// planningDetailsSync.ts

import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

// --- Helper Function to get all Training Offers keyed by machine/software + plan ---
type OfferMapKey = `M${number}P${number}` | `S${number}P${number}`;
interface TrainingOfferData {
    hours_required: number;
    // Add other offer fields if needed
}
async function getAllTrainingOffersMap(): Promise<Map<OfferMapKey, TrainingOfferData>> {
    const map = new Map<OfferMapKey, TrainingOfferData>();
    const { data, error } = await supabase.from("training_offers").select("*");
    if (error) {
        console.error("Error fetching all training offers:", error);
        return map; // Return empty map on error
    }
    data?.forEach(offer => {
        const key: OfferMapKey | null = offer.machine_type_id
            ? `M${offer.machine_type_id}P${offer.plan_id}`
            : offer.software_type_id
            ? `S${offer.software_type_id}P${offer.plan_id}`
            : null;
        if (key) {
            map.set(key, { hours_required: offer.hours_required || 0 });
        }
    });
    return map;
}

// --- Helper Function to get all Training Requirements keyed by machine/software + plan ---
type RequirementMapKey = `M${number}P${number}` | `S${number}P${number}`;
interface TrainingRequirementData {
    resource_id: number | null;
    // Add other requirement fields if needed
}
async function getAllTrainingRequirementsMap(): Promise<Map<RequirementMapKey, TrainingRequirementData>> {
    const map = new Map<RequirementMapKey, TrainingRequirementData>();

    // Fetch Machine Requirements
    const { data: machineReqs, error: machineErr } = await supabase
        .from("machine_training_requirements")
        .select("*");
    if (machineErr) console.error("Error fetching machine requirements:", machineErr);
    else machineReqs?.forEach(req => map.set(`M${req.machine_type_id}P${req.plan_id}`, { resource_id: req.resource_id }));

    // Fetch Software Requirements
    const { data: softwareReqs, error: softwareErr } = await supabase
        .from("software_training_requirements")
        .select("*");
    if (softwareErr) console.error("Error fetching software requirements:", softwareErr);
    else softwareReqs?.forEach(req => map.set(`S${req.software_type_id}P${req.plan_id}`, { resource_id: req.resource_id }));

    return map;
}


// --- Helper function to get all existing planning details for relevant quotes ---
async function getExistingPlanningDetails(quoteIds: string[]): Promise<any[]> {
    if (!quoteIds || quoteIds.length === 0) return [];
    const { data, error } = await supabase
        .from("planning_details")
        .select("id, quote_id, plan_id, machine_types_id, software_types_id, resource_id, allocated_hours")
        .in("quote_id", quoteIds);
    if (error) {
        console.error("Error fetching existing planning details:", error);
        return [];
    }
    return data || [];
}


