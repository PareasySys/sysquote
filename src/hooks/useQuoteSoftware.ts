
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { SoftwareType } from "@/hooks/useSoftwareTypes";

export interface QuoteSoftware {
  software_type_id: number;
  name: string;
  description?: string;
  photo_url?: string;
  always_included: boolean;
}

export const useQuoteSoftware = (quoteId: string | undefined) => {
  const [selectedSoftware, setSelectedSoftware] = useState<QuoteSoftware[]>([]);
  const [softwareTypeIds, setSoftwareTypeIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuoteSoftware = async () => {
    if (!quoteId) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching software for quote:", quoteId);
      
      // Get the software IDs from the quote
      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select('software_type_ids')
        .eq('quote_id', quoteId)
        .single();
      
      if (fetchError) throw fetchError;
      
      console.log("Quote with software data:", data);
      
      if (data) {
        // Set the software type IDs
        const softwareIds = data.software_type_ids || [];
        setSoftwareTypeIds(softwareIds);
        
        // If we have software ids, fetch their details
        if (softwareIds.length > 0) {
          const { data: softwareData, error: softwareError } = await supabase
            .from('software_types')
            .select('software_type_id, name, description, photo_url, always_included')
            .in('software_type_id', softwareIds);
          
          if (softwareError) throw softwareError;
          
          setSelectedSoftware(softwareData || []);
        } else {
          setSelectedSoftware([]);
        }
      } else {
        setSoftwareTypeIds([]);
        setSelectedSoftware([]);
      }
    } catch (err: any) {
      console.error("Error fetching quote software:", err);
      setError(err.message || "Failed to load quote software");
      toast.error("Failed to load quote software");
    } finally {
      setLoading(false);
    }
  };

  const saveSoftware = async (quoteId: string, softwareIds: number[]) => {
    if (!quoteId) return false;
    
    try {
      setLoading(true);
      
      // Update directly in the quotes table
      const { error } = await supabase
        .from('quotes')
        .update({ software_type_ids: softwareIds })
        .eq('quote_id', quoteId);
      
      if (error) throw error;
      
      // Update local state
      setSoftwareTypeIds(softwareIds);
      
      // Refresh the software list to get updated data
      await fetchQuoteSoftware();
      toast.success("Software selection saved successfully");
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
      setLoading(true);
      
      // Filter out the software type ID from the current list
      const updatedSoftwareIds = softwareTypeIds.filter(id => id !== softwareTypeId);
      
      // Update the quote with the new software type IDs
      const { error } = await supabase
        .from('quotes')
        .update({ software_type_ids: updatedSoftwareIds })
        .eq('quote_id', quoteId);
      
      if (error) throw error;
      
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
    loading,
    error,
    fetchQuoteSoftware,
    saveSoftware,
    removeSoftware
  };
};
