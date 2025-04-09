
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AreaIcon {
  name: string;
  url: string;
}

export const useAreaIcons = () => {
  const [icons, setIcons] = useState<AreaIcon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIcons = async () => {
      try {
        setLoading(true);
        
        // List all files in the area_icons bucket
        const { data: files, error } = await supabase
          .storage
          .from('area_icons')
          .list();
        
        if (error) {
          console.error("Error fetching area icons:", error);
          throw error;
        }
        
        if (!files || files.length === 0) {
          setIcons([]);
          return;
        }
        
        // Get public URLs for all icons
        const iconsWithUrls = files.map(file => {
          const iconName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
          const { data } = supabase
            .storage
            .from('area_icons')
            .getPublicUrl(file.name);
            
          return {
            name: iconName,
            url: data.publicUrl
          };
        });
        
        setIcons(iconsWithUrls);
        console.log("Fetched area icons:", iconsWithUrls);
      } catch (err) {
        console.error("Error in useAreaIcons:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchIcons();
  }, []);
  
  return { icons, loading };
};