export const dataSyncService = {

  // --- Sync Machine Type (Refactored) ---
  async syncMachineTypeChanges(machineTypeId: number): Promise<void> {
    try {
      console.log(`Syncing planning details for machine type ID: ${machineTypeId}`);

      // 1. Find affected quotes
      const { data: quotes, error: quotesError } = await supabase
        .from("quotes")
        .select("quote_id")
        .contains("machine_type_ids", [machineTypeId]);
      if (quotesError) throw quotesError;
      if (!quotes || quotes.length === 0) return;
      const affectedQuoteIds = quotes.map(q => q.quote_id);
      console.log(` Found ${affectedQuoteIds.length} quotes containing machine type ID: ${machineTypeId}`);

      // 2. Get ALL relevant requirements & offers (fetch once)
      const requirementsMap = await getAllTrainingRequirementsMap();
      const offersMap = await getAllTrainingOffersMap();

      // 3. Get existing planning details for these quotes
      const existingDetails = await getExistingPlanningDetails(affectedQuoteIds);
      const existingMap = new Map(existingDetails.map(d => [`Q${d.quote_id}P${d.plan_id}M${d.machine_types_id}`, d]));

      // 4. Determine Updates and Inserts
      const detailsToUpdate: any[] = [];
      const detailsToInsert: any[] = [];

      // Iterate through requirements specific to *this* machine type
      for (const [key, reqData] of requirementsMap.entries()) {
        if (key.startsWith(`M${machineTypeId}P`)) { // Only process reqs for the changed machine
            const planId = parseInt(key.split('P')[1], 10);
            const offerKey: OfferMapKey = `M${machineTypeId}P${planId}`;
            const offerData = offersMap.get(offerKey);
            const allocatedHours = offerData?.hours_required ?? 0;
            const resourceId = reqData.resource_id; // Can be null

            // Check against each affected quote
            for (const quoteId of affectedQuoteIds) {
                const existingDetailKey = `Q${quoteId}P${planId}M${machineTypeId}`;
                const existingDetail = existingMap.get(existingDetailKey);

                if (existingDetail) {
                    // Check if update is needed
                    if (existingDetail.resource_id !== resourceId || existingDetail.allocated_hours !== allocatedHours) {
                        detailsToUpdate.push({
                            id: existingDetail.id,
                            resource_id: resourceId,
                            allocated_hours: allocatedHours,
                            updated_at: new Date().toISOString()
                            // Only update relevant fields
                        });
                    }
                    // Remove from map to track processed details
                    existingMap.delete(existingDetailKey);
                } else {
                    // Prepare for insert
                    detailsToInsert.push({
                        quote_id: quoteId,
                        plan_id: planId,
                        resource_id: resourceId,
                        allocated_hours: allocatedHours,
                        machine_types_id: machineTypeId,
                        software_types_id: null,
                        resource_category: "Machine", // Make sure this column exists
                        work_on_saturday: false, // Default values
                        work_on_sunday: false
                    });
                }
            }
        }
      }

       // 5. Perform Bulk Operations
      if (detailsToInsert.length > 0) {
          console.log(`Inserting ${detailsToInsert.length} new planning details for machine ${machineTypeId}`);
          const { error: insertError } = await supabase.from("planning_details").insert(detailsToInsert);
          if (insertError) console.error("Bulk Insert Error:", insertError);
      }
      if (detailsToUpdate.length > 0) {
           console.log(`Updating ${detailsToUpdate.length} planning details for machine ${machineTypeId}`);
           // Supabase update doesn't support bulk updates easily based on different IDs in one go.
           // We might need to loop or use an RPC function for true bulk update.
           // Looping for now, but be mindful of performance with many updates.
           for (const update of detailsToUpdate) {
               const { id, ...updateData } = update;
               const { error: updateError } = await supabase.from("planning_details").update(updateData).eq("id", id);
               if (updateError) console.error(`Update Error for ID ${id}:`, updateError);
           }
      }

      // 6. Optional: Delete orphaned details (planning details for this machine in affected quotes that are no longer required)
      // This is complex - requires comparing existingMap keys (those not processed) against known reqs/offers.
      // For simplicity, let's skip direct deletion here. A separate cleanup job might be better.


      console.log("Sync completed for machine type:", machineTypeId);
    } catch (error) {
      console.error(`Error synchronizing planning details for machine type ${machineTypeId}:`, error);
      toast.error(`Failed to sync changes for machine type ${machineTypeId}`);
    }
  },

 // --- Sync Software Type (Refactored - Similar logic to Machine Type) ---
  async syncSoftwareTypeChanges(softwareTypeId: number): Promise<void> {
     try {
         console.log(`Syncing planning details for software type ID: ${softwareTypeId}`);

         // 1. Find affected quotes (Assuming quotes table has 'software_type_ids' array column)
         const { data: quotes, error: quotesError } = await supabase
             .from("quotes")
             .select("quote_id, software_type_ids") // Fetch IDs to be sure
             .contains("software_type_ids", [softwareTypeId]); // Use contains for array check
         if (quotesError) throw quotesError;
         if (!quotes || quotes.length === 0) return;

         const affectedQuoteIds = quotes
             .filter(q => q.software_type_ids?.includes(softwareTypeId)) // Double check
             .map(q => q.quote_id);

          if (affectedQuoteIds.length === 0) return;
          console.log(` Found ${affectedQuoteIds.length} quotes containing software type ID: ${softwareTypeId}`);


         // 2. Get ALL relevant requirements & offers
         const requirementsMap = await getAllTrainingRequirementsMap();
         const offersMap = await getAllTrainingOffersMap();

         // 3. Get existing planning details for these quotes
         const existingDetails = await getExistingPlanningDetails(affectedQuoteIds);
         const existingMap = new Map(existingDetails.map(d => [`Q${d.quote_id}P${d.plan_id}S${d.software_types_id}`, d]));

         // 4. Determine Updates and Inserts
         const detailsToUpdate: any[] = [];
         const detailsToInsert: any[] = [];

         for (const [key, reqData] of requirementsMap.entries()) {
             if (key.startsWith(`S${softwareTypeId}P`)) {
                 const planId = parseInt(key.split('P')[1], 10);
                 const offerKey: OfferMapKey = `S${softwareTypeId}P${planId}`;
                 const offerData = offersMap.get(offerKey);
                 const allocatedHours = offerData?.hours_required ?? 0;
                 const resourceId = reqData.resource_id;

                 for (const quoteId of affectedQuoteIds) {
                     const existingDetailKey = `Q${quoteId}P${planId}S${softwareTypeId}`;
                     const existingDetail = existingMap.get(existingDetailKey);

                     if (existingDetail) {
                         if (existingDetail.resource_id !== resourceId || existingDetail.allocated_hours !== allocatedHours) {
                             detailsToUpdate.push({
                                 id: existingDetail.id,
                                 resource_id: resourceId,
                                 allocated_hours: allocatedHours,
                                 updated_at: new Date().toISOString()
                             });
                         }
                         existingMap.delete(existingDetailKey);
                     } else {
                         detailsToInsert.push({
                             quote_id: quoteId,
                             plan_id: planId,
                             resource_id: resourceId,
                             allocated_hours: allocatedHours,
                             machine_types_id: null,
                             software_types_id: softwareTypeId,
                             resource_category: "Software", // Ensure column exists
                             work_on_saturday: false,
                             work_on_sunday: false
                         });
                     }
                 }
             }
         }

          // 5. Perform Bulk Operations
         if (detailsToInsert.length > 0) {
             console.log(`Inserting ${detailsToInsert.length} new planning details for software ${softwareTypeId}`);
             const { error: insertError } = await supabase.from("planning_details").insert(detailsToInsert);
             if (insertError) console.error("Bulk Insert Error (Software):", insertError);
         }
         if (detailsToUpdate.length > 0) {
             console.log(`Updating ${detailsToUpdate.length} planning details for software ${softwareTypeId}`);
             for (const update of detailsToUpdate) { // Loop for updates
                 const { id, ...updateData } = update;
                 const { error: updateError } = await supabase.from("planning_details").update(updateData).eq("id", id);
                 if (updateError) console.error(`Update Error for ID ${id} (Software):`, updateError);
             }
         }

         console.log("Sync completed for software type:", softwareTypeId);
     } catch (error) {
         console.error(`Error synchronizing planning details for software type ${softwareTypeId}:`, error);
         toast.error(`Failed to sync changes for software type ${softwareTypeId}`);
     }
  },


  // --- Sync Resource Changes (Minimal - Timestamp Only) ---
  // Consider if more specific updates are needed based on what changed about the resource (e.g., name?)
  async syncResourceChanges(resourceId: number): Promise<void> {
    try {
      console.log(`Updating timestamp for planning details using resource ID: ${resourceId}`);
      const { error } = await supabase
        .from("planning_details")
        .update({ updated_at: new Date().toISOString() })
        .eq("resource_id", resourceId);
      if (error) throw error;
      console.log("Sync timestamp updated for resource:", resourceId);
    } catch (error) {
      console.error(`Error synchronizing planning details for resource ${resourceId}:`, error);
    }
  },

 // --- Sync Training Plan Changes (Minimal - Timestamp Only) ---
 // Consider if more specific updates are needed (e.g., if plan name change affects details?)
  async syncTrainingPlanChanges(planId: number): Promise<void> {
     try {
         console.log(`Updating timestamp for planning details using plan ID: ${planId}`);
         const { error } = await supabase
             .from("planning_details")
             .update({ updated_at: new Date().toISOString() })
             .eq("plan_id", planId);
         if (error) throw error;
         console.log("Sync timestamp updated for plan:", planId);
     } catch (error) {
         console.error(`Error synchronizing planning details for plan ${planId}:`, error);
     }
  },

  // --- Sync Area Cost Changes (No Action on planning_details) ---
  async syncAreaCostChanges(areaId: number): Promise<void> {
    console.log(`Area cost changed for area ID: ${areaId}. No direct sync needed for planning_details.`);
    return Promise.resolve();
  },

  // --- Sync Training Offer Changes (Dispatch to Machine/Software Sync) ---
  async syncTrainingOfferChanges(
    planId: number,
    machineTypeId?: number | null, // Allow null
    softwareTypeId?: number | null // Allow null
  ): Promise<void> {
    try {
      console.log(`Syncing for training offer change - Plan: ${planId}, Machine: ${machineTypeId}, Software: ${softwareTypeId}`);
      if (machineTypeId != null) {
        await this.syncMachineTypeChanges(machineTypeId);
      } else if (softwareTypeId != null) {
        await this.syncSoftwareTypeChanges(softwareTypeId);
      } else {
          console.warn(`Training offer change detected for Plan ${planId} but no machine/software ID provided.`);
          // Optionally sync all details for the plan if offer structure is complex
          // await this.syncTrainingPlanChanges(planId);
      }
    } catch (error) {
      console.error("Error dispatching training offer sync:", error);
    }
  },

  // --- Sync Training Topic Changes (No Action) ---
  async syncTrainingTopicChanges(): Promise<void> {
    console.log("Training topics changed, no direct sync needed for planning_details.");
    return Promise.resolve();
  }
};