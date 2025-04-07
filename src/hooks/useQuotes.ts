
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Quote = {
  quote_id: string;
  quote_name: string;
  client_name?: string;
  area_id?: number;
  area_name?: string;
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
  const isMounted = useRef<boolean>(true);

  const fetchQuotes = async () => {
    // Check if we should fetch quotes
    if (fetchInProgress.current || !user || !isMounted.current) return;
    
    // Clear any existing retry timeouts
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current);
      retryTimeout.current = null;
    }

    setLoading(true);
    setError(null);
    fetchInProgress.current = true;
    
    try {
      console.log("Fetching quotes for user:", user.id);
      
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          quote_id,
          quote_name,
          client_name,
          created_at,
          area_id,
          geographic_areas(name)
        `)
        .eq("created_by_user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      console.log("Received quotes data:", data);

      // Only update state if component is still mounted
      if (isMounted.current) {
        // Reset retry count on success
        retryCount.current = 0;

        // Transform the data to match our expected Quote type
        const formattedQuotes = data ? data.map((item: any) => ({
          quote_id: item.quote_id,
          quote_name: item.quote_name,
          client_name: item.client_name,
          area_id: item.area_id,
          area_name: item.geographic_areas?.name,
          created_at: item.created_at
        })) : [];

        console.log("Formatted quotes:", formattedQuotes);
        setQuotes(formattedQuotes);
      }
    } catch (err: any) {
      console.error("Error fetching quotes:", err);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setError(err.message || "Failed to load quotes");
        
        // Implement retry with exponential backoff
        if (retryCount.current < maxRetries) {
          const backoffTime = Math.pow(2, retryCount.current) * 1000;
          retryCount.current++;
          
          console.log(`Retrying in ${backoffTime}ms (Attempt ${retryCount.current}/${maxRetries})`);
          
          retryTimeout.current = setTimeout(() => {
            if (isMounted.current) {
              fetchInProgress.current = false;
              fetchQuotes();
            }
          }, backoffTime);
        } else {
          toast.error("Error loading quotes. Please refresh the page and try again.");
        }
      }
    } finally {
      // Only reset fetchInProgress if we're not scheduling a retry and component is mounted
      if (!retryTimeout.current && isMounted.current) {
        fetchInProgress.current = false;
      }
      
      // Only update loading state if component is still mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Reset mount state on component mount
    isMounted.current = true;
    
    // Always fetch quotes when user is available
    if (user) {
      console.log("User available, fetching quotes");
      fetchInProgress.current = false; // Reset this flag to ensure fetch can proceed
      fetchQuotes();
    }
    
    // Cleanup function
    return () => {
      console.log("Component unmounting, cleaning up");
      isMounted.current = false;
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
