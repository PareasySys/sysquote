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
  console.log("--- Starting Scheduling (v3: Corrected Weekend Skip) ---");
  const dailySegments: ScheduledTaskSegment[] = [];
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

    // Get the *current* next available day and hours for this resource
    let schedulingDay = resourceNextAvailable[resourceId].day;
    let hoursUsedOnSchedulingDay = resourceNextAvailable[resourceId].hoursUsed;

    for (const req of resourceReqs) {
      console.log(` Processing Req ID: ${req.requirement_id}, Res: ${resourceId}, Machine: ${req.machine_name}, Hours: ${req.training_hours}`);
      let hoursRemaining = req.training_hours;
      let segmentIndex = 0;

      while (hoursRemaining > 0) {

        // Find the *actual* working day to schedule on, starting from the resource's next available day
        let workDay = findNextWorkingDay(schedulingDay, workOnSaturday, workOnSunday);

        // If we skipped days (weekends), reset the hours used counter
        if (workDay > schedulingDay) {
          hoursUsedOnSchedulingDay = 0;
        }
        // If we didn't skip days, ensure we use the correct hours used count for *that* day
        else {
           hoursUsedOnSchedulingDay = resourceNextAvailable[resourceId].day === workDay
                ? resourceNextAvailable[resourceId].hoursUsed
                : 0; // Reset if somehow the tracker day doesn't match workDay
        }
        schedulingDay = workDay; // Update the day we are attempting to schedule on


        // If the target scheduling day is already full, advance to the NEXT working day and restart iteration
        if (hoursUsedOnSchedulingDay >= DAILY_HOUR_LIMIT) {
          console.log(`  Day ${schedulingDay} full for Resource ${resourceId}. Finding next working day.`);
          schedulingDay = findNextWorkingDay(schedulingDay + 1, workOnSaturday, workOnSunday);
          hoursUsedOnSchedulingDay = 0; // Reset for the new day
          resourceNextAvailable[resourceId] = { day: schedulingDay, hoursUsed: 0 }; // Update tracker
          continue; // Re-evaluate this new day in the next loop iteration
        }

        // Calculate hours for this segment
        const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursUsedOnSchedulingDay;
        const hoursForThisSegment = Math.min(hoursRemaining, hoursAvailableToday);

        if (hoursForThisSegment <= 0) {
           console.error(" Calculated zero/negative hours for segment. Breaking.", { req, schedulingDay, hoursUsedOnSchedulingDay, hoursRemaining });
           break;
        }

        console.log(`  Segment ${segmentIndex}: Day ${schedulingDay}, Hours ${hoursForThisSegment}. Used ${hoursUsedOnSchedulingDay}/${DAILY_HOUR_LIMIT} today.`);

        // Create the segment
        dailySegments.push({
          id: `${req.requirement_id}-seg${segmentIndex}`,
          originalRequirementId: req.requirement_id || `req-${resourceId}-${segmentIndex}`,
          resource_id: req.resource_id,
          resource_name: req.resource_name,
          machine_name: req.machine_name,
          total_training_hours: req.training_hours,
          segment_hours: hoursForThisSegment,
          start_day: schedulingDay, // Use the confirmed working day
          duration_days: 1,
        });

        // Update state for the next iteration/task
        hoursRemaining -= hoursForThisSegment;
        hoursUsedOnSchedulingDay += hoursForThisSegment;
        segmentIndex++;

        // --- CRITICAL FIX: Update the resource tracker correctly ---
        // If the day is now full, the *next available day* for the resource is the *next working day*
        if (hoursUsedOnSchedulingDay >= DAILY_HOUR_LIMIT) {
          schedulingDay = findNextWorkingDay(schedulingDay + 1, workOnSaturday, workOnSunday);
          hoursUsedOnSchedulingDay = 0; // Reset hours for the *next* day
        }
        // Update the tracker regardless of whether the day was filled
        resourceNextAvailable[resourceId] = { day: schedulingDay, hoursUsed: hoursUsedOnSchedulingDay };
        // --- END CRITICAL FIX ---

      } // End while (hoursRemaining > 0)
      console.log(` Finished processing Req ID: ${req.requirement_id}`);
    } // End for (const req of resourceReqs)
  } // End for (const resourceIdStr in reqsByResource)

  console.log("--- Finished Daily Segment Creation ---", dailySegments.length, "segments created.");
  if (dailySegments.length === 0) return [];

  // --- Consolidation (Same as before, should be fine) ---
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
    if (
      currentConsolidated &&
      segment.originalRequirementId === currentConsolidated.originalRequirementId &&
      segment.resource_id === currentConsolidated.resource_id &&
      findNextWorkingDay(currentConsolidated.start_day + currentConsolidated.duration_days, workOnSaturday, workOnSunday) === segment.start_day
    ) {
      currentConsolidated.duration_days = (segment.start_day + segment.duration_days) - currentConsolidated.start_day;
      currentConsolidated.segment_hours += segment.segment_hours;
       console.log(`  Merged segment ${segment.id}. New Duration: ${currentConsolidated.duration_days}`);
    } else {
      if (currentConsolidated) {
         console.log(`  Pushing consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
         consolidatedSegments.push(currentConsolidated);
      }
      currentConsolidated = { ...segment }; // Duration remains 1 initially
       console.log(`  Starting new consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
    }
  }
  if (currentConsolidated) {
    console.log(`  Pushing final consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
    consolidatedSegments.push(currentConsolidated);
  }

  console.log("--- Scheduling Finished ---", consolidatedSegments.length, "consolidated segments.");
  return consolidatedSegments;
};