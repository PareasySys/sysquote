
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface PlanningDetail {
  id?: string;
  quote_id: string;
  plan_id: number;
  resource_id?: number | null;
  resource_name?: string;
  machine_types_id?: number | null;
  software_types_id?: number | null;
  type_name?: string | null;
  allocated_hours: number;
  work_on_saturday?: boolean;
  work_on_sunday?: boolean;
}

/**
 * Fetch all planning details for a specific quote and plan
 */
export const fetchPlanningDetails = async (
  quoteId: string | undefined,
  planId: number | null
): Promise<PlanningDetail[]> => {
  if (!quoteId || !planId) return [];
  
  try {
    console.log("Fetching planning details for quote", quoteId, "and plan", planId);
    
    // Join with resources table to get resource names
    const { data, error } = await supabase
      .from("planning_details")
      .select(`
        id,
        quote_id,
        plan_id,
        resource_id,
        resources (name),
        allocated_hours,
        machine_types_id,
        software_types_id,
        machine_types (name),
        software_types (name),
        work_on_saturday,
        work_on_sunday
      `)
      .eq("quote_id", quoteId)
      .eq("plan_id", planId);
    
    if (error) {
      console.error("Error fetching planning details:", error);
      throw error;
    }
    
    console.log("Stored planning details:", data);
    
    // Map the data to our expected format
    if (data && data.length > 0) {
      const mappedDetails: PlanningDetail[] = data.map(item => ({
        id: item.id,
        quote_id: item.quote_id,
        plan_id: item.plan_id,
        resource_id: item.resource_id,
        resource_name: item.resources?.name || "Unassigned",
        allocated_hours: item.allocated_hours,
        machine_types_id: item.machine_types_id,
        software_types_id: item.software_types_id,
        type_name: item.machine_types ? item.machine_types.name : 
                  (item.software_types ? item.software_types.name : null),
        work_on_saturday: item.work_on_saturday,
        work_on_sunday: item.work_on_sunday
      }));
      
      return mappedDetails;
    } else {
      return [];
    }
    
  } catch (err: any) {
    console.error("Error fetching planning details:", err);
    toast.error(err.message || "Failed to fetch planning details");
    return [];
  }
};

/**
 * Create or update a planning detail
 */
export const savePlanningDetail = async (
  detail: PlanningDetail
): Promise<PlanningDetail | null> => {
  try {
    console.log("Saving planning detail:", detail);
    
    if (!detail.quote_id || !detail.plan_id) {
      throw new Error("Quote ID and Plan ID are required");
    }
    
    // Check if this is an update (has ID) or a new record
    if (detail.id) {
      // Update existing record
      const { data, error } = await supabase
        .from("planning_details")
        .update({
          resource_id: detail.resource_id,
          allocated_hours: detail.allocated_hours,
          work_on_saturday: detail.work_on_saturday || false,
          work_on_sunday: detail.work_on_sunday || false,
          updated_at: new Date().toISOString()
        })
        .eq("id", detail.id)
        .select();
      
      if (error) {
        console.error("Error updating planning detail:", error);
        throw error;
      }
      
      return data && data.length > 0 ? { ...detail, ...data[0] } : null;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from("planning_details")
        .insert({
          quote_id: detail.quote_id,
          plan_id: detail.plan_id,
          resource_id: detail.resource_id,
          machine_types_id: detail.machine_types_id,
          software_types_id: detail.software_types_id,
          allocated_hours: detail.allocated_hours,
          work_on_saturday: detail.work_on_saturday || false,
          work_on_sunday: detail.work_on_sunday || false
        })
        .select();
      
      if (error) {
        console.error("Error creating planning detail:", error);
        throw error;
      }
      
      return data && data.length > 0 ? { ...detail, ...data[0] } : null;
    }
    
  } catch (err: any) {
    console.error("Error saving planning detail:", err);
    toast.error(err.message || "Failed to save planning detail");
    return null;
  }
};

/**
 * Delete a planning detail by ID
 */
export const deletePlanningDetail = async (
  id: string
): Promise<boolean> => {
  try {
    console.log("Deleting planning detail:", id);
    
    const { error } = await supabase
      .from("planning_details")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting planning detail:", error);
      throw error;
    }
    
    return true;
  } catch (err: any) {
    console.error("Error deleting planning detail:", err);
    toast.error(err.message || "Failed to delete planning detail");
    return false;
  }
};

/**
 * Sync planning details for selected machines
 */
