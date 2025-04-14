
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

/**
 * Synchronizes planning details data after changes to related entities
 * This ensures that planning details remain consistent with their related data
 */
export async function syncPlanningDetailsAfterChanges() {
  try {
    // Fetch all planning details that need to be updated
    const { data: planningDetails, error: fetchError } = await supabase
      .from("planning_details")
      .select("*");

    if (fetchError) {
      console.error("Error fetching planning details:", fetchError);
      return false;
    }

    if (!planningDetails || planningDetails.length === 0) {
      console.log("No planning details to synchronize");
      return true;
    }

    console.log(`Synchronizing ${planningDetails.length} planning details records`);
    
    // For each planning detail, verify that the referenced entities still exist
    // and update the record if needed
    for (const detail of planningDetails) {
      let needsUpdate = false;
      const updates: Record<string, any> = {};
      
      // Check plan still exists
      if (detail.plan_id) {
        const { data: plan } = await supabase
          .from("training_plans")
          .select("plan_id")
          .eq("plan_id", detail.plan_id)
          .single();
          
        if (!plan) {
          console.warn(`Plan ID ${detail.plan_id} no longer exists for planning detail ${detail.id}`);
          needsUpdate = true;
        }
      }
      
      // Check machine type still exists
      if (detail.machine_types_id) {
        const { data: machine } = await supabase
          .from("machine_types")
          .select("machine_type_id")
          .eq("machine_type_id", detail.machine_types_id)
          .single();
          
        if (!machine) {
          console.warn(`Machine type ID ${detail.machine_types_id} no longer exists for planning detail ${detail.id}`);
          updates.machine_types_id = null;
          needsUpdate = true;
        }
      }
      
      // Check software type still exists
      if (detail.software_types_id) {
        const { data: software } = await supabase
          .from("software_types")
          .select("software_type_id")
          .eq("software_type_id", detail.software_types_id)
          .single();
          
        if (!software) {
          console.warn(`Software type ID ${detail.software_types_id} no longer exists for planning detail ${detail.id}`);
          updates.software_types_id = null;
          needsUpdate = true;
        }
      }
      
      // Check resource still exists
      if (detail.resource_id) {
        const { data: resource } = await supabase
          .from("resources")
          .select("resource_id")
          .eq("resource_id", detail.resource_id)
          .single();
          
        if (!resource) {
          console.warn(`Resource ID ${detail.resource_id} no longer exists for planning detail ${detail.id}`);
          updates.resource_id = null;
          needsUpdate = true;
        }
      }
      
      // If any referenced entity doesn't exist, update the planning detail
      if (needsUpdate && Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("planning_details")
          .update(updates)
          .eq("id", detail.id);
          
        if (updateError) {
          console.error(`Error updating planning detail ${detail.id}:`, updateError);
        } else {
          console.log(`Updated planning detail ${detail.id}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error synchronizing planning details:", error);
    return false;
  }
}
