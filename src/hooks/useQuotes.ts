
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Quote = {
  quote_id: string;
  quote_name: string;
  client_name?: string;
  created_at: string;
};

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchQuotes = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // We need to cast the entire query operation to any to bypass TypeScript constraints
      const result = await (supabase
        .from("quotes" as any)
        .select(`
          quote_id,
          quote_name,
          created_at,
          clients (
            name
          )
        `)
        .eq("created_by_user_id", user.id)
        .order("created_at", { ascending: false }) as any);
      
      const { data, error } = result;

      if (error) throw error;

      // Transform the data to match our expected Quote type
      const formattedQuotes = data ? data.map((item: any) => ({
        quote_id: item.quote_id,
        quote_name: item.quote_name,
        client_name: item.clients?.name,
        created_at: item.created_at
      })) : [];

      setQuotes(formattedQuotes);
    } catch (err: any) {
      console.error("Error fetching quotes:", err);
      setError(err.message || "Failed to load quotes");
    } finally {
      setLoading(false);
    }
  };

  return {
    quotes,
    loading,
    error,
    fetchQuotes
  };
};
