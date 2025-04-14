
import { TrainingRequirement } from '@/hooks/useTrainingRequirements';
import { ScheduledTaskSegment } from './types';

// Constants
const DAILY_HOUR_LIMIT = 8; // Maximum hours per day

/**
 * Schedule training tasks based on requirements and weekend settings
 * 
 * @param requirements - Raw training requirements data
 * @param workOnSaturday - Whether work is allowed on Saturdays
 * @param workOnSunday - Whether work is allowed on Sundays
 * @returns Array of scheduled task segments
 */
export function scheduleTrainingTasks(
  requirements: TrainingRequirement[],
  workOnSaturday: boolean,
  workOnSunday: boolean
): ScheduledTaskSegment[] {
  if (requirements.length === 0) return [];
  
  // Create a map to organize requirements by resource
  const resourceRequirements: Record<number, TrainingRequirement[]> = {};
  
  // Group requirements by resource
  requirements.forEach(req => {
    if (!req.resource_id) return;
    
    if (!resourceRequirements[req.resource_id]) {
      resourceRequirements[req.resource_id] = [];
    }
    resourceRequirements[req.resource_id].push(req);
  });
  
  const scheduledSegments: ScheduledTaskSegment[] = [];
  let segmentIdCounter = 0;
  
  // Schedule tasks for each resource
  Object.entries(resourceRequirements).forEach(([resourceIdStr, reqs]) => {
    const resourceId = parseInt(resourceIdStr, 10);
    let currentDay = 1; // Start from day 1
    let hourOffset = 0; // Hours offset within current day
    
    reqs.forEach(req => {
      let remainingHours = req.training_hours;
      
      while (remainingHours > 0) {
        // Skip weekends based on configuration
        if (!workOnSaturday && isWeekendDay(currentDay, 6)) {
          currentDay++;
          hourOffset = 0;
          continue;
        }
        if (!workOnSunday && isWeekendDay(currentDay, 0)) {
          currentDay++;
          hourOffset = 0;
          continue;
        }
        
        // Calculate how many hours can be allocated in the current day
        const availableHours = DAILY_HOUR_LIMIT - hourOffset;
        const hoursToAllocate = Math.min(availableHours, remainingHours);
        
        // Create a segment
        scheduledSegments.push({
          id: `segment-${segmentIdCounter++}`,
          originalRequirementId: req.id || req.requirement_id || `req-${resourceId}-${req.machine_name}`,
          resource_id: resourceId,
          resource_name: req.resource_name,
          machine_name: req.machine_name,
          total_training_hours: req.training_hours,
          segment_hours: hoursToAllocate,
          start_day: currentDay,
          duration_days: 1, // Each segment is within a single day
          start_hour_offset: hourOffset
        });
        
        // Update remaining hours and current position
        remainingHours -= hoursToAllocate;
        hourOffset += hoursToAllocate;
        
        // Move to next day if current day is full
        if (hourOffset >= DAILY_HOUR_LIMIT) {
          currentDay++;
          hourOffset = 0;
        }
      }
    });
  });
  
  return scheduledSegments;
}

/**
 * Determine if a given day is a specific day of the week
 * 
 * @param dayNumber - The day number (1-based)
 * @param weekdayToCheck - The weekday to check (0 = Sunday, 6 = Saturday)
 * @returns True if the day is the specified weekday
 */
function isWeekendDay(dayNumber: number, weekdayToCheck: number): boolean {
  // Convert 1-based day number to 0-based for modulo arithmetic
  const zeroBased = dayNumber - 1;
  
  // Day of week is calculated with modulo 7
  // Adding 1 because we're assuming day 1 is a Monday
  // So (day + 1) % 7 will give: 1->2 (Tue), 2->3 (Wed), ... 5->6 (Sat), 6->0 (Sun)
  const dayOfWeek = (zeroBased + 1) % 7;
  
  return dayOfWeek === weekdayToCheck;
}
