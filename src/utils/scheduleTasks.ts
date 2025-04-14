// Create a new file (e.g., utils/scheduleTasks.ts) or add within useTrainingRequirements.ts

import { TrainingRequirement } from "@/hooks/useTrainingRequirements"; // Adjust import path
import { ScheduledTaskSegment } from "./types"; // Assuming you created a types file

const DAILY_HOUR_LIMIT = 8;

// Helper to check if a day is a weekend based on global day number
// Assumes Day 1 is Monday (index 0). Adjust if your calendar starts differently.
const isWeekend = (
  dayNumber: number,
  workOnSaturday: boolean,
  workOnSunday: boolean
): boolean => {
  const dayOfWeek = (dayNumber - 1) % 7; // 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun
  if (!workOnSaturday && dayOfWeek === 5) {
    return true;
  }
  if (!workOnSunday && dayOfWeek === 6) {
    return true;
  }
  return false;
};

export const scheduleTrainingTasks = (
  rawRequirements: TrainingRequirement[],
  workOnSaturday: boolean,
  workOnSunday: boolean
): ScheduledTaskSegment[] => {
  const scheduledSegments: ScheduledTaskSegment[] = [];
  const resourceSchedule: { [resourceId: number]: { currentDay: number; hoursDoneToday: number } } = {};

  // Group requirements by resource
  const reqsByResource = rawRequirements.reduce((acc, req) => {
    if (!acc[req.resource_id]) {
      acc[req.resource_id] = [];
    }
    acc[req.resource_id].push(req);
    // Optional: Sort requirements within each resource group if needed (e.g., by name)
    // acc[req.resource_id].sort((a, b) => a.machine_name.localeCompare(b.machine_name));
    return acc;
  }, {} as { [resourceId: number]: TrainingRequirement[] });

  // Schedule for each resource independently
  for (const resourceIdStr in reqsByResource) {
    const resourceId = parseInt(resourceIdStr, 10);
    const resourceReqs = reqsByResource[resourceId];

    // Initialize resource's schedule tracker
    if (!resourceSchedule[resourceId]) {
        resourceSchedule[resourceId] = { currentDay: 1, hoursDoneToday: 0 };
    }
    let { currentDay, hoursDoneToday } = resourceSchedule[resourceId];

    for (const req of resourceReqs) {
      let remainingHoursForTask = req.training_hours;
      let segmentIndex = 0;

      while (remainingHoursForTask > 0) {
        // --- Find the next available working slot ---
        let movedToNextDay = false;
        while (isWeekend(currentDay, workOnSaturday, workOnSunday) || hoursDoneToday >= DAILY_HOUR_LIMIT) {
          currentDay++;
          hoursDoneToday = 0;
          movedToNextDay = true;
          // Skip subsequent weekends if we landed on one
          while (isWeekend(currentDay, workOnSaturday, workOnSunday)) {
            currentDay++;
          }
        }

        // --- Determine segment details ---
        const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursDoneToday;
        const hoursToDoThisSegment = Math.min(remainingHoursForTask, hoursAvailableToday);

        // Segments are currently per-day allocation. We group consecutive days later.
        // For now, let's just store the daily work.
         scheduledSegments.push({
           id: `${req.requirement_id}-seg${segmentIndex}`,
           originalRequirementId: req.requirement_id,
           resource_id: req.resource_id,
           resource_name: req.resource_name,
           machine_name: req.machine_name,
           total_training_hours: req.training_hours, // Store original total
           segment_hours: hoursToDoThisSegment,
           start_day: currentDay, // This is the day the work happens
           duration_days: 1, // Initially, each segment is one day
           // segment_index: segmentIndex // Keep track if needed later
         });


        // --- Update state ---
        remainingHoursForTask -= hoursToDoThisSegment;
        hoursDoneToday += hoursToDoThisSegment;
        segmentIndex++; // Increment for next potential segment of *this task*
      }
    }
    // Update the resource's schedule state for the next resource (if any)
    // Not strictly needed here as resources schedule independently based on this logic
     resourceSchedule[resourceId] = { currentDay, hoursDoneToday };
  }


  // --- Consolidate consecutive segments ---
  const consolidatedSegments: ScheduledTaskSegment[] = [];
  if (scheduledSegments.length === 0) return [];

  // Sort primarily by resource, then original requirement, then start day
  scheduledSegments.sort((a, b) => {
      if (a.resource_id !== b.resource_id) return a.resource_id - b.resource_id;
      if (a.originalRequirementId !== b.originalRequirementId) {
          // Handle potential string/number comparison issues if IDs are mixed
          const idA = String(a.originalRequirementId);
          const idB = String(b.originalRequirementId);
          return idA.localeCompare(idB);
      }
      return a.start_day - b.start_day;
  });


  let currentConsolidated: ScheduledTaskSegment | null = null;

  for (const segment of scheduledSegments) {
      if (currentConsolidated &&
          segment.originalRequirementId === currentConsolidated.originalRequirementId &&
          segment.start_day === currentConsolidated.start_day + currentConsolidated.duration_days &&
          !isWeekend(segment.start_day, workOnSaturday, workOnSunday) // Ensure we don't merge across a weekend gap
          )
      {
          // This segment continues the previous one
          currentConsolidated.duration_days += segment.duration_days; // Add duration (which is 1)
          currentConsolidated.segment_hours += segment.segment_hours;
      } else {
          // Start a new consolidated segment
          if (currentConsolidated) {
              consolidatedSegments.push(currentConsolidated);
          }
           // Create a new object, don't modify the original segment from the loop
           currentConsolidated = { ...segment };
           // Ensure duration is at least 1 even if segment_hours is small
           currentConsolidated.duration_days = Math.max(1, currentConsolidated.duration_days);
      }
  }
   // Add the last consolidated segment
   if (currentConsolidated) {
       consolidatedSegments.push(currentConsolidated);
   }


  return consolidatedSegments;
};
