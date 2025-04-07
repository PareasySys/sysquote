
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
  const fetchInProgress = useRef<boolean>(false);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef<number>(0);
  const maxRetries = 3;

  const fetchQuotes = async () => {
    // Prevent multiple simultaneous fetches
    if (fetchInProgress.current) return;
    if (!user) return;
    
    // Clear any existing retry timeouts
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current);
      retryTimeout.current = null;
    }

    setLoading(true);
    setError(null);
    fetchInProgress.current = true;
    
    try {
      console.log("Fetching quotes...");
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          quote_id,
          quote_name,
          client_name,
          created_at
        `)
        .eq("created_by_user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Reset retry count on success
      retryCount.current = 0;

      // Transform the data to match our expected Quote type
      const formattedQuotes = data ? data.map((item: any) => ({
        quote_id: item.quote_id,
        quote_name: item.quote_name,
        client_name: item.client_name,
        created_at: item.created_at
      })) : [];

      setQuotes(formattedQuotes);
    } catch (err: any) {
      console.error("Error fetching quotes:", err);
      setError(err.message || "Failed to load quotes");
      
      // Implement retry with exponential backoff
      if (retryCount.current < maxRetries) {
        const backoffTime = Math.pow(2, retryCount.current) * 1000;
        retryCount.current++;
        
        retryTimeout.current = setTimeout(() => {
          fetchInProgress.current = false;
          fetchQuotes();
        }, backoffTime);
      } else {
        toast({
          title: "Error loading quotes",
          description: "Please refresh the page and try again",
          variant: "destructive",
        });
      }
    } finally {
      // Only reset fetchInProgress if we're not scheduling a retry
      if (!retryTimeout.current) {
        fetchInProgress.current = false;
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQuotes();
    }
    
    // Cleanup function to cancel any pending retries
    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, [user]);

  return {
    quotes,
    loading,
    error,
    fetchQuotes
  };
};
