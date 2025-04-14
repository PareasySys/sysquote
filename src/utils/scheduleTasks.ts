// src/utils/scheduleTasks.ts

import { TrainingRequirement } from "@/hooks/useTrainingRequirements"; // Adjust import path if needed

// --- Define/Update ScheduledTaskSegment Interface ---
// Ensure this definition (or an imported one) includes start_hour_offset
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
  console.log("--- Starting Scheduling (v8: Start Hour Offset) ---");
  const dailySegments: ScheduledTaskSegment[] = [];
  // Tracks the next available day and hours used *on that specific day* for each resource
  const resourceNextAvailable: { [resourceId: number]: { day: number; hoursUsed: number } } = {};

  // Group requirements by resource and add remaining_hours tracker
  const reqsByResource = rawRequirements.reduce((acc, req) => {
    const key = req.resource_id ?? -1;
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
    if (isNaN(resourceId) || resourceId < 0) continue;

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

      // Ensure the current day is a working day
      let workDay = findNextWorkingDay(currentDayForResource, workOnSaturday, workOnSunday);
      if (workDay > currentDayForResource) {
        hoursUsedOnCurrentDay = 0; // Reset if skipped weekend(s)
        currentDayForResource = workDay;
      }

      // Check if the confirmed working day is already full
      if (hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
        // If full, advance to the *next* working day and reset hours
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
         console.error(" Calculated zero/negative hours when day wasn't full. Breaking.", { req: currentReq, currentDayForResource, hoursUsedOnCurrentDay });
         currentReqIndex++; // Try next requirement to prevent infinite loop
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
      segmentCounter++; // Increment segment counter for unique IDs

      // Update the persistent tracker for the resource immediately
      resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: hoursUsedOnCurrentDay };

      // If the current requirement is finished, move to the next one
      if (currentReq.remaining_hours <= 0) {
          console.log(`   Req ${currentReq.requirement_id} finished.`);
          currentReqIndex++;
      }
      // Continue the outer while loop - it will either process the next requirement
      // or advance the day if the current day became full

    } // End while (requirements left for this resource)
    console.log(`Finished processing Resource ${resourceId}.`);
  } // End for (each resource)

  console.log("--- Finished Daily Segment Creation ---", dailySegments.length, "segments created.");
  if (dailySegments.length === 0) return [];

  // --- Step 2: Consolidate Consecutive Segments ---
  console.log("--- Starting Consolidation (v5 logic) ---");
  const consolidatedSegments: ScheduledTaskSegment[] = [];
  dailySegments.sort((a, b) => { /* ... same sort logic ... */ });
  let currentConsolidated: ScheduledTaskSegment | null = null;
  for (const segment of dailySegments) {
    if (
      currentConsolidated &&
      segment.originalRequirementId === currentConsolidated.originalRequirementId &&
      segment.resource_id === currentConsolidated.resource_id &&
      segment.start_day === (currentConsolidated.start_day + currentConsolidated.duration_days) &&
      !isDayWeekend(segment.start_day, workOnSaturday, workOnSunday)
    ) {
      // Merge: Update duration and sum hours
      currentConsolidated.duration_days += segment.duration_days;
      currentConsolidated.segment_hours += segment.segment_hours;
    } else {
      // Cannot merge or first segment
      if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
      currentConsolidated = { ...segment }; // Start new block, preserve start_hour_offset
    }
  }
  if (currentConsolidated) consolidatedSegments.push(currentConsolidated); // Push last block
  console.log("--- Consolidation Finished ---", consolidatedSegments.length, "consolidated segments.");

  return consolidatedSegments;
};