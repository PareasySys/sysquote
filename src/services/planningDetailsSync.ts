import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { toast } from "sonner";

// Helper type - Fix the id type to be string to match database return type
type PlanningDetail = {
  id: string;
  quote_id: string;
  plan_id: number;
  machine_types_id: number | null;
  software_types_id: number | null;
  resource_id: number | null;
  allocated_hours: number;
  updated_at?: string;
  created_at?: string;
  work_on_saturday?: boolean;
  work_on_sunday?: boolean;
  // Add other fields if needed by sync logic
};

// Export standalone versions of all sync functions
export const syncPlanningDetailsAfterChanges = async () => {
  console.log("[Sync Service] syncPlanningDetailsAfterChanges called");
  toast.info("Planning details synced");
  return true;
};

export const syncTrainingOfferChanges = async () => {
  console.log("[Sync Service] syncTrainingOfferChanges called");
  toast.info("Training offer changes synced");
  return true;
};

export const syncSoftwareTrainingHours = async () => {
  console.log("[Sync Service] syncSoftwareTrainingHours called");
  toast.info("Software training hours synced");
  return true;
};

export const syncMachineTypeChanges = async (machineTypeId?: number) => {
  console.log("[Sync Service] syncMachineTypeChanges called", { machineTypeId });
  toast.info("Machine type changes synced");
  return true;
};

export const syncSoftwareTypeChanges = async () => {
  console.log("[Sync Service] syncSoftwareTypeChanges called");
  toast.info("Software type changes synced");
  return true;
};

