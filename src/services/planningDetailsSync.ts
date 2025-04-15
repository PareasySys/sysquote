import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { toast } from "sonner";

// You might expand this hook with more specific sync functions as needed
export function usePlanningDetailsSync() {

  // Generic sync function (kept for potential broad use cases or internal calls)
  // Consider if this is truly needed or if specific syncs are always better.
  const syncAllPlanningDetails = useCallback(async () => {
    try {
      console.log("Starting full planning details sync...");
      const { data: planningDetails, error: fetchError } = await supabase
        .from("planning_details")
        .select("*");

      if (fetchError) throw fetchError;
      if (!planningDetails || planningDetails.length === 0) return true;

      console.log(`Synchronizing ${planningDetails.length} planning details records`);

      for (const detail of planningDetails) {
        let needsUpdate = false;
        const updates: Record<string, any> = {};

        // --- Check Referenced Entities Exist ---
        // (Simplified checks - add more robust checks if needed)
        if (detail.plan_id) {
          const { data: plan } = await supabase.from("training_plans").select("plan_id").eq("plan_id", detail.plan_id).maybeSingle();
          if (!plan) needsUpdate = true; // Mark for potential update/delete later if needed
        }
        if (detail.machine_types_id) {
          const { data: machine } = await supabase.from("machine_types").select("machine_type_id").eq("machine_type_id", detail.machine_types_id).maybeSingle();
          if (!machine) { updates.machine_types_id = null; needsUpdate = true; }
        }
         if (detail.software_types_id) {
          const { data: software } = await supabase.from("software_types").select("software_type_id").eq("software_type_id", detail.software_types_id).maybeSingle();
          if (!software) { updates.software_types_id = null; needsUpdate = true; }
        }
        if (detail.resource_id) {
          const { data: resource } = await supabase.from("resources").select("resource_id").eq("resource_id", detail.resource_id).maybeSingle();
          if (!resource) { updates.resource_id = null; needsUpdate = true; }
        }

        // --- Sync Resource/Hours based on Requirements/Offers ---
        // Software
        if (detail.software_types_id) {
            const { data: softwareReq } = await supabase
              .from("software_training_requirements")
              .select("resource_id")
              .eq("software_type_id", detail.software_types_id)
              .eq("plan_id", detail.plan_id)
              .maybeSingle(); // Use maybeSingle

            const { data: offer } = await supabase
              .from("training_offers")
              .select("hours_required")
              .eq("software_type_id", detail.software_types_id)
              .eq("plan_id", detail.plan_id)
              .is("machine_type_id", null)
              .maybeSingle(); // Use maybeSingle

            const requiredResourceId = softwareReq?.resource_id ?? null;
            const requiredHours = offer?.hours_required ?? 0; // Default to 0 if no offer

            if (requiredResourceId !== detail.resource_id) {
                updates.resource_id = requiredResourceId;
                needsUpdate = true;
            }
            if (requiredHours !== detail.allocated_hours) {
                updates.allocated_hours = requiredHours;
                needsUpdate = true;
            }
        }
        // Machine (similar logic)
        else if (detail.machine_types_id) {
           const { data: machineReq } = await supabase
              .from("machine_training_requirements")
              .select("resource_id")
              .eq("machine_type_id", detail.machine_types_id)
              .eq("plan_id", detail.plan_id)
              .maybeSingle();

            const { data: offer } = await supabase
              .from("training_offers")
              .select("hours_required")
              .eq("machine_type_id", detail.machine_types_id)
              .eq("plan_id", detail.plan_id)
              .is("software_type_id", null)
              .maybeSingle();

            const requiredResourceId = machineReq?.resource_id ?? null;
            const requiredHours = offer?.hours_required ?? 0;

            if (requiredResourceId !== detail.resource_id) {
                updates.resource_id = requiredResourceId;
                needsUpdate = true;
            }
             if (requiredHours !== detail.allocated_hours) {
                updates.allocated_hours = requiredHours;
                needsUpdate = true;
            }
        }

        // Apply updates if needed
        if (needsUpdate && Object.keys(updates).length > 0) {
          console.log(`Updating planning detail ${detail.id} with:`, updates);
          const { error: updateError } = await supabase
            .from("planning_details")
            .update(updates)
            .eq("id", detail.id);
          if (updateError) console.error(`Error updating planning detail ${detail.id}:`, updateError);
        }
      }
      console.log("Full planning details sync completed.");
      return true;
    } catch (error) {
      console.error("Error during full planning details sync:", error);
      toast.error("Failed to synchronize planning details.");
      return false;
    }
  }, []);

  // --- Specific Sync Functions ---

  const syncMachineTypeChanges = useCallback(async (machineTypeId: number) => {
    console.log(`Syncing planning details for Machine Type ID: ${machineTypeId}`);
    // Logic to find related planning_details and update/delete them
    // This might involve checking if the machine type still exists,
    // updating resource_id based on machine_training_requirements,
    // updating allocated_hours based on training_offers.
    // Example: Remove details if machine type was deleted, or update hours/resource if changed.
    await syncAllPlanningDetails(); // Simplistic: Re-run full sync; ideally, make this more targeted.
    toast.info(`Planning details synced for machine type ${machineTypeId}`);
  }, [syncAllPlanningDetails]);

  const syncSoftwareTypeChanges = useCallback(async (softwareTypeId: number) => {
    console.log(`Syncing planning details for Software Type ID: ${softwareTypeId}`);
    // Similar logic as syncMachineTypeChanges, but for software.
    await syncAllPlanningDetails(); // Simplistic: Re-run full sync.
    toast.info(`Planning details synced for software type ${softwareTypeId}`);
  }, [syncAllPlanningDetails]);

  const syncResourceChanges = useCallback(async (resourceId: number) => {
    console.log(`Syncing planning details for Resource ID: ${resourceId}`);
    // Find planning_details using this resource. Check if resource still exists.
    // Update details if resource was deleted (e.g., set resource_id to null).
    await syncAllPlanningDetails(); // Simplistic: Re-run full sync.
    toast.info(`Planning details synced for resource ${resourceId}`);
  }, [syncAllPlanningDetails]);

   const syncTrainingPlanChanges = useCallback(async (planId: number) => {
    console.log(`Syncing planning details for Training Plan ID: ${planId}`);
    // Logic if a plan is deleted or significantly changed.
    await syncAllPlanningDetails(); // Simplistic: Re-run full sync.
    toast.info(`Planning details synced for training plan ${planId}`);
  }, [syncAllPlanningDetails]);

  const syncAreaCostChanges = useCallback(async (areaId: number) => {
    console.log(`Syncing planning details related to Area ID: ${areaId}`);
    // Area costs don't directly affect planning_details structure,
    // but might affect quote calculations elsewhere.
    // This sync might be simpler or handled differently.
    // For now, we can just log it or perform related quote updates.
    // Example: Re-fetch quotes using this area if costs changed.
    // No direct planning_details update needed here based on schema.
    toast.info(`Area cost change noted for area ${areaId}. Related quotes might need recalculation.`);
  }, []);


  const syncTrainingOfferChanges = useCallback(async (/* offerId?: number, itemId?: number, planId?: number */) => {
    // Offer changes (hours) directly impact allocated_hours in planning_details.
    console.log(`Syncing planning details due to Training Offer changes...`);
    // Find relevant planning_details and update allocated_hours.
    await syncAllPlanningDetails(); // Simplistic: Re-run full sync. Needs specific targeting ideally.
    toast.info(`Planning details synced after training offer change.`);
  }, [syncAllPlanningDetails]);

  const syncSoftwareTrainingHours = useCallback(async () => {
    // Specific function to sync hours/resources for *all* software items
    // based on current offers and requirements.
    try {
        console.log("Starting software training hours sync...");
        const { data: softwareOffers, error: offersError } = await supabase
            .from("training_offers")
            .select("*")
            .is("machine_type_id", null)
            .not("software_type_id", "is", null);

        if (offersError) throw offersError;
        if (!softwareOffers || softwareOffers.length === 0) return true;

        const { data: softwareReqs, error: reqsError } = await supabase
            .from("software_training_requirements")
            .select("*");
        if (reqsError) throw reqsError;

        // Efficiently update relevant planning_details
        const updates = [];
        for (const offer of softwareOffers) {
            const softwareId = offer.software_type_id;
            const planId = offer.plan_id;
            const hoursRequired = offer.hours_required;
            const softwareReq = softwareReqs?.find(
                req => req.software_type_id === softwareId && req.plan_id === planId
            );
            const resourceId = softwareReq?.resource_id ?? null;

            // Find planning details to update
             const { data: detailsToUpdate, error: fetchDetailsError } = await supabase
                .from("planning_details")
                .select("id")
                .eq("plan_id", planId)
                .eq("software_types_id", softwareId)
                .or(`allocated_hours.neq.${hoursRequired},resource_id.neq.${resourceId === null ? 'null' : resourceId }`); // Find where hours OR resource differs

            if (fetchDetailsError) {
                console.error("Error fetching details to update:", fetchDetailsError);
                continue; // Skip this offer on error
            }

            if (detailsToUpdate && detailsToUpdate.length > 0) {
                 for (const detail of detailsToUpdate) {
                    updates.push(supabase
                        .from("planning_details")
                        .update({ allocated_hours: hoursRequired, resource_id: resourceId })
                        .eq("id", detail.id)
                    );
                 }
            }
        }

        if (updates.length > 0) {
            console.log(`Applying ${updates.length} software planning detail updates...`);
            await Promise.all(updates);
            toast.success(`${updates.length} software planning details updated.`);
        } else {
             console.log("No software planning details needed updates.");
        }

        return true;
    } catch (error) {
        console.error("Error synchronizing software training hours:", error);
        toast.error("Failed to sync software training hours.");
        return false;
    }
  }, []);


  return {
    syncAllPlanningDetails, // Keep if needed
    syncMachineTypeChanges,
    syncSoftwareTypeChanges,
    syncResourceChanges,
    syncTrainingPlanChanges,
    syncAreaCostChanges,
    syncTrainingOfferChanges,
    syncSoftwareTrainingHours, // Add this specific sync
    // Add other specific sync functions here
  };
}