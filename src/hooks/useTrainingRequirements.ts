import { useState, useEffect, useCallback } from 'react';
import { fetchPlanningDetails } from '@/services/planningDetailsService'; // Ensure this service handles its own supabase import
import { scheduleTrainingTasks } from '@/utils/scheduleTasks';
import { ScheduledTaskSegment } from '@/utils/types';
// Removed direct import of syncPlanningDetailsAfterChanges - syncs should happen on mutation, not read.

export interface TrainingRequirement {
  id?: string; // Keep existing fields
  requirement_id?: number | string;
  quote_id: string;
  plan_id: number;
  resource_id: number | null; // Allow null if resource is optional or removed
  resource_name: string | null; // Allow null
  machine_name: string | null; // Allow null (might be software)
  software_name?: string | null; // Add if needed
  training_hours: number;
  resource_category?: 'Machine' | 'Software' | null; // Allow null
}

export function useTrainingRequirements(
  quoteId: string | undefined,
  planId: number | null,
  workOnSaturday: boolean,
  workOnSunday: boolean
) {
  const [rawRequirements, setRawRequirements] = useState<TrainingRequirement[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTaskSegment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirements = useCallback(async () => {
    if (!quoteId || typeof planId !== 'number') { // Stricter check for planId
      console.log("useTrainingRequirements: Invalid quoteId or planId. Clearing state.");
      setRawRequirements([]);
      setScheduledTasks([]);
      setError(null);
      setLoading(false); // Ensure loading is false if prerequisites aren't met
      return;
    }

    console.log(`useTrainingRequirements: Fetching for quote: ${quoteId}, plan: ${planId}`);
    setLoading(true);
    setError(null); // Clear previous errors on new fetch
    setRawRequirements([]); // Clear previous data
    setScheduledTasks([]); // Clear previous schedule

    try {
      // Fetch the raw details from the service
      const details = await fetchPlanningDetails(quoteId, planId);
      console.log(`useTrainingRequirements: Fetched ${details.length} raw planning details.`);

      // Map raw details to TrainingRequirement structure, filtering out invalid ones
      const validRequirements = details
        .filter(detail => detail.resource_id && detail.allocated_hours > 0) // Ensure resource AND hours exist
        .map(detail => ({
          id: detail.id?.toString(), // Use planning_details primary key as unique ID for Gantt
          requirement_id: detail.id, // Or use a specific requirement ID if available
          quote_id: detail.quote_id,
          plan_id: detail.plan_id,
          resource_id: detail.resource_id,
          // Safely access related names (assuming fetchPlanningDetails joins them)
          resource_name: detail.resources?.name ?? `Resource ${detail.resource_id}`,
          machine_name: detail.machine_types?.name ?? null,
          software_name: detail.software_types?.name ?? null, // Add software name if available
          training_hours: detail.allocated_hours,
          resource_category: detail.resource_category ?? null, // Map category
        } as TrainingRequirement)); // Cast to type

      const machineCount = validRequirements.filter(d => d.resource_category === 'Machine').length;
      const softwareCount = validRequirements.filter(d => d.resource_category === 'Software').length;
      console.log(`useTrainingRequirements: Processing ${validRequirements.length} valid requirements (${machineCount} machine, ${softwareCount} software).`);

      setRawRequirements(validRequirements);

      // Removed the call to syncPlanningDetailsAfterChanges() here.
      // Syncing should happen in the components that *cause* changes (modals, tabs).

    } catch (err: any) {
      console.error("useTrainingRequirements: Error fetching planning details:", err);
      const errorMessage = err.message || "Failed to fetch training requirements data.";
      setError(errorMessage);
      setRawRequirements([]); // Clear data on error
      setScheduledTasks([]);
    } finally {
      setLoading(false);
    }
  }, [quoteId, planId]); // Dependencies for fetching

  // Effect to run fetchRequirements when dependencies change
  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  // Effect to schedule tasks when raw requirements or weekend settings change
  useEffect(() => {
    // Only schedule if not loading and requirements exist
    if (!loading && rawRequirements.length > 0) {
      console.log(`useTrainingRequirements: Scheduling ${rawRequirements.length} requirements. Sat: ${workOnSaturday}, Sun: ${workOnSunday}`);
      // No need to set loading here again, fetch handles it.
      setError(null); // Clear previous scheduling errors

      try {
        // Ensure requirements have unique IDs for the scheduler
        const requirementsWithUniqueIds = rawRequirements.map((req, index) => ({
          ...req,
          // Ensure a unique ID for each task segment for the scheduler, use DB id if possible
          id: req.id || `task-${req.resource_id}-${req.plan_id}-${index}`,
        }));

        const scheduled = scheduleTrainingTasks(
          requirementsWithUniqueIds,
          workOnSaturday,
          workOnSunday
        );
        console.log(`useTrainingRequirements: Scheduling complete, generated ${scheduled.length} segments.`);
        // console.log('useTrainingRequirements: Final Scheduled Output:', JSON.stringify(scheduled, null, 2)); // Keep for debugging if needed
        setScheduledTasks(scheduled);
      } catch (err: any) {
        console.error("useTrainingRequirements: Error during task scheduling:", err);
        const scheduleErrorMessage = err.message || "An error occurred during task scheduling.";
        setError(scheduleErrorMessage);
        setScheduledTasks([]); // Clear schedule on error
      }
      // No finally setLoading(false) here, as fetch handles the main loading state
    } else if (!loading && rawRequirements.length === 0) {
      // If not loading and no requirements, ensure schedule is empty
        setScheduledTasks([]);
    }
    // Else: If loading, wait for fetch to complete. If error occurred during fetch, error state is set.
  }, [rawRequirements, workOnSaturday, workOnSunday, loading]); // Dependencies for scheduling

  return {
    scheduledTasks,
    loading, // Reflects fetching state
    error,
    fetchRequirements // Expose fetch function for manual refresh/retry
  };
}