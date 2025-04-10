
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
      
      // Get quote machine types to fetch training offers
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('machine_type_ids')
        .eq('quote_id', quoteId)
        .single();
      
      if (quoteError) throw quoteError;
      
      const machineTypeIds = quoteData?.machine_type_ids || [];
      
      // Fetch training offers for these machine types and the selected plan
      // NOTE: The training_offers table has machine_type_id, not resource_id
      const { data: trainingOffers, error: offersError } = await supabase
        .from('training_offers')
        .select('machine_type_id, hours_required')
        .eq('plan_id', planId)
        .in('machine_type_id', machineTypeIds);
      
      if (offersError) throw offersError;
      
      console.log("Training offers fetched:", trainingOffers);
      
      // Apply weekend settings and map training hours from offers when available
      const adjustedRequirements = data.map((req: TrainingRequirement) => {
        let adjustedDuration = req.duration_days;
        let trainingHours = req.training_hours;
        
        // Since training_offers doesn't have resource_id, we can't directly match
        // We'll need to handle this differently - for now, just use the existing hours
        
        // If not working on weekends, extend duration to account for skipped days
        if (!workOnSaturday || !workOnSunday) {
          const daysOff = (!workOnSaturday && !workOnSunday) ? 2 : 1;
          const weekendAdjustment = Math.floor(adjustedDuration / 5) * daysOff;
          adjustedDuration += weekendAdjustment;
        }
        
        return {
          ...req,
          training_hours: trainingHours,
          duration_days: adjustedDuration
        };
      });
      
      setRequirements(adjustedRequirements);
      
      // Save to planning_details table
      await saveTrainingPlanDetails(adjustedRequirements, planId, workOnSaturday, workOnSunday);
    } catch (err: any) {
      console.error("Error fetching training requirements:", err);
      setError(err.message || "Failed to load training requirements");
      toast.error("Failed to load training requirements");
    } finally {
      setLoading(false);
    }
  };
  
  // Save training plan details to the database using the updated function
  const saveTrainingPlanDetails = async (
    items: TrainingRequirement[], 
    planId: number, 
    workOnSaturday: boolean,
    workOnSunday: boolean
  ) => {
    if (!quoteId) return;
    
    try {
      console.log("Saving training plan details:", items.length, "items");
      
      // Insert each requirement as a training plan detail using the new RPC
      for (const item of items) {
        const { data, error } = await supabase.rpc(
          'save_training_plan_detail',
          {
            p_quote_id: quoteId,
            p_plan_id: planId,
            p_resource_category: 'Machine', // Default to Machine for now
            p_machine_types_id: null, // Will be populated when we have proper type assignments
            p_software_types_id: null, // Will be populated when we have software type assignments
            p_resource_id: item.resource_id,
            p_allocated_hours: item.training_hours,
            p_start_day: item.start_day,
            p_duration_days: item.duration_days,
            p_work_on_saturday: workOnSaturday,
            p_work_on_sunday: workOnSunday
          }
        );
        
        if (error) {
          console.error("Error saving training plan detail:", error);
          throw error;
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
