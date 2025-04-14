// src/utils/scheduleTasks.ts

// Adjust import paths as needed
import { TrainingRequirement } from "@/hooks/useTrainingRequirements";
// Make sure this path is correct for your project structure
import { ScheduledTaskSegment } from "./types";

const DAILY_HOUR_LIMIT = 8;

// Helper to check if a specific day number is a weekend
const isDayWeekend = (
  dayNumber: number,
  workOnSaturday: boolean,
  workOnSunday: boolean
): boolean => {
  if (dayNumber <= 0) return false;
  // Day 1 = Mon, Day 6 = Sat, Day 7 = Sun
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
  console.log("--- Starting Scheduling (v5: Weekend Consolidation Fix) ---");
  const dailySegments: ScheduledTaskSegment[] = [];
  const resourceNextAvailable: { [resourceId: number]: { day: number; hoursUsed: number } } = {};

  const reqsByResource = rawRequirements.reduce((acc, req) => {
    // Ensure resource_id exists, otherwise group under a default or skip
    const key = req.resource_id ?? -1; // Use -1 for unassigned, adjust as needed
    if (key === -1) {
      console.warn(`Requirement ${req.requirement_id} has no resource_id, skipping.`);
      return acc;
    }
    if (!acc[key]) acc[key] = [];
    acc[key].push(req);
    return acc;
  }, {} as { [resourceId: number]: TrainingRequirement[] });

  for (const resourceIdStr in reqsByResource) {
    const resourceId = parseInt(resourceIdStr, 10);
    if (isNaN(resourceId) || resourceId < 0) continue; // Skip if invalid resource ID

    const resourceReqs = reqsByResource[resourceId];

    // Initialize resource tracker: Earliest WORK day is Day 2 or later
    const initialWorkDay = findNextWorkingDay(2, workOnSaturday, workOnSunday);
    if (!resourceNextAvailable[resourceId]) {
        resourceNextAvailable[resourceId] = { day: initialWorkDay, hoursUsed: 0 };
        console.log(`Resource ${resourceId}: Initializing to start Day ${initialWorkDay}`);
    }

    let currentDayForResource = resourceNextAvailable[resourceId].day;
    let hoursUsedOnCurrentDay = resourceNextAvailable[resourceId].hoursUsed;

    for (const req of resourceReqs) {
      console.log(` Processing Req ID: ${req.requirement_id}, Res: ${resourceId}, Machine: ${req.machine_name}, Hours: ${req.training_hours}`);
      let hoursRemaining = req.training_hours;
      let segmentIndex = 0;

      while (hoursRemaining > 0) {
        // Find next available slot
        let dayAdvanced = false;
        while (isDayWeekend(currentDayForResource, workOnSaturday, workOnSunday) || hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
          currentDayForResource++;
          hoursUsedOnCurrentDay = 0; // Reset hours for the new day
          dayAdvanced = true;
          currentDayForResource = findNextWorkingDay(currentDayForResource, workOnSaturday, workOnSunday); // Ensure it's a working day
        }
        if (dayAdvanced) {
            console.log(`  Advanced to next working day for Res ${resourceId}: Day ${currentDayForResource}`);
        }

        // Calculate hours for segment
        const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursUsedOnCurrentDay;
        const hoursForThisSegment = Math.min(hoursRemaining, hoursAvailableToday);

        if (hoursForThisSegment <= 0) {
           console.error(" Calculated zero/negative hours for segment. Breaking.", { req, currentDayForResource, hoursUsedOnCurrentDay, hoursRemaining });
           break; // Safety break
        }

        console.log(`  Segment ${segmentIndex}: Day ${currentDayForResource}, Hours ${hoursForThisSegment}. Used ${hoursUsedOnCurrentDay}/${DAILY_HOUR_LIMIT} today.`);

        // Create the segment
        dailySegments.push({
          id: `${req.requirement_id}-seg${segmentIndex}`,
          originalRequirementId: req.requirement_id || `req-${resourceId}-${segmentIndex}`,
          resource_id: req.resource_id, // Should exist due to filter earlier
          resource_name: req.resource_name,
          machine_name: req.machine_name,
          total_training_hours: req.training_hours,
          segment_hours: hoursForThisSegment,
          start_day: currentDayForResource,
          duration_days: 1, // Logical duration for daily segment
        });

        // Update state for the next iteration/task
        hoursRemaining -= hoursForThisSegment;
        hoursUsedOnCurrentDay += hoursForThisSegment;
        segmentIndex++;

        // Update Resource Tracker with the current day and hours used
        resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: hoursUsedOnCurrentDay };

      } // End while (hoursRemaining > 0)
      console.log(` Finished processing Req ID: ${req.requirement_id}`);
    } // End for (const req of resourceReqs)
  } // End for (const resourceIdStr in reqsByResource)

  console.log("--- Finished Daily Segment Creation ---", dailySegments.length, "segments created.");
  if (dailySegments.length === 0) return [];

  // --- Step 2: Consolidate Consecutive *Working Day* Segments ---
  console.log("--- Starting Consolidation (v5: Weekend Fix) ---");
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
    // Check if this segment can be merged with the previous one
    if (
      currentConsolidated &&
      segment.originalRequirementId === currentConsolidated.originalRequirementId &&
      segment.resource_id === currentConsolidated.resource_id &&
      // Check if it starts *exactly* on the day after the previous segment logically ends
      segment.start_day === (currentConsolidated.start_day + currentConsolidated.duration_days) &&
      // AND the start day of this segment is NOT a weekend we're skipping
      !isDayWeekend(segment.start_day, workOnSaturday, workOnSunday)
    ) {
      // Merge: Extend duration and add hours
      currentConsolidated.duration_days += segment.duration_days; // Add logical duration (which is 1)
      currentConsolidated.segment_hours += segment.segment_hours;
      console.log(`  Merged segment ${segment.id}. New Duration: ${currentConsolidated.duration_days}, Hours: ${currentConsolidated.segment_hours}`);
    } else {
      // Cannot merge. Push previous block if it exists.
      if (currentConsolidated) {
         console.log(`  Pushing consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}, Hours: ${currentConsolidated.segment_hours}`);
         consolidatedSegments.push(currentConsolidated);
      }
      // Start a new consolidation block with the current segment.
      currentConsolidated = { ...segment }; // segment.duration_days is already 1
      console.log(`  Starting new consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}, Hours: ${currentConsolidated.segment_hours}`);
    }
  }
  // Push the last remaining consolidated block.
  if (currentConsolidated) {
    console.log(`  Pushing final consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}, Hours: ${currentConsolidated.segment_hours}`);
    consolidatedSegments.push(currentConsolidated);
  }

  console.log("--- Scheduling Finished ---", consolidatedSegments.length, "consolidated segments.");
  return consolidatedSegments;
};