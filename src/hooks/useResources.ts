
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Resource {
  resource_id: number;
  name: string;
  hourly_rate: number;
  is_active: boolean;
  created_at: string;
}

export const useResources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching resources...");
      
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      console.log("Resources fetched:", data);
      setResources(data || []);
    } catch (err: any) {
      console.error("Error fetching resources:", err);
      setError(err.message || "Failed to load resources");
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  return {
    resources,
    loading,
    error,
    fetchResources
  };
};
