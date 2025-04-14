
// src/utils/scheduleTasks.ts

import { TrainingRequirement } from "@/hooks/useTrainingRequirements"; // Adjust import path if needed

// Ensure this definition includes start_hour_offset
export interface ScheduledTaskSegment {
  id: string;
  originalRequirementId: number | string;
  resource_id: number;
  resource_name: string;
  machine_name: string;
  total_training_hours: number;
  segment_hours: number;
  start_day: number;
  duration_days: number;
  start_hour_offset: number;
}

const DAILY_HOUR_LIMIT = 8;

// Helper to check if a specific day number is a weekend
const isDayWeekend = (
  dayNumber: number,
  workOnSaturday: boolean,
  workOnSunday: boolean
): boolean => {
  if (dayNumber <= 0) return false;
  const dayOfWeek = ((dayNumber - 1) % 7) + 1; // 1=Mon, 6=Sat, 7=Sun
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
  console.log("--- Starting Scheduling (v8: Start Hour Offset) ---");
  const dailySegments: ScheduledTaskSegment[] = [];
  const resourceNextAvailable: { [resourceId: number]: { day: number; hoursUsed: number } } = {};

  const reqsByResource = rawRequirements.reduce((acc, req) => {
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
      let hoursUsedToday = hoursUsedOnCurrentDay; // Local copy for inner loop logic
      while (hoursUsedToday < DAILY_HOUR_LIMIT && currentReqIndex < resourceReqs.length) { 
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
          !isDayWeekend(segment.start_day, workOnSaturday, workOnSunday)) {
          // Merge logic
          currentConsolidated.duration_days += segment.duration_days;
          currentConsolidated.segment_hours += segment.segment_hours;
      } else {
          if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
          currentConsolidated = { ...segment }; // Preserves start_hour_offset of first segment
      }
  }
  if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
  console.log("--- Consolidation Finished ---", consolidatedSegments.length, "consolidated segments.");

  return consolidatedSegments;
};
