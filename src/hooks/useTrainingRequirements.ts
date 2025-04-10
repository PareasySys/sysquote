
import { useState, useEffect } from "react";
import { cleanupRemovedMachines, fetchPlanningDetails } from "@/services/planningDetailsService";

export interface TrainingRequirement {
  requirement_id: number;
  resource_id: number;
  resource_name: string;
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
      // When there are duplicates (same resource_id), we'll still create separate entries
      // Each planning detail record will be treated as a unique training requirement
      const transformedRequirements: TrainingRequirement[] = planningDetails.map((detail, index) => {
        const resourceId = detail.resource_id || 0;
        const resourceName = detail.resource_name || "Unassigned";
        const hours = detail.allocated_hours || 0;
        
        // Calculate duration in days (assuming 8 hours per working day)
        let durationDays = Math.ceil(hours / 8);
        if (durationDays < 1) durationDays = 1;
        
        // If not working on weekends, extend duration to account for skipped days
        if (!workOnSaturday || !workOnSunday) {
          // Calculate how many weekends will be encountered during the duration
          // For simplicity, assuming uniform distribution of weekends (2 days per 7)
          const daysOff = (!workOnSaturday && !workOnSunday) ? 2 : 1;
          const weekendAdjustment = Math.floor(durationDays / 5) * daysOff;
          durationDays += weekendAdjustment;
        }
        
        // Use simple spacing algorithm for start days if not available
        const startDay = (index + 1) * 5; 
        
        return {
          requirement_id: index + 1,  // Use index for unique requirement_id
          resource_id: resourceId,
          resource_name: resourceName,
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
    
    // When quote, plan, or weekend settings change, clean up any orphaned planning details
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
