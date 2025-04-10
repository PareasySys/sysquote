
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
    } catch (err: any) {
      console.error("Error fetching training requirements:", err);
      setError(err.message || "Failed to load training requirements");
      toast.error("Failed to load training requirements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [quoteId, planId, workOnSaturday, workOnSunday]);

  return {
    requirements,
    loading,
    error,
    fetchRequirements
  };
};
