
import { useState, useEffect, useCallback } from 'react';
import { fetchPlanningDetails } from '@/services/planningDetailsService';
import { scheduleTrainingTasks } from '@/utils/scheduleTasks';
import { ScheduledTaskSegment } from '@/utils/types';
import { dataSyncService } from '@/services/planningDetailsSync';

export interface TrainingRequirement {
  id?: string;
  requirement_id?: number | string;
  quote_id: string;
  plan_id: number;
  resource_id: number;
  resource_name: string;
  machine_name: string;
  training_hours: number;
  resource_category?: 'Machine' | 'Software';
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
      const details = await fetchPlanningDetails(quoteId, planId);
      console.log(`useTrainingRequirements: Fetched ${details.length} raw planning details.`);
      
      // Filter out requirements with no resource assigned
      const validRequirements = details.filter(req => req.resource_id);
      
      const machineCount = validRequirements.filter(d => d.resource_category === 'Machine').length;
      const softwareCount = validRequirements.filter(d => d.resource_category === 'Software').length;
      console.log(`useTrainingRequirements: Found ${machineCount} machine resources and ${softwareCount} software resources.`);

      setRawRequirements(validRequirements);
      
      // Sync changes for each software and machine type in this quote
      const { data: quoteData } = await supabase
        .from('quotes')
        .select('machine_type_ids, software_type_ids')
        .eq('quote_id', quoteId)
        .single();
      
      if (quoteData) {
        // Sync machine types
        if (quoteData.machine_type_ids && Array.isArray(quoteData.machine_type_ids)) {
          for (const machineId of quoteData.machine_type_ids) {
            await dataSyncService.syncMachineTypeChanges(machineId);
          }
        }
        
        // Sync software types
        if (quoteData.software_type_ids && Array.isArray(quoteData.software_type_ids)) {
          for (const softwareId of quoteData.software_type_ids) {
            await dataSyncService.syncSoftwareTypeChanges(softwareId);
          }
        }
      }
    } catch (err: any) {
      console.error("useTrainingRequirements: Error fetching planning details:", err);
      const errorMessage = err.message || "Failed to fetch training requirements.";
      setError(errorMessage);
      setRawRequirements([]);
      setScheduledTasks([]);
    } finally {
      setLoading(false);
    }
  }, [quoteId, planId]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  useEffect(() => {
    if (rawRequirements.length > 0) {
      console.log(`useTrainingRequirements: Scheduling ${rawRequirements.length} requirements... Sat: ${workOnSaturday}, Sun: ${workOnSunday}`);
      setLoading(true);
      setError(null);

      try {
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
        setLoading(false);
      }
    } else {
      if (!loading) {
        setScheduledTasks([]);
      }
    }
  }, [rawRequirements, workOnSaturday, workOnSunday, loading]);

  return {
    scheduledTasks,
    loading,
    error,
    fetchRequirements
  };
}
