import { useState, useEffect, useCallback } from "react";
import { supabase } from '@/integrations/supabase/client'; // Corrected path
import { toast } from "sonner";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync"; // Import the sync hook

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
  const { syncQuotePlanningDetails } = usePlanningDetailsSync(); // Get the consolidated sync function

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
      setAlwaysIncludedIds([]);
      return [];
    }
  }, []);

  const fetchQuoteSoftware = useCallback(async (fetchedAlwaysIncludedIds: number[]) => {
    if (!quoteId) {
        setSoftwareTypeIds(fetchedAlwaysIncludedIds);
        setSelectedSoftware([]);
        setError(null);
        setLoading(false);
        return;
    }

    console.log("useQuoteSoftware: Fetching software for quote:", quoteId);
    setLoading(true);
    setError(null);

    try {
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('software_type_ids')
        .eq('quote_id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      const currentIds = quoteData?.software_type_ids || [];
      console.log("useQuoteSoftware: Fetched software IDs from quote:", currentIds);

      const combinedIds = [...new Set([...currentIds, ...fetchedAlwaysIncludedIds])];

      // // Optional: Auto-update DB if always_included missing (consider if needed)
      // if (JSON.stringify(combinedIds) !== JSON.stringify(currentIds)) {
      //    // ... update logic ...
      // }

      setSoftwareTypeIds(combinedIds);

      if (combinedIds.length > 0) {
        const { data: softwareDetails, error: detailsError } = await supabase
          .from('software_types')
          .select('*')
          .in('software_type_id', combinedIds);

        if (detailsError) throw detailsError;

        console.log("useQuoteSoftware: Fetched software details:", softwareDetails);
        setSelectedSoftware(softwareDetails || []);
      } else {
        setSelectedSoftware([]);
      }
    } catch (err: any) {
      console.error("useQuoteSoftware: Error fetching quote software:", err);
      const message = err.message || "Failed to load quote software";
      setError(message);
      setSoftwareTypeIds(fetchedAlwaysIncludedIds);
      setSelectedSoftware([]);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    let isMounted = true;
    const runFetch = async () => {
        const fetchedAlwaysIds = await fetchAlwaysIncludedSoftware();
        if (isMounted) {
            await fetchQuoteSoftware(fetchedAlwaysIds);
        }
    };
    runFetch();
    return () => { isMounted = false; };
  }, [fetchAlwaysIncludedSoftware, fetchQuoteSoftware]);

  const saveSoftware = async (softwareIdsToSave: number[]) => {
    if (!quoteId) {
        toast.error("Cannot save software without a valid Quote ID.");
        return false;
    }

    // Use temporary loading state if desired
    // setLoading(true);
    setError(null);
    let success = false;

    try {
      const combinedIds = [...new Set([...softwareIdsToSave, ...alwaysIncludedIds])];
      console.log(`useQuoteSoftware: Saving software [${combinedIds.join(', ')}] for quote ${quoteId}`);

      const { error: updateError } = await supabase
        .from('quotes')
        .update({ software_type_ids: combinedIds })
        .eq('quote_id', quoteId);

      if (updateError) throw updateError;

      console.log("useQuoteSoftware: Successfully updated quote's software_type_ids.");

      // --- Trigger Sync AFTER successful save ---
      console.log("useQuoteSoftware: Triggering planning details sync after saving software.");
      await syncQuotePlanningDetails(quoteId); // Pass the current quote ID
      // -----------------------------------------

      // Update local state
      setSoftwareTypeIds(combinedIds);
      await fetchQuoteSoftware(alwaysIncludedIds); // Re-fetch details

      toast.success("Software selection saved successfully.");
      success = true;

    } catch (err: any) {
      console.error("useQuoteSoftware: Error saving quote software:", err);
      const message = err.message || "Failed to save software selection";
      setError(message);
      toast.error(message);
      success = false;
    } finally {
      // setLoading(false);
    }
    return success;
  };

  const removeSoftware = async (softwareTypeIdToRemove: number) => {
    if (!quoteId) {
        toast.error("Cannot remove software without a valid Quote ID.");
        return false;
    }
    if (alwaysIncludedIds.includes(softwareTypeIdToRemove)) {
      toast.error("Cannot remove software that is marked as 'always included'.");
      return false;
    }

    console.log(`useQuoteSoftware: Removing software ${softwareTypeIdToRemove} from quote ${quoteId}`);
    // setLoading(true);
    setError(null);
    let success = false;

    try {
      const updatedSoftwareIds = softwareTypeIds.filter(id => id !== softwareTypeIdToRemove);

      const { error: updateError } = await supabase
        .from('quotes')
        .update({ software_type_ids: updatedSoftwareIds })
        .eq('quote_id', quoteId);

      if (updateError) throw updateError;

      console.log("useQuoteSoftware: Successfully updated quote after software removal.");

      // --- Trigger Sync AFTER successful removal ---
      console.log("useQuoteSoftware: Triggering planning details sync after removing software.");
      await syncQuotePlanningDetails(quoteId); // Pass the current quote ID
      // ------------------------------------------

      // Update local state immediately
      setSoftwareTypeIds(updatedSoftwareIds);
      setSelectedSoftware(prev => prev.filter(software => software.software_type_id !== softwareTypeIdToRemove));

      toast.success("Software removed successfully.");
      success = true;
    } catch (err: any) {
      console.error("useQuoteSoftware: Error removing software:", err);
      const message = err.message || "Failed to remove software";
      setError(message);
      toast.error(message);
      success = false;
    } finally {
      // setLoading(false);
    }
    return success;
  };

  return {
    selectedSoftware,
    softwareTypeIds,
    alwaysIncludedIds,
    loading,
    error,
    fetchQuoteSoftware: () => fetchQuoteSoftware(alwaysIncludedIds),
    saveSoftware,
    removeSoftware
  };
};