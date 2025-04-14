
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

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

  // Fetch software that is always included
  const fetchAlwaysIncludedSoftware = async () => {
    try {
      const { data, error } = await supabase
        .from('software_types')
        .select('software_type_id')
        .eq('always_included', true);
      
      if (error) throw error;
      
      const ids = data?.map(item => item.software_type_id) || [];
      setAlwaysIncludedIds(ids);
      return ids;
    } catch (err: any) {
      console.error("Error fetching always included software:", err);
      return [];
    }
  };

  const fetchQuoteSoftware = async () => {
    if (!quoteId) return;

    try {
      setLoading(true);
      setError(null);
      
      // First, check if the quote has a software_type_ids column
      const { data: columnCheck } = await supabase
        .from('quotes')
        .select('quote_id, machine_type_ids')
        .eq('quote_id', quoteId)
        .single();
      
      // Get always included software IDs
      const alwaysIncludedIds = await fetchAlwaysIncludedSoftware();

      // Try to add the column if it doesn't exist
      try {
        // Add the column first to avoid errors
        await supabase.rpc('add_software_type_ids_column');

        // Now get the current software types
        const { data: softwareIds, error: getError } = await supabase
          .from('quotes')
          .select('software_type_ids')
          .eq('quote_id', quoteId)
          .single();

        if (getError) throw getError;
        
        // If software_type_ids exists but is null, or doesn't include always included IDs
        let currentIds = softwareIds.software_type_ids || [];
        
        // Ensure always included software is added
        const updatedIds = [...new Set([...currentIds, ...alwaysIncludedIds])];
        
        // Update if there are changes
        if (JSON.stringify(updatedIds) !== JSON.stringify(currentIds)) {
          await supabase
            .from('quotes')
            .update({ software_type_ids: updatedIds })
            .eq('quote_id', quoteId);
        }
        
        setSoftwareTypeIds(updatedIds);
      } catch (err: any) {
        console.error("Error in software types setup:", err);
        // Default to just the always included software
        setSoftwareTypeIds(alwaysIncludedIds);
      }
      
      // Now fetch the software details for the selected IDs
      if (softwareTypeIds.length > 0) {
        const { data: softwareDetails, error: detailsError } = await supabase
          .from('software_types')
          .select('*')
          .in('software_type_id', softwareTypeIds);
        
        if (detailsError) throw detailsError;
        
        setSelectedSoftware(softwareDetails || []);
      } else {
        setSelectedSoftware([]);
      }
    } catch (err: any) {
      console.error("Error fetching quote software:", err);
      setError(err.message || "Failed to load quote software");
    } finally {
      setLoading(false);
    }
  };

  const saveSoftware = async (softwareIds: number[]) => {
    if (!quoteId) return false;
    
    try {
      setLoading(true);
      
      // Make sure always included software is still included
      const combinedIds = [...new Set([...softwareIds, ...alwaysIncludedIds])];
      
      // Update the database
      await supabase
        .from('quotes')
        .update({ software_type_ids: combinedIds })
        .eq('quote_id', quoteId);
      
      // Update local state
      setSoftwareTypeIds(combinedIds);
      
      // Refresh the software list
      await fetchQuoteSoftware();
      return true;
    } catch (err: any) {
      console.error("Error saving quote software:", err);
      setError(err.message || "Failed to save software selection");
      toast.error("Failed to save software selection");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeSoftware = async (softwareTypeId: number) => {
    try {
      // Don't allow removing always included software
      if (alwaysIncludedIds.includes(softwareTypeId)) {
        toast.error("Cannot remove always included software");
        return;
      }
      
      setLoading(true);
      
      // Filter out the software type ID from the current list
      const updatedSoftwareIds = softwareTypeIds.filter(id => id !== softwareTypeId);
      
      // Update the quote with the new software type IDs
      await supabase
        .from('quotes')
        .update({ software_type_ids: updatedSoftwareIds })
        .eq('quote_id', quoteId);
      
      // Update local state
      setSoftwareTypeIds(updatedSoftwareIds);
      setSelectedSoftware(prev => prev.filter(software => software.software_type_id !== softwareTypeId));
      
      toast.success("Software removed successfully");
    } catch (err: any) {
      console.error("Error removing software:", err);
      toast.error("Failed to remove software");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteSoftware();
  }, [quoteId]);

  return {
    selectedSoftware,
    softwareTypeIds,
    alwaysIncludedIds,
    loading,
    error,
    fetchQuoteSoftware,
    saveSoftware,
    removeSoftware
  };
};
