// src/utils/scheduleTasks.ts

// Adjust import paths as needed
import { TrainingRequirement } from "@/hooks/useTrainingRequirements";
import { ScheduledTaskSegment } from "./types"; // Assuming types.ts exists here

const DAILY_HOUR_LIMIT = 8;

// Helper to check if a specific day number is a weekend
const isDayWeekend = (
  dayNumber: number,
  workOnSaturday: boolean,
  workOnSunday: boolean
): boolean => {
  if (dayNumber <= 0) return false;
  // Day 1 = Mon, ..., Day 6 = Sat, Day 7 = Sun
  const dayOfWeek = ((dayNumber - 1) % 7) + 1;
  if (!workOnSaturday && dayOfWeek === 6) return true;
  if (!workOnSunday && dayOfWeek === 7) return true;
  return false;
};

// Helper to find the next working day, starting from a given day
const findNextWorkingDay = (
    startDay: number,
    workOnSaturday: boolean,
    workOnSunday: boolean
): number => {
    let day = startDay;
    while (isDayWeekend(day, workOnSaturday, workOnSunday)) {
        day++;
    }
    return day;
}

export const scheduleTrainingTasks = (
  rawRequirements: TrainingRequirement[],
  workOnSaturday: boolean,
  workOnSunday: boolean
): ScheduledTaskSegment[] => {
  console.log("--- Starting Scheduling (v4: Reverted Weekend Check Logic) ---");
  const dailySegments: ScheduledTaskSegment[] = [];
  // Tracks the next available day and hours used *on that specific day* for each resource
  const resourceNextAvailable: { [resourceId: number]: { day: number; hoursUsed: number } } = {};

  const reqsByResource = rawRequirements.reduce((acc, req) => {
    const key = req.resource_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(req);
    return acc;
  }, {} as { [resourceId: number]: TrainingRequirement[] });

  for (const resourceIdStr in reqsByResource) {
    const resourceId = parseInt(resourceIdStr, 10);
    const resourceReqs = reqsByResource[resourceId];

    // Initialize resource tracker: Earliest WORK day is Day 2 or later
    const initialWorkDay = findNextWorkingDay(2, workOnSaturday, workOnSunday);
    if (!resourceNextAvailable[resourceId]) {
        resourceNextAvailable[resourceId] = { day: initialWorkDay, hoursUsed: 0 };
        console.log(`Resource ${resourceId}: Initializing to start Day ${initialWorkDay}`);
    }

    // Get the resource's current state *before* processing its requirements
    let currentDayForResource = resourceNextAvailable[resourceId].day;
    let hoursUsedOnCurrentDay = resourceNextAvailable[resourceId].hoursUsed;

    for (const req of resourceReqs) {
      console.log(` Processing Req ID: ${req.requirement_id}, Res: ${resourceId}, Machine: ${req.machine_name}, Hours: ${req.training_hours}`);
      let hoursRemaining = req.training_hours;
      let segmentIndex = 0;

      // Process segments for this requirement
      while (hoursRemaining > 0) {

        // --- Find next available slot (check weekend/full day BEFORE calculating) ---
        let dayAdvanced = false;
        while (isDayWeekend(currentDayForResource, workOnSaturday, workOnSunday) || hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
          currentDayForResource++;
          hoursUsedOnCurrentDay = 0; // Reset hours for the new day
          dayAdvanced = true;
          // Ensure the incremented day is also not a weekend
          currentDayForResource = findNextWorkingDay(currentDayForResource, workOnSaturday, workOnSunday);
        }
        if (dayAdvanced) {
            console.log(`  Advanced to next working day for Res ${resourceId}: Day ${currentDayForResource}`);
        }
        // --- End find next available slot ---

        // Now currentDayForResource is a valid working day with some hours available
        const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursUsedOnCurrentDay;
        const hoursForThisSegment = Math.min(hoursRemaining, hoursAvailableToday);

        if (hoursForThisSegment <= 0) {
           console.error(" Calculated zero/negative hours for segment. Breaking.", { req, currentDayForResource, hoursUsedOnCurrentDay, hoursRemaining });
           break;
        }

        console.log(`  Segment ${segmentIndex}: Day ${currentDayForResource}, Hours ${hoursForThisSegment}. Used ${hoursUsedOnCurrentDay}/${DAILY_HOUR_LIMIT} today.`);

        // Create the segment
        dailySegments.push({
          id: `${req.requirement_id}-seg${segmentIndex}`,
          originalRequirementId: req.requirement_id || `req-${resourceId}-${segmentIndex}`,
          resource_id: req.resource_id,
          resource_name: req.resource_name,
          machine_name: req.machine_name,
          total_training_hours: req.training_hours,
          segment_hours: hoursForThisSegment,
          start_day: currentDayForResource, // Use the confirmed working day
          duration_days: 1,
        });

        // Update state for the next iteration/task
        hoursRemaining -= hoursForThisSegment;
        hoursUsedOnCurrentDay += hoursForThisSegment; // Increment hours used on *this* day
        segmentIndex++;

        // --- Update Resource Tracker ---
        // Store the current day and the hours used on it. This state will be picked up
        // at the start of the next segment's loop or the next task's loop.
        resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: hoursUsedOnCurrentDay };
        // --- End Update Resource Tracker ---

      } // End while (hoursRemaining > 0)
      console.log(` Finished processing Req ID: ${req.requirement_id}`);
    } // End for (const req of resourceReqs)
  } // End for (const resourceIdStr in reqsByResource)

  console.log("--- Finished Daily Segment Creation ---", dailySegments.length, "segments created.");
  if (dailySegments.length === 0) return [];

  // --- Consolidation ---
  console.log("--- Starting Consolidation ---");
  const consolidatedSegments: ScheduledTaskSegment[] = [];
  dailySegments.sort((a, b) => {
    if (a.resource_id !== b.resource_id) return a.resource_id - b.resource_id;
    const idA = String(a.originalRequirementId);
    const idB = String(b.originalRequirementId);
    if (idA !== idB) return idA.localeCompare(idB);
    return a.start_day - b.start_day;
  });

  let currentConsolidated: ScheduledTaskSegment | null = null;
  for (const segment of dailySegments) {
    // Can we merge this segment with the previous consolidated block?
    if (
      currentConsolidated &&
      segment.originalRequirementId === currentConsolidated.originalRequirementId &&
      segment.resource_id === currentConsolidated.resource_id &&
      // Check if it starts *exactly* on the next working day after the current block ends
      findNextWorkingDay(currentConsolidated.start_day + currentConsolidated.duration_days, workOnSaturday, workOnSunday) === segment.start_day
    ) {
      // Merge: Calculate new duration based on days spanned and add hours
      currentConsolidated.duration_days = (segment.start_day + segment.duration_days) - currentConsolidated.start_day; // Duration is end_day - start_day + 1
      currentConsolidated.segment_hours += segment.segment_hours;
      console.log(`  Merged segment ${segment.id}. New Duration: ${currentConsolidated.duration_days}`);
    } else {
      // Cannot merge. Push previous block if it exists.
      if (currentConsolidated) {
         console.log(`  Pushing consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
         consolidatedSegments.push(currentConsolidated);
      }
      // Start a new consolidation block with the current segment.
      currentConsolidated = { ...segment }; // Duration is initially 1
      console.log(`  Starting new consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
    }
  }
  // Push the last remaining consolidated block.
  if (currentConsolidated) {
    console.log(`  Pushing final consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
    consolidatedSegments.push(currentConsolidated);
  }

  console.log("--- Scheduling Finished ---", consolidatedSegments.length, "consolidated segments.");
  return consolidatedSegments;
};