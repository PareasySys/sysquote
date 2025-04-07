
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export const useStorageTrainingIcons = () => {
  const [uploading, setUploading] = useState<boolean>(false);

  const uploadIcon = async (file: File): Promise<string | null> => {
    if (!file || !file.name.endsWith('.svg')) {
      toast.error("Please select an SVG file");
      return null;
    }

    try {
      setUploading(true);

      // Clean the filename to create a safe path
      const fileName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, '-');

      const { data, error } = await supabase.storage
        .from("training_plan_icons")
        .upload(fileName, file, {
          upsert: true,
          contentType: "image/svg+xml",
        });

      if (error) {
        console.error("Error uploading icon:", error);
        toast.error("Failed to upload icon");
        return null;
      }

      const publicUrl = supabase.storage
        .from("training_plan_icons")
        .getPublicUrl(data.path).data.publicUrl;
      
      toast.success("Icon uploaded successfully");
      return data.path;
    } catch (err) {
      console.error("Error uploading icon:", err);
      toast.error("Failed to upload icon");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteIcon = async (path: string): Promise<boolean> => {
    try {
      setUploading(true);
      const { error } = await supabase.storage
        .from("training_plan_icons")
        .remove([path]);

      if (error) {
        console.error("Error deleting icon:", error);
        toast.error("Failed to delete icon");
        return false;
      }

      toast.success("Icon deleted successfully");
      return true;
    } catch (err) {
      console.error("Error deleting icon:", err);
      toast.error("Failed to delete icon");
      return false;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadIcon,
    deleteIcon,
    uploading,
  };
};
