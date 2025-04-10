
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMachineTypes } from "./useMachineTypes";
import { useTrainingPlans } from "./useTrainingPlans";
import { toast } from "sonner";

export interface TrainingOffer {
  id: number;
  machine_type_id: number;
  plan_id: number;
  hours_required: number;
  created_at: string;
  updated_at: string;
}

export const useTrainingOffers = () => {
  const [offers, setOffers] = useState<TrainingOffer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { machines } = useMachineTypes();
  const { plans } = useTrainingPlans();

  // Create a 2D matrix representation of hours for each machine-plan combination
  // Inverted from previous version: machines are now rows, plans are columns
  const offersMatrix = machines.map(machine => {
    const machineRow = {
      machineId: machine.machine_type_id,
      machineName: machine.name,
      plans: plans.map(plan => {
        const offer = offers.find(o => 
          o.plan_id === plan.plan_id && 
          o.machine_type_id === machine.machine_type_id
        );
        
        return {
          planId: plan.plan_id,
          planName: plan.name,
          hoursRequired: offer?.hours_required || 0,
          offerId: offer?.id
        };
      })
    };
    return machineRow;
  });

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching training offers...");
      
      const { data, error } = await supabase
        .from("training_offers")
        .select("*");
      
      if (error) throw error;
      
      console.log("Training offers fetched:", data);
      setOffers(data || []);
    } catch (err: any) {
      console.error("Error fetching training offers:", err);
      setError(err.message || "Failed to load training offers");
      toast.error("Failed to load training offers");
    } finally {
      setLoading(false);
    }
  };

  const updateTrainingHours = async (
    machine_type_id: number,
    plan_id: number,
    hours_required: number
  ) => {
    try {
      const existingOffer = offers.find(
        o => o.machine_type_id === machine_type_id && o.plan_id === plan_id
      );

      if (existingOffer) {
        // Update existing record
        const { error } = await supabase
          .from("training_offers")
          .update({ 
            hours_required,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingOffer.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from("training_offers")
          .insert({
            machine_type_id,
            plan_id,
            hours_required
          });

        if (error) throw error;
      }
      
      // Refetch to update state
      await fetchOffers();
      
      // Also update any planning_details that use this machine type and plan
      await updatePlanningDetailsHours(machine_type_id, plan_id, hours_required);
      
      toast.success("Training hours updated successfully");
    } catch (err: any) {
      console.error("Error updating training hours:", err);
      toast.error("Failed to update training hours");
    }
  };
  
  // Update planning_details allocated_hours when training offers change
  const updatePlanningDetailsHours = async (
    machine_type_id: number,
    plan_id: number,
    hours_required: number
  ) => {
    try {
      // Get all planning details that match this machine type and plan
      const { data, error } = await supabase
        .from("planning_details")
        .select("id")
        .eq("plan_id", plan_id)
        .eq("machine_types_id", machine_type_id);
      
      if (error) throw error;
      
      if (!data || data.length === 0) return;
      
      console.log(`Updating ${data.length} planning details with new hours: ${hours_required}`);
      
      // Update each planning detail with the new allocated hours
      for (const detail of data) {
        const { error: updateError } = await supabase
          .from("planning_details")
          .update({ 
            allocated_hours: hours_required,
            updated_at: new Date().toISOString()
          })
          .eq("id", detail.id);
          
        if (updateError) {
          console.error("Error updating planning detail:", updateError);
        }
      }
    } catch (err) {
      console.error("Error updating planning details hours:", err);
    }
  };

  useEffect(() => {
    if (machines.length > 0 && plans.length > 0) {
      fetchOffers();
    }
  }, [machines.length, plans.length]);

  return {
    offers,
    offersMatrix,
    loading,
    error,
    fetchOffers,
    updateTrainingHours
  };
};