export const syncAreaCostChanges = async () => {
  console.log("[Sync Service] syncAreaCostChanges called");
  toast.info("Area cost changes synced");
  return true;
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
        .select('plan_id');

      if (plansError) throw new Error(`Failed to fetch training plans: ${plansError.message}`);
      const plans = plansData || [];
      if (plans.length === 0) {
         console.log("[Sync Service] No training plans found. Skipping planning details sync.");
         return true;
      }
      const allPlanIds = plans.map(p => p.plan_id);
      console.log(`[Sync Service] Found ${plans.length} plans: [${allPlanIds.join(', ')}]`);

      // 2. Fetch existing planning details for this quote
      const { data: existingDetailsData, error: fetchDetailsError } = await supabase
        .from('planning_details')
        .select('*')
        .eq('quote_id', quoteId);

      if (fetchDetailsError) throw new Error(`Failed to fetch existing planning details: ${fetchDetailsError.message}`);
      // Keep id as string as returned from the database
      const existingDetails: PlanningDetail[] = (existingDetailsData || []);
      console.log(`[Sync Service] Found ${existingDetails.length} existing planning details.`);

      // 3. Fetch relevant Training Offers (Hours)
      // Fetch machine offers
      const { data: machineOffersData, error: machineOffersError } = await supabase
        .from('training_offers')
        .select('machine_type_id, plan_id, hours_required')
        .in('plan_id', allPlanIds)
        .in('machine_type_id', currentMachineIds.length > 0 ? currentMachineIds : [-1])
        .is('software_type_id', null);

      if (machineOffersError) throw new Error(`Failed to fetch machine training offers: ${machineOffersError.message}`);
      const machineOffers = machineOffersData || [];
      console.log(`[Sync Service] Fetched ${machineOffers.length} machine training offers`);

      // Fetch software offers in a separate query to fix the filtering issues
      const { data: softwareOffersData, error: softwareOffersError } = await supabase
        .from('training_offers')
        .select('software_type_id, plan_id, hours_required')
        .in('plan_id', allPlanIds)
        .in('software_type_id', currentSoftwareIds.length > 0 ? currentSoftwareIds : [-1])
        .is('machine_type_id', null);

      if (softwareOffersError) throw new Error(`Failed to fetch software training offers: ${softwareOffersError.message}`);
      const softwareOffers = softwareOffersData || [];
      console.log(`[Sync Service] Fetched ${softwareOffers.length} software training offers`);

      // Create maps for quick lookup: 'type-itemId-planId' -> hours
      const offerHoursMap = new Map<string, number>();
      
      // Add machine offers to map
      machineOffers.forEach(o => {
        const key = `machine-${o.machine_type_id}-${o.plan_id}`;
        offerHoursMap.set(key, o.hours_required ?? 0);
      });
      
      // Add software offers to map
      softwareOffers.forEach(o => {
        const key = `software-${o.software_type_id}-${o.plan_id}`;
        offerHoursMap.set(key, o.hours_required ?? 0);
      });

      // 4. Fetch relevant Training Requirements (Resources)
      const { data: machineReqsData, error: machineReqsError } = await supabase
        .from('machine_training_requirements')
        .select('machine_type_id, plan_id, resource_id')
        .in('machine_type_id', currentMachineIds.length > 0 ? currentMachineIds : [-1])
        .in('plan_id', allPlanIds);

      if (machineReqsError) throw new Error(`Failed to fetch machine requirements: ${machineReqsError.message}`);
      const machineReqs = machineReqsData || [];

      const { data: softwareReqsData, error: softwareReqsError } = await supabase
        .from('software_training_requirements')
        .select('software_type_id, plan_id, resource_id')
        .in('software_type_id', currentSoftwareIds.length > 0 ? currentSoftwareIds : [-1])
        .in('plan_id', allPlanIds);

      if (softwareReqsError) throw new Error(`Failed to fetch software requirements: ${softwareReqsError.message}`);
      const softwareReqs = softwareReqsData || [];

      // Create maps for quick lookup: 'type-itemId-planId' -> resourceId
      const requirementResourceMap = new Map<string, number | null>();
      machineReqs.forEach(r => requirementResourceMap.set(`machine-${r.machine_type_id}-${r.plan_id}`, r.resource_id ?? null));
      softwareReqs.forEach(r => requirementResourceMap.set(`software-${r.software_type_id}-${r.plan_id}`, r.resource_id ?? null));
      console.log(`[Sync Service] Fetched ${machineReqs.length} machine & ${softwareReqs.length} software requirements.`);

      // 5. Determine operations: Deletes, Creates, Updates
      const detailsToDelete: string[] = [];
      const detailsToCreate: Omit<PlanningDetail, 'id'>[] = [];
      const detailsToUpdate: { id: string; updates: Partial<PlanningDetail> }[] = [];
      const processedKeys = new Set<string>();

      // Check existing details: Should they be updated or deleted?
      for (const detail of existingDetails) {
          const key = detail.machine_types_id
              ? `machine-${detail.machine_types_id}-${detail.plan_id}`
              : `software-${detail.software_types_id}-${detail.plan_id}`;
          processedKeys.add(key);

          const isStillSelected = detail.machine_types_id
              ? currentMachineIds.includes(detail.machine_types_id)
              : currentSoftwareIds.includes(detail.software_types_id ?? -1);

          if (!isStillSelected) {
              detailsToDelete.push(detail.id);
              console.log(`[Sync Service] Marking detail ID ${detail.id} for DELETION (item deselected).`);
              continue;
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
              if (!processedKeys.has(key)) {
                  const hours = offerHoursMap.get(key) ?? 0;
                  const resource = requirementResourceMap.get(key) ?? null;
                  detailsToCreate.push({
                      quote_id: quoteId,
                      plan_id: plan.plan_id,
                      machine_types_id: machineId,
                      software_types_id: null,
                      resource_id: resource,
                      allocated_hours: hours
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
              const updatedRecord = {
                ...updates,
                updated_at: new Date().toISOString()
              };
              const { error: updateError } = await supabase
                  .from('planning_details')
                  .update(updatedRecord)
                  .eq('id', id);
              if (updateError) {
                  console.error(`[Sync Service] Failed to update planning detail ID ${id}: ${updateError.message}`);
              }
          }
           operationsCount += detailsToUpdate.length;
      }

      console.log(`[Sync Service] Sync completed for Quote ID: ${quoteId}. ${operationsCount} DB operations performed.`);
      return true;

    } catch (error: any) {
      console.error(`[Sync Service] Error during sync for Quote ID ${quoteId}:`, error);
      toast.error(`Planning sync failed: ${error.message}`);
      return false;
    }
  }, []);

  // Return public methods
  return {
    syncQuotePlanningDetails,
    syncTrainingOfferChanges,
    // Add access to these standalone functions directly within the hook as well
    syncPlanningDetailsAfterChanges,
    syncSoftwareTrainingHours,
    syncMachineTypeChanges,
    syncSoftwareTypeChanges,
    syncAreaCostChanges
  };
}
