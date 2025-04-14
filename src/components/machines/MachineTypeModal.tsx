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
import { MachineType } from "@/hooks/useMachineTypes";
import { useImageUpload } from "@/hooks/use-image-upload";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useMachineTrainingRequirements } from "@/hooks/useMachineTrainingRequirements";
import { useResources } from "@/hooks/useResources";
import { useTrainingTopics } from "@/hooks/useTrainingTopics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MachineTypeModalProps {
  open: boolean;
  onClose: () => void;
  machine?: MachineType | null;
  onSave: () => void;
}

const MachineTypeModal: React.FC<MachineTypeModalProps> = ({
  open,
  onClose,
  machine,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const { 
    previewUrl, 
    setPreviewUrl, 
    uploadImage, 
    isUploading 
  } = useImageUpload();
  
  const { 
    plans, 
    loading: loadingPlans 
  } = useTrainingPlans();
  const { 
    resources, 
    loading: loadingResources 
  } = useResources();
  const { 
    requirements, 
    saveRequirement, 
    deleteRequirement 
  } = useMachineTrainingRequirements(machine?.machine_type_id);
  
  const { deleteTopicsByItemId } = useTrainingTopics([]);

  const [selectedResources, setSelectedResources] = useState<Record<number, number | undefined>>({});

  useEffect(() => {
    if (machine) {
      setName(machine.name || "");
      setDescription(machine.description || "");
      setPhotoURL(machine.photo_url);
      setPreviewUrl(machine.photo_url);
    } else {
      setName("");
      setDescription("");
      setPhotoURL(null);
      setPreviewUrl(null);
    }
  }, [machine, setPreviewUrl]);

  useEffect(() => {
    const initialSelectedResources: Record<number, number | undefined> = {};
    
    if (requirements && requirements.length > 0) {
      requirements.forEach((req) => {
        initialSelectedResources[req.plan_id] = req.resource_id;
      });
    }
    
    setSelectedResources(initialSelectedResources);
  }, [requirements]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    try {
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      
      const url = await uploadImage(file);
      setPhotoURL(url);
      
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    }
  };

  const handleDelete = async () => {
    if (!machine) return;

    try {
      setIsDeleting(true);

      if (machine.machine_type_id) {
        await deleteTopicsByItemId(machine.machine_type_id, "machine");
      }
      
      try {
        await supabase
          .from("machine_training_requirements")
          .delete()
          .eq("machine_type_id", machine.machine_type_id);
      } catch (error) {
        console.error("Error deleting training requirements:", error);
      }
      
      try {
        await supabase
          .from("training_offers")
          .delete()
          .eq("machine_type_id", machine.machine_type_id);
      } catch (error) {
        console.error("Error deleting training offers:", error);
      }
      
      const { error } = await supabase
        .from("machine_types")
        .delete()
        .eq("machine_type_id", machine.machine_type_id);

      if (error) throw error;

      toast.success("Machine deleted successfully");
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error deleting machine:", error);
      toast.error(error.message || "Failed to delete machine");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Machine name is required");
      return;
    }

    try {
      setIsSaving(true);

      if (machine) {
        const { error } = await supabase
          .from("machine_types")
          .update({
            name,
            description,
            photo_url: photoURL,
          })
          .eq("machine_type_id", machine.machine_type_id);

        if (error) {
          console.error("Error updating machine:", error);
          throw error;
        }
        toast.success("Machine updated successfully");
      } else {
        const { data, error } = await supabase.from("machine_types").insert({
          name,
          description,
          photo_url: photoURL,
        }).select();

        if (error) {
          console.error("Error creating machine:", error);
          throw error;
        }
        toast.success("Machine created successfully");
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving machine:", error);
      toast.error(error.message || "Failed to save machine");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResourceChange = async (planId: number, resourceId: number | undefined) => {
    setSelectedResources((prev) => ({
      ...prev,
      [planId]: resourceId,
    }));

    if (resourceId) {
      await saveRequirement(planId, resourceId);
    } else {
      await deleteRequirement(planId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>
            {machine ? "Edit Machine" : "Add New Machine"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-white">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-0 focus:ring-offset-0 focus:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Enter machine name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-blue-500 focus:ring-0 focus:ring-offset-0 min-h-[100px]"
                placeholder="Enter machine description"
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
          
          <div className="space-y-4">
            <div className="grid gap-3">
              <h3 className="font-medium text-white border-b border-slate-700 pb-2">Training Requirements</h3>
              
              {loadingPlans || loadingResources ? (
                <div className="text-slate-400 text-sm">Loading training plans...</div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <div key={plan.plan_id} className="flex flex-col gap-1.5">
                      <Label className="text-sm text-slate-300">{plan.name}</Label>
                      <Select
                        value={selectedResources[plan.plan_id]?.toString() || "none"}
                        onValueChange={(value) => handleResourceChange(plan.plan_id, value === "none" ? undefined : Number(value))}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500">
                          <SelectValue placeholder="No resource required" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                          <SelectItem value="none">No resource required</SelectItem>
                          {resources.map((resource) => (
                            <SelectItem key={resource.resource_id} value={resource.resource_id.toString()}>
                              {resource.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          {machine && (
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
                "Delete Machine"
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

export default MachineTypeModal;
