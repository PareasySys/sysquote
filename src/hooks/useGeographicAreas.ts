
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GeographicArea {
  area_id: number;
  area_name: string;
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
        .from("area_costs")
        .select("area_id, area_name")
        .order("area_name");
      
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

  // Check if an area name already exists and return the area if it does
  const checkAreaNameExists = async (name: string): Promise<{exists: boolean, area?: GeographicArea}> => {
    try {
      const { data, error } = await supabase
        .from("area_costs")
        .select("area_id, area_name")
        .eq("area_name", name)
        .maybeSingle();
      
      if (error) throw error;
      
      return { 
        exists: !!data,
        area: data ? { area_id: data.area_id, area_name: data.area_name } : undefined
      };
    } catch (err: any) {
      console.error("Error checking area name:", err);
      return { exists: false };
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
