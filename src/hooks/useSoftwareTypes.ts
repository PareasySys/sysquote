
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SoftwareType {
  software_type_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  always_included: boolean;
  created_at: string;
}

export const useSoftwareTypes = () => {
  const [software, setSoftware] = useState<SoftwareType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSoftware = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching software types...");
      
      const { data, error } = await supabase
        .from("software_types")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      console.log("Software types fetched:", data);
      setSoftware(data || []);
    } catch (err: any) {
      console.error("Error fetching software types:", err);
      setError(err.message || "Failed to load software types");
      toast.error("Failed to load software types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoftware();
  }, []);

  return {
    software,
    loading,
    error,
    fetchSoftware
  };
};
