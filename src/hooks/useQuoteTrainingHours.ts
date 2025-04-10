
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface TrainingPlanHours {
  plan_id: number;
  plan_name: string;
  icon_name: string;
  training_hours: number;
}

export const useQuoteTrainingHours = (quoteId?: string) => {
  const [trainingHours, setTrainingHours] = useState<TrainingPlanHours[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalHours, setTotalHours] = useState<number>(0);

  // Fetch all training hours for a quote
  const fetchTrainingHours = useCallback(async () => {
    if (!quoteId) {
      setTrainingHours([]);
      setTotalHours(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the Supabase stored procedure to get training hours
      const { data, error } = await supabase.rpc('get_quote_training_hours', {
        quote_id_param: quoteId
      });

      if (error) throw error;

      console.log("Training hours data:", data);
      
      // Ensure data matches our TrainingPlanHours interface
      const typedData: TrainingPlanHours[] = data || [];
      setTrainingHours(typedData);
      
      // Calculate total hours
      const total = (typedData).reduce((sum, item) => sum + (item.training_hours || 0), 0);
      setTotalHours(total);
    } catch (err: any) {
      console.error("Error fetching training hours:", err);
      setError(err.message || "Failed to load training hours");
      toast.error("Failed to load training hours");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  // Update training hours for a specific plan
  const updateTrainingHours = async (planId: number, hours: number): Promise<boolean> => {
    if (!quoteId) {
      toast.error("Cannot update hours: Missing quote ID");
      return false;
    }

    try {
      // Ensure hours is a non-negative integer
      const safeHours = Math.max(0, Math.round(hours));
      
      // Use an UPSERT operation via the Supabase client
      const { error } = await supabase
        .from('quote_training_plan_hours')
        .upsert({
          quote_id: quoteId,
          plan_id: planId,
          training_hours: safeHours,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'quote_id,plan_id'
        });

      if (error) throw error;

      // Update local state
      setTrainingHours(prev => 
        prev.map(item => 
          item.plan_id === planId 
            ? { ...item, training_hours: safeHours } 
            : item
        )
      );

      // Recalculate total
      setTotalHours(prev => {
        const oldHours = trainingHours.find(item => item.plan_id === planId)?.training_hours || 0;
        return prev - oldHours + safeHours;
      });

      toast.success("Training hours updated");
      return true;
    } catch (err: any) {
      console.error("Error updating training hours:", err);
      toast.error(err.message || "Failed to update training hours");
      return false;
    }
  };

  // Effect to fetch training hours when quote ID changes
  useEffect(() => {
    fetchTrainingHours();
  }, [quoteId, fetchTrainingHours]);

  return {
    trainingHours,
    totalHours,
    loading,
    error,
    fetchTrainingHours,
    updateTrainingHours
  };
};
