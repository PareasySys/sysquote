
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TrainingPlan {
  plan_id: number;
  name: string;
  description: string | null;
  display_order: number | null;
  created_at: string;
  icon_name: string | null;
  requirements?: any[]; // Added this line to define the requirements property
}

export const useTrainingPlans = () => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching training plans...");
      
      const { data, error } = await supabase
        .from("training_plans")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      
      console.log("Training plans fetched:", data);
      
      // Ensure icon_name is defined for all plans
      const plansWithIcons = data?.map((plan) => ({
        ...plan,
        icon_name: plan.icon_name || "skill-level-basic"
      })) || [];
      
      setPlans(plansWithIcons);
    } catch (err: any) {
      console.error("Error fetching training plans:", err);
      setError(err.message || "Failed to load training plans");
      toast.error("Failed to load training plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    error,
    fetchPlans
  };
};
