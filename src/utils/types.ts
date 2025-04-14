
// src/utils/types.ts

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
