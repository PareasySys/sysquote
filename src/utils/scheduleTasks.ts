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
  if (dayNumber <= 0) return false; // Guard against invalid day numbers
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
    // Keep incrementing the day until it's not a weekend we should skip
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
  console.log("--- Starting Scheduling (v2: Task Start Day >= 2) ---");
  const dailySegments: ScheduledTaskSegment[] = []; // Store segments per day initially
  // Tracks the next available start day and hours used on that day for each resource
  const resourceNextAvailable: { [resourceId: number]: { day: number; hoursUsed: number } } = {};

  // Group requirements by resource (same as before)
  const reqsByResource = rawRequirements.reduce((acc, req) => {
    const key = req.resource_id; // Use non-nullable resource_id
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(req);
    return acc;
  }, {} as { [resourceId: number]: TrainingRequirement[] });


  // Schedule for each resource independently
  for (const resourceIdStr in reqsByResource) {
    const resourceId = parseInt(resourceIdStr, 10);
    const resourceReqs = reqsByResource[resourceId];

    // --- MODIFICATION: Initialize resource's schedule tracker ---
    // Earliest TRAVEL day is Day 1.
    // Earliest WORK day is the first working day ON or AFTER Day 2.
    const initialWorkDay = findNextWorkingDay(2, workOnSaturday, workOnSunday);
    if (!resourceNextAvailable[resourceId]) {
        // Initialize the resource's starting day to the first valid work day (Day 2 or later)
        resourceNextAvailable[resourceId] = { day: initialWorkDay, hoursUsed: 0 };
        console.log(`Resource ${resourceId}: Initializing work schedule to start on Day ${initialWorkDay}`);
    }
    // --- END MODIFICATION ---

    // Get the current scheduling day and hours used for this resource from the tracker
    let currentDay = resourceNextAvailable[resourceId].day;
    let hoursUsedToday = resourceNextAvailable[resourceId].hoursUsed;

    // Process each requirement for the current resource
    for (const req of resourceReqs) {
      console.log(` Processing Req ID: ${req.requirement_id}, Res: ${resourceId}, Machine: ${req.machine_name}, Hours: ${req.training_hours}`);
      let hoursRemaining = req.training_hours;
      let segmentIndex = 0;

      // Schedule segments until all hours for this requirement are allocated
      while (hoursRemaining > 0) {

        // Find the next *actual* working day, starting from the current potential day
        // This skips weekends encountered *during* the scheduling process
        let potentialWorkDay = findNextWorkingDay(currentDay, workOnSaturday, workOnSunday);

        // If the potential day moved us forward, reset hours used today
        // We compare potentialWorkDay with the day recorded in the resource tracker
        if (potentialWorkDay > resourceNextAvailable[resourceId].day) {
            hoursUsedToday = 0;
        } else {
            // Still on the same day as the resource's last recorded activity
            hoursUsedToday = resourceNextAvailable[resourceId].hoursUsed;
        }
        currentDay = potentialWorkDay; // Update currentDay to the valid working day


        // If the current working day is already full, advance to the next working day
        if (hoursUsedToday >= DAILY_HOUR_LIMIT) {
          console.log(`  Day ${currentDay} full for Resource ${resourceId}. Moving to next day.`);
          currentDay++; // Try the next calendar day
          currentDay = findNextWorkingDay(currentDay, workOnSaturday, workOnSunday); // Find the next actual working day
          hoursUsedToday = 0; // Reset hours for this new day
          // Update the resource tracker since we're advancing its schedule
          resourceNextAvailable[resourceId] = { day: currentDay, hoursUsed: 0 };
          continue; // Re-evaluate the new day in the next loop iteration
        }

        // Calculate how many hours can be worked on this segment today
        const hoursAvailableToday = DAILY_HOUR_LIMIT - hoursUsedToday;
        const hoursForThisSegment = Math.min(hoursRemaining, hoursAvailableToday);

        // Safety check to prevent infinite loops if calculation is somehow wrong
        if (hoursForThisSegment <= 0) {
           console.error(" Calculated zero/negative hours for segment. Breaking loop.", { req, currentDay, hoursUsedToday, hoursRemaining });
           break;
        }

        console.log(`  Segment ${segmentIndex}: Day ${currentDay}, Hours ${hoursForThisSegment}. Resource ${resourceId} used ${hoursUsedToday}/${DAILY_HOUR_LIMIT} today.`);

        // Create the segment for this day's work
        dailySegments.push({
          id: `${req.requirement_id}-seg${segmentIndex}`,
          originalRequirementId: req.requirement_id || `req-${resourceId}-${segmentIndex}`, // Fallback ID
          resource_id: req.resource_id,
          resource_name: req.resource_name,
          machine_name: req.machine_name,
          total_training_hours: req.training_hours,
          segment_hours: hoursForThisSegment,
          start_day: currentDay, // The day work is performed
          duration_days: 1, // Represents one day's work
        });

        // Update remaining hours and hours used today
        hoursRemaining -= hoursForThisSegment;
        hoursUsedToday += hoursForThisSegment;
        segmentIndex++;

        // Update the resource's tracker with the current day and total hours used on it
        resourceNextAvailable[resourceId] = { day: currentDay, hoursUsed: hoursUsedToday };

        // If the day became full after adding this segment, advance currentDay
        // This prepares `currentDay` for the *next segment* of this *same task* (if hoursRemaining > 0)
        // or for the *next task* for this resource.
        if (hoursUsedToday >= DAILY_HOUR_LIMIT) {
            currentDay++;
            // No need to reset hoursUsedToday here, it will be reset based on tracker at the start of the next loop/task
        }

      } // End while (hoursRemaining > 0)
      console.log(` Finished processing Req ID: ${req.requirement_id}`);
    } // End for (const req of resourceReqs)
  } // End for (const resourceIdStr in reqsByResource)

  console.log("--- Finished Daily Segment Creation ---", dailySegments.length, "segments created.");
  if (dailySegments.length === 0) return [];

  // --- Step 2: Consolidate Consecutive Segments ---
  console.log("--- Starting Consolidation ---");
  const consolidatedSegments: ScheduledTaskSegment[] = [];
  // Sort segments to ensure correct consolidation order: Resource -> Original Task -> Start Day
  dailySegments.sort((a, b) => {
    if (a.resource_id !== b.resource_id) return a.resource_id - b.resource_id;
    const idA = String(a.originalRequirementId); // Consistent comparison
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
      // Check if it starts *exactly* on the next working day after the current consolidated block ends
      findNextWorkingDay(currentConsolidated.start_day + currentConsolidated.duration_days, workOnSaturday, workOnSunday) === segment.start_day
    ) {
      // Merge: Extend duration based on days spanned and add hours
      currentConsolidated.duration_days = (segment.start_day + segment.duration_days) - currentConsolidated.start_day;
      currentConsolidated.segment_hours += segment.segment_hours;
      console.log(`  Merged segment ${segment.id}. New Duration: ${currentConsolidated.duration_days}, Total Hours: ${currentConsolidated.segment_hours}`);
    } else {
      // Cannot merge, push the previous consolidated segment (if any)
      if (currentConsolidated) {
         console.log(`  Pushing consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
         consolidatedSegments.push(currentConsolidated);
      }
      // Start a new consolidated segment (create a copy)
      currentConsolidated = { ...segment }; // Duration is initially 1 from daily segment
       console.log(`  Starting new consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
    }
  }

  // Push the very last consolidated segment
  if (currentConsolidated) {
    console.log(`  Pushing final consolidated: ID ${currentConsolidated.id}, Start ${currentConsolidated.start_day}, Dur ${currentConsolidated.duration_days}`);
    consolidatedSegments.push(currentConsolidated);
  }

  console.log("--- Scheduling Finished ---", consolidatedSegments.length, "consolidated segments.");
  return consolidatedSegments;
};