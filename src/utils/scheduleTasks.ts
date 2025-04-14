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
  console.log("--- Starting Scheduling (v8.1: Corrected Consolidation Condition) ---");
  const dailySegments: ScheduledTaskSegment[] = [];
  const resourceNextAvailable: { [resourceId: number]: { day: number; hoursUsed: number } } = {};

  // Group requirements by resource and add remaining_hours tracker
  const reqsByResource = rawRequirements.reduce((acc, req) => {
    const key = req.resource_id ?? -1;
    if (key === -1) { console.warn(`Req ${req.requirement_id} lacks resource_id, skipping.`); return acc; }
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...req, remaining_hours: req.training_hours, requirement_id: req.requirement_id ?? `fallback-${key}-${acc[key].length}` });
    return acc;
  }, {} as { [resourceId: number]: (TrainingRequirement & { remaining_hours: number })[] });

  // --- Step 1: Create Daily Segments ---
  for (const resourceIdStr in reqsByResource) {
    const resourceId = parseInt(resourceIdStr, 10);
    if (isNaN(resourceId) || resourceId < 0) continue;

    const resourceReqs = reqsByResource[resourceId];
    let currentReqIndex = 0;
    let segmentCounter = 0;

    // Initialize tracker if needed
    if (!resourceNextAvailable[resourceId]) {
      const initialWorkDay = findNextWorkingDay(2, workOnSaturday, workOnSunday);
      resourceNextAvailable[resourceId] = { day: initialWorkDay, hoursUsed: 0 };
    }

    // Loop through requirements for this resource
    while (currentReqIndex < resourceReqs.length) {
      let currentDayForResource = resourceNextAvailable[resourceId].day;
      let hoursUsedOnCurrentDay = resourceNextAvailable[resourceId].hoursUsed;

      // Ensure current day is valid and not full
      currentDayForResource = findNextWorkingDay(currentDayForResource, workOnSaturday, workOnSunday);
      if (resourceNextAvailable[resourceId].day !== currentDayForResource) {
          hoursUsedOnCurrentDay = 0; // Reset if day changed due to weekend skip
      }

      if (hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
        currentDayForResource = findNextWorkingDay(currentDayForResource + 1, workOnSaturday, workOnSunday);
        hoursUsedOnCurrentDay = 0;
        resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: 0 };
        continue; // Re-evaluate this new day
      }

      const currentReq = resourceReqs[currentReqIndex];

      // Check if current requirement needs scheduling
      if (currentReq.remaining_hours <= 0) {
        currentReqIndex++;
        continue; // Move to next requirement
      }

      // Calculate hours for this segment
      const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursUsedOnCurrentDay;
      const hoursForThisSegment = Math.min(currentReq.remaining_hours, hoursAvailableToday);

      if (hoursForThisSegment <= 0) {
          // Day is full, break inner logic and let outer loop advance day
          break; // Should be handled by the check at the start, but safety first
      }

      const startHourOffset = hoursUsedOnCurrentDay;

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
        duration_days: 1,
        start_hour_offset: startHourOffset,
      });

      // Update state
      currentReq.remaining_hours -= hoursForThisSegment;
      hoursUsedOnCurrentDay += hoursForThisSegment;
      segmentCounter++;
      resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: hoursUsedOnCurrentDay }; // Update tracker

      // If requirement finished, move to next one immediately (within the same day if possible)
      if (currentReq.remaining_hours <= 0) {
        currentReqIndex++;
      }

      // If the day is now full, advance the day for the next loop iteration
      if (hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
          currentDayForResource++;
          hoursUsedOnCurrentDay = 0; // Reset for potential next day
      }

    } // End while (requirements left)
  } // End for (each resource)


  // --- Step 2: Consolidate Consecutive Segments ---
  console.log("--- Starting Consolidation (v8.1: Corrected Condition) ---");
  const consolidatedSegments: ScheduledTaskSegment[] = [];
  dailySegments.sort((a, b) => {
    if (a.resource_id !== b.resource_id) return a.resource_id - b.resource_id;
    const idA = String(a.originalRequirementId); const idB = String(b.originalRequirementId);
    if (idA !== idB) return idA.localeCompare(idB);
    return a.start_day - b.start_day;
  });

  let currentConsolidated: ScheduledTaskSegment | null = null;
  for (const segment of dailySegments) {
    // --- RESTORED CONSOLIDATION CHECK ---
    if (
      currentConsolidated &&
      segment.originalRequirementId === currentConsolidated.originalRequirementId &&
      segment.resource_id === currentConsolidated.resource_id &&
      segment.start_day === (currentConsolidated.start_day + currentConsolidated.duration_days) && // Check for immediate next calendar day
      !isDayWeekend(segment.start_day, workOnSaturday, workOnSunday) // Ensure the next day is a working day
    ) {
      // --- RESTORED MERGE LOGIC ---
      currentConsolidated.duration_days += segment.duration_days; // Add logical duration (1)
      currentConsolidated.segment_hours += segment.segment_hours; // Sum the hours
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