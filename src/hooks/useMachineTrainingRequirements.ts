
import { useState, useEffect } from "react";
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

  const fetchRequirements = async () => {
    if (!machineTypeId) {
      setRequirements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching machine training requirements for machine type ID:", machineTypeId);
      
      const { data, error } = await supabase
        .from("machine_training_requirements")
        .select("*")
        .eq("machine_type_id", machineTypeId);
      
      if (error) throw error;
      
      console.log("Machine training requirements fetched:", data);
      setRequirements(data || []);
    } catch (err: any) {
      console.error("Error fetching machine training requirements:", err);
      setError(err.message || "Failed to load machine training requirements");
    } finally {
      setLoading(false);
    }
  };

  const saveRequirement = async (planId: number, resourceId: number) => {
    if (!machineTypeId) return null;

    try {
      // Check if a requirement for this plan already exists
      const existingIndex = requirements.findIndex(r => r.plan_id === planId);
      
      if (existingIndex !== -1) {
        // Update existing requirement
        const { data, error } = await supabase
          .from("machine_training_requirements")
          .update({ resource_id: resourceId })
          .eq("id", requirements[existingIndex].id)
          .select();

        if (error) throw error;
        
        const updatedRequirements = [...requirements];
        updatedRequirements[existingIndex] = data[0];
        
        setRequirements(updatedRequirements);
        return data[0];
      } else {
        // Create new requirement
        const { data, error } = await supabase
          .from("machine_training_requirements")
          .insert({
            machine_type_id: machineTypeId,
            plan_id: planId,
            resource_id: resourceId
          })
          .select();

        if (error) throw error;
        
        setRequirements([...requirements, data[0]]);
        return data[0];
      }
    } catch (err: any) {
      console.error("Error saving machine training requirement:", err);
      toast.error(err.message || "Failed to save machine training requirement");
      return null;
    }
  };

  const deleteRequirement = async (planId: number) => {
    if (!machineTypeId) return false;

    try {
      const { error } = await supabase
        .from("machine_training_requirements")
        .delete()
        .eq("machine_type_id", machineTypeId)
        .eq("plan_id", planId);

      if (error) throw error;
      
      setRequirements(requirements.filter(r => r.plan_id !== planId));
      return true;
    } catch (err: any) {
      console.error("Error deleting machine training requirement:", err);
      toast.error(err.message || "Failed to delete machine training requirement");
      return false;
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [machineTypeId]);

  return {
    requirements,
    loading,
    error,
    fetchRequirements,
    saveRequirement,
    deleteRequirement
  };
};
