import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync"; // Import the sync hook

export interface QuoteMachine {
  machine_type_id: number;
  name: string;
  description?: string;
  photo_url?: string;
}

// Removed QuoteWithMachines interface as it wasn't directly used by the hook's return

export const useQuoteMachines = (quoteId: string | undefined) => {
  const [selectedMachines, setSelectedMachines] = useState<QuoteMachine[]>([]);
  const [machineTypeIds, setMachineTypeIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { syncAllPlanningDetails } = usePlanningDetailsSync(); // Get the sync function

  const fetchQuoteMachines = useCallback(async () => {
    if (!quoteId) {
        // Clear state if quoteId becomes invalid
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
      // Fetch quote data including machine_type_ids
      const { data: quoteData, error: fetchError } = await supabase
        .from('quotes')
        .select('machine_type_ids') // Only need the IDs here
        .eq('quote_id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      const currentMachineIds = quoteData?.machine_type_ids || [];
      console.log("useQuoteMachines: Fetched machine IDs:", currentMachineIds);
      setMachineTypeIds(currentMachineIds);

      // If we have machine ids, fetch their details
      if (currentMachineIds.length > 0) {
        const { data: machinesData, error: machineError } = await supabase
          .from('machine_types')
          .select('machine_type_id, name, description, photo_url')
          .in('machine_type_id', currentMachineIds);

        if (machineError) throw machineError;

        console.log("useQuoteMachines: Fetched machine details:", machinesData);
        setSelectedMachines(machinesData || []);
      } else {
        setSelectedMachines([]); // Clear machines if no IDs
      }
    } catch (err: any) {
      console.error("useQuoteMachines: Error fetching quote machines:", err);
      const message = err.message || "Failed to load quote machines";
      setError(message);
      toast.error(message);
      // Clear state on error
      setMachineTypeIds([]);
      setSelectedMachines([]);
    } finally {
      setLoading(false);
    }
  }, [quoteId]); // Dependency: fetch when quoteId changes

  const saveMachines = async (quoteIdParam: string, machineIdsToSave: number[]) => {
    // Ensure quoteIdParam is valid (might differ from hook's quoteId if called manually)
    if (!quoteIdParam) {
        toast.error("Cannot save machines without a valid Quote ID.");
        return false;
    }

    console.log(`useQuoteMachines: Saving machines [${machineIdsToSave.join(', ')}] for quote ${quoteIdParam}`);
    setLoading(true); // Indicate loading state for save operation
    setError(null);

    try {
      // Update the machine_type_ids array directly in the quotes table
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ machine_type_ids: machineIdsToSave })
        .eq('quote_id', quoteIdParam);

      if (updateError) throw updateError;

      console.log("useQuoteMachines: Successfully updated quote's machine_type_ids.");

      // --- Trigger Sync AFTER successful save ---
      console.log("useQuoteMachines: Triggering planning details sync after saving machines.");
      await syncAllPlanningDetails(); // Call the centralized sync function
      // -----------------------------------------

      // Update local state only if the save was for the hook's current quoteId
      if (quoteIdParam === quoteId) {
          setMachineTypeIds(machineIdsToSave);
          // Re-fetch machine details to update the selectedMachines array
          await fetchQuoteMachines();
      } else {
         // If saved for a different quoteId, just indicate success
         // The component managing that quoteId would need its own hook instance
      }

      toast.success("Machine selection saved successfully.");
      return true; // Indicate success

    } catch (err: any) {
      console.error("useQuoteMachines: Error saving quote machines:", err);
      const message = err.message || "Failed to save machine selection";
      setError(message);
      toast.error(message);
      return false; // Indicate failure
    } finally {
      setLoading(false); // Clear loading state for save operation
    }
  };

  const removeMachine = async (machineTypeIdToRemove: number) => {
    if (!quoteId) {
         toast.error("Cannot remove machine without a valid Quote ID.");
         return false; // Return false for failure
    }

    console.log(`useQuoteMachines: Removing machine ${machineTypeIdToRemove} from quote ${quoteId}`);
    setLoading(true); // Indicate loading for removal
    setError(null);

    try {
      // Filter out the machine type ID from the current list
      const updatedMachineIds = machineTypeIds.filter(id => id !== machineTypeIdToRemove);

      // Update the quote with the new machine type IDs
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ machine_type_ids: updatedMachineIds })
        .eq('quote_id', quoteId);

      if (updateError) throw updateError;

      console.log("useQuoteMachines: Successfully updated quote after machine removal.");

      // --- Trigger Sync AFTER successful removal ---
      console.log("useQuoteMachines: Triggering planning details sync after removing machine.");
      await syncAllPlanningDetails(); // Call the centralized sync function
      // ------------------------------------------

      // Update local state immediately
      setMachineTypeIds(updatedMachineIds);
      setSelectedMachines(prev => prev.filter(machine => machine.machine_type_id !== machineTypeIdToRemove));

      toast.success("Machine removed successfully.");
      return true; // Indicate success
    } catch (err: any) {
      console.error("useQuoteMachines: Error removing machine:", err);
      const message = err.message || "Failed to remove machine";
      setError(message);
      toast.error(message);
      return false; // Indicate failure
    } finally {
      setLoading(false); // Clear loading for removal
    }
  };

  // Initial fetch when quoteId is available or changes
  useEffect(() => {
    fetchQuoteMachines();
  }, [fetchQuoteMachines]); // Use the memoized fetch function

  return {
    selectedMachines,
    machineTypeIds,
    loading,
    error,
    fetchQuoteMachines, // Expose fetch for potential manual refresh
    saveMachines,
    removeMachine
  };
};