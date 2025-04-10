
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface TrainingRequirement {
  requirement_id: number;
  resource_id: number;
  item_id: number;
  item_type: string;
  plan_id: number;
  training_hours: number;
  start_day?: number; // Calculated start day (1-360)
  duration_days?: number; // Duration in days
  resource_name?: string; // Will be populated from join
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
      
      // Fetch requirements and join with resources to get names
      const { data, error } = await supabase
        .from('training_requirements')
        .select(`
          requirement_id,
          item_id,
          item_type,
          plan_id,
          required_resource_id,
          training_hours,
          resources:required_resource_id(resource_id, name)
        `)
        .eq('plan_id', planId);
      
      if (error) throw error;
      
      if (!data) {
        setRequirements([]);
        return;
      }
      
      // Transform the data to include resource names and calculate days
      const transformedData = data.map((req, index) => {
        // Calculate position on timeline
        // For demo purposes, we're spacing items out evenly
        // In a real app, you would use actual start dates
        const startDay = index * 10 + 1; // Simple spacing algorithm
        
        // Calculate duration based on hours (simplified)
        // In real app, this would be based on actual duration data
        const hoursPerDay = 8; // Assume 8 hours per day
        const durationDays = Math.ceil(req.training_hours / hoursPerDay);
        
        return {
          requirement_id: req.requirement_id,
          resource_id: req.required_resource_id,
          resource_name: req.resources?.name || `Resource ${req.required_resource_id}`,
          item_id: req.item_id,
          item_type: req.item_type,
          plan_id: req.plan_id,
          training_hours: req.training_hours,
          start_day: startDay,
          duration_days: durationDays
        };
      });
      
      setRequirements(transformedData);
      
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
