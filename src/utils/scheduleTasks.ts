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
  duration_days: number; // Logical duration (usually 1 for daily segments before consolidation)
  start_hour_offset: number; // Hours used on start_day *before* this segment begins (0 to < DAILY_HOUR_LIMIT)
}

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
  console.log("--- Starting Scheduling (v8.1: Corrected Consolidation Condition) ---");
  const dailySegments: ScheduledTaskSegment[] = [];
  const resourceNextAvailable: { [resourceId: number]: { day: number; hoursUsed: number } } = {};

  // Group requirements by resource and add remaining_hours tracker
  const reqsByResource = rawRequirements.reduce((acc, req) => {
    const key = req.resource_id ?? -1; // Use resource_id, handle null/undefined
    if (key === -1) {
      console.warn(`Requirement ${req.requirement_id} lacks resource_id, skipping.`);
      return acc;
    }
    if (!acc[key]) acc[key] = [];
    // Ensure requirement_id exists, provide fallback if necessary
    acc[key].push({ ...req, remaining_hours: req.training_hours, requirement_id: req.requirement_id ?? `fallback-${key}-${acc[key].length}` });
    return acc;
  }, {} as { [resourceId: number]: (TrainingRequirement & { remaining_hours: number })[] });


  // Schedule for each resource independently
  for (const resourceIdStr in reqsByResource) {
    const resourceId = parseInt(resourceIdStr, 10);
    if (isNaN(resourceId) || resourceId < 0) continue; // Skip if invalid resource ID

    const resourceReqs = reqsByResource[resourceId];
    let currentReqIndex = 0; // Index of the requirement we are currently scheduling
    let segmentCounter = 0; // Counter for unique segment IDs per original requirement

    // Initialize resource tracker if not present: Earliest WORK day is Day 2 or later
    if (!resourceNextAvailable[resourceId]) {
      const initialWorkDay = findNextWorkingDay(2, workOnSaturday, workOnSunday);
      resourceNextAvailable[resourceId] = { day: initialWorkDay, hoursUsed: 0 };
      console.log(`Resource ${resourceId}: Initializing to start Day ${initialWorkDay}`);
    }

    // Loop as long as there are requirements left to schedule for this resource
    while (currentReqIndex < resourceReqs.length) {

      // Get the resource's current state for the start of this iteration
      let currentDayForResource = resourceNextAvailable[resourceId].day;
      let hoursUsedOnCurrentDay = resourceNextAvailable[resourceId].hoursUsed;

      // Ensure current day is valid and not full
      let workDay = findNextWorkingDay(currentDayForResource, workOnSaturday, workOnSunday);
      if (workDay > currentDayForResource) {
        hoursUsedOnCurrentDay = 0; // Reset if skipped weekend(s)
      }
      // Use the tracked hours if it's the same day
      else if (resourceNextAvailable[resourceId].day === workDay) {
          hoursUsedOnCurrentDay = resourceNextAvailable[resourceId].hoursUsed;
      }
      // Otherwise (if somehow day didn't advance but tracker day differs), reset
      else {
          hoursUsedOnCurrentDay = 0;
      }
      currentDayForResource = workDay; // Update the day we are working on


      // If the confirmed working day is already full, advance to the *next* working day
      if (hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
        currentDayForResource = findNextWorkingDay(currentDayForResource + 1, workOnSaturday, workOnSunday);
        hoursUsedOnCurrentDay = 0;
        resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: hoursUsedOnCurrentDay }; // Update tracker
        console.log(`  Day was full. Advanced Res ${resourceId} to next working day: ${currentDayForResource}`);
        continue; // Restart the outer while loop to re-evaluate this new day
      }

      // Get the current requirement to schedule
      const currentReq = resourceReqs[currentReqIndex];

      // Check if the current requirement has hours left
      if (currentReq.remaining_hours <= 0) {
        currentReqIndex++; // Move to the next requirement
        continue; // Go to the next iteration of the outer while loop
      }

      // Calculate hours for this segment on the current day
      const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursUsedOnCurrentDay;
      const hoursForThisSegment = Math.min(currentReq.remaining_hours, hoursAvailableToday);

      if (hoursForThisSegment <= 0) {
         // This should ideally not happen due to the check above, but acts as a safeguard
         console.error(" Calculated zero/negative hours when day wasn't full. Moving to next req.", { req: currentReq, currentDayForResource, hoursUsedOnCurrentDay });
         currentReqIndex++; // Try next requirement to prevent potential infinite loop
         continue;
      }

      // Capture the offset *before* adding hours for this segment
      const startHourOffset = hoursUsedOnCurrentDay;

      console.log(`  Segment ${segmentCounter} for Req ${currentReq.requirement_id}: Day ${currentDayForResource}, Offset ${startHourOffset}h, Hours ${hoursForThisSegment}.`);

      // Create the segment
      dailySegments.push({
        id: `${currentReq.requirement_id}-seg${segmentCounter}`,
        originalRequirementId: currentReq.requirement_id,
        resource_id: currentReq.resource_id,
        resource_name: currentReq.resource_name,
        machine_name: currentReq.machine_name,
        total_training_hours: currentReq.training_hours,
        segment_hours: hoursForThisSegment,
        start_day: currentDayForResource,
        duration_days: 1, // Logical duration for daily segment
        start_hour_offset: startHourOffset, // Store the offset
      });

      // Update state
      currentReq.remaining_hours -= hoursForThisSegment;
      hoursUsedOnCurrentDay += hoursForThisSegment; // Add hours used *on this day*
      segmentCounter++;

      // Update the persistent tracker for the resource immediately
      resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: hoursUsedOnCurrentDay };

      // If requirement finished, move to next one for the next loop iteration
      if (currentReq.remaining_hours <= 0) {
          console.log(`   Req ${currentReq.requirement_id} finished.`);
          currentReqIndex++;
      }

      // If the day became full, advance day *for the next iteration*
      if (hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
          currentDayForResource++;
          hoursUsedOnCurrentDay = 0; // Reset for next potential day
      }

    } // End while (requirements left for this resource)
    console.log(`Finished processing Resource ${resourceId}.`);
  } // End for (each resource)

  console.log("--- Finished Daily Segment Creation ---", dailySegments.length, "segments created.");
  if (dailySegments.length === 0) return [];

  // --- Step 2: Consolidate Consecutive Segments ---
  console.log("--- Starting Consolidation (v8.1 logic) ---");
  const consolidatedSegments: ScheduledTaskSegment[] = [];
  dailySegments.sort((a, b) => {
    if (a.resource_id !== b.resource_id) return a.resource_id - b.resource_id;
    const idA = String(a.originalRequirementId); const idB = String(b.originalRequirementId);
    if (idA !== idB) return idA.localeCompare(idB);
    return a.start_day - b.start_day;
  });

  let currentConsolidated: ScheduledTaskSegment | null = null;
  for (const segment of dailySegments) {
    // Restore the actual conditions for merging segments
    if (
      currentConsolidated &&
      segment.originalRequirementId === currentConsolidated.originalRequirementId &&
      segment.resource_id === currentConsolidated.resource_id &&
      segment.start_day === (currentConsolidated.start_day + currentConsolidated.duration_days) && // Check for immediate next calendar day
      !isDayWeekend(segment.start_day, workOnSaturday, workOnSunday) // Ensure the next day is a working day
    ) {
      // Restore the actual merge logic
      currentConsolidated.duration_days += segment.duration_days;
      currentConsolidated.segment_hours += segment.segment_hours;
    } else {
      // Cannot merge or first segment
      if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
      currentConsolidated = { ...segment }; // Start new block, preserves start_hour_offset
    }
  }
  if (currentConsolidated) consolidatedSegments.push(currentConsolidated); // Push last block
  console.log("--- Consolidation Finished ---", consolidatedSegments.length, "consolidated segments.");

  return consolidatedSegments;
};