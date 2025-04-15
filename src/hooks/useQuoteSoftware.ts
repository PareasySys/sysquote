import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { supabase } from '@/integrations/supabase/client'; // Corrected path
import { toast } from "sonner";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync"; // Import the sync hook
// Removed syncSoftwareTrainingHoursAndResources, syncPlanningDetailsAfterChanges direct imports
// Removed useTrainingPlans import as it's not directly needed here

export interface QuoteSoftware {
  software_type_id: number;
  name: string;
  description?: string | null;
  photo_url?: string | null;
  always_included: boolean;
}

export const useQuoteSoftware = (quoteId: string | undefined) => {
  const [selectedSoftware, setSelectedSoftware] = useState<QuoteSoftware[]>([]);
  const [softwareTypeIds, setSoftwareTypeIds] = useState<number[]>([]);
  const [alwaysIncludedIds, setAlwaysIncludedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { syncAllPlanningDetails } = usePlanningDetailsSync(); // Get the sync function

  // Fetch software that is always included - runs once on mount
  const fetchAlwaysIncludedSoftware = useCallback(async () => {
    console.log("useQuoteSoftware: Fetching always included software IDs.");
    try {
      const { data, error: fetchError } = await supabase
        .from('software_types')
        .select('software_type_id')
        .eq('always_included', true);

      if (fetchError) throw fetchError;

      const ids = data?.map(item => item.software_type_id) || [];
      console.log("useQuoteSoftware: Always included IDs:", ids);
      setAlwaysIncludedIds(ids);
      return ids;
    } catch (err: any) {
      console.error("useQuoteSoftware: Error fetching always included software:", err);
      setAlwaysIncludedIds([]); // Reset on error
      return [];
    }
  }, []); // Empty dependency array - fetch once

  // Fetch the quote's software and details - memoized
  const fetchQuoteSoftware = useCallback(async (fetchedAlwaysIncludedIds: number[]) => {
    if (!quoteId) {
        // Clear state if quoteId becomes invalid
        setSoftwareTypeIds(fetchedAlwaysIncludedIds); // Keep always included
        setSelectedSoftware([]); // Clear selected non-always-included
        setError(null);
        setLoading(false);
        return;
    }

    console.log("useQuoteSoftware: Fetching software for quote:", quoteId);
    setLoading(true);
    setError(null);

    try {
      // Fetch quote data including software_type_ids
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('software_type_ids') // Only need the IDs
        .eq('quote_id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      const currentIds = quoteData?.software_type_ids || [];
      console.log("useQuoteSoftware: Fetched software IDs from quote:", currentIds);

      // Ensure always included software is part of the list displayed/tracked
      const combinedIds = [...new Set([...currentIds, ...fetchedAlwaysIncludedIds])];

      // Check if the list in the DB needs updating (if always_included wasn't there)
      // Note: This automatic update might be better handled during save/creation
      // if (JSON.stringify(combinedIds) !== JSON.stringify(currentIds)) {
      //   console.log("useQuoteSoftware: Adding always_included IDs to quote's list.");
      //   const { error: updateError } = await supabase
      //     .from('quotes')
      //     .update({ software_type_ids: combinedIds })
      //     .eq('quote_id', quoteId);
      //   if (updateError) console.warn("useQuoteSoftware: Failed to auto-add always_included IDs:", updateError);
      // }

      setSoftwareTypeIds(combinedIds); // Set combined list locally

      // Now fetch the software details for the combined IDs
      if (combinedIds.length > 0) {
        const { data: softwareDetails, error: detailsError } = await supabase
          .from('software_types')
          .select('*') // Select all details for display
          .in('software_type_id', combinedIds);

        if (detailsError) throw detailsError;

        console.log("useQuoteSoftware: Fetched software details:", softwareDetails);
        setSelectedSoftware(softwareDetails || []);

        // --- REMOVED Sync calls from fetch function ---
        // Syncing should happen after mutations (save/remove), not reads.
        // ---------------------------------------------

      } else {
        setSelectedSoftware([]); // Clear details if no IDs
      }
    } catch (err: any) {
      console.error("useQuoteSoftware: Error fetching quote software:", err);
      const message = err.message || "Failed to load quote software";
      setError(message);
      // Don't toast error on fetch, let component decide
      setSoftwareTypeIds(fetchedAlwaysIncludedIds); // Reset to always included on error
      setSelectedSoftware([]); // Clear details
    } finally {
      setLoading(false);
    }
  }, [quoteId]); // Dependency: fetch when quoteId changes

  // Main effect to orchestrate fetching
  useEffect(() => {
    let isMounted = true;
    const runFetch = async () => {
        const fetchedAlwaysIds = await fetchAlwaysIncludedSoftware();
        if (isMounted) {
            await fetchQuoteSoftware(fetchedAlwaysIds);
        }
    };
    runFetch();
    return () => { isMounted = false; }; // Cleanup
  }, [fetchAlwaysIncludedSoftware, fetchQuoteSoftware]); // Rerun if quoteId changes (via fetchQuoteSoftware dependency)


  // Save the user's selection (plus always included)
  const saveSoftware = async (softwareIdsToSave: number[]) => {
    if (!quoteId) {
        toast.error("Cannot save software without a valid Quote ID.");
        return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure always included software is part of the final list
      const combinedIds = [...new Set([...softwareIdsToSave, ...alwaysIncludedIds])];
      console.log(`useQuoteSoftware: Saving software [${combinedIds.join(', ')}] for quote ${quoteId}`);

      // Update the software_type_ids array directly in the quotes table
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ software_type_ids: combinedIds })
        .eq('quote_id', quoteId);

      if (updateError) throw updateError;

      console.log("useQuoteSoftware: Successfully updated quote's software_type_ids.");

      // --- Trigger Sync AFTER successful save ---
      console.log("useQuoteSoftware: Triggering planning details sync after saving software.");
      await syncAllPlanningDetails(); // Call the centralized sync function
      // -----------------------------------------

      // Update local state
      setSoftwareTypeIds(combinedIds);
      // Re-fetch details to ensure consistency
      await fetchQuoteSoftware(alwaysIncludedIds);

      toast.success("Software selection saved successfully.");
      return true;

    } catch (err: any) {
      console.error("useQuoteSoftware: Error saving quote software:", err);
      const message = err.message || "Failed to save software selection";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Remove a piece of software (if not always included)
  const removeSoftware = async (softwareTypeIdToRemove: number) => {
    if (!quoteId) {
        toast.error("Cannot remove software without a valid Quote ID.");
        return false;
    }
    // Prevent removing always included software
    if (alwaysIncludedIds.includes(softwareTypeIdToRemove)) {
      toast.error("Cannot remove software that is marked as 'always included'.");
      return false;
    }

    console.log(`useQuoteSoftware: Removing software ${softwareTypeIdToRemove} from quote ${quoteId}`);
    setLoading(true);
    setError(null);

    try {
      // Filter out the software type ID from the current list
      const updatedSoftwareIds = softwareTypeIds.filter(id => id !== softwareTypeIdToRemove);

      // Update the quote directly
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ software_type_ids: updatedSoftwareIds })
        .eq('quote_id', quoteId);

      if (updateError) throw updateError;

      console.log("useQuoteSoftware: Successfully updated quote after software removal.");

      // --- Trigger Sync AFTER successful removal ---
      console.log("useQuoteSoftware: Triggering planning details sync after removing software.");
      await syncAllPlanningDetails(); // Call the centralized sync function
      // ------------------------------------------

      // Update local state immediately
      setSoftwareTypeIds(updatedSoftwareIds);
      setSelectedSoftware(prev => prev.filter(software => software.software_type_id !== softwareTypeIdToRemove));

      toast.success("Software removed successfully.");
      return true;
    } catch (err: any) {
      console.error("useQuoteSoftware: Error removing software:", err);
      const message = err.message || "Failed to remove software";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedSoftware,
    softwareTypeIds,
    alwaysIncludedIds,
    loading,
    error,
    fetchQuoteSoftware: () => fetchQuoteSoftware(alwaysIncludedIds), // Expose fetch for manual refresh
    saveSoftware,
    removeSoftware
  };
};