
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
      
      // Save to planning_view table
      await savePlanningItems(adjustedRequirements, planId, workOnSaturday, workOnSunday);
    } catch (err: any) {
      console.error("Error fetching training requirements:", err);
      setError(err.message || "Failed to load training requirements");
      toast.error("Failed to load training requirements");
    } finally {
      setLoading(false);
    }
  };
  
  // Save planning items to the database
  const savePlanningItems = async (
    items: TrainingRequirement[], 
    planId: number, 
    workOnSaturday: boolean,
    workOnSunday: boolean
  ) => {
    if (!quoteId) return;
    
    try {
      // First, delete existing planning items for this quote and plan
      const { error: deleteError } = await supabase
        .from('planning_view')
        .delete()
        .match({ quote_id: quoteId, plan_id: planId });
      
      if (deleteError) throw deleteError;
      
      // Insert each requirement as a planning item
      for (const item of items) {
        const { error: insertError } = await supabase.rpc(
          'save_quote_planning_item',
          {
            p_quote_id: quoteId,
            p_reference_id: uuidv4(),
            p_plan_id: planId,
            p_machine_type_id: null,
            p_software_type_id: null,
            p_area_id: null,
            p_resource_id: item.resource_id,
            p_training_hours: item.training_hours,
            p_start_day: item.start_day,
            p_duration_days: item.duration_days,
            p_work_on_saturday: workOnSaturday,
            p_work_on_sunday: workOnSunday
          }
        );
        
        if (insertError) throw insertError;
      }
      
      console.log("Planning items saved successfully");
    } catch (err: any) {
      console.error("Error saving planning items:", err);
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
    savePlanningItems
  };
};
