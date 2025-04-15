
import { supabase } from '@/integrations/supabase/client'; 
import { TrainingRequirement } from '@/hooks/useTrainingRequirements';

/**
 * Fetch planning details for scheduling view (Gantt)
 */
export async function fetchPlanningDetails(
  quoteId: string,
  planId: number
): Promise<TrainingRequirement[]> {
  if (!quoteId || typeof planId !== 'number') {
    console.warn("fetchPlanningDetails called with invalid quoteId or planId.");
    return [];
  }

  console.log(`[Planning Service] Fetching details for Quote ${quoteId}, Plan ${planId}`);
  try {
    // Get planning details for this specific quote and plan
    // Ensure necessary relations are fetched for mapping
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
        software_types:software_types_id (name),
        resource_category
      `)
      .eq('quote_id', quoteId)
      .eq('plan_id', planId)
      .not('resource_id', 'is', null);

    if (error) throw error;

    console.log("[Planning Service] Raw planning details data:", data);

    // Map to TrainingRequirement format for the Gantt chart hook
    const requirements: TrainingRequirement[] = data.map(detail => {
      // Determine item name based on whether it's machine or software
      const itemName = detail.software_types_id
        ? (detail.software_types?.name || 'Unknown Software')
        : (detail.machine_types?.name || 'Unknown Machine');

      // Determine category (use stored value if available, otherwise infer)
      const category = detail.resource_category ?? (detail.software_types_id ? 'Software' : 'Machine');

      return {
        id: detail.id.toString(),
        requirement_id: detail.id,
        quote_id: detail.quote_id,
        plan_id: detail.plan_id,
        resource_id: detail.resource_id,
        resource_name: detail.resources?.name || `Resource ${detail.resource_id}`,
        machine_name: itemName,
        training_hours: detail.allocated_hours || 0,
        resource_category: category as 'Machine' | 'Software'
      };
    });

    console.log("[Planning Service] Mapped training requirements for Gantt:", requirements);
    return requirements;

  } catch (err: any) {
    console.error("[Planning Service] Error fetching planning details:", err);
    throw new Error(`Failed to fetch planning details: ${err.message}`);
  }
}

/**
 * Update weekend work settings for all planning details of a specific quote and plan.
 */
export async function updateWeekendSettings(
  quoteId: string,
  planId: number,
  workOnSaturday: boolean,
  workOnSunday: boolean
): Promise<void> {
    if (!quoteId || typeof planId !== 'number') {
        console.warn("updateWeekendSettings called with invalid quoteId or planId.");
        return;
    }
    console.log(`[Planning Service] Updating weekend settings for Quote ${quoteId}, Plan ${planId}: Sat=${workOnSaturday}, Sun=${workOnSunday}`);
    try {
        // Update weekend settings across all resources for this plan/quote combo
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
        console.log(`[Planning Service] Weekend settings updated successfully.`);

    } catch (err: any) {
        console.error("[Planning Service] Error updating weekend settings:", err);
        throw new Error(`Failed to update weekend settings: ${err.message}`);
    }
}
