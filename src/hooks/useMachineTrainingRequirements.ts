
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface MachineTrainingRequirement {
  id: number;
  machine_type_id: number;
  plan_id: number;
  resource_id: number;
  created_at: string;
}

export const useMachineTrainingRequirements = (machineTypeId?: number) => {
  const [requirements, setRequirements] = useState<MachineTrainingRequirement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the fetchRequirements function
  const fetchRequirements = useCallback(async () => {
    if (!machineTypeId) {
      setRequirements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching machine training requirements for machine type ID:", machineTypeId);
      
      const { data, error: fetchError } = await supabase
        .from('machine_training_requirements')
        .select('*')
        .eq('machine_type_id', machineTypeId);
      
      if (fetchError) throw fetchError;
      
      console.log("Machine training requirements fetched:", data);
      setRequirements(data as MachineTrainingRequirement[]);
    } catch (err: any) {
      console.error("Error fetching machine training requirements:", err);
      setError(err.message || "Failed to load machine training requirements");
    } finally {
      setLoading(false);
    }
  }, [machineTypeId]);

  // Memoize the saveRequirement function
  const saveRequirement = useCallback(async (planId: number, resourceId: number) => {
    if (!machineTypeId) return null;

    try {
      // Check if a requirement for this plan already exists
      const existingIndex = requirements.findIndex(r => r.plan_id === planId);
      
      if (existingIndex !== -1) {
        // Update existing requirement
        const { data, error: updateError } = await supabase
          .from('machine_training_requirements')
          .update({ resource_id: resourceId })
          .eq('id', requirements[existingIndex].id)
          .select();

        if (updateError) throw updateError;
        
        const updatedRequirements = [...requirements];
        updatedRequirements[existingIndex] = data[0] as MachineTrainingRequirement;
        
        setRequirements(updatedRequirements);
        return data[0] as MachineTrainingRequirement;
      } else {
        // Create new requirement
        const { data, error: insertError } = await supabase
          .from('machine_training_requirements')
          .insert({
            machine_type_id: machineTypeId,
            plan_id: planId,
            resource_id: resourceId
          })
          .select();

        if (insertError) throw insertError;
        
        setRequirements([...requirements, data[0] as MachineTrainingRequirement]);
        return data[0] as MachineTrainingRequirement;
      }
    } catch (err: any) {
      console.error("Error saving machine training requirement:", err);
      toast.error(err.message || "Failed to save machine training requirement");
      return null;
    }
  }, [machineTypeId, requirements]);

  // Memoize the deleteRequirement function
  const deleteRequirement = useCallback(async (planId: number) => {
    if (!machineTypeId) return false;

    try {
      const { error: deleteError } = await supabase
        .from('machine_training_requirements')
        .delete()
        .eq('machine_type_id', machineTypeId)
        .eq('plan_id', planId);

      if (deleteError) throw deleteError;
      
      setRequirements(requirements.filter(r => r.plan_id !== planId));
      return true;
    } catch (err: any) {
      console.error("Error deleting machine training requirement:", err);
      toast.error(err.message || "Failed to delete machine training requirement");
      return false;
    }
  }, [machineTypeId, requirements]);

  // Memoize the getResourceForPlan function
  const getResourceForPlan = useCallback((planId: number): number | undefined => {
    const req = requirements.find(r => r.plan_id === planId);
    return req?.resource_id;
  }, [requirements]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  return {
    requirements,
    loading,
    error,
    fetchRequirements,
    saveRequirement,
    deleteRequirement,
    getResourceForPlan
  };
};
