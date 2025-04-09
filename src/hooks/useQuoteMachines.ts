
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MachineType } from "@/hooks/useMachineTypes";
import { toast } from "sonner";

export interface QuoteMachine {
  machine_type_id: number;
  name: string;
  description?: string;
  photo_url?: string;
}

export interface QuoteWithMachines {
  quote_id: string;
  quote_name: string;
  client_name?: string | null;
  created_at: string;
  area_id?: number;
  machine_type_ids: number[];
  machines: QuoteMachine[];
}

export const useQuoteMachines = (quoteId: string | undefined) => {
  const [selectedMachines, setSelectedMachines] = useState<QuoteMachine[]>([]);
  const [machineTypeIds, setMachineTypeIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuoteMachines = async () => {
    if (!quoteId) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching machines for quote:", quoteId);
      
      // Use the new RPC function to get quote with machines
      const { data, error: fetchError } = await supabase
        .rpc('get_quote_with_machines', { quote_id_param: quoteId });
      
      if (fetchError) throw fetchError;
      
      console.log("Quote with machines data:", data);
      
      if (data) {
        // Set the machine type IDs
        setMachineTypeIds(data.machine_type_ids || []);
        
        // Set the selected machines
        const machines = data.machines ? JSON.parse(JSON.stringify(data.machines)) : [];
        setSelectedMachines(machines);
      } else {
        setMachineTypeIds([]);
        setSelectedMachines([]);
      }
    } catch (err: any) {
      console.error("Error fetching quote machines:", err);
      setError(err.message || "Failed to load quote machines");
      toast.error("Failed to load quote machines");
    } finally {
      setLoading(false);
    }
  };

  const saveMachines = async (quoteId: string, machineIds: number[]) => {
    if (!quoteId) return false;
    
    try {
      setLoading(true);
      
      // Call the new function to update machine types directly in quotes table
      const { error } = await supabase
        .rpc('update_quote_machines_direct', { 
          quote_id_param: quoteId,
          machine_ids: machineIds
        });
      
      if (error) throw error;
      
      // Update local state
      setMachineTypeIds(machineIds);
      
      // Refresh the machine list to get updated data
      await fetchQuoteMachines();
      toast.success("Machine selection saved successfully");
      return true;
    } catch (err: any) {
      console.error("Error saving quote machines:", err);
      setError(err.message || "Failed to save machine selection");
      toast.error("Failed to save machine selection");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeMachine = async (machineTypeId: number) => {
    try {
      setLoading(true);
      
      // Filter out the machine type ID from the current list
      const updatedMachineIds = machineTypeIds.filter(id => id !== machineTypeId);
      
      // Update the quote with the new machine type IDs
      const { error } = await supabase
        .rpc('update_quote_machines_direct', {
          quote_id_param: quoteId,
          machine_ids: updatedMachineIds
        });
      
      if (error) throw error;
      
      // Update local state
      setMachineTypeIds(updatedMachineIds);
      setSelectedMachines(prev => prev.filter(machine => machine.machine_type_id !== machineTypeId));
      
      toast.success("Machine removed successfully");
    } catch (err: any) {
      console.error("Error removing machine:", err);
      toast.error("Failed to remove machine");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteMachines();
  }, [quoteId]);

  return {
    selectedMachines,
    machineTypeIds,
    loading,
    error,
    fetchQuoteMachines,
    saveMachines,
    removeMachine
  };
};
