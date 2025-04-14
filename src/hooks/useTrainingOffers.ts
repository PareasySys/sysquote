
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMachineTypes } from "./useMachineTypes";
import { useSoftwareTypes } from "./useSoftwareTypes";
import { useTrainingPlans } from "./useTrainingPlans";
import { toast } from "sonner";
import { dataSyncService } from "@/services/dataSyncService";

export interface TrainingOffer {
  id: number;
  machine_type_id: number | null;
  software_type_id: number | null;
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
  const { software } = useSoftwareTypes();
  const { plans } = useTrainingPlans();

  const offersMatrix = machines.map(machine => {
    const machineRow = {
      itemId: machine.machine_type_id,
      itemName: machine.name,
      plans: plans.map(plan => {
        const offer = offers.find(o => 
          o.plan_id === plan.plan_id && 
          o.machine_type_id === machine.machine_type_id &&
          o.software_type_id === null
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

  const softwareOffersMatrix = software.map(softwareItem => {
    const softwareRow = {
      itemId: softwareItem.software_type_id,
      itemName: softwareItem.name,
      plans: plans.map(plan => {
        const offer = offers.find(o => 
          o.plan_id === plan.plan_id && 
          o.software_type_id === softwareItem.software_type_id &&
          o.machine_type_id === null
        );
        
        return {
          planId: plan.plan_id,
          planName: plan.name,
          hoursRequired: offer?.hours_required || 0,
          offerId: offer?.id
        };
      })
    };
    return softwareRow;
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
        o => o.machine_type_id === machine_type_id && 
             o.plan_id === plan_id &&
             o.software_type_id === null
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
            software_type_id: null,
            hours_required
          });

        if (error) throw error;
      }
      
      // Refetch to update state
      await fetchOffers();
      
      // Sync changes to planning details across all affected quotes
      await dataSyncService.syncTrainingOfferChanges(machine_type_id, null, plan_id);
      
      toast.success("Training hours updated");
      return true;
    } catch (err: any) {
      console.error("Error updating training hours:", err);
      toast.error(err.message || "Failed to update training hours");
      return false;
    }
  };

  const updateSoftwareTrainingHours = async (
    software_type_id: number,
    plan_id: number,
    hours_required: number
  ) => {
    try {
      const existingOffer = offers.find(
        o => o.software_type_id === software_type_id && 
             o.plan_id === plan_id &&
             o.machine_type_id === null
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
        // Create new record with explicit NULL for machine_type_id
        const { error } = await supabase
          .from("training_offers")
          .insert({
            software_type_id,
            plan_id,
            machine_type_id: null,  // Explicitly set to NULL
            hours_required,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }
      
      // Refetch to update state
      await fetchOffers();
      
      // Sync changes to planning details across all affected quotes
      await dataSyncService.syncTrainingOfferChanges(null, software_type_id, plan_id);
      
      toast.success("Software training hours updated");
      return true;
    } catch (err: any) {
      console.error("Error updating software training hours:", err);
      toast.error(err.message || "Failed to update software training hours");
      return false;
    }
  };

  useEffect(() => {
    if ((machines.length > 0 || software.length > 0) && plans.length > 0) {
      fetchOffers();
    }
  }, [machines.length, software.length, plans.length]);

  return {
    offers,
    offersMatrix,
    softwareOffersMatrix,
    loading,
    error,
    fetchOffers,
    updateTrainingHours,
    updateSoftwareTrainingHours
  };
};
