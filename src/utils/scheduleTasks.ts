// src/utils/scheduleTasks.ts

import { TrainingRequirement } from "@/hooks/useTrainingRequirements";
// Assuming types.ts defines ScheduledTaskSegment, we need to modify it or redefine here
// import { ScheduledTaskSegment } from "./types";

// --- Define/Update ScheduledTaskSegment Interface ---
// Add start_hour_offset
export interface ScheduledTaskSegment {
  id: string;
  originalRequirementId: number | string;
  resource_id: number;
  resource_name: string;
  machine_name: string;
  total_training_hours: number;
  segment_hours: number;
  start_day: number;
  duration_days: number; // Logical duration (usually 1 for daily segments before consolidation)
  start_hour_offset: number; // Hours used on start_day *before* this segment begins (0 to < DAILY_HOUR_LIMIT)
}
// --- End Interface Definition ---


const DAILY_HOUR_LIMIT = 8;

const isDayWeekend = ( /* ... same as before ... */ ): boolean => { /* ... */ };
const findNextWorkingDay = ( /* ... same as before ... */ ): number => { /* ... */ };


export const scheduleTrainingTasks = (
  rawRequirements: TrainingRequirement[],
  workOnSaturday: boolean,
  workOnSunday: boolean
): ScheduledTaskSegment[] => {
  console.log("--- Starting Scheduling (v8: Start Hour Offset) ---");
  const dailySegments: ScheduledTaskSegment[] = [];
  const resourceNextAvailable: { [resourceId: number]: { day: number; hoursUsed: number } } = {};

  const reqsByResource = rawRequirements.reduce((acc, req) => {
    // ... (same grouping logic as v7, ensure remaining_hours is added) ...
     const key = req.resource_id ?? -1;
    if (key === -1) { console.warn(`Req ${req.requirement_id} lacks resource_id, skipping.`); return acc; }
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...req, remaining_hours: req.training_hours, requirement_id: req.requirement_id ?? `fallback-${key}-${acc[key].length}` });
    return acc;
  }, {} as { [resourceId: number]: (TrainingRequirement & { remaining_hours: number })[] });


  for (const resourceIdStr in reqsByResource) {
    const resourceId = parseInt(resourceIdStr, 10);
    if (isNaN(resourceId) || resourceId < 0) continue;

    const resourceReqs = reqsByResource[resourceId];
    let currentReqIndex = 0;
    let segmentCounter = 0;

    if (!resourceNextAvailable[resourceId]) {
      const initialWorkDay = findNextWorkingDay(2, workOnSaturday, workOnSunday);
      resourceNextAvailable[resourceId] = { day: initialWorkDay, hoursUsed: 0 };
    }

    let currentDayForResource = resourceNextAvailable[resourceId].day;
    let hoursUsedOnCurrentDay = resourceNextAvailable[resourceId].hoursUsed;

    while (currentReqIndex < resourceReqs.length) {
      // Find next available working day/slot
      let workDay = findNextWorkingDay(currentDayForResource, workOnSaturday, workOnSunday);
      if (workDay > currentDayForResource) {
        hoursUsedOnCurrentDay = 0; // Reset if skipped weekend
      } else {
        // Make sure we use the tracked hours if it's the same day
         hoursUsedOnCurrentDay = resourceNextAvailable[resourceId].day === workDay
                ? resourceNextAvailable[resourceId].hoursUsed
                : 0;
      }
      currentDayForResource = workDay;

      // If day is full, advance and restart loop iteration
      if (hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
        currentDayForResource = findNextWorkingDay(currentDayForResource + 1, workOnSaturday, workOnSunday);
        hoursUsedOnCurrentDay = 0;
        resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: 0 }; // Update tracker
        continue;
      }

      // --- Try to fill the current working day ---
      while (hoursUsedToday < DAILY_HOUR_LIMIT && currentReqIndex < resourceReqs.length) { // Use local copy for inner loop
            let hoursUsedToday = hoursUsedOnCurrentDay; // Local copy for inner loop logic
            const currentReq = resourceReqs[currentReqIndex];

            if (currentReq.remaining_hours <= 0) {
                currentReqIndex++;
                continue;
            }

            const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursUsedToday;
            const hoursForThisSegment = Math.min(currentReq.remaining_hours, hoursAvailableToday);

            if (hoursForThisSegment <= 0) {
                 // No more time left today, break the inner "fill day" loop
                 break; // Exit inner loop, outer loop will advance day
            }

            // --- CAPTURE OFFSET ---
            const startHourOffset = hoursUsedToday; // Hours used *before* this segment
            // --- END CAPTURE OFFSET ---

            console.log(`  Segment ${segmentCounter}: Day ${currentDayForResource}, Offset ${startHourOffset}h, Hours ${hoursForThisSegment}.`);

            // Create the segment, including the offset
            dailySegments.push({
              id: `${currentReq.requirement_id}-seg${segmentCounter}`,
              originalRequirementId: currentReq.requirement_id,
              resource_id: currentReq.resource_id,
              resource_name: currentReq.resource_name,
              machine_name: currentReq.machine_name,
              total_training_hours: currentReq.training_hours,
              segment_hours: hoursForThisSegment,
              start_day: currentDayForResource,
              duration_days: 1,
              start_hour_offset: startHourOffset, // Store the offset
            });

            // Update state
            currentReq.remaining_hours -= hoursForThisSegment;
            hoursUsedToday += hoursForThisSegment; // Update the local count for *this day*
            segmentCounter++;

             // Update the *persistent* tracker for the resource
             resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: hoursUsedToday };
             hoursUsedOnCurrentDay = hoursUsedToday; // Sync outer loop variable

             if (currentReq.remaining_hours <= 0) {
                console.log(`   Req ${currentReq.requirement_id} finished.`);
                currentReqIndex++;
             }
      } // --- End of inner "fill day" loop ---

      // If the day is full, advance to the next day for the next outer loop iteration
      if (hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
        currentDayForResource++; // Prepare for the next day check
        hoursUsedOnCurrentDay = 0; // Reset hours since we are moving day
      }
      // If all requirements are done, outer loop terminates

    } // End while (requirements left for this resource)
  } // End for (each resource)

  // --- Consolidation ---
  // The consolidation logic should remain the same (v5).
  // The start_hour_offset of the *first* segment in a consolidated block
  // will be preserved because we do `{ ...segment }` when starting a new block.
  console.log("--- Starting Consolidation (v5 logic) ---");
  const consolidatedSegments: ScheduledTaskSegment[] = [];
  // ... (Keep exact consolidation logic from v5/previous step) ...
  dailySegments.sort((a, b) => { /* ... sort ... */ });
  let currentConsolidated: ScheduledTaskSegment | null = null;
  for (const segment of dailySegments) {
      if ( currentConsolidated && /* ... merge conditions ... */ ) {
           /* ... merge logic ... */
      } else {
          if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
          currentConsolidated = { ...segment }; // Preserves start_hour_offset of first segment
      }
  }
  if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
  console.log("--- Consolidation Finished ---", consolidatedSegments.length, "consolidated segments.");

  return consolidatedSegments;
};