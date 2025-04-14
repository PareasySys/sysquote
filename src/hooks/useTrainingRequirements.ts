// hooks/useTrainingRequirements.ts

import { useState, useEffect, useCallback } from 'react';
// --- Adjust these import paths based on your project structure ---
import { fetchPlanningDetails } from '@/services/planningDetailsService';
import { scheduleTrainingTasks } from '@/utils/scheduleTasks'; // Import the scheduling function
import { ScheduledTaskSegment } from '@/utils/types'; // Import the type for scheduled segments

// --- Define or Import Core Data Types ---

// Interface for the raw data fetched from the backend
// Remove start_day and duration_days if they aren't part of the raw fetch response
export interface TrainingRequirement {
  requirement_id: number | string; // Use appropriate type (number or string)
  resource_id: number;
  resource_name: string;
  machine_name: string;
  training_hours: number;
  // These fields are calculated by the scheduler, not fetched:
  // start_day?: number;
  // duration_days?: number;
}

/*
// Alternative: If ScheduledTaskSegment is not defined elsewhere, define it here:
export interface ScheduledTaskSegment {
  id: string; // Unique ID for this specific segment (e.g., "req123-seg0")
  originalRequirementId: number | string; // ID of the source requirement
  resource_id: number;
  resource_name: string;
  machine_name: string;
  total_training_hours: number; // Total hours for the original requirement
  segment_hours: number; // Hours allocated to this specific segment
  start_day: number; // Calculated start day for this segment
  duration_days: number; // Calculated duration for this segment (can be 1 or more after consolidation)
  // Add any other original fields you might need for display
}
*/


/**
 * Custom hook to fetch raw training requirements and schedule them
 * based on daily hour limits and weekend settings.
 *
 * @param quoteId - The identifier for the quote.
 * @param planId - The identifier for the specific plan within the quote.
 * @param workOnSaturday - Boolean indicating if work can be scheduled on Saturdays.
 * @param workOnSunday - Boolean indicating if work can be scheduled on Sundays.
 * @returns An object containing the scheduled tasks, loading state, error state,
 *          and a function to refetch the data.
 */
export function useTrainingRequirements(
  quoteId: string | undefined,
  planId: number | null,
  workOnSaturday: boolean,
  workOnSunday: boolean
) {
  // State for the raw, unscheduled requirements fetched from the API
  const [rawRequirements, setRawRequirements] = useState<TrainingRequirement[]>([]);
  // State for the tasks after processing by the scheduling logic
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTaskSegment[]>([]);
  // Combined loading state (covers both fetching and scheduling)
  const [loading, setLoading] = useState<boolean>(false);
  // State to hold any error messages during fetching or scheduling
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the raw training requirements from the backend.
   */
  const fetchRequirements = useCallback(async () => {
    // Do nothing if required IDs are missing
    if (!quoteId || !planId) {
      setRawRequirements([]);
      setScheduledTasks([]); // Clear any existing scheduled tasks
      setError(null); // Clear errors
      setLoading(false); // Ensure loading is off
      return;
    }

    console.log(`Fetching requirements for quote: ${quoteId}, plan: ${planId}`);
    setLoading(true);
    setError(null); // Clear previous errors before fetching

    try {
      // Assume fetchPlanningDetails returns an array matching TrainingRequirement[]
      const details: TrainingRequirement[] = await fetchPlanningDetails(quoteId, planId);
      console.log(`Fetched ${details.length} raw requirements.`);
      setRawRequirements(details);
      // Don't set scheduledTasks here, let the scheduling effect handle it
    } catch (err: any) {
      console.error("Error fetching planning details:", err);
      const errorMessage = err.message || "Failed to fetch training requirements.";
      setError(errorMessage);
      setRawRequirements([]); // Clear raw data on fetch error
      setScheduledTasks([]); // Clear scheduled data on fetch error
    } finally {
      // Loading state will be fully turned off after scheduling completes (or fails)
      // setLoading(false); // Removed: Let the scheduling effect manage the final loading state
    }
  }, [quoteId, planId]); // Dependencies for the fetch callback itself

  // --- Effect 1: Fetch Raw Data ---
  // Runs when the component mounts or when quoteId/planId changes (via fetchRequirements dependency)
  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]); // fetchRequirements is stable due to useCallback

  // --- Effect 2: Schedule Tasks ---
  // Runs whenever the raw data is updated or the weekend work rules change.
  useEffect(() => {
    // Only run scheduling if we have raw data and are not currently fetching
    if (rawRequirements.length > 0) {
      console.log(`Scheduling ${rawRequirements.length} requirements... Sat: ${workOnSaturday}, Sun: ${workOnSunday}`);
      setLoading(true); // Indicate scheduling is in progress
      setError(null); // Clear previous scheduling errors

      // Use a try...catch block for the scheduling logic itself
      try {
        // Call the scheduling function
        const scheduled = scheduleTrainingTasks(
          rawRequirements,
          workOnSaturday,
          workOnSunday
        );
        console.log(`Scheduling complete, generated ${scheduled.length} segments.`);
        setScheduledTasks(scheduled);
      } catch (err: any) {
        console.error("Error during task scheduling:", err);
        const scheduleErrorMessage = err.message || "An error occurred during task scheduling.";
        setError(scheduleErrorMessage);
        setScheduledTasks([]); // Clear scheduled tasks on scheduling error
      } finally {
        setLoading(false); // Scheduling process finished (success or fail)
      }
    } else {
      // If there are no raw requirements, ensure scheduled tasks are also empty
      // and loading is false (unless a fetch is in progress, handled by fetchRequirements)
       if (!loading) { // Avoid race condition if fetch is still running
          setScheduledTasks([]);
       }
       // Keep error state as is, it might be from the fetch failing
       // setLoading(false) // Loading state is managed above
    }
  }, [rawRequirements, workOnSaturday, workOnSunday]); // Dependencies for scheduling

  // --- Return Values ---
  // Expose the scheduled tasks, loading/error state, and the refetch function
  return {
    scheduledTasks, // The processed, scheduled segments for the Gantt chart
    loading,        // True if fetching OR scheduling is in progress
    error,          // Any error message from fetching or scheduling
    fetchRequirements // Function to manually trigger a refetch
    // requirements: rawRequirements, // Optionally expose raw data if needed elsewhere
  };
}