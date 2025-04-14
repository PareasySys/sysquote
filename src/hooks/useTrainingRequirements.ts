
import { useState, useEffect } from "react";
import { cleanupRemovedMachines, fetchPlanningDetails } from "@/services/planningDetailsService";

export interface TrainingRequirement {
  requirement_id: number;
  resource_id: number;
  resource_name: string;
  machine_name?: string;
  training_hours: number;
  start_day: number;
  duration_days: number;
}

export const useTrainingRequirements = (
  quoteId?: string, 
  planId?: number | null,
  workOnSaturday: boolean = false,
  workOnSunday: boolean = false
) => {
  const [requirements, setRequirements] = useState<TrainingRequirement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch training requirements for the selected quote and plan
  const fetchRequirements = async () => {
    if (!quoteId || !planId) {
      setRequirements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get planning details
      const planningDetails = await fetchPlanningDetails(quoteId, planId);
      
      if (planningDetails.length === 0) {
        setRequirements([]);
        setLoading(false);
        return;
      }
      
      // Transform planning details into training requirements
      // Each planning detail record will be treated as a unique training requirement
      const transformedRequirements: TrainingRequirement[] = planningDetails.map((detail, index) => {
        const resourceId = detail.resource_id || 0;
        const resourceName = detail.resource_name || "Unassigned";
        const hours = detail.allocated_hours || 0;
        const machineName = detail.type_name || "Unknown Machine";
        
        // Calculate duration in days (assuming 8 hours per working day)
        let durationDays = Math.ceil(hours / 8);
        if (durationDays < 1) durationDays = 1;
        
        // Use the actual weekend settings from the database record, not the global settings
        const detailWorkOnSaturday = detail.work_on_saturday || false;
        const detailWorkOnSunday = detail.work_on_sunday || false;
        
        // Only extend duration if this specific detail has weekend work disabled
        if (!detailWorkOnSaturday || !detailWorkOnSunday) {
          // Calculate how many weekends will be encountered during the duration
          // For simplicity, assuming uniform distribution of weekends (2 days per 7)
          const daysOff = (!detailWorkOnSaturday && !detailWorkOnSunday) ? 2 : 1;
          const weekendAdjustment = Math.floor(durationDays / 5) * daysOff;
          durationDays += weekendAdjustment;
        }
        
        // Stagger the tasks by resources and machines
        // Group by resource and machine
        const sameResourceMachines = planningDetails.filter(
          d => d.resource_id === detail.resource_id && d.type_name === detail.type_name
        );
        const resourceMachineIndex = sameResourceMachines.findIndex(d => d.id === detail.id);
        let startDay = resourceMachineIndex * 2 + 1;
        
        // Further stagger based on resource to avoid multiple resources starting at the same time
        startDay += (resourceId % 5) * 2; 
        
        return {
          requirement_id: index + 1, // Use index for unique requirement_id
          resource_id: resourceId,
          resource_name: resourceName,
          machine_name: machineName,
          training_hours: hours,
          start_day: startDay,
          duration_days: durationDays || 1
        };
      });
      
      setRequirements(transformedRequirements);
      
    } catch (err: any) {
      console.error("Error fetching training requirements:", err);
      setError(err.message || "Failed to load training requirements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
    
    // When quote or plan changes, clean up any orphaned planning details
    if (quoteId && planId) {
      cleanupRemovedMachines(quoteId, planId);
    }
  }, [quoteId, planId, workOnSaturday, workOnSunday]);

  return {
    requirements,
    loading,
    error,
    fetchRequirements,
    cleanupRemovedMachines: () => cleanupRemovedMachines(quoteId, planId)
  };
};
