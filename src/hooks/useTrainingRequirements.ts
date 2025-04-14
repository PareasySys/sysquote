
// src/hooks/useTrainingRequirements.ts

import { useState, useEffect, useCallback } from 'react';
// --- Adjust these import paths based on your project structure ---
import { fetchPlanningDetails } from '@/services/planningDetailsService';
// Ensure scheduleTasks.ts is in the correct location (e.g., src/utils/)
import { scheduleTrainingTasks } from '@/utils/scheduleTasks';
// Use the local types file we just created
import { ScheduledTaskSegment } from '@/utils/types';

// --- Define or Import Core Data Types ---

// Interface for the raw data fetched from the backend
// Ensure this matches the actual structure returned by fetchPlanningDetails
// after the mapping in that service function.
export interface TrainingRequirement {
  id?: string; // From planning_details ID
  requirement_id?: number | string; // Add this if needed, maybe derived from id
  quote_id: string;
  plan_id: number;
  resource_id: number; // Made non-nullable based on service logic? Check service
  resource_name: string; // Ensured by service mapping
  machine_name: string; // Derived as type_name in service
  training_hours: number; // Mapped from allocated_hours
  // Remove start_day and duration_days - these are calculated by the scheduler
}

/**
 * Custom hook to fetch raw training requirements and schedule them
 * based on daily hour limits and weekend settings.
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
    if (!quoteId || !planId) {
      console.log("useTrainingRequirements: quoteId or planId missing, clearing state.");
      setRawRequirements([]);
      setScheduledTasks([]);
      setError(null);
      setLoading(false);
      return;
    }

    console.log(`useTrainingRequirements: Fetching requirements for quote: ${quoteId}, plan: ${planId}`);
    setLoading(true);
    setError(null);

    try {
      // fetchPlanningDetails now returns data closer to TrainingRequirement structure
      const details = await fetchPlanningDetails(quoteId, planId);
      console.log(`useTrainingRequirements: Fetched ${details.length} raw planning details.`);

      // The data is already mapped in the service function
      setRawRequirements(details);
      // Don't set scheduledTasks here; let the scheduling effect handle it.
    } catch (err: any) {
      console.error("useTrainingRequirements: Error fetching planning details:", err);
      const errorMessage = err.message || "Failed to fetch training requirements.";
      setError(errorMessage);
      setRawRequirements([]);
      setScheduledTasks([]);
    } finally {
      // Loading is managed by the scheduling effect now
      // setLoading(false); // Removed
    }
  }, [quoteId, planId]);

  // --- Effect 1: Fetch Raw Data ---
  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  // --- Effect 2: Schedule Tasks ---
  useEffect(() => {
    if (rawRequirements.length > 0) {
      console.log(`useTrainingRequirements: Scheduling ${rawRequirements.length} requirements... Sat: ${workOnSaturday}, Sun: ${workOnSunday}`);
      setLoading(true); // Indicate scheduling is in progress
      setError(null);

      try {
        // Call the actual scheduling function
        const scheduled = scheduleTrainingTasks(
          rawRequirements,
          workOnSaturday,
          workOnSunday
        );
        console.log(`useTrainingRequirements: Scheduling complete, generated ${scheduled.length} segments.`);
        console.log('useTrainingRequirements: Final Scheduled Output:', JSON.stringify(scheduled, null, 2));
        setScheduledTasks(scheduled);
      } catch (err: any) {
        console.error("useTrainingRequirements: Error during task scheduling:", err);
        const scheduleErrorMessage = err.message || "An error occurred during task scheduling.";
        setError(scheduleErrorMessage);
        setScheduledTasks([]);
      } finally {
        setLoading(false); // Scheduling process finished (success or fail)
      }
    } else {
      // If no raw requirements, clear scheduled tasks unless loading is already active
      if (!loading) {
        setScheduledTasks([]);
      }
    }
    // Dependency array includes rawRequirements and weekend settings
  }, [rawRequirements, workOnSaturday, workOnSunday, loading]); // Added `loading` here to prevent clearing scheduledTasks while fetch is running

  // --- Return Values ---
  return {
    scheduledTasks, // Use this in ResourceTrainingGantt
    loading,
    error,
    fetchRequirements // Expose retry function
  };
}
