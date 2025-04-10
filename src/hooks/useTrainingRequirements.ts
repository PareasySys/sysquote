
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

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
      
      // First check if we can join with resources table
      const { data: planningDetails, error: detailsError } = await supabase
        .from("planning_details")
        .select(`
          id,
          resource_id,
          resources:resource_id (name),
          allocated_hours,
          machine_types_id,
          software_types_id
        `)
        .eq("quote_id", quoteId)
        .eq("plan_id", planId);
      
      if (detailsError) {
        console.error("Error fetching planning details:", detailsError);
        throw detailsError;
      }
      
      console.log("Planning details fetched:", planningDetails);
      
      if (!planningDetails || planningDetails.length === 0) {
        setRequirements([]);
        setLoading(false);
        return;
      }
      
      // Now get additional resource information if needed
      const resourceIds = planningDetails
        .map(detail => detail.resource_id)
        .filter(id => id !== null) as number[];
        
      const { data: resourcesData, error: resourcesError } = await supabase
        .from("resources")
        .select("resource_id, name")
        .in("resource_id", resourceIds.length > 0 ? resourceIds : [0]);
        
      if (resourcesError) {
        console.error("Error fetching resources:", resourcesError);
        // Don't throw, we can continue with partial data
      }
      
      // Create a map of resource id to name for quick lookups
      const resourceMap = new Map<number, string>();
      (resourcesData || []).forEach(resource => {
        resourceMap.set(resource.resource_id, resource.name);
      });
      
      // Transform planning details into training requirements
      const transformedRequirements: TrainingRequirement[] = planningDetails.map((detail, index) => {
        const resourceId = detail.resource_id || 0;
        // Get resource name from the resources table data if available
        const resourceName = resourceMap.get(resourceId) || 
                            (detail.resources?.name || "Unassigned");
                            
        const hours = detail.allocated_hours || 0;
        
        // Calculate duration in days (assuming 8 hours per working day)
        let durationDays = Math.ceil(hours / 8);
        
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
          requirement_id: index + 1,
          resource_id: resourceId,
          resource_name: resourceName,
          training_hours: hours,
          // Use calculated start day
          start_day: startDay,
          // Use calculated duration
          duration_days: durationDays || 1
        };
      });
      
      setRequirements(transformedRequirements);
      
    } catch (err: any) {
      console.error("Error fetching training requirements:", err);
      setError(err.message || "Failed to load training requirements");
      toast.error("Failed to load training requirements");
    } finally {
      setLoading(false);
    }
  };
  
  // Save training plan details to the database
  const saveTrainingPlanDetails = async (
    items: TrainingRequirement[], 
    planId: number, 
    workOnSaturday: boolean,
    workOnSunday: boolean
  ) => {
    if (!quoteId) return;
    
    try {
      console.log("Saving training plan details:", items.length, "items");
      
      // For each requirement, update the corresponding planning_details entry
      for (const item of items) {
        // Find the planning detail with the matching resource ID
        const { data: existingDetails, error: findError } = await supabase
          .from("planning_details")
          .select("id")
          .eq("quote_id", quoteId)
          .eq("plan_id", planId)
          .eq("resource_id", item.resource_id)
          .maybeSingle();
          
        if (findError) throw findError;
        
        // If we found a matching planning detail, update it
        if (existingDetails) {
          const { error: updateError } = await supabase
            .from("planning_details")
            .update({
              allocated_hours: item.training_hours,
              work_on_saturday: workOnSaturday,
              work_on_sunday: workOnSunday,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingDetails.id);
            
          if (updateError) throw updateError;
        }
      }
      
      console.log("Training plan details saved successfully");
    } catch (err: any) {
      console.error("Error saving training plan details:", err);
      // Don't show toast here as it would appear for each tab change
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [quoteId, planId, workOnSaturday, workOnSunday]);

  return {
    requirements,
    loading,
    error,
    fetchRequirements,
    saveTrainingPlanDetails
  };
};
