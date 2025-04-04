
import { supabase } from "@/lib/supabaseClient";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  confirmPassword?: string;
}

export const signIn = async ({ email, password }: LoginCredentials) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signUp = async ({ email, password }: RegisterCredentials) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPasswordForEmail = async (email: string, redirectUrl?: string) => {
  const options = redirectUrl ? { redirectTo: redirectUrl } : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, options);
  
  if (error) throw error;
  return true;
};
