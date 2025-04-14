
import { supabase } from '@/lib/supabaseClient';
import { TrainingRequirement } from '@/hooks/useTrainingRequirements';

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
        resource_category,
        machine_types_id,
        software_types_id,
        resource_id,
        resources:resource_id (name),
        allocated_hours,
        machine_types:machine_types_id (name),
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
      machine_name: detail.resource_category === 'Machine' 
        ? detail.machine_types?.name || 'Unknown Machine' 
        : detail.software_types?.name || 'Unknown Software',
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
