// src/utils/scheduleTasks.ts

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
  console.log("--- Starting Scheduling (v7: Fill Day Logic) ---");
  const dailySegments: ScheduledTaskSegment[] = [];

  // Group requirements by resource - important to process each resource independently
  const reqsByResource = rawRequirements.reduce((acc, req) => {
    const key = req.resource_id ?? -1;
    if (key === -1) {
        console.warn(`Requirement ${req.requirement_id} has no resource_id, skipping.`);
        return acc;
    }
    if (!acc[key]) acc[key] = [];
    // Add remaining_hours tracker to each requirement object for easier state management
    acc[key].push({ ...req, remaining_hours: req.training_hours, requirement_id: req.requirement_id ?? `fallback-${key}-${acc[key].length}` });
    return acc;
  }, {} as { [resourceId: number]: (TrainingRequirement & { remaining_hours: number })[] });


  // --- Schedule for each resource independently ---
  for (const resourceIdStr in reqsByResource) {
    const resourceId = parseInt(resourceIdStr, 10);
    if (isNaN(resourceId) || resourceId < 0) continue;

    const resourceReqs = reqsByResource[resourceId];
    let currentReqIndex = 0; // Index of the requirement we are currently trying to schedule hours FROM
    let segmentCounter = 0; // Counter for unique segment IDs

    // Start scheduling from the first working day on or after Day 2
    let currentSchedulingDay = findNextWorkingDay(2, workOnSaturday, workOnSunday);
    let hoursUsedToday = 0;

    console.log(`Processing Resource ${resourceId}, starting potential Day ${currentSchedulingDay}`);

    // Loop as long as there are requirements left to schedule for this resource
    while (currentReqIndex < resourceReqs.length) {

      // Ensure the currentSchedulingDay is a working day
      let workDay = findNextWorkingDay(currentSchedulingDay, workOnSaturday, workOnSunday);
      if (workDay > currentSchedulingDay) {
        // We skipped weekend(s), so the previous day's hoursUsedToday is irrelevant
        hoursUsedToday = 0;
        currentSchedulingDay = workDay;
        console.log(`  Skipped weekend. Res ${resourceId} now on Day ${currentSchedulingDay}`);
      }

      // --- Try to fill the current working day ---
      while (hoursUsedToday < DAILY_HOUR_LIMIT && currentReqIndex < resourceReqs.length) {
        const currentReq = resourceReqs[currentReqIndex];

        if (currentReq.remaining_hours <= 0) {
            // This requirement is done, move to the next one for this resource
            currentReqIndex++;
            continue; // Check the next requirement within the *same day* fill loop
        }

        const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursUsedToday;
        const hoursForThisSegment = Math.min(currentReq.remaining_hours, hoursAvailableToday);

        if (hoursForThisSegment <= 0) {
            // No more time left today, break the inner "fill day" loop
            break;
        }

        console.log(`  Segment ${segmentCounter}: Day ${currentSchedulingDay}, Hours ${hoursForThisSegment} for Req ${currentReq.requirement_id}. Used ${hoursUsedToday}/${DAILY_HOUR_LIMIT} today.`);

        // Create the segment
        dailySegments.push({
          id: `${currentReq.requirement_id}-seg${segmentCounter}`,
          originalRequirementId: currentReq.requirement_id,
          resource_id: currentReq.resource_id,
          resource_name: currentReq.resource_name,
          machine_name: currentReq.machine_name,
          total_training_hours: currentReq.training_hours,
          segment_hours: hoursForThisSegment,
          start_day: currentSchedulingDay,
          duration_days: 1, // Logical duration is 1 for daily segment
        });

        // Update state
        currentReq.remaining_hours -= hoursForThisSegment;
        hoursUsedToday += hoursForThisSegment;
        segmentCounter++;

        // Check if the current requirement is finished *after* scheduling the segment
         if (currentReq.remaining_hours <= 0) {
            console.log(`   Req ${currentReq.requirement_id} finished.`);
            currentReqIndex++; // Move to the next requirement index
         }

      } // --- End of inner "fill day" loop ---

      // If we exited the inner loop, it means either the day is full OR all requirements are done.
      // If the day is full, advance to the next day for the next outer loop iteration.
      if (hoursUsedToday >= DAILY_HOUR_LIMIT) {
        currentSchedulingDay++;
        hoursUsedToday = 0; // Reset hours for the new day
      }
      // If all requirements are done (currentReqIndex >= resourceReqs.length), the outer loop will terminate.

    } // End while (requirements left for this resource)
    console.log(`Finished processing Resource ${resourceId}. Last scheduling day considered: ${currentSchedulingDay}`);
  } // End for (each resource)

  console.log("--- Finished Daily Segment Creation ---", dailySegments.length, "segments created.");
  if (dailySegments.length === 0) return [];

  // --- Step 2: Consolidate Consecutive Segments (v5 logic is correct) ---
   console.log("--- Starting Consolidation (v5 logic) ---");
  const consolidatedSegments: ScheduledTaskSegment[] = [];
  dailySegments.sort((a, b) => {
    if (a.resource_id !== b.resource_id) return a.resource_id - b.resource_id;
    const idA = String(a.originalRequirementId); const idB = String(b.originalRequirementId);
    if (idA !== idB) return idA.localeCompare(idB);
    return a.start_day - b.start_day;
  });
  let currentConsolidated: ScheduledTaskSegment | null = null;
  for (const segment of dailySegments) {
    if (currentConsolidated &&
        segment.originalRequirementId === currentConsolidated.originalRequirementId &&
        segment.resource_id === currentConsolidated.resource_id &&
        segment.start_day === (currentConsolidated.start_day + currentConsolidated.duration_days) &&
        !isDayWeekend(segment.start_day, workOnSaturday, workOnSunday)
    ) {
      currentConsolidated.duration_days += segment.duration_days;
      currentConsolidated.segment_hours += segment.segment_hours;
    } else {
      if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
      currentConsolidated = { ...segment };
    }
  }
  if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
  console.log("--- Consolidation Finished ---", consolidatedSegments.length, "consolidated segments.");


  return consolidatedSegments;
};