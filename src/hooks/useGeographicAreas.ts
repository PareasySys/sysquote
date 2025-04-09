
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
      
      console.log("Fetching geographic areas...");
      
      const { data, error } = await supabase
        .from("geographic_areas")
        .select("area_id, name")
        .order("name");
      
      if (error) throw error;
      
      console.log("Geographic areas fetched:", data);
      setAreas(data || []);
    } catch (err: any) {
      console.error("Error fetching geographic areas:", err);
      setError(err.message || "Failed to load geographic areas");
      toast.error("Failed to load geographic areas");
    } finally {
      setLoading(false);
    }
  };

  // Add a function to check if an area name already exists
  const checkAreaNameExists = async (name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("geographic_areas")
        .select("area_id")
        .eq("name", name)
        .maybeSingle();
      
      if (error) throw error;
      
      return !!data;
    } catch (err: any) {
      console.error("Error checking area name:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  return {
    areas,
    loading,
    error,
    fetchAreas,
    checkAreaNameExists
  };
};
