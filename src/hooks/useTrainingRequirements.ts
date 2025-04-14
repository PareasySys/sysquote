
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
      
      // Group planning details by resource_id to process sequentially
      const resourceGroups = planningDetails.reduce((acc, detail) => {
        const resourceId = detail.resource_id || 0;
        if (!acc[resourceId]) {
          acc[resourceId] = [];
        }
        acc[resourceId].push(detail);
        return acc;
      }, {} as Record<number, typeof planningDetails>);
      
      let allRequirements: TrainingRequirement[] = [];
      let requirementId = 1;
      
      // Process each resource's training details sequentially
      Object.entries(resourceGroups).forEach(([resourceId, details]) => {
        const numericResourceId = parseInt(resourceId);
        // Sort by machine/software type name for consistent ordering
        const sortedDetails = details.sort((a, b) => {
          const nameA = a.type_name || '';
          const nameB = b.type_name || '';
          return nameA.localeCompare(nameB);
        });
        
        // Start day for this resource's first training
        // Always start on day 1 for each resource to avoid initial gaps
        let currentDay = 1;
        
        // Process each detail for this resource sequentially
        sortedDetails.forEach((detail) => {
          const resourceName = detail.resource_name || "Unassigned";
          const hours = detail.allocated_hours || 0;
          const machineName = detail.type_name || "Unknown Machine";
          
          // Calculate duration in days (assuming 8 hours per working day)
          let durationDays = Math.ceil(hours / 8);
          if (durationDays < 1) durationDays = 1;
          
          // Get weekend settings from the database record
          const detailWorkOnSaturday = detail.work_on_saturday || false;
          const detailWorkOnSunday = detail.work_on_sunday || false;
          
          // Create the requirement
          const requirement: TrainingRequirement = {
            requirement_id: requirementId++,
            resource_id: numericResourceId,
            resource_name: resourceName,
            machine_name: machineName,
            training_hours: hours,
            start_day: currentDay,
            duration_days: durationDays
          };
          
          allRequirements.push(requirement);
          
          // Move to next available starting day - immediately after this training
          currentDay += durationDays;
          
          // Skip weekends for the next training if needed
          if (!detailWorkOnSaturday || !detailWorkOnSunday) {
            let additionalDays = 0;
            
            // Check each day to see if it's a weekend that should be skipped
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
              const dayToCheck = currentDay + dayOffset;
              const dayOfWeek = dayToCheck % 7; // 0-6, where 0 is Sunday and 6 is Saturday
              
              if ((dayOfWeek === 0 && !detailWorkOnSunday) ||
                  (dayOfWeek === 6 && !detailWorkOnSaturday)) {
                // If it's a weekend day we're skipping, increment additional days
                additionalDays++;
              }
            }
            
            currentDay += additionalDays;
          }
        });
      });
      
      setRequirements(allRequirements);
      
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
