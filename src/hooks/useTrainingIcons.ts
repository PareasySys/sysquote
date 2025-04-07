
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface TrainingIcon {
  name: string;
  url: string;
}

export const useTrainingIcons = () => {
  const [icons, setIcons] = useState<TrainingIcon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Default icons based on local SVG files
  const defaultIcons: TrainingIcon[] = [
    {
      name: "skill-level-basic",
      url: "/training-plan-icons/skill-level-basic.svg"
    },
    {
      name: "skill-level-intermediate",
      url: "/training-plan-icons/skill-level-intermediate.svg"
    },
    {
      name: "skill-level-advanced",
      url: "/training-plan-icons/skill-level-advanced.svg"
    },
    {
      name: "team-training",
      url: "/training-plan-icons/team-training.svg"
    }
  ];

  const fetchIcons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching training icons...");
      
      // Initialize with default icons
      const iconsList = [...defaultIcons];
      
      // Try to fetch icons from storage bucket if available
      const { data, error } = await supabase
        .storage
        .from('training-icons')
        .list('', {
          sortBy: { column: 'name', order: 'asc' },
        });
      
      if (error) {
        console.warn("Failed to fetch icons from storage, using defaults only:", error);
      } else if (data) {
        console.log("Icons fetched from storage:", data);
        
        // Add storage icons to the list
        const storageIcons = data
          .filter(file => file.name.endsWith('.svg'))
          .map(file => ({
            name: file.name.replace('.svg', ''),
            url: `${supabase.storage.from('training-icons').getPublicUrl(file.name).data.publicUrl}`
          }));
        
        // Add storage icons to our list, avoiding duplicates
        storageIcons.forEach(storageIcon => {
          if (!iconsList.some(icon => icon.name === storageIcon.name)) {
            iconsList.push(storageIcon);
          }
        });
      }
      
      setIcons(iconsList);
    } catch (err: any) {
      console.error("Error fetching training icons:", err);
      setError(err.message || "Failed to load training icons");
      toast.error("Failed to load icons");
      
      // Fallback to default icons
      setIcons(defaultIcons);
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
