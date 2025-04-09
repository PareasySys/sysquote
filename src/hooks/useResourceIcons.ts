
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface ResourceIcon {
  name: string;
  url: string;
  source: "storage";
}

export const useResourceIcons = () => {
  const [icons, setIcons] = useState<ResourceIcon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIcons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching resource icons from storage bucket...");
      
      // Initialize with an empty array
      let iconsList: ResourceIcon[] = [];
      
      // Fetch icons from storage bucket
      const { data, error } = await supabase
        .storage
        .from('resource_icons')
        .list('', {
          sortBy: { column: 'name', order: 'asc' },
        });
      
      if (error) {
        console.warn("Failed to fetch resource icons from storage:", error);
        throw error;
      } else if (data) {
        console.log("Icons fetched from storage:", data);
        
        // Create icons from storage files - accept both SVGs and PNGs
        iconsList = data
          .filter(file => file.name.endsWith('.svg') || file.name.endsWith('.png'))
          .map(file => ({
            name: file.name,
            url: `${supabase.storage.from('resource_icons').getPublicUrl(file.name).data.publicUrl}`,
            source: "storage" as const
          }));
      }
      
      // If no icons were found in storage, show a message
      if (iconsList.length === 0) {
        toast.warning("No icons found in resource_icons bucket. Please upload some icons first.");
      }
      
      setIcons(iconsList);
    } catch (err: any) {
      console.error("Error fetching resource icons:", err);
      setError(err.message || "Failed to load resource icons");
      toast.error("Failed to load icons");
      
      // Set empty array on error
      setIcons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIcons();
  }, []);

  return {
    icons,
    loading,
    error,
    fetchIcons
  };
};
