import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync"; // Import the sync hook

export interface QuoteMachine {
  machine_type_id: number;
  name: string;
  description?: string;
  photo_url?: string;
}

export const useQuoteMachines = (quoteId: string | undefined) => {
  const [selectedMachines, setSelectedMachines] = useState<QuoteMachine[]>([]);
  const [machineTypeIds, setMachineTypeIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { syncQuotePlanningDetails } = usePlanningDetailsSync(); // Get the consolidated sync function

  const fetchQuoteMachines = useCallback(async () => {
    if (!quoteId) {
        setMachineTypeIds([]);
        setSelectedMachines([]);
        setError(null);
        setLoading(false);
        return;
    }

    console.log("useQuoteMachines: Fetching machines for quote:", quoteId);
    setLoading(true);
    setError(null);

    try {
      const { data: quoteData, error: fetchError } = await supabase
        .from('quotes')
        .select('machine_type_ids')
        .eq('quote_id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      const currentMachineIds = quoteData?.machine_type_ids || [];
      console.log("useQuoteMachines: Fetched machine IDs:", currentMachineIds);
      setMachineTypeIds(currentMachineIds);

      if (currentMachineIds.length > 0) {
        const { data: machinesData, error: machineError } = await supabase
          .from('machine_types')
          .select('machine_type_id, name, description, photo_url')
          .in('machine_type_id', currentMachineIds);

        if (machineError) throw machineError;

        console.log("useQuoteMachines: Fetched machine details:", machinesData);
        setSelectedMachines(machinesData || []);
      } else {
        setSelectedMachines([]);
      }
    } catch (err: any) {
      console.error("useQuoteMachines: Error fetching quote machines:", err);
      const message = err.message || "Failed to load quote machines";
      setError(message);
      toast.error(message);
      setMachineTypeIds([]);
      setSelectedMachines([]);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  const saveMachines = async (quoteIdParam: string, machineIdsToSave: number[]) => {
    if (!quoteIdParam) {
        toast.error("Cannot save machines without a valid Quote ID.");
        return false;
    }

    console.log(`useQuoteMachines: Saving machines [${machineIdsToSave.join(', ')}] for quote ${quoteIdParam}`);
    // Use a temporary loading state for the save operation itself if needed,
    // separate from the main hook loading state which is for fetching.
    // setLoading(true);
    let success = false;
    try {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ machine_type_ids: machineIdsToSave })
        .eq('quote_id', quoteIdParam);

      if (updateError) throw updateError;

      console.log("useQuoteMachines: Successfully updated quote's machine_type_ids.");

      // --- Trigger Sync AFTER successful save ---
      console.log("useQuoteMachines: Triggering planning details sync after saving machines.");
      await syncQuotePlanningDetails(quoteIdParam); // Pass the relevant quote ID
      // -----------------------------------------

      // Update local state only if the save was for the hook's current quoteId
      if (quoteIdParam === quoteId) {
          setMachineTypeIds(machineIdsToSave);
          // Re-fetch machine details after sync might have changed things
          await fetchQuoteMachines();
      }

      toast.success("Machine selection saved successfully.");
      success = true; // Mark as success

    } catch (err: any) {
      console.error("useQuoteMachines: Error saving quote machines:", err);
      const message = err.message || "Failed to save machine selection";
      setError(message); // Set error state
      toast.error(message);
      success = false; // Mark as failure
    } finally {
      // setLoading(false);
    }
    return success; // Return success status
  };

  const removeMachine = async (machineTypeIdToRemove: number) => {
    if (!quoteId) {
         toast.error("Cannot remove machine without a valid Quote ID.");
         return false;
    }

    console.log(`useQuoteMachines: Removing machine ${machineTypeIdToRemove} from quote ${quoteId}`);
    // Use a temporary loading state if needed
    // setLoading(true);
    let success = false;
    try {
      const updatedMachineIds = machineTypeIds.filter(id => id !== machineTypeIdToRemove);

      const { error: updateError } = await supabase
        .from('quotes')
        .update({ machine_type_ids: updatedMachineIds })
        .eq('quote_id', quoteId);

      if (updateError) throw updateError;

      console.log("useQuoteMachines: Successfully updated quote after machine removal.");

      // --- Trigger Sync AFTER successful removal ---
      console.log("useQuoteMachines: Triggering planning details sync after removing machine.");
      await syncQuotePlanningDetails(quoteId); // Pass the current quote ID
      // ------------------------------------------

      // Update local state immediately
      setMachineTypeIds(updatedMachineIds);
      setSelectedMachines(prev => prev.filter(machine => machine.machine_type_id !== machineTypeIdToRemove));

      toast.success("Machine removed successfully.");
      success = true;
    } catch (err: any) {
      console.error("useQuoteMachines: Error removing machine:", err);
      const message = err.message || "Failed to remove machine";
      setError(message);
      toast.error(message);
      success = false;
    } finally {
      // setLoading(false);
    }
    return success;
  };

  useEffect(() => {
    fetchQuoteMachines();
  }, [fetchQuoteMachines]);

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