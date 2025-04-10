
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

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
      
      // Call the database function to get requirements
      const { data, error: fetchError } = await supabase.rpc(
        'get_quote_training_requirements',
        {
          quote_id_param: quoteId,
          plan_id_param: planId
        }
      );
      
      if (fetchError) throw fetchError;
      
      console.log("Training requirements fetched:", data);
      
      if (!data || data.length === 0) {
        setRequirements([]);
        setLoading(false);
        return;
      }
      
      // Apply weekend settings (adjust duration if working on weekends)
      const adjustedRequirements = data.map((req: TrainingRequirement) => {
        let adjustedDuration = req.duration_days;
        
        // If not working on weekends, extend duration to account for skipped days
        if (!workOnSaturday || !workOnSunday) {
          const daysOff = (!workOnSaturday && !workOnSunday) ? 2 : 1;
          const weekendAdjustment = Math.floor(req.duration_days / 5) * daysOff;
          adjustedDuration += weekendAdjustment;
        }
        
        return {
          ...req,
          duration_days: adjustedDuration
        };
      });
      
      setRequirements(adjustedRequirements);
      
      // Save to quote_training_plan_hours table (for persistence)
      await saveTrainingPlanDetails(adjustedRequirements, planId, workOnSaturday, workOnSunday);
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
      // First, delete existing records for this quote and plan from quote_training_plan_hours
      const { error: deleteError } = await supabase
        .from('quote_training_plan_hours')
        .delete()
        .match({ quote_id: quoteId, plan_id: planId });
      
      if (deleteError) throw deleteError;
      
      // Insert each requirement as a new record
      for (const item of items) {
        const { error: insertError } = await supabase
          .from('quote_training_plan_hours')
          .insert({
            quote_id: quoteId,
            plan_id: planId,
            resource_id: item.resource_id,
            training_hours: item.training_hours,
          });
        
        if (insertError) throw insertError;
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
