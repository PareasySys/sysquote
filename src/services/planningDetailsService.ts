
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
    
    // Map to TrainingRequirement format
    const requirements: TrainingRequirement[] = data.map(detail => ({
      id: detail.id,
      quote_id: detail.quote_id,
      plan_id: detail.plan_id,
      resource_id: detail.resource_id,
      resource_name: detail.resources?.name || 'Unnamed Resource',
      machine_name: detail.machine_types?.name || detail.software_types?.name || 'Unknown',
      training_hours: detail.allocated_hours
    }));
    
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
