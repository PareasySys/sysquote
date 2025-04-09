
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AreaCost {
  area_cost_id: number;
  area_id: number;
  daily_accommodation_food_cost: number;
  daily_allowance: number;
  daily_car_rental_cost: number | null;
  daily_taxi_cost: number | null;
  daily_pocket_money: number;
  travel_cost_flight: number | null;
  created_at: string;
  updated_at: string;
  area_name?: string; // This will be joined from geographic_areas table
  icon_name?: string | null;
}

export const useAreaCosts = () => {
  const [areaCosts, setAreaCosts] = useState<AreaCost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreaCosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching area costs...");
      
      const { data, error } = await supabase
        .from("area_costs")
        .select(`
          *,
          geographic_areas:area_id(name, area_id)
        `)
        .order("area_id");
      
      if (error) throw error;
      
      // Process the results to flatten the joined data
      const processedData = data?.map(item => {
        return {
          ...item,
          area_name: item.geographic_areas?.name || "Unknown Area",
          icon_name: "icon-location", // Default icon name, will be updated in the future
        };
      }) || [];
      
      console.log("Area costs fetched:", processedData);
      setAreaCosts(processedData);
    } catch (err: any) {
      console.error("Error fetching area costs:", err);
      setError(err.message || "Failed to load area costs");
      toast.error("Failed to load area costs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreaCosts();
  }, []);

  return {
    areaCosts,
    loading,
    error,
    fetchAreaCosts
  };
};
