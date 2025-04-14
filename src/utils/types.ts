
// Scheduled Task Segment interface to represent training plan segments
export interface ScheduledTaskSegment {
  id: string; // Unique ID for this specific segment
  originalRequirementId: number | string; // ID of the source requirement 
  resource_id: number;
  resource_name: string;
  machine_name: string;
  total_training_hours: number; // Total hours for the original requirement
  segment_hours: number; // Hours allocated to this specific segment
  start_day: number; // Calculated start day for this segment
  duration_days: number; // Duration for this segment
  start_hour_offset: number; // Hours offset within the start day
}
