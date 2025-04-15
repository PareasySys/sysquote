import { supabase } from "@/integrations/supabase/client"; // Ensure correct path
import { useCallback } from "react";
import { toast } from "sonner";
import { TrainingPlan } from "@/hooks/useTrainingPlans"; // Assuming this type is needed/available

// Helper type
type PlanningDetail = {
  id: number;
  quote_id: string;
  plan_id: number;
  machine_types_id: number | null;
  software_types_id: number | null;
  resource_id: number | null;
  allocated_hours: number;
  // Add other fields if needed by sync logic (e.g., work_on_saturday)
};

export function usePlanningDetailsSync() {

  /**
   * Synchronizes the planning_details table for a specific quote.
   * Ensures rows exist for selected machines/software per plan,
   * removes rows for deselected items, and updates hours/resources
   * based on training_offers and *_training_requirements.
   */
  const syncQuotePlanningDetails = useCallback(async (quoteId: string) => {
    if (!quoteId) {
      console.error("syncQuotePlanningDetails called without quoteId.");
      return false;
    }
    console.log(`[Sync Service] Starting sync for Quote ID: ${quoteId}`);

    try {
      // 1. Fetch current state of the quote (selected items) and plans
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('machine_type_ids, software_type_ids')
        .eq('quote_id', quoteId)
        .single();

      if (quoteError) throw new Error(`Failed to fetch quote data: ${quoteError.message}`);
      if (!quoteData) throw new Error(`Quote not found: ${quoteId}`);

      const currentMachineIds = quoteData.machine_type_ids || [];
      const currentSoftwareIds = quoteData.software_type_ids || [];
      console.log(`[Sync Service] Current selections - Machines: [${currentMachineIds.join(', ')}], Software: [${currentSoftwareIds.join(', ')}]`);

      const { data: plansData, error: plansError } = await supabase
        .from('training_plans')
        .select('plan_id'); // Only need IDs

      if (plansError) throw new Error(`Failed to fetch training plans: ${plansError.message}`);
      const plans = plansData || [];
      if (plans.length === 0) {
         console.log("[Sync Service] No training plans found. Skipping planning details sync.");
         return true; // Nothing to sync if no plans
      }
      const allPlanIds = plans.map(p => p.plan_id);
      console.log(`[Sync Service] Found ${plans.length} plans: [${allPlanIds.join(', ')}]`);


      // 2. Fetch existing planning details for this quote
      const { data: existingDetailsData, error: fetchDetailsError } = await supabase
        .from('planning_details')
        .select('*') // Select all for comparison/update/delete
        .eq('quote_id', quoteId);

      if (fetchDetailsError) throw new Error(`Failed to fetch existing planning details: ${fetchDetailsError.message}`);
      const existingDetails: PlanningDetail[] = existingDetailsData || [];
      console.log(`[Sync Service] Found ${existingDetails.length} existing planning details.`);


      // 3. Fetch relevant Training Offers (Hours)
      const { data: offersData, error: offersError } = await supabase
        .from('training_offers')
        .select('machine_type_id, software_type_id, plan_id, hours_required')
        .in('plan_id', allPlanIds)
        .or(`machine_type_id.in.(${currentMachineIds.join(',')}),software_type_id.in.(${currentSoftwareIds.join(',')})`); // Fetch offers for selected items

      if (offersError) throw new Error(`Failed to fetch training offers: ${offersError.message}`);
      const offers = offersData || [];
      // Create maps for quick lookup: 'type-itemId-planId' -> hours
      const offerHoursMap = new Map<string, number>();
      offers.forEach(o => {
         const key = o.machine_type_id ? `machine-${o.machine_type_id}-${o.plan_id}` : `software-${o.software_type_id}-${o.plan_id}`;
         offerHoursMap.set(key, o.hours_required ?? 0);
      });
      console.log(`[Sync Service] Fetched ${offers.length} relevant training offers.`);


      // 4. Fetch relevant Training Requirements (Resources)
      const { data: machineReqsData, error: machineReqsError } = await supabase
         .from('machine_training_requirements')
         .select('machine_type_id, plan_id, resource_id')
         .in('machine_type_id', currentMachineIds)
         .in('plan_id', allPlanIds);

      if (machineReqsError) throw new Error(`Failed to fetch machine requirements: ${machineReqsError.message}`);
      const machineReqs = machineReqsData || [];

      const { data: softwareReqsData, error: softwareReqsError } = await supabase
         .from('software_training_requirements')
         .select('software_type_id, plan_id, resource_id')
         .in('software_type_id', currentSoftwareIds)
         .in('plan_id', allPlanIds);

      if (softwareReqsError) throw new Error(`Failed to fetch software requirements: ${softwareReqsError.message}`);
      const softwareReqs = softwareReqsData || [];

       // Create maps for quick lookup: 'type-itemId-planId' -> resourceId
      const requirementResourceMap = new Map<string, number | null>();
      machineReqs.forEach(r => requirementResourceMap.set(`machine-${r.machine_type_id}-${r.plan_id}`, r.resource_id ?? null));
      softwareReqs.forEach(r => requirementResourceMap.set(`software-${r.software_type_id}-${r.plan_id}`, r.resource_id ?? null));
      console.log(`[Sync Service] Fetched ${machineReqs.length} machine & ${softwareReqs.length} software requirements.`);


      // 5. Determine operations: Deletes, Creates, Updates
      const detailsToDelete: number[] = [];
      const detailsToCreate: Omit<PlanningDetail, 'id'>[] = [];
      const detailsToUpdate: { id: number; updates: Partial<PlanningDetail> }[] = [];
      const processedKeys = new Set<string>(); // Keep track of existing details processed

      // Check existing details: Should they be updated or deleted?
      for (const detail of existingDetails) {
          const key = detail.machine_types_id
              ? `machine-${detail.machine_types_id}-${detail.plan_id}`
              : `software-${detail.software_types_id}-${detail.plan_id}`;
          processedKeys.add(key); // Mark this existing detail as seen

          const isStillSelected = detail.machine_types_id
              ? currentMachineIds.includes(detail.machine_types_id)
              : currentSoftwareIds.includes(detail.software_types_id ?? -1); // Handle potential null software_id

          if (!isStillSelected) {
              detailsToDelete.push(detail.id);
              console.log(`[Sync Service] Marking detail ID ${detail.id} for DELETION (item deselected).`);
              continue; // No need to check for updates if deleting
          }

          // Item is still selected, check for updates
          const expectedHours = offerHoursMap.get(key) ?? 0;
          const expectedResource = requirementResourceMap.get(key) ?? null;
          const updates: Partial<PlanningDetail> = {};

          if (detail.allocated_hours !== expectedHours) {
              updates.allocated_hours = expectedHours;
          }
          if (detail.resource_id !== expectedResource) {
              updates.resource_id = expectedResource;
          }

          if (Object.keys(updates).length > 0) {
              detailsToUpdate.push({ id: detail.id, updates });
              console.log(`[Sync Service] Marking detail ID ${detail.id} for UPDATE:`, updates);
          }
      }

      // Check for missing details: Should they be created?
      for (const plan of plans) {
          // Machines
          for (const machineId of currentMachineIds) {
              const key = `machine-${machineId}-${plan.plan_id}`;
              if (!processedKeys.has(key)) { // If this combo wasn't in existingDetails
                  const hours = offerHoursMap.get(key) ?? 0;
                  const resource = requirementResourceMap.get(key) ?? null;
                  detailsToCreate.push({
                      quote_id: quoteId,
                      plan_id: plan.plan_id,
                      machine_types_id: machineId,
                      software_types_id: null,
                      resource_id: resource,
                      allocated_hours: hours
                      // Add defaults for other fields if needed (e.g., work_on_saturday: false)
                  });
                  console.log(`[Sync Service] Marking detail for CREATION: Machine ${machineId}, Plan ${plan.plan_id}, Hours ${hours}, Resource ${resource}`);
              }
          }
          // Software
          for (const softwareId of currentSoftwareIds) {
              const key = `software-${softwareId}-${plan.plan_id}`;
               if (!processedKeys.has(key)) {
                   const hours = offerHoursMap.get(key) ?? 0;
                   const resource = requirementResourceMap.get(key) ?? null;
                   detailsToCreate.push({
                       quote_id: quoteId,
                       plan_id: plan.plan_id,
                       machine_types_id: null,
                       software_types_id: softwareId,
                       resource_id: resource,
                       allocated_hours: hours
                       // Add defaults for other fields
                   });
                    console.log(`[Sync Service] Marking detail for CREATION: Software ${softwareId}, Plan ${plan.plan_id}, Hours ${hours}, Resource ${resource}`);
               }
          }
      }

      // 6. Execute Batched DB Operations
      let operationsCount = 0;

      // Deletes
      if (detailsToDelete.length > 0) {
          console.log(`[Sync Service] Executing DELETE for ${detailsToDelete.length} details.`);
          const { error: deleteError } = await supabase
              .from('planning_details')
              .delete()
              .in('id', detailsToDelete);
          if (deleteError) throw new Error(`Failed to delete planning details: ${deleteError.message}`);
          operationsCount += detailsToDelete.length;
      }

      // Creates
      if (detailsToCreate.length > 0) {
         console.log(`[Sync Service] Executing INSERT for ${detailsToCreate.length} details.`);
          const { error: insertError } = await supabase
              .from('planning_details')
              .insert(detailsToCreate);
          if (insertError) throw new Error(`Failed to insert planning details: ${insertError.message}`);
          operationsCount += detailsToCreate.length;
      }

      // Updates
      if (detailsToUpdate.length > 0) {
         console.log(`[Sync Service] Executing UPDATE for ${detailsToUpdate.length} details.`);
          // Execute updates individually (batch update based on ID is complex)
          for (const { id, updates } of detailsToUpdate) {
              updates.updated_at = new Date().toISOString(); // Add timestamp
              const { error: updateError } = await supabase
                  .from('planning_details')
                  .update(updates)
                  .eq('id', id);
              if (updateError) {
                  // Log specific error but continue trying others
                  console.error(`[Sync Service] Failed to update planning detail ID ${id}: ${updateError.message}`);
                  // Optionally throw or collect errors
              }
          }
           operationsCount += detailsToUpdate.length;
      }

      console.log(`[Sync Service] Sync completed for Quote ID: ${quoteId}. ${operationsCount} DB operations performed.`);
      // Optionally toast success only if changes were made
      // if (operationsCount > 0) {
      //     toast.info("Planning details synchronized.");
      // }
      return true; // Indicate success

    } catch (error: any) {
      console.error(`[Sync Service] Error during sync for Quote ID ${quoteId}:`, error);
      toast.error(`Planning sync failed: ${error.message}`);
      return false; // Indicate failure
    }
  }, []); // useCallback ensures the function identity is stable

  // --- Keep other specific sync functions if they are used elsewhere ---
  // --- OR remove them if syncQuotePlanningDetails covers all use cases ---

  // Example: Keep syncTrainingOfferChanges if called directly from TrainingOffersTab
  const syncTrainingOfferChanges = useCallback(async () => {
    // This might need refinement - does changing *one* offer require syncing *all* quotes?
    // Or should it sync only planning_details related to that specific offer?
    // For now, a broad sync might be acceptable, but less efficient.
    console.warn("[Sync Service] syncTrainingOfferChanges called - consider refining scope.");
    // Maybe call syncQuotePlanningDetails for ALL relevant quotes? This could be heavy.
    // A better approach might involve updating only the affected planning_details directly.
    // For simplicity, let's assume for now it triggers a general resync (less ideal).
    // await syncAllPlanningDetails(); // This was the old name
    toast.info(`Planning details might need refresh due to offer change.`);
  }, []);


  return {
    // Rename the main function for clarity
    syncQuotePlanningDetails,
    // Keep other specific syncs if needed by other parts of the app
    syncTrainingOfferChanges,
    // syncMachineTypeChanges, // Likely redundant now
    // syncSoftwareTypeChanges, // Likely redundant now
    // syncResourceChanges, // Keep if needed when a resource is deleted/updated globally
    // syncTrainingPlanChanges, // Keep if needed when a plan is deleted/updated globally
    // syncAreaCostChanges, // Keep if needed
    // syncSoftwareTrainingHours, // Likely redundant now (logic merged into syncQuotePlanningDetails)
  };
}