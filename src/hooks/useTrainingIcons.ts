
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface TrainingIcon {
  name: string;
  url: string;
  source: "storage" | "local";
}

export const useTrainingIcons = () => {
  const [icons, setIcons] = useState<TrainingIcon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIcons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching training icons from storage bucket...");
      
      // Initialize with an empty array
      let iconsList: TrainingIcon[] = [];
      
      // Fetch icons from storage bucket
      const { data, error } = await supabase
        .storage
        .from('training_plan_icons')
        .list('', {
          sortBy: { column: 'name', order: 'asc' },
        });
      
      if (error) {
        console.warn("Failed to fetch icons from storage:", error);
        throw error;
      } else if (data) {
        console.log("Icons fetched from storage:", data);
        
        // Create icons from storage files
        iconsList = data
          .filter(file => file.name.endsWith('.svg'))
          .map(file => ({
            name: file.name.replace('.svg', ''),
            url: `${supabase.storage.from('training_plan_icons').getPublicUrl(file.name).data.publicUrl}`,
            source: "storage" as const
          }));
      }
      
      // If no icons were found in storage, show a message
      if (iconsList.length === 0) {
        toast.warning("No icons found in storage bucket. Please upload some icons first.");
      }
      
      setIcons(iconsList);
    } catch (err: any) {
      console.error("Error fetching training icons:", err);
      setError(err.message || "Failed to load training icons");
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
