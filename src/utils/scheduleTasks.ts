// src/utils/scheduleTasks.ts

// Adjust import paths as needed
import { TrainingRequirement } from "@/hooks/useTrainingRequirements";
import { ScheduledTaskSegment } from "./types"; // Assuming types.ts exists here

const DAILY_HOUR_LIMIT = 8;

// Helper: Checks if a specific day number is a weekend based on settings
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

// Helper: Finds the next day number that is a working day
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
  console.log("--- Starting Scheduling (v6: Fill Day Logic) ---");
  const dailySegments: ScheduledTaskSegment[] = [];
  const resourceNextAvailable: { [resourceId: number]: { day: number; hoursUsed: number } } = {};

  const reqsByResource = rawRequirements.reduce((acc, req) => {
    const key = req.resource_id ?? -1; // Use resource_id, handle null/undefined
    if (key === -1) {
      console.warn(`Requirement ${req.requirement_id} lacks resource_id, skipping.`);
      return acc;
    }
    if (!acc[key]) acc[key] = [];
    // Ensure requirement has an ID, provide a fallback if necessary
    acc[key].push({ ...req, requirement_id: req.requirement_id ?? `fallback-${key}-${acc[key].length}` });
    return acc;
  }, {} as { [resourceId: number]: TrainingRequirement[] });


  for (const resourceIdStr in reqsByResource) {
    const resourceId = parseInt(resourceIdStr, 10);
    if (isNaN(resourceId) || resourceId < 0) continue;

    const resourceReqs = reqsByResource[resourceId];

    // Initialize tracker if not present: Earliest WORK day is Day 2 or later
    if (!resourceNextAvailable[resourceId]) {
      const initialWorkDay = findNextWorkingDay(2, workOnSaturday, workOnSunday);
      resourceNextAvailable[resourceId] = { day: initialWorkDay, hoursUsed: 0 };
      console.log(`Resource ${resourceId}: Initializing to start Day ${initialWorkDay}`);
    }

    // Use the tracker's state for the *start* of this resource's overall work
    let currentDayForResource = resourceNextAvailable[resourceId].day;
    let hoursUsedOnCurrentDay = resourceNextAvailable[resourceId].hoursUsed;

    // Process all requirements for this resource
    for (const req of resourceReqs) {
      console.log(` Processing Req ID: ${req.requirement_id}, Res: ${resourceId}, Machine: ${req.machine_name}, Hrs Needed: ${req.training_hours}`);
      let hoursRemaining = req.training_hours;
      let segmentIndex = 0;

      // Keep scheduling segments for *this requirement* until its hours are done
      while (hoursRemaining > 0) {

        // 1. Find the next available *working* day starting from currentDayForResource
        currentDayForResource = findNextWorkingDay(currentDayForResource, workOnSaturday, workOnSunday);

        // 2. Check if the day is full based on hours already used
        if (hoursUsedOnCurrentDay >= DAILY_HOUR_LIMIT) {
          // If full, advance to the *next* working day and reset hours
          currentDayForResource = findNextWorkingDay(currentDayForResource + 1, workOnSaturday, workOnSunday);
          hoursUsedOnCurrentDay = 0;
          console.log(`  Day was full. Advanced Res ${resourceId} to next working day: ${currentDayForResource}`);
        }

        // 3. Calculate how many hours can be done *now*
        const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursUsedOnCurrentDay;
        const hoursForThisSegment = Math.min(hoursRemaining, hoursAvailableToday);

        if (hoursForThisSegment <= 0) {
           console.error(" Calculated zero/negative hours for segment. This shouldn't happen here. Breaking.", { req, currentDayForResource, hoursUsedOnCurrentDay, hoursRemaining });
           break; // Safety break
        }

        console.log(`  Segment ${segmentIndex}: Day ${currentDayForResource}, Hours ${hoursForThisSegment}. Used ${hoursUsedOnCurrentDay}/${DAILY_HOUR_LIMIT} today.`);

        // 4. Create the segment
        dailySegments.push({
          id: `${req.requirement_id}-seg${segmentIndex}`,
          originalRequirementId: req.requirement_id, // Ensure req.requirement_id is not undefined
          resource_id: req.resource_id,
          resource_name: req.resource_name,
          machine_name: req.machine_name,
          total_training_hours: req.training_hours,
          segment_hours: hoursForThisSegment,
          start_day: currentDayForResource,
          duration_days: 1, // Represents one logical day block for consolidation
        });

        // 5. Update state for the next iteration
        hoursRemaining -= hoursForThisSegment;
        hoursUsedOnCurrentDay += hoursForThisSegment; // Add hours used *on this day*
        segmentIndex++;

        // 6. IMPORTANT: Update the tracker immediately. This state persists across requirements for the resource.
        resourceNextAvailable[resourceId] = { day: currentDayForResource, hoursUsed: hoursUsedOnCurrentDay };

        // (No need to explicitly advance day here if full; the check at the start of the loop handles it)

      } // End while (hoursRemaining > 0) for this requirement
      console.log(` Finished processing Req ID: ${req.requirement_id}. Res ${resourceId} state: Day ${resourceNextAvailable[resourceId].day}, Used ${resourceNextAvailable[resourceId].hoursUsed}h.`);
    } // End for (const req of resourceReqs)
  } // End for (const resourceIdStr in reqsByResource)

  console.log("--- Finished Daily Segment Creation ---", dailySegments.length, "segments created.");
  if (dailySegments.length === 0) return [];

  // --- Step 2: Consolidate Consecutive *Working Day* Segments (v5 logic is correct here) ---
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
        segment.start_day === (currentConsolidated.start_day + currentConsolidated.duration_days) && // Check for immediate next calendar day
        !isDayWeekend(segment.start_day, workOnSaturday, workOnSunday) // Ensure it's not a weekend we skip
    ) {
      currentConsolidated.duration_days += segment.duration_days;
      currentConsolidated.segment_hours += segment.segment_hours;
      // console.log(` Merged segment ${segment.id}. New Duration: ${currentConsolidated.duration_days}`);
    } else {
      if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
      currentConsolidated = { ...segment };
      // console.log(` Starting new consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
    }
  }
  if (currentConsolidated) consolidatedSegments.push(currentConsolidated);
  console.log("--- Consolidation Finished ---", consolidatedSegments.length, "consolidated segments.");

  return consolidatedSegments;
};