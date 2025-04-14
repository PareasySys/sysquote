import { supabase } from '@/lib/supabaseClient';
import { TrainingRequirement } from '@/hooks/useTrainingRequirements';
import { TrainingPlan } from '@/hooks/useTrainingPlans';

/**
 * Fetch planning details for scheduling
 */
export async function fetchPlanningDetails(
  quoteId: string,
  planId: number
): Promise<TrainingRequirement[]> {
  if (!quoteId || !planId) {
    return [];
  }
  
  try {
    // Get planning details for this quote and plan
    const { data, error } = await supabase
      .from('planning_details')
      .select(`
        id,
        quote_id,
        plan_id,
        resource_id,
        resources:resource_id (name),
        allocated_hours,
        machine_types_id,
        machine_types:machine_types_id (name),
        software_types_id,
        software_types:software_types_id (name)
      `)
      .eq('quote_id', quoteId)
      .eq('plan_id', planId)
      .not('resource_id', 'is', null);
    
    if (error) throw error;
    
    console.log("Raw planning details data:", data);
    
    // Map to TrainingRequirement format
    const requirements: TrainingRequirement[] = data.map(detail => {
      // Determine if this is a machine or software resource
      const isSoftwareResource = detail.software_types_id !== null;
      
      return {
        id: detail.id,
        quote_id: detail.quote_id,
        plan_id: detail.plan_id,
        resource_id: detail.resource_id,
        resource_name: detail.resources?.name || 'Unnamed Resource',
        machine_name: isSoftwareResource 
          ? (detail.software_types?.name || 'Unknown Software') 
          : (detail.machine_types?.name || 'Unknown Machine'),
        training_hours: detail.allocated_hours,
        resource_category: isSoftwareResource ? 'Software' : 'Machine'
      };
    });
    
    console.log("Mapped training requirements:", requirements);
    return requirements;
    
  } catch (err) {
    console.error("Error fetching planning details:", err);
    throw err;
  }
}

/**
 * Update weekend settings for a quote plan
 */
export async function updateWeekendSettings(
  quoteId: string,
  planId: number,
  workOnSaturday: boolean,
  workOnSunday: boolean
): Promise<void> {
  if (!quoteId || !planId) {
    return;
  }
  
  try {
    // Update weekend settings across all resources for this plan
    const { error } = await supabase
      .from('planning_details')
      .update({
        work_on_saturday: workOnSaturday,
        work_on_sunday: workOnSunday,
        updated_at: new Date().toISOString()
      })
      .eq('quote_id', quoteId)
      .eq('plan_id', planId);
    
    if (error) throw error;
    
  } catch (err) {
    console.error("Error updating weekend settings:", err);
    throw err;
  }
}

/**
 * Sync machine planning details with selected machines
 * This creates or updates planning detail records for selected machines
 */
export async function syncMachinePlanningDetails(
  quoteId: string,
  machineTypeIds: number[],
  plans: TrainingPlan[]
): Promise<void> {
  if (!quoteId || !machineTypeIds || !plans || plans.length === 0) {
    return;
  }
  
  try {
    // Get existing planning details for this quote
    const { data: existingDetails, error: fetchError } = await supabase
      .from('planning_details')
      .select('id, quote_id, plan_id, machine_types_id, software_types_id')
      .eq('quote_id', quoteId)
      .is('software_types_id', null); // Only get machine-related records
    
    if (fetchError) throw fetchError;
    
    // Create a map of existing details for quick lookup
    const existingMap: Record<string, any> = {};
    existingDetails?.forEach(detail => {
      if (detail.machine_types_id) {
        const key = `${detail.plan_id}_${detail.machine_types_id}`;
        existingMap[key] = detail;
      }
    });
    
    // Process each plan and selected machine
    const operations = [];
    
    for (const plan of plans) {
      for (const machineTypeId of machineTypeIds) {
        const key = `${plan.plan_id}_${machineTypeId}`;
        
        if (existingMap[key]) {
          // Planning detail already exists, no need to create
          continue;
        }
        
        // Create new planning detail
        operations.push(
          supabase
            .from('planning_details')
            .insert({
              quote_id: quoteId,
              plan_id: plan.plan_id,
              machine_types_id: machineTypeId,
              allocated_hours: 0 // Default to 0 hours
            })
        );
      }
      
      // Remove planning details for machines that are no longer selected
      if (machineTypeIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('planning_details')
          .delete()
          .eq('quote_id', quoteId)
          .eq('plan_id', plan.plan_id)
          .not('machine_types_id', 'in', `(${machineTypeIds.join(',')})`)
          .is('software_types_id', null);
          
        if (deleteError) throw deleteError;
      }
    }
    
    // Execute all insert operations in parallel
    if (operations.length > 0) {
      await Promise.all(operations.map(op => op));
    }
    
  } catch (err) {
    console.error("Error syncing machine planning details:", err);
    throw err;
  }
}

/**
 * Sync software planning details with selected software
 * This creates or updates planning detail records for selected software
 */
export async function syncSoftwarePlanningDetails(
  quoteId: string,
  softwareTypeIds: number[],
  plans: TrainingPlan[]
): Promise<void> {
  if (!quoteId || !softwareTypeIds || !plans || plans.length === 0) {
    return;
  }
  
  try {
    // Get existing planning details for this quote
    const { data: existingDetails, error: fetchError } = await supabase
      .from('planning_details')
      .select('id, quote_id, plan_id, software_types_id, machine_types_id')
      .eq('quote_id', quoteId)
      .is('machine_types_id', null); // Only get software-related records
    
    if (fetchError) throw fetchError;
    
    // Create a map of existing details for quick lookup
    const existingMap: Record<string, any> = {};
    existingDetails?.forEach(detail => {
      if (detail.software_types_id) {
        const key = `${detail.plan_id}_${detail.software_types_id}`;
        existingMap[key] = detail;
      }
    });
    
    // Process each plan and selected software
    const operations = [];
    
    for (const plan of plans) {
      for (const softwareTypeId of softwareTypeIds) {
        const key = `${plan.plan_id}_${softwareTypeId}`;
        
        if (existingMap[key]) {
          // Planning detail already exists, no need to create
          continue;
        }
        
        // Create new planning detail
        operations.push(
          supabase
            .from('planning_details')
            .insert({
              quote_id: quoteId,
              plan_id: plan.plan_id,
              software_types_id: softwareTypeId,
              allocated_hours: 4 // Default to 4 hours for software
            })
        );
      }
      
      // Remove planning details for software that are no longer selected
      if (softwareTypeIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('planning_details')
          .delete()
          .eq('quote_id', quoteId)
          .eq('plan_id', plan.plan_id)
          .not('software_types_id', 'in', `(${softwareTypeIds.join(',')})`)
          .is('machine_types_id', null);
          
        if (deleteError) throw deleteError;
      }
    }
    
    // Execute all insert operations in parallel
    if (operations.length > 0) {
      await Promise.all(operations.map(op => op));
    }
    
  } catch (err) {
    console.error("Error syncing software planning details:", err);
    throw err;
  }
}

/**
 * Update planning details when resource information changes
 * This ensures that all planning details using this resource get updated
 */
export async function syncResourceChanges(resourceId: number): Promise<void> {
  try {
    // Get all planning details that use this resource
    const { data: planningDetails, error: fetchError } = await supabase
      .from('planning_details')
      .select('id, quote_id, plan_id')
      .eq('resource_id', resourceId);
    
    if (fetchError) throw fetchError;
    
    // If no planning details use this resource, nothing to update
    if (!planningDetails || planningDetails.length === 0) {
      console.log(`No planning details found using resource ${resourceId}`);
      return;
    }
    
    // Update the updated_at timestamp to trigger any dependent processes
    const operations = planningDetails.map(detail => 
      supabase
        .from('planning_details')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', detail.id)
    );
    
    // Run all update operations
    if (operations.length > 0) {
      await Promise.all(operations.map(op => op));
      console.log(`Updated timestamp for ${operations.length} planning details using resource ${resourceId}`);
    }
  } catch (err) {
    console.error("Error syncing resource changes to planning details:", err);
    throw err;
  }
}

/**
 * Update planning details when a training plan is modified
 * This ensures all planning details related to this plan stay in sync
 */
export async function syncTrainingPlanChanges(planId: number): Promise<void> {
  try {
    // Get all planning details that use this plan
    const { data: planningDetails, error: fetchError } = await supabase
      .from('planning_details')
      .select('id')
      .eq('plan_id', planId);
    
    if (fetchError) throw fetchError;
    
    // If no planning details use this plan, nothing to update
    if (!planningDetails || planningDetails.length === 0) {
      console.log(`No planning details found using plan ${planId}`);
      return;
    }
    
    // Update the updated_at timestamp to trigger any dependent processes
    const operations = planningDetails.map(detail => 
      supabase
        .from('planning_details')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', detail.id)
    );
    
    // Run all update operations
    if (operations.length > 0) {
      await Promise.all(operations.map(op => op));
      console.log(`Updated timestamp for ${operations.length} planning details using plan ${planId}`);
    }
  } catch (err) {
    console.error("Error syncing training plan changes to planning details:", err);
    throw err;
  }
}

/**
 * Sync planning details when area costs change
 * This updates any planning details related to quotes using these areas
 */
export async function syncAreaCostChanges(areaId: number): Promise<void> {
  try {
    // Find all quotes that use this area
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('quote_id')
      .eq('area_id', areaId);
    
    if (quotesError) throw quotesError;
    
    // If no quotes use this area, nothing to update
    if (!quotes || quotes.length === 0) {
      console.log(`No quotes found using area ${areaId}`);
      return;
    }
    
    // For each affected quote, update the timestamp on all its planning details
    for (const quote of quotes) {
      const { error: updateError } = await supabase
        .from('planning_details')
        .update({ updated_at: new Date().toISOString() })
        .eq('quote_id', quote.quote_id);
      
      if (updateError) {
        console.error(`Error updating planning details for quote ${quote.quote_id}:`, updateError);
      } else {
        console.log(`Updated planning details for quote ${quote.quote_id} due to area change`);
      }
    }
  } catch (err) {
    console.error("Error syncing area cost changes to planning details:", err);
    throw err;
  }
}

/**
 * Ensure planning details have correct resource_id values
 * Use this after updating training requirements to ensure consistency
 */
export async function syncAllPlanningDetailsWithRequirements(): Promise<void> {
  try {
    // Get all software training requirements
    const { data: softwareReqs, error: softwareError } = await supabase
      .from('software_training_requirements')
      .select('software_type_id, plan_id, resource_id');
      
    if (softwareError) throw softwareError;
    
    // Get all machine training requirements
    const { data: machineReqs, error: machineError } = await supabase
      .from('machine_training_requirements')
      .select('machine_type_id, plan_id, resource_id');
      
    if (machineError) throw machineError;
    
    // Process software requirements first
    if (softwareReqs && softwareReqs.length > 0) {
      for (const req of softwareReqs) {
        if (!req.resource_id) continue; // Skip if no resource assigned
        
        // Update all planning details for this software+plan combination
        const { error: updateError } = await supabase
          .from('planning_details')
          .update({ 
            resource_id: req.resource_id,
            resource_category: 'Software'
          })
          .eq('software_types_id', req.software_type_id)
          .eq('plan_id', req.plan_id);
          
        if (updateError) {
          console.error(`Error updating planning details for software ${req.software_type_id}:`, updateError);
        }
      }
    }
    
    // Then process machine requirements
    if (machineReqs && machineReqs.length > 0) {
      for (const req of machineReqs) {
        if (!req.resource_id) continue; // Skip if no resource assigned
        
        // Update all planning details for this machine+plan combination
        const { error: updateError } = await supabase
          .from('planning_details')
          .update({ 
            resource_id: req.resource_id,
            resource_category: 'Machine'
          })
          .eq('machine_types_id', req.machine_type_id)
          .eq('plan_id', req.plan_id);
          
        if (updateError) {
          console.error(`Error updating planning details for machine ${req.machine_type_id}:`, updateError);
        }
      }
    }
    
    console.log("Completed synchronization of all planning details with training requirements");
  } catch (err) {
    console.error("Error syncing planning details with requirements:", err);
    throw err;
  }
}
