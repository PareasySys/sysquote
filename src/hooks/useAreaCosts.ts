
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AreaCost {
  area_cost_id: number;
  area_name: string;
  daily_accommodation_food_cost: number;
  daily_allowance: number;
  daily_pocket_money: number;
  created_at: string;
  updated_at: string;
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
        .select("*")
        .order("area_name");
      
      if (error) throw error;
      
      console.log("Area costs fetched:", data);
      setAreaCosts(data || []);
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
