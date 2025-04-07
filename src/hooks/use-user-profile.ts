
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";

export type UserProfileData = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  [key: string]: any;
};

export function useUserProfile(user: User | null) {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Get current profile data from user metadata
  const getUserProfileData = useCallback((): UserProfileData => {
    if (!user) return {};
    return {
      firstName: user.user_metadata?.first_name || "",
      lastName: user.user_metadata?.last_name || "",
      avatarUrl: user.user_metadata?.avatar_url || "",
      ...user.user_metadata
    };
  }, [user]);
  
  const updateProfile = useCallback(async (profileData: UserProfileData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsUpdating(true);
      
      const { error } = await supabase.auth.updateUser({
        data: profileData
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully."
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [user, toast]);
  
  return {
    profileData: getUserProfileData(),
    updateProfile,
    isUpdating
  };
}
