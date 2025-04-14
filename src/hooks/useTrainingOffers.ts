
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMachineTypes } from "./useMachineTypes";
import { useSoftwareTypes } from "./useSoftwareTypes";
import { useTrainingPlans } from "./useTrainingPlans";
import { toast } from "sonner";

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

  // Create a 2D matrix representation of hours for machine-plan combinations
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

  // Create a separate matrix for software-plan combinations
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
      
      // Also update any planning_details that use this machine type and plan
      await updatePlanningDetailsForAllQuotes(machine_type_id, plan_id, hours_required, false);
      
      toast.success("Training hours updated");
      return true;
    } catch (err: any) {
      console.error("Error updating training hours:", err);
      toast.error(err.message || "Failed to update training hours");
      return false;
    }
  };
  
  // New function to update software training hours
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
        // Create new record
        const { error } = await supabase
          .from("training_offers")
          .insert({
            software_type_id,
            plan_id,
            machine_type_id: null,
            hours_required
          });

        if (error) throw error;
      }
      
      // Refetch to update state
      await fetchOffers();
      
      // Also update any planning_details that use this software type and plan
      await updatePlanningDetailsForAllQuotes(software_type_id, plan_id, hours_required, true);
      
      toast.success("Software training hours updated");
      return true;
    } catch (err: any) {
      console.error("Error updating software training hours:", err);
      toast.error(err.message || "Failed to update software training hours");
      return false;
    }
  };
  
  // Update planning_details allocated_hours when training offers change for ALL quotes
  const updatePlanningDetailsForAllQuotes = async (
    type_id: number,
    plan_id: number,
    hours_required: number,
    isSoftware: boolean = false
  ) => {
    try {
      const columnName = isSoftware ? 'software_type_ids' : 'machine_type_ids';
      
      // First, get all quotes that have this type in their types array
      const { data: quotesWithType, error: quotesError } = await supabase
        .from("quotes")
        .select("quote_id")
        .contains(columnName, [type_id]);
      
      if (quotesError) {
        console.error(`Error finding quotes with ${isSoftware ? 'software' : 'machine'} type:`, quotesError);
        return;
      }
      
      if (!quotesWithType || quotesWithType.length === 0) return;
      
      console.log(`Updating planning details for ${quotesWithType.length} quotes that use ${isSoftware ? 'software' : 'machine'} type ${type_id}`);
      
      // For each quote that has this type, update its planning details
      for (const quote of quotesWithType) {
        try {
          // Get all planning details for this quote, type, and plan
          const typesIdColumn = isSoftware ? 'software_types_id' : 'machine_types_id';
          
          const { data: planningDetails, error: detailsError } = await supabase
            .from("planning_details")
            .select("id")
            .eq("quote_id", quote.quote_id)
            .eq("plan_id", plan_id)
            .eq(typesIdColumn, type_id);
          
          if (detailsError) {
            console.error(`Error checking planning details for quote ${quote.quote_id}:`, detailsError);
            continue;
          }
          
          if (!planningDetails || planningDetails.length === 0) {
            // If no planning details exist for this combination, create one
            const { error: insertError } = await supabase
              .from("planning_details")
              .insert({
                quote_id: quote.quote_id,
                plan_id: plan_id,
                machine_types_id: isSoftware ? null : type_id,
                software_types_id: isSoftware ? type_id : null,
                resource_id: null,
                allocated_hours: hours_required,
                resource_category: isSoftware ? 'Software' : 'Machine',
                work_on_saturday: false,
                work_on_sunday: false
              });
              
            if (insertError) {
              console.error(`Error creating planning detail for quote ${quote.quote_id}:`, insertError);
            }
          } else {
            // Update each planning detail with the new allocated hours
            for (const detail of planningDetails) {
              const { error: updateError } = await supabase
                .from("planning_details")
                .update({ 
                  allocated_hours: hours_required,
                  updated_at: new Date().toISOString()
                })
                .eq("id", detail.id);
                
              if (updateError) {
                console.error(`Error updating planning detail ${detail.id}:`, updateError);
              }
            }
          }
        } catch (err) {
          console.error(`Error processing quote ${quote.quote_id}:`, err);
        }
      }
      
      console.log(`Successfully updated planning details for all affected quotes`);
    } catch (err) {
      console.error("Error updating planning details hours:", err);
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