export const syncMachinePlanningDetails = async (
  quoteId: string,
  selectedMachineIds: number[],
  plans: { plan_id: number, name: string }[]
): Promise<boolean> => {
  if (!quoteId) return false;
  
  try {
    console.log("Syncing planning details for machines:", selectedMachineIds);
    
    // Get all training offers to get hours_required for each machine-plan combination
    const { data: allTrainingOffers, error: offersError } = await supabase
      .from("training_offers")
      .select("machine_type_id, plan_id, hours_required");
      
    if (offersError) {
      console.error("Error fetching training offers:", offersError);
      throw offersError;
    }
    
    // Get all machine training requirements to find resources for each machine
    const { data: allMachineTrainingReqs, error: reqsError } = await supabase
      .from("machine_training_requirements")
      .select("machine_type_id, plan_id, resource_id");
    
    if (reqsError) {
      console.error("Error fetching machine training requirements:", reqsError);
      throw reqsError;
    }
    
    // First get all existing planning details for this quote's machines
    const { data: existingDetails, error: fetchError } = await supabase
      .from("planning_details")
      .select("id, machine_types_id")
      .eq("quote_id", quoteId)
      .not("machine_types_id", "is", null);
      
    if (fetchError) {
      console.error("Error fetching existing planning details:", fetchError);
      throw fetchError;
    }
    
    // Find details that should be deleted (machine no longer selected)
    const detailsToDelete = (existingDetails || []).filter(
      detail => !selectedMachineIds.includes(detail.machine_types_id || 0)
    );
    
    // Delete machine-related planning details that are no longer needed
    if (detailsToDelete.length > 0) {
      console.log(`Deleting ${detailsToDelete.length} planning details for removed machines`);
      
      for (const detail of detailsToDelete) {
        await deletePlanningDetail(detail.id);
      }
    }
    
    // For each selected machine ID and each training plan, ensure there's a planning_details entry
    for (const machineId of selectedMachineIds) {
      for (const plan of plans) {
        // Find the corresponding training requirement for this machine-plan combination
        // to get the designated resource
        const machineTrainingReq = allMachineTrainingReqs?.find(
          req => req.machine_type_id === machineId && req.plan_id === plan.plan_id
        );
        
        // Find the corresponding training offer for this machine-plan combination
        // to get the required hours
        const trainingOffer = allTrainingOffers?.find(
          offer => offer.machine_type_id === machineId && offer.plan_id === plan.plan_id
        );
        
        // Use resource ID from requirements, or null if not found
        const resourceId = machineTrainingReq?.resource_id || null;
        
        // Default hours if no specific training offer is found
        const hoursRequired = trainingOffer?.hours_required || 0;
        
        // Check if there's already a planning detail for this machine-plan combination
        const { data: existingDetail, error: checkError } = await supabase
          .from("planning_details")
          .select("id, allocated_hours, resource_id")
          .eq("quote_id", quoteId)
          .eq("plan_id", plan.plan_id)
          .eq("machine_types_id", machineId)
          .maybeSingle();
          
        if (checkError) {
          console.error("Error checking existing planning details:", checkError);
          continue; // Skip to next item, don't throw
        }
        
        try {
          // If no planning detail exists, create one
          if (!existingDetail) {
            await savePlanningDetail({
              quote_id: quoteId,
              plan_id: plan.plan_id,
              machine_types_id: machineId,
              software_types_id: null,
              resource_id: resourceId,
              allocated_hours: hoursRequired,
              work_on_saturday: false,
              work_on_sunday: false
            });
          } else if (existingDetail.allocated_hours !== hoursRequired || 
                    existingDetail.resource_id !== resourceId) {
            // Only update if values have changed
            await savePlanningDetail({
              id: existingDetail.id,
              quote_id: quoteId,
              plan_id: plan.plan_id,
              machine_types_id: machineId,
              resource_id: resourceId,
              allocated_hours: hoursRequired
            });
          }
        } catch (err) {
          console.error("Error processing planning detail:", err);
          // Continue with other operations
        }
      }
    }
    
    return true;
  } catch (err: any) {
    console.error("Error syncing machine planning details:", err);
    toast.error("Failed to sync planning details");
    return false;
  }
};

/**
 * Cleanup planning details for machines that have been removed
 */
export const cleanupRemovedMachines = async (
  quoteId: string | undefined,
  planId: number | null
): Promise<boolean> => {
  if (!quoteId || !planId) return false;
  
  try {
    console.log("Cleaning up planning details for removed machines");
    
    // 1. Get the current list of machine IDs from the quote
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("machine_type_ids")
      .eq("quote_id", quoteId)
      .single();
    
    if (quoteError) {
      console.error("Error fetching quote:", quoteError);
      return false;
    }
    
    const currentMachineIds = quote?.machine_type_ids || [];
    
    // 2. Find planning details for machines that are no longer in the quote
    const { data: orphanedDetails, error: orphanError } = await supabase
      .from("planning_details")
      .select("id, machine_types_id")
      .eq("quote_id", quoteId)
      .eq("plan_id", planId)
      .not("machine_types_id", "is", null);
    
    if (orphanError) {
      console.error("Error fetching orphaned planning details:", orphanError);
      return false;
    }
    
    // 3. Filter for planning details with machine IDs not in the current selection
    const detailsToDelete = orphanedDetails?.filter(
      detail => detail.machine_types_id && !currentMachineIds.includes(detail.machine_types_id)
    );
    
    // 4. Delete the orphaned planning details one by one
    if (detailsToDelete && detailsToDelete.length > 0) {
      console.log(`Deleting ${detailsToDelete.length} orphaned planning details`);
      
      for (const detail of detailsToDelete) {
        await deletePlanningDetail(detail.id);
      }
    }
    
    return true;
  } catch (err) {
    console.error("Error cleaning up planning details:", err);
    return false;
  }
};

/**
 * Update weekend settings for planning details
 */
export const updateWeekendSettings = async (
  quoteId: string | undefined,
  planId: number | null,
  workOnSaturday: boolean,
  workOnSunday: boolean
): Promise<boolean> => {
  if (!quoteId || !planId) return false;
  
  try {
    console.log("Updating weekend settings for planning details");
    
    const { error } = await supabase
      .from("planning_details")
      .update({
        work_on_saturday: workOnSaturday,
        work_on_sunday: workOnSunday,
        updated_at: new Date().toISOString()
      })
      .eq("quote_id", quoteId)
      .eq("plan_id", planId);
      
    if (error) {
      console.error("Error updating weekend settings:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Error updating weekend settings:", err);
    return false;
  }
};
