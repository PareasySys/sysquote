
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GeographicArea {
  area_id: number;
  name: string;
}

export const useGeographicAreas = () => {
  const [areas, setAreas] = useState<GeographicArea[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from("geographic_areas")
        .select("area_id, name")
        .order("name");
      
      if (error) throw error;
      
      setAreas(data || []);
    } catch (err: any) {
      console.error("Error fetching geographic areas:", err);
      setError(err.message || "Failed to load geographic areas");
      toast.error("Failed to load geographic areas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  return {
    areas,
    loading,
    error,
    fetchAreas
  };
};
