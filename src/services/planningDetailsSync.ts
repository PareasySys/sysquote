
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
      
      // For software entries, check if we need to update resource or hours from training requirements and offers
      if (detail.software_types_id) {
        // Get resource from software training requirements
        const { data: softwareReqs, error: reqError } = await supabase
          .from("software_training_requirements")
          .select("resource_id")
          .eq("software_type_id", detail.software_types_id)
          .eq("plan_id", detail.plan_id);
        
        // Use maybeSingle to avoid 406 error for singular results
        const softwareReq = softwareReqs && softwareReqs.length > 0 ? softwareReqs[0] : null;
        
        // Get hours from training offers
        // FIX: Use .is() for null values but with the correct syntax
        const { data: offers, error: offerError } = await supabase
          .from("training_offers")
          .select("hours_required")
          .eq("software_type_id", detail.software_types_id)
          .eq("plan_id", detail.plan_id)
          .is("machine_type_id", null);
          
        const trainingOffer = offers && offers.length > 0 ? offers[0] : null;
          
        // If we have a resource in softwareReq but it's different from what's in details, update it
        if (softwareReq && softwareReq.resource_id !== detail.resource_id) {
          console.log(`Updating resource ID for software ${detail.software_types_id} from ${detail.resource_id || 'null'} to ${softwareReq.resource_id}`);
          updates.resource_id = softwareReq.resource_id;
          needsUpdate = true;
        }
        
        // If we have hours in trainingOffer but they're different from allocated_hours, update them
        if (trainingOffer && trainingOffer.hours_required !== detail.allocated_hours) {
          console.log(`Updating allocated hours for software ${detail.software_types_id} from ${detail.allocated_hours} to ${trainingOffer.hours_required}`);
          updates.allocated_hours = trainingOffer.hours_required;
          needsUpdate = true;
        }
      }
      
      // For machine entries, do the same kind of checks for resource and hours
      if (detail.machine_types_id) {
        // Get resource from machine training requirements
        const { data: machineReqs } = await supabase
          .from("machine_training_requirements")
          .select("resource_id")
          .eq("machine_type_id", detail.machine_types_id)
          .eq("plan_id", detail.plan_id);
        
        const machineReq = machineReqs && machineReqs.length > 0 ? machineReqs[0] : null;
        
        // Get hours from training offers
        // FIX: Use .is() for null values but with the correct syntax
        const { data: offers } = await supabase
          .from("training_offers")
          .select("hours_required")
          .eq("machine_type_id", detail.machine_types_id)
          .eq("plan_id", detail.plan_id)
          .is("software_type_id", null);
          
        const trainingOffer = offers && offers.length > 0 ? offers[0] : null;
          
        // If we have a resource in machineReq but it's different from what's in details, update it
        if (machineReq && machineReq.resource_id !== detail.resource_id) {
          console.log(`Updating resource ID for machine ${detail.machine_types_id} from ${detail.resource_id || 'null'} to ${machineReq.resource_id}`);
          updates.resource_id = machineReq.resource_id;
          needsUpdate = true;
        }
        
        // If we have hours in trainingOffer but they're different from allocated_hours, update them
        if (trainingOffer && trainingOffer.hours_required !== detail.allocated_hours) {
          console.log(`Updating allocated hours for machine ${detail.machine_types_id} from ${detail.allocated_hours} to ${trainingOffer.hours_required}`);
          updates.allocated_hours = trainingOffer.hours_required;
          needsUpdate = true;
        }
      }
      
      // If any referenced entity doesn't exist or we need to update resource/hours, update the planning detail
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

/**
 * Ensures that planning details for software items reflect the correct hours from training_offers
 * and the correct resource assignments from software_training_requirements
 */
export async function syncSoftwareTrainingHoursAndResources() {
  try {
    console.log("Starting software training hours and resources sync");
    
    // Get all software training offers to make sure we have the correct hours
    // FIX: Use .is() for null values but with correct syntax
    const { data: softwareOffers, error: offersError } = await supabase
      .from("training_offers")
      .select("*")
      .is("machine_type_id", null)
      .not("software_type_id", "is", null);
      
    if (offersError) {
      console.error("Error fetching software training offers:", offersError);
      return false;
    }
    
    if (!softwareOffers || softwareOffers.length === 0) {
      console.log("No software training offers found, nothing to sync");
      return true;
    }
    
    // Get all software training requirements to make sure we have the correct resources
    const { data: softwareReqs, error: reqsError } = await supabase
      .from("software_training_requirements")
      .select("*");
      
    if (reqsError) {
      console.error("Error fetching software training requirements:", reqsError);
      return false;
    }
    
    // Get all quotes that contain software
    const { data: quotesWithSoftware, error: quotesError } = await supabase
      .from("quotes")
      .select("quote_id, software_type_ids");
      
    if (quotesError) {
      console.error("Error fetching quotes with software:", quotesError);
      return false;
    }
    
    // Process each software offer to ensure planning_details are up to date
    let updateCount = 0;
    for (const offer of softwareOffers) {
      const softwareId = offer.software_type_id;
      const planId = offer.plan_id;
      const hoursRequired = offer.hours_required;
      
      // Find the resource for this software and plan
      const softwareReq = softwareReqs?.find(
        req => req.software_type_id === softwareId && req.plan_id === planId
      );
      
      const resourceId = softwareReq?.resource_id || null;
      
      // Find all quotes that include this software
      for (const quote of quotesWithSoftware || []) {
        if (!quote.software_type_ids || !quote.software_type_ids.includes(softwareId)) {
          continue;
        }
        
        // Check if planning detail already exists
        const { data: existingDetail } = await supabase
          .from("planning_details")
          .select("id, allocated_hours, resource_id")
          .eq("quote_id", quote.quote_id)
          .eq("plan_id", planId)
          .eq("software_types_id", softwareId)
          .maybeSingle();
          
        if (existingDetail) {
          // Update if hours or resource have changed
          if (existingDetail.allocated_hours !== hoursRequired || 
              (resourceId && existingDetail.resource_id !== resourceId)) {
            
            const { error: updateError } = await supabase
              .from("planning_details")
              .update({
                allocated_hours: hoursRequired,
                resource_id: resourceId,
                resource_category: "Software",
                updated_at: new Date().toISOString()
              })
              .eq("id", existingDetail.id);
              
            if (updateError) {
              console.error(`Error updating planning detail for quote ${quote.quote_id}:`, updateError);
            } else {
              updateCount++;
              console.log(`Updated hours to ${hoursRequired} and resource to ${resourceId} for quote ${quote.quote_id}, software ${softwareId}, plan ${planId}`);
            }
          }
        } else {
          // Create new planning detail
          const { error: insertError } = await supabase
            .from("planning_details")
            .insert({
              quote_id: quote.quote_id,
              plan_id: planId,
              software_types_id: softwareId,
              machine_types_id: null,
              resource_id: resourceId,
              allocated_hours: hoursRequired,
              resource_category: "Software",
              work_on_saturday: false,
              work_on_sunday: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error(`Error creating planning detail for quote ${quote.quote_id}:`, insertError);
          } else {
            updateCount++;
            console.log(`Created planning detail for quote ${quote.quote_id}, software ${softwareId}, plan ${planId} with ${hoursRequired} hours`);
          }
        }
      }
    }
    
    console.log(`Software training hours sync complete. Updated ${updateCount} planning details.`);
    return true;
  } catch (error) {
    console.error("Error synchronizing software training hours:", error);
    return false;
  }
}

