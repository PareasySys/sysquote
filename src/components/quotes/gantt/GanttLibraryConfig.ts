
/**
 * This file contains configurations for the Gantt chart library.
 * If we need to change the Gantt library in the future, modifications can be mostly 
 * contained to this file instead of the entire codebase.
 */

// Define colors for different task types
export const GANTT_COLORS = {
  MACHINE: '#3b82f6', // Blue
  SOFTWARE: '#8b5cf6', // Purple
  STANDARD_PLAN: '#10b981', // Green
  EXTENDED_PLAN: '#f59e0b', // Amber
  ADVANCED_PLAN: '#ef4444', // Red
  SHADOWING_PLAN: '#6366f1', // Indigo
};

// Get color for a specific plan
export const getPlanColor = (planId: number): string => {
  switch (planId) {
    case 1: // Standard
      return GANTT_COLORS.STANDARD_PLAN;
    case 2: // Extended
      return GANTT_COLORS.EXTENDED_PLAN;
    case 3: // Advanced
      return GANTT_COLORS.ADVANCED_PLAN;
    case 4: // Shadowing
      return GANTT_COLORS.SHADOWING_PLAN;
    default:
      return '#64748b'; // Default slate
  }
};

// Format days for display (Day 1, Day 2, etc.)
export const formatDay = (day: number): string => {
  return `Day ${day}`;
};

// Format months for display (Month 1, Month 2, etc.)
export const formatMonth = (month: number): string => {
  return `Month ${month}`;
};

// Helper for checking if a specific day is a weekend day
export const isWeekendDay = (day: number): boolean => {
  // In our 30-day month model, days 6, 7, 13, 14, 20, 21, 27, 28 are weekends
  const dayInMonth = ((day - 1) % 30) + 1;
  return [6, 7, 13, 14, 20, 21, 27, 28].includes(dayInMonth);
};

// Helper for checking if a specific day is a Saturday
export const isSaturday = (day: number): boolean => {
  const dayInMonth = ((day - 1) % 30) + 1;
  return [6, 13, 20, 27].includes(dayInMonth);
};

// Helper for checking if a specific day is a Sunday
export const isSunday = (day: number): boolean => {
  const dayInMonth = ((day - 1) % 30) + 1;
  return [7, 14, 21, 28].includes(dayInMonth);
};

// Calculate the total number of days needed based on tasks
export const calculateTotalDays = (tasks: Array<any>): number => {
  if (!tasks || tasks.length === 0) return 90; // Default 3 months (90 days)
  
  return Math.max(
    ...tasks.map(task => task.start_date + task.duration)
  );
};

// Helper to get the appropriate icon for a resource
export const getResourceIcon = (resourceType: string): string => {
  switch (resourceType.toLowerCase()) {
    case 'trainer':
      return 'user';
    case 'engineer':
      return 'wrench';
    case 'specialist':
      return 'brain';
    case 'consultant':
      return 'briefcase';
    default:
      return 'user';
  }
};
