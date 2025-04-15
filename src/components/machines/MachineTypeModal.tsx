import React, { useState, useEffect, useCallback } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useMachineTrainingRequirements } from "@/hooks/useMachineTrainingRequirements";
import { useResources } from "@/hooks/useResources";
import { useTrainingTopics } from "@/hooks/useTrainingTopics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync";

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

  const { plans, loading: loadingPlans } = useTrainingPlans();
  const { resources, loading: loadingResources } = useResources();
  const { syncMachineTypeChanges } = usePlanningDetailsSync();

  const machineTypeId = machine?.machine_type_id ?? null;
  const {
    requirements,
    saveRequirement,
    deleteRequirement,
    getResourceForPlan,
    loading: loadingRequirements,
  } = useMachineTrainingRequirements(machineTypeId);

  const { deleteTopicsByItemId } = useTrainingTopics([]);

  const [selectedResources, setSelectedResources] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open) {
      if (machine) {
        setName(machine.name || "");
        setDescription(machine.description || "");
        setPhotoURL(machine.photo_url);
        setPreviewUrl(machine.photo_url);
        const initialSelected: Record<number, string> = {};
         if (plans && requirements) {
             plans.forEach((plan) => {
                const resourceId = getResourceForPlan(plan.plan_id);
                initialSelected[plan.plan_id] = resourceId ? resourceId.toString() : "none";
             });
         }
        setSelectedResources(initialSelected);
      } else {
        setName("");
        setDescription("");
        setPhotoURL(null);
        setPreviewUrl(null);
        setSelectedResources({});
      }
    }
  }, [open, machine, plans, requirements, getResourceForPlan, setPreviewUrl]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      const uploadedUrl = await uploadImage(file);
      setPhotoURL(uploadedUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      setPreviewUrl(photoURL);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Machine name is required");
      return;
    }
     if (!machineTypeId && !machine) {
         console.error("Save attempt without machine context for potential edit.");
         return;
     }

    setIsSaving(true);
    let savedMachineTypeId: number | undefined;

    try {
      let machineData;
      if (machine) {
        const { data, error } = await supabase
          .from("machine_types")
          .update({
            name,
            description,
            photo_url: photoURL,
          })
          .eq("machine_type_id", machine.machine_type_id)
          .select('machine_type_id')
          .single();

        if (error) throw error;
        machineData = data;
        toast.success("Machine updated successfully");
      } else {
        const { data, error } = await supabase
          .from("machine_types")
          .insert({
            name,
            description,
            photo_url: photoURL,
          })
          .select('machine_type_id')
          .single();

        if (error) throw error;
        machineData = data;
        toast.success("Machine created successfully");
      }

      savedMachineTypeId = machineData?.machine_type_id;

      if (!savedMachineTypeId) {
        throw new Error("Failed to get machine ID after save/update.");
      }

      const requirementPromises = [];
      for (const planIdStr in selectedResources) {
          const planId = parseInt(planIdStr, 10);
          const resourceValue = selectedResources[planId];
          const resourceId = resourceValue === "none" ? undefined : parseInt(resourceValue, 10);

          const initialResourceId = getResourceForPlan(planId);
          const initialResourceValue = initialResourceId ? initialResourceId.toString() : "none";

          if (resourceValue !== initialResourceValue) {
             console.log(`Requirement changed for plan ${planId}: ${initialResourceValue} -> ${resourceValue}`);
             if (resourceId !== undefined) {
                await saveRequirement(planId, resourceId);
             } else {
                await deleteRequirement(planId);
             }
          }
      }

      if (requirementPromises.length > 0) {
           console.log(`Saving ${requirementPromises.length} requirement changes...`);
           await Promise.all(requirementPromises);
           toast.success("Training requirements updated.");
      }

      await syncMachineTypeChanges();

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving machine:", error);
      toast.error(error.message || "Failed to save machine");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!machine || !machine.machine_type_id) return;

    const idToDelete = machine.machine_type_id;

    setIsDeleting(true);
    try {
      await deleteTopicsByItemId(idToDelete, "machine");

      try {
        await supabase
          .from("machine_training_requirements")
          .delete()
          .eq("machine_type_id", idToDelete);
      } catch (reqError: any) {
        console.warn("Could not delete all training requirements:", reqError.message);
      }

      try {
        await supabase
          .from("training_offers")
          .delete()
          .eq("machine_type_id", idToDelete);
      } catch (offerError: any) {
        console.warn("Could not delete all training offers:", offerError.message);
      }

      const { error: deleteError } = await supabase
        .from("machine_types")
        .delete()
        .eq("machine_type_id", idToDelete);

      if (deleteError) throw deleteError;

      toast.success("Machine deleted successfully");

      await syncMachineTypeChanges();

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error deleting machine:", error);
      toast.error(error.message || "Failed to delete machine");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResourceSelectionChange = (planId: number, value: string) => {
     setSelectedResources(prev => ({
        ...prev,
        [planId]: value,
     }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>
            {machine ? "Edit Machine" : "Add New Machine"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">

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
                className="p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-blue-500 focus:ring-0 focus:ring-offset-0 min-h-[100px] resize-y"
                placeholder="Enter machine description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="photo-upload" className="text-white">Photo</Label>
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-40 h-40 mx-auto overflow-hidden rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center">
                    {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={name || 'Machine preview'}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                             console.error("Error loading image preview:", previewUrl);
                             (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                     ) : (
                        <span className="text-slate-500 text-sm">No image</span>
                    )}
                </div>
                <label
                  htmlFor="photo-upload-input"
                  className={`cursor-pointer flex items-center justify-center gap-2 p-2 border border-dashed rounded-lg w-full transition-colors ${isUploading ? 'border-slate-500 bg-slate-800/30 text-slate-500' : 'border-slate-600 hover:bg-slate-800/50 hover:border-blue-600 text-slate-300'}`}
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">
                    {isUploading ? "Uploading..." : (photoURL ? "Change Image" : "Upload Image")}
                  </span>
                  <input
                    id="photo-upload-input"
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

              {loadingPlans || loadingResources || loadingRequirements ? (
                <div className="text-slate-400 text-sm flex items-center gap-2">
                   <Loader2 className="h-4 w-4 animate-spin" /> Loading training data...
                </div>
              ) : plans.length === 0 ? (
                 <div className="text-slate-400 text-sm p-4 bg-slate-800/50 rounded border border-slate-700">No training plans configured yet.</div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <div key={plan.plan_id} className="flex flex-col gap-1.5">
                      <Label className="text-sm text-slate-300">{plan.name}</Label>
                      <Select
                        value={selectedResources[plan.plan_id] || "none"}
                        onValueChange={(value) => handleResourceSelectionChange(plan.plan_id, value)}
                        disabled={isSaving || isDeleting || (!machine && !machineTypeId)}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500">
                          <SelectValue placeholder="Select required resource..." />
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
                       {!machine && !machineTypeId && (
                         <p className="text-xs text-slate-500 mt-1">Save the machine first to assign requirements.</p>
                       )}
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
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting... </>
              ) : (
                "Delete Machine"
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isDeleting || isUploading}
            className="bg-blue-700 hover:bg-blue-800"
          >
            {isSaving ? (
              <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>
            ) : (
              machine ? "Save Changes" : "Create Machine"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MachineTypeModal;
