/**
 * Utils function for scheduling training tasks into daily segments
 * @file src/utils/scheduleTasks.ts
 */
import { TrainingRequirement } from '@/hooks/useTrainingRequirements';
import { ScheduledTaskSegment } from './types';

// Constants
const DAILY_HOUR_LIMIT = 8; // Maximum hours of work per day

/**
 * Schedule a set of training tasks across calendar days, respecting daily hour limits
 * and weekend settings.
 */
export function scheduleTrainingTasks(
  requirements: TrainingRequirement[],
  workOnSaturday: boolean = false,
  workOnSunday: boolean = false
): ScheduledTaskSegment[] {
  console.log(`scheduleTasks: Scheduling ${requirements.length} requirements, workOnSat=${workOnSaturday}, workOnSun=${workOnSunday}`);
  
  if (!requirements || requirements.length === 0) {
    console.log('scheduleTasks: No requirements to schedule');
    return [];
  }

  // Group by resource to avoid scheduling conflicts
  const resourceGroups = new Map<number, TrainingRequirement[]>();
  
  requirements.forEach(req => {
    if (!resourceGroups.has(req.resource_id)) {
      resourceGroups.set(req.resource_id, []);
    }
    resourceGroups.get(req.resource_id)!.push(req);
  });
  
  let allSegments: ScheduledTaskSegment[] = [];
  
  // Process each resource individually
  resourceGroups.forEach((resourceReqs, resourceId) => {
    console.log(`scheduleTasks: Processing resource ${resourceId} with ${resourceReqs.length} requirements`);
    
    let currentDay = 1; // Start on day 1
    let availableHoursToday = DAILY_HOUR_LIMIT;
    
    // Sort requirements - helps with visualization and processing
    resourceReqs.sort((a, b) => (a.machine_name || '').localeCompare(b.machine_name || ''));
    
    // Process each requirement
    resourceReqs.forEach(req => {
      let remainingHours = req.training_hours;
      const originalRequirementId = req.id || `${req.resource_id}-${req.machine_name}`;
      
      console.log(`scheduleTasks: Scheduling ${req.training_hours}h for ${req.machine_name} (Resource: ${req.resource_name}, Type: ${req.resource_category || 'Unknown'})`);
      
      // Keep track of logical start day for this requirement
      const startDay = currentDay;
      
      // Continue until all hours are allocated
      while (remainingHours > 0) {
        // Skip weekends if not working on those days
        if (isDayWeekend(currentDay, workOnSaturday, workOnSunday)) {
          currentDay++;
          availableHoursToday = DAILY_HOUR_LIMIT; // Reset hours for the new day
          continue;
        }
        
        // Determine how many hours we can schedule today
        const hoursToUseToday = Math.min(remainingHours, availableHoursToday);
        
        // Create segment for today's work
        if (hoursToUseToday > 0) {
          allSegments.push({
            id: `${originalRequirementId}-day${currentDay}-${availableHoursToday}`,
            originalRequirementId,
            resource_id: req.resource_id,
            resource_name: req.resource_name,
            machine_name: req.machine_name, // Shows both machine and software names
            resource_category: req.resource_category || 'Machine',
            segment_hours: hoursToUseToday,
            total_training_hours: req.training_hours,
            start_day: currentDay,
            duration_days: 1, // Each segment is 1 day
            start_hour_offset: DAILY_HOUR_LIMIT - availableHoursToday // Hours already used today
          });
        }
        
        // Update remaining hours and available hours
        remainingHours -= hoursToUseToday;
        availableHoursToday -= hoursToUseToday;
        
        // Move to next day if we've used all hours today
        if (availableHoursToday <= 0) {
          currentDay++;
          availableHoursToday = DAILY_HOUR_LIMIT; // Reset hours for the new day
        }
      }
    });
  });
  
  // Sort segments by day and resource
  allSegments.sort((a, b) => {
    if (a.start_day !== b.start_day) return a.start_day - b.start_day;
    if (a.resource_id !== b.resource_id) return a.resource_id - b.resource_id;
    return (a.machine_name || '').localeCompare(b.machine_name || '');
  });
  
  console.log(`scheduleTasks: Generated ${allSegments.length} scheduled segments`);
  return allSegments;
}

// Helper function to check if a day is a weekend
function isDayWeekend(
  dayNumber: number,
  workOnSaturday: boolean,
  workOnSunday: boolean
): boolean {
  // Days are 1-indexed, calculate day of week (0-6, with 0 = Sunday)
  const dayOfWeek = (dayNumber - 1) % 7;
  
  // Check if it's a weekend day we should skip
  return (dayOfWeek === 6 && !workOnSaturday) || // Saturday (6)
         (dayOfWeek === 0 && !workOnSunday);    // Sunday (0)
}
