
import { createClient } from '@supabase/supabase-js';

// This approach uses fallback values for development to prevent errors
// In production, these values should always come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// We still log a warning if the real environment variables aren't set
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or Anonymous Key not found in environment variables. Using fallback values. Authentication will not work correctly until proper values are provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
