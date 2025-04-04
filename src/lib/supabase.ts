
import { createClient } from '@supabase/supabase-js';

// Replace these with your own Supabase URL and anon key
// These will be available in your Supabase project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anonymous Key. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
