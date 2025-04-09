
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SoftwareType } from "@/hooks/useSoftwareTypes";
import { useImageUpload } from "@/hooks/use-image-upload";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

interface SoftwareTypeModalProps {
  open: boolean;
  onClose: () => void;
  software?: SoftwareType | null;
  onSave: () => void;
}

const SoftwareTypeModal: React.FC<SoftwareTypeModalProps> = ({
  open,
  onClose,
  software,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [alwaysIncluded, setAlwaysIncluded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const { 
    previewUrl, 
    setPreviewUrl, 
    uploadImage, 
    isUploading 
  } = useImageUpload();
  
  useEffect(() => {
    if (software) {
      setName(software.name || "");
      setDescription(software.description || "");
      setAlwaysIncluded(software.always_included);
      setPhotoURL(software.photo_url);
      setPreviewUrl(software.photo_url);
    } else {
      setName("");
      setDescription("");
      setAlwaysIncluded(false);
      setPhotoURL(null);
      setPreviewUrl(null);
    }
  }, [software, setPreviewUrl]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    try {
      // Create a local preview URL
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      
      // Upload to storage
      const url = await uploadImage(file);
      setPhotoURL(url);
      
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Software name is required");
      return;
    }

    try {
      setIsSaving(true);

      if (software) {
        const { error } = await supabase
          .from("software_types")
          .update({
            name,
            description,
            always_included: alwaysIncluded,
            photo_url: photoURL,
          })
          .eq("software_type_id", software.software_type_id);

        if (error) {
          console.error("Error updating software:", error);
          throw error;
        }
        toast.success("Software updated successfully");
      } else {
        const { error } = await supabase.from("software_types").insert({
          name,
          description,
          always_included: alwaysIncluded,
          photo_url: photoURL,
        });

        if (error) {
          console.error("Error creating software:", error);
          throw error;
        }
        toast.success("Software created successfully");
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving software:", error);
      toast.error(error.message || "Failed to save software");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!software) return;

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from("software_types")
        .delete()
        .eq("software_type_id", software.software_type_id);

      if (error) throw error;

      toast.success("Software deleted successfully");
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error deleting software:", error);
      toast.error(error.message || "Failed to delete software");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>
            {software ? "Edit Software" : "Add New Software"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-white">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter software name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="text-white">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-blue-500 min-h-[100px]"
              placeholder="Enter software description"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="alwaysIncluded" className="text-white cursor-pointer">Always Included</Label>
            <Switch
              id="alwaysIncluded"
              checked={alwaysIncluded}
              onCheckedChange={setAlwaysIncluded}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="photo" className="text-white">Photo</Label>
            <div className="flex flex-col items-center gap-4">
              {previewUrl && (
                <div className="relative w-40 h-40 mx-auto overflow-hidden rounded-lg border border-slate-700">
                  <img
                    src={previewUrl}
                    alt={name}
                    className="w-full h-full object-contain"
                    onError={() => setPreviewUrl("/placeholder.svg")}
                  />
                </div>
              )}
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex items-center justify-center gap-2 p-2 border border-dashed border-slate-600 rounded-lg w-full hover:bg-slate-800/50 transition-colors"
              >
                <Upload className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300 text-sm">
                  {isUploading ? "Uploading..." : "Upload Image"}
                </span>
                <input
                  id="photo-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          {software && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="mr-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Software"
              )}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={onClose}
            className="text-blue-700 border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-700 hover:bg-blue-800"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SoftwareTypeModal;
