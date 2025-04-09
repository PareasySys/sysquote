
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MachineType } from "@/hooks/useMachineTypes";
import { toast } from "sonner";

export interface QuoteMachine {
  id: string;
  quote_id: string;
  machine_type_id: number;
  created_at: string;
  machine?: MachineType;
}

export const useQuoteMachines = (quoteId: string | undefined) => {
  const [selectedMachines, setSelectedMachines] = useState<QuoteMachine[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuoteMachines = async () => {
    if (!quoteId) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching machines for quote:", quoteId);
      
      // Use raw SQL query through rpc to bypass TypeScript limitations
      const { data, error: fetchError } = await supabase
        .rpc('get_quote_machines', { quote_id_param: quoteId });
      
      if (fetchError) throw fetchError;
      
      console.log("Quote machines data:", data);
      
      // Transform the data to match our expected interface
      const formattedMachines = data ? data.map((item: any) => ({
        id: item.id,
        quote_id: item.quote_id,
        machine_type_id: item.machine_type_id,
        created_at: item.created_at,
        machine: item.machine_details
      })) : [];
      
      setSelectedMachines(formattedMachines);
    } catch (err: any) {
      console.error("Error fetching quote machines:", err);
      setError(err.message || "Failed to load quote machines");
      toast.error("Failed to load quote machines");
    } finally {
      setLoading(false);
    }
  };

  const saveMachines = async (quoteId: string, machineIds: number[]) => {
    if (!quoteId) return;
    
    try {
      setLoading(true);
      
      // Call a stored procedure to handle the update
      const { error } = await supabase
        .rpc('update_quote_machines', { 
          quote_id_param: quoteId,
          machine_ids: machineIds
        });
      
      if (error) throw error;
      
      // Refresh the machine list
      fetchQuoteMachines();
      toast.success("Machine selection saved successfully");
    } catch (err: any) {
      console.error("Error saving quote machines:", err);
      setError(err.message || "Failed to save machine selection");
      toast.error("Failed to save machine selection");
      return false;
    } finally {
      setLoading(false);
    }
    
    return true;
  };

  const removeMachine = async (machineId: string) => {
    try {
      setLoading(true);
      
      // Direct delete using REST API
      const { error } = await supabase
        .from('quote_machines')
        .delete()
        .eq('id', machineId);
      
      if (error) throw error;
      
      // Update the state by removing the deleted machine
      setSelectedMachines(prev => prev.filter(machine => machine.id !== machineId));
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
    loading,
    error,
    fetchQuoteMachines,
    saveMachines,
    removeMachine
  };
};
