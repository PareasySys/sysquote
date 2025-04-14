
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
        }
      }
      
      toast.success("Training requirement saved");
    } catch (err: any) {
      console.error("Error saving software training requirement:", err);
      toast.error(err.message || "Failed to save requirement");
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
      
      setRequirements(prev => prev.filter(req => req.id !== existingReq.id));
      toast.success("Training requirement removed");
    } catch (err: any) {
      console.error("Error removing software training requirement:", err);
      toast.error(err.message || "Failed to remove requirement");
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
