
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
      
      // Fetch planning details that match the current quote and plan
      const { data: planningDetails, error: detailsError } = await supabase
        .from("planning_details")
        .select(`
          id,
          resource_id,
          resources (name),
          allocated_hours,
          machine_types_id,
          software_types_id
        `)
        .eq("quote_id", quoteId)
        .eq("plan_id", planId);
      
      if (detailsError) throw detailsError;
      
      console.log("Planning details fetched:", planningDetails);
      
      if (!planningDetails || planningDetails.length === 0) {
        setRequirements([]);
        setLoading(false);
        return;
      }
      
      // Transform planning details into training requirements with calculated durations
      const transformedRequirements: TrainingRequirement[] = planningDetails.map((detail, index) => {
        const resourceName = detail.resources?.name || "Unassigned";
        const hours = detail.allocated_hours || 0;
        
        // Calculate duration in days (assuming 8 hours per working day)
        let durationDays = Math.ceil(hours / 8);
        
        // If not working on weekends, extend duration to account for skipped days
        if (!workOnSaturday || !workOnSunday) {
          const daysOff = (!workOnSaturday && !workOnSunday) ? 2 : 1;
          const weekendAdjustment = Math.floor(durationDays / 5) * daysOff;
          durationDays += weekendAdjustment;
        }
        
        return {
          requirement_id: index + 1,
          resource_id: detail.resource_id || 0,
          resource_name: resourceName,
          training_hours: hours,
          // Simple spacing algorithm - space items out
          start_day: (index + 1) * 5,
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
          .select("id, machine_types_id, software_types_id")
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
