
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

/**
 * Service to sync data changes across related database tables
 * This ensures data consistency when changes are made in settings
 */
export const dataSyncService = {
  /**
   * Updates all planning details when machine type details are changed
   * @param machineTypeId - The ID of the machine type that was changed
   */
  async syncMachineTypeChanges(machineTypeId: number): Promise<void> {
    try {
      console.log(`Syncing changes for machine type ID: ${machineTypeId}`);
      
      // Find all quotes that use this machine type
      const { data: affectedQuotes, error: quotesError } = await supabase
        .from("quotes")
        .select("quote_id")
        .contains("machine_type_ids", [machineTypeId]);
      
      if (quotesError) {
        throw quotesError;
      }
      
      if (!affectedQuotes || affectedQuotes.length === 0) {
        console.log(`No quotes found using machine type ${machineTypeId}`);
        return;
      }
      
      console.log(`Found ${affectedQuotes.length} quotes using machine type ${machineTypeId}`);
      
      // For each affected quote, update associated planning details
      for (const quote of affectedQuotes) {
        await this.refreshPlanningDetailsForQuote(quote.quote_id);
      }
      
      console.log(`Successfully synced planning details for machine type ${machineTypeId}`);
    } catch (error) {
      console.error("Error syncing machine type changes:", error);
    }
  },
  
  /**
   * Updates all planning details when software type details are changed
   * @param softwareTypeId - The ID of the software type that was changed
   */
  async syncSoftwareTypeChanges(softwareTypeId: number): Promise<void> {
    try {
      console.log(`Syncing changes for software type ID: ${softwareTypeId}`);
      
      // Find all quotes that use this software type
      const { data: affectedQuotes, error: quotesError } = await supabase
        .from("quotes")
        .select("quote_id")
        .contains("software_type_ids", [softwareTypeId]);
      
      if (quotesError) {
        throw quotesError;
      }
      
      if (!affectedQuotes || affectedQuotes.length === 0) {
        console.log(`No quotes found using software type ${softwareTypeId}`);
        return;
      }
      
      console.log(`Found ${affectedQuotes.length} quotes using software type ${softwareTypeId}`);
      
      // For each affected quote, update associated planning details
      for (const quote of affectedQuotes) {
        await this.refreshPlanningDetailsForQuote(quote.quote_id);
      }
      
      console.log(`Successfully synced planning details for software type ${softwareTypeId}`);
    } catch (error) {
      console.error("Error syncing software type changes:", error);
    }
  },

  /**
   * Updates all planning details when resource details are changed
   * @param resourceId - The ID of the resource that was changed
   */
  async syncResourceChanges(resourceId: number): Promise<void> {
    try {
      console.log(`Syncing changes for resource ID: ${resourceId}`);
      
      // Find all planning details that use this resource
      const { data: affectedDetails, error: detailsError } = await supabase
        .from("planning_details")
        .select("quote_id")
        .eq("resource_id", resourceId);
      
      if (detailsError) {
        throw detailsError;
      }
      
      if (!affectedDetails || affectedDetails.length === 0) {
        console.log(`No planning details found using resource ${resourceId}`);
        return;
      }
      
      // Get unique quote IDs
      const quoteIds = [...new Set(affectedDetails.map(detail => detail.quote_id))];
      
      console.log(`Found ${quoteIds.length} quotes using resource ${resourceId}`);
      
      // For each affected quote, update associated planning details
      for (const quoteId of quoteIds) {
        await this.refreshPlanningDetailsForQuote(quoteId);
      }
      
      console.log(`Successfully synced planning details for resource ${resourceId}`);
    } catch (error) {
      console.error("Error syncing resource changes:", error);
    }
  },

  /**
   * Updates all planning details when training plan details are changed
   * @param planId - The ID of the training plan that was changed
   */
  async syncTrainingPlanChanges(planId: number): Promise<void> {
    try {
      console.log(`Syncing changes for training plan ID: ${planId}`);
      
      // Find all planning details that use this plan
      const { data: affectedDetails, error: detailsError } = await supabase
        .from("planning_details")
        .select("quote_id")
        .eq("plan_id", planId);
      
      if (detailsError) {
        throw detailsError;
      }
      
      if (!affectedDetails || affectedDetails.length === 0) {
        console.log(`No planning details found using plan ${planId}`);
        return;
      }
      
      // Get unique quote IDs
      const quoteIds = [...new Set(affectedDetails.map(detail => detail.quote_id))];
      
      console.log(`Found ${quoteIds.length} quotes using plan ${planId}`);
      
      // For each affected quote, update associated planning details
      for (const quoteId of quoteIds) {
        await this.refreshPlanningDetailsForQuote(quoteId);
      }
      
      console.log(`Successfully synced planning details for plan ${planId}`);
    } catch (error) {
      console.error("Error syncing training plan changes:", error);
    }
  },

  /**
   * Updates all planning details when training offer details are changed
   * This is handled by useTrainingOffers already, but included for completeness
   */
  async syncTrainingOfferChanges(machineTypeId: number | null, softwareTypeId: number | null, planId: number): Promise<void> {
    try {
      console.log(`Syncing changes for training offer: machine=${machineTypeId}, software=${softwareTypeId}, plan=${planId}`);
      
      // Find all quotes that use this machine or software type
      if (machineTypeId) {
        const { data: affectedQuotes, error: quotesError } = await supabase
          .from("quotes")
          .select("quote_id")
          .contains("machine_type_ids", [machineTypeId]);
        
        if (quotesError) throw quotesError;
        
        if (affectedQuotes && affectedQuotes.length > 0) {
          console.log(`Found ${affectedQuotes.length} quotes using machine type ${machineTypeId}`);
          
          for (const quote of affectedQuotes) {
            await this.refreshPlanningDetailsForQuote(quote.quote_id);
          }
        }
      } else if (softwareTypeId) {
        const { data: affectedQuotes, error: quotesError } = await supabase
          .from("quotes")
          .select("quote_id")
          .contains("software_type_ids", [softwareTypeId]);
        
        if (quotesError) throw quotesError;
        
        if (affectedQuotes && affectedQuotes.length > 0) {
          console.log(`Found ${affectedQuotes.length} quotes using software type ${softwareTypeId}`);
          
          for (const quote of affectedQuotes) {
            await this.refreshPlanningDetailsForQuote(quote.quote_id);
          }
        }
      }
      
      console.log(`Successfully synced planning details for training offer`);
    } catch (error) {
      console.error("Error syncing training offer changes:", error);
    }
  },

  /**
   * Updates all planning details when area cost details are changed
   * @param areaId - The ID of the area that was changed
   */
  async syncAreaCostChanges(areaId: number): Promise<void> {
    try {
      console.log(`Syncing changes for area ID: ${areaId}`);
      
      // Find all quotes that use this area
      const { data: affectedQuotes, error: quotesError } = await supabase
        .from("quotes")
        .select("quote_id")
        .eq("area_id", areaId);
      
      if (quotesError) {
        throw quotesError;
      }
      
      if (!affectedQuotes || affectedQuotes.length === 0) {
        console.log(`No quotes found using area ${areaId}`);
        return;
      }
      
      console.log(`Found ${affectedQuotes.length} quotes using area ${areaId}`);
      
      // For each affected quote, update associated planning details
      for (const quote of affectedQuotes) {
        await this.refreshPlanningDetailsForQuote(quote.quote_id);
      }
      
      console.log(`Successfully synced planning details for area ${areaId}`);
    } catch (error) {
      console.error("Error syncing area cost changes:", error);
    }
  },

  /**
   * Refreshes all planning details for a specific quote
   * This is the core function that ensures data consistency
   * @param quoteId - The ID of the quote to refresh planning details for
   */
  async refreshPlanningDetailsForQuote(quoteId: string): Promise<void> {
    try {
      console.log(`Refreshing planning details for quote: ${quoteId}`);
      
      // Get the quote with machine and software types
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("quote_id", quoteId)
        .single();
      
      if (quoteError) {
        throw quoteError;
      }
      
      if (!quote) {
        console.error(`Quote ${quoteId} not found`);
        return;
      }
      
      const machineTypeIds = quote.machine_type_ids || [];
      const softwareTypeIds = quote.software_type_ids || [];
      const workOnSaturday = quote.work_on_saturday || false;
      const workOnSunday = quote.work_on_sunday || false;
      
      // For each machine type, update planning details
      for (const machineTypeId of machineTypeIds) {
        // Get all training offers for this machine type
        const { data: offers, error: offersError } = await supabase
          .from("training_offers")
          .select("plan_id, hours_required")
          .eq("machine_type_id", machineTypeId);
        
        if (offersError) {
          throw offersError;
        }
        
        if (offers && offers.length > 0) {
          for (const offer of offers) {
            // Get the resource assigned to this machine type and plan
            const { data: requirement, error: reqError } = await supabase
              .from("machine_training_requirements")
              .select("resource_id")
              .eq("machine_type_id", machineTypeId)
              .eq("plan_id", offer.plan_id)
              .maybeSingle();
            
            if (reqError) {
              console.error(`Error getting resource for machine ${machineTypeId}, plan ${offer.plan_id}:`, reqError);
              continue;
            }
            
            // Update or insert planning detail
            await this.upsertPlanningDetail({
              quoteId,
              planId: offer.plan_id,
              resourceCategory: 'Machine',
              machineTypesId: machineTypeId,
              softwareTypesId: null,
              resourceId: requirement?.resource_id || null,
              allocatedHours: offer.hours_required,
              workOnSaturday,
              workOnSunday
            });
          }
        }
      }
      
      // For each software type, update planning details
      for (const softwareTypeId of softwareTypeIds) {
        // Get all training offers for this software type
        const { data: offers, error: offersError } = await supabase
          .from("training_offers")
          .select("plan_id, hours_required")
          .eq("software_type_id", softwareTypeId);
        
        if (offersError) {
          throw offersError;
        }
        
        if (offers && offers.length > 0) {
          for (const offer of offers) {
            // Get the resource assigned to this software type and plan
            const { data: requirement, error: reqError } = await supabase
              .from("software_training_requirements")
              .select("resource_id")
              .eq("software_type_id", softwareTypeId)
              .eq("plan_id", offer.plan_id)
              .maybeSingle();
            
            if (reqError) {
              console.error(`Error getting resource for software ${softwareTypeId}, plan ${offer.plan_id}:`, reqError);
              continue;
            }
            
            // Update or insert planning detail
            await this.upsertPlanningDetail({
              quoteId,
              planId: offer.plan_id,
              resourceCategory: 'Software',
              machineTypesId: null,
              softwareTypesId: softwareTypeId,
              resourceId: requirement?.resource_id || null,
              allocatedHours: offer.hours_required,
              workOnSaturday,
              workOnSunday
            });
          }
        }
      }
      
      console.log(`Successfully refreshed planning details for quote ${quoteId}`);
    } catch (error) {
      console.error(`Error refreshing planning details for quote ${quoteId}:`, error);
    }
  },

  /**
   * Updates or inserts a planning detail
   * @param params - Parameters for the planning detail
   */
  async upsertPlanningDetail(params: {
    quoteId: string;
    planId: number;
    resourceCategory: 'Machine' | 'Software';
    machineTypesId: number | null;
    softwareTypesId: number | null;
    resourceId: number | null;
    allocatedHours: number;
    workOnSaturday: boolean;
    workOnSunday: boolean;
  }): Promise<void> {
    try {
      const { 
        quoteId, 
        planId, 
        resourceCategory, 
        machineTypesId, 
        softwareTypesId, 
        resourceId,
        allocatedHours,
        workOnSaturday,
        workOnSunday
      } = params;
      
      // First check if a planning detail already exists
      let whereClause = {
        quote_id: quoteId,
        plan_id: planId,
        resource_category: resourceCategory
      };
      
      // Add the type_id condition based on resource category
      if (resourceCategory === 'Machine') {
        Object.assign(whereClause, { machine_types_id: machineTypesId });
      } else {
        Object.assign(whereClause, { software_types_id: softwareTypesId });
      }
      
      const { data: existingDetail, error: findError } = await supabase
        .from("planning_details")
        .select("id")
        .match(whereClause)
        .maybeSingle();
      
      if (findError) {
        throw findError;
      }
      
      if (existingDetail) {
        // Update existing detail
        const { error: updateError } = await supabase
          .from("planning_details")
          .update({
            resource_id: resourceId,
            allocated_hours: allocatedHours,
            work_on_saturday: workOnSaturday,
            work_on_sunday: workOnSunday,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingDetail.id);
        
        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new detail
        const { error: insertError } = await supabase
          .from("planning_details")
          .insert({
            quote_id: quoteId,
            plan_id: planId,
            resource_category: resourceCategory,
            machine_types_id: machineTypesId,
            software_types_id: softwareTypesId,
            resource_id: resourceId,
            allocated_hours: allocatedHours,
            work_on_saturday: workOnSaturday,
            work_on_sunday: workOnSunday
          });
        
        if (insertError) {
          throw insertError;
        }
      }
    } catch (error) {
      console.error("Error updating planning detail:", error);
      throw error;
    }
  }
};
