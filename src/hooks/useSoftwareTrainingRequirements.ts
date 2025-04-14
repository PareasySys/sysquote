
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface SoftwareTrainingRequirement {
  id: number;
  software_type_id: number;
  plan_id: number;
  resource_id: number | null;
  created_at?: string;
}

export const useSoftwareTrainingRequirements = (softwareTypeId?: number) => {
  const [requirements, setRequirements] = useState<SoftwareTrainingRequirement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirements = async () => {
    if (!softwareTypeId) {
      setRequirements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use 'as any' to bypass the type checking for table names
      const { data, error } = await (supabase
        .from("software_training_requirements" as any)
        .select("*")
        .eq("software_type_id", softwareTypeId)) as unknown as {
          data: SoftwareTrainingRequirement[] | null;
          error: any;
        };
      
      if (error) throw error;
      
      setRequirements(data || []);
    } catch (err: any) {
      console.error("Error fetching software training requirements:", err);
      setError(err.message || "Failed to load training requirements");
    } finally {
      setLoading(false);
    }
  };

  const saveRequirement = async (planId: number, resourceId: number) => {
    if (!softwareTypeId) return;
    
    try {
      // Check if requirement already exists
      const existingReq = requirements.find(req => req.plan_id === planId);
      
      if (existingReq) {
        // Update existing requirement
        const { error } = await (supabase
          .from("software_training_requirements" as any)
          .update({ resource_id: resourceId })
          .eq("id", existingReq.id)) as unknown as {
            error: any;
          };
        
        if (error) throw error;
        
        setRequirements(prev => 
          prev.map(req => req.id === existingReq.id 
            ? { ...req, resource_id: resourceId } 
            : req
          )
        );
        
        // Update any existing planning_details for quotes that use this software
        await updatePlanningDetailsForSoftware(softwareTypeId, planId, resourceId);
      } else {
        // Create new requirement
        const { data, error } = await (supabase
          .from("software_training_requirements" as any)
          .insert({
            software_type_id: softwareTypeId,
            plan_id: planId,
            resource_id: resourceId
          })
          .select()) as unknown as {
            data: SoftwareTrainingRequirement[] | null;
            error: any;
          };
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setRequirements(prev => [...prev, data[0]]);
          
          // Update any existing planning_details for quotes that use this software
          await updatePlanningDetailsForSoftware(softwareTypeId, planId, resourceId);
        }
      }
      
      toast.success("Training requirement saved");
    } catch (err: any) {
      console.error("Error saving software training requirement:", err);
      toast.error(err.message || "Failed to save requirement");
    }
  };

  // New function to update planning_details for all quotes that use this software
  const updatePlanningDetailsForSoftware = async (
    softwareTypeId: number,
    planId: number,
    resourceId: number
  ) => {
    try {
      // First, find all quotes that have this software in their software_type_ids array
      const { data: quotesWithSoftware, error: quotesError } = await supabase
        .from("quotes")
        .select("quote_id")
        .contains("software_type_ids", [softwareTypeId]);
      
      if (quotesError) {
        console.error("Error finding quotes with software:", quotesError);
        return;
      }
      
      if (!quotesWithSoftware || quotesWithSoftware.length === 0) {
        console.log("No quotes found with this software");
        return;
      }
      
      console.log(`Found ${quotesWithSoftware.length} quotes with software type ${softwareTypeId}`);
      
      // For each quote, update or create planning details
      for (const quote of quotesWithSoftware) {
        const quoteId = quote.quote_id;
        
        // Check if planning detail already exists
        const { data: existingDetail, error: detailError } = await supabase
          .from("planning_details")
          .select("id")
          .eq("quote_id", quoteId)
          .eq("plan_id", planId)
          .eq("software_types_id", softwareTypeId);
        
        if (detailError) {
          console.error(`Error checking planning details for quote ${quoteId}:`, detailError);
          continue;
        }
        
        if (existingDetail && existingDetail.length > 0) {
          // Update existing planning detail
          const { error: updateError } = await supabase
            .from("planning_details")
            .update({
              resource_id: resourceId,
              resource_category: "Software",
              updated_at: new Date().toISOString()
            })
            .eq("id", existingDetail[0].id);
          
          if (updateError) {
            console.error(`Error updating planning detail for quote ${quoteId}:`, updateError);
          } else {
            console.log(`Updated planning detail for quote ${quoteId} with resource ${resourceId}`);
          }
        } else {
          // Create new planning detail
          const { error: insertError } = await supabase
            .from("planning_details")
            .insert({
              quote_id: quoteId,
              plan_id: planId,
              software_types_id: softwareTypeId,
              resource_id: resourceId,
              resource_category: "Software",
              allocated_hours: 4, // Default to 4 hours for software training
              work_on_saturday: false,
              work_on_sunday: false
            });
          
          if (insertError) {
            console.error(`Error creating planning detail for quote ${quoteId}:`, insertError);
          } else {
            console.log(`Created planning detail for quote ${quoteId} with resource ${resourceId}`);
          }
        }
      }
    } catch (err) {
      console.error("Error updating planning details:", err);
    }
  };

  const removeRequirement = async (planId: number) => {
    if (!softwareTypeId) return;

    const existingReq = requirements.find(req => req.plan_id === planId);
    if (!existingReq) return;
    
    try {
      const { error } = await (supabase
        .from("software_training_requirements" as any)
        .delete()
        .eq("id", existingReq.id)) as unknown as {
          error: any;
        };
      
      if (error) throw error;
      
      // Remove resource ID from planning_details for all quotes that use this software
      await removeResourceFromPlanningDetails(softwareTypeId, planId);
      
      setRequirements(prev => prev.filter(req => req.id !== existingReq.id));
      toast.success("Training requirement removed");
    } catch (err: any) {
      console.error("Error removing software training requirement:", err);
      toast.error(err.message || "Failed to remove requirement");
    }
  };

  // New function to remove resource ID from planning_details
  const removeResourceFromPlanningDetails = async (
    softwareTypeId: number,
    planId: number
  ) => {
    try {
      // Find all quotes that have this software
      const { data: quotesWithSoftware, error: quotesError } = await supabase
        .from("quotes")
        .select("quote_id")
        .contains("software_type_ids", [softwareTypeId]);
      
      if (quotesError) {
        console.error("Error finding quotes with software:", quotesError);
        return;
      }
      
      if (!quotesWithSoftware || quotesWithSoftware.length === 0) return;
      
      // For each quote, set the resource_id to null in planning_details
      for (const quote of quotesWithSoftware) {
        const { error: updateError } = await supabase
          .from("planning_details")
          .update({
            resource_id: null,
            updated_at: new Date().toISOString()
          })
          .eq("quote_id", quote.quote_id)
          .eq("plan_id", planId)
          .eq("software_types_id", softwareTypeId);
        
        if (updateError) {
          console.error(`Error updating planning detail for quote ${quote.quote_id}:`, updateError);
        }
      }
    } catch (err) {
      console.error("Error removing resource from planning details:", err);
    }
  };

  const getResourceForPlan = (planId: number): number | undefined => {
    const req = requirements.find(req => req.plan_id === planId);
    return req?.resource_id || undefined;
  };

  useEffect(() => {
    fetchRequirements();
  }, [softwareTypeId]);

  return {
    requirements,
    loading,
    error,
    saveRequirement,
    removeRequirement,
    getResourceForPlan,
    fetchRequirements
  };
};
