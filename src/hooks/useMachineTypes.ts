
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface MachineType {
  machine_type_id: number;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_at: string;
}

export const useMachineTypes = () => {
  const [machines, setMachines] = useState<MachineType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching machine types...");
      
      const { data, error } = await supabase
        .from("machine_types")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      console.log("Machine types fetched:", data);
      setMachines(data || []);
    } catch (err: any) {
      console.error("Error fetching machine types:", err);
      setError(err.message || "Failed to load machine types");
      toast.error("Failed to load machine types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  return {
    machines,
    loading,
    error,
    fetchMachines
  };
};
