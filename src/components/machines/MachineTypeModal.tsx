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
import { supabase } from "@/integrations/supabase/client"; // Corrected path
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useMachineTrainingRequirements } from "@/hooks/useMachineTrainingRequirements";
import { useResources } from "@/hooks/useResources";
import { useTrainingTopics } from "@/hooks/useTrainingTopics"; // Keep if needed for topic deletion
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync"; // Import the hook

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
  const { syncMachineTypeChanges } = usePlanningDetailsSync(); // Use the hook

  // Ensure requirements hook gets a valid ID or null
  const machineTypeId = machine?.machine_type_id ?? null;
  const {
    requirements, // This holds the current requirements for the machineTypeId
    saveRequirement,
    deleteRequirement,
    getResourceForPlan, // Utility to get resource for a plan from 'requirements'
    loading: loadingRequirements, // Add loading state from requirements hook
  } = useMachineTrainingRequirements(machineTypeId);

  // Keep if you need to delete associated topics
  const { deleteTopicsByItemId } = useTrainingTopics([]);

  // Local state to manage the resource selections in the UI *before* saving
  const [selectedResources, setSelectedResources] = useState<Record<number, string>>({}); // Use string for Select value 'none'/'id'

  // --- Effects ---

  // Reset form state when modal opens or machine changes
  useEffect(() => {
    if (open) {
      if (machine) {
        setName(machine.name || "");
        setDescription(machine.description || "");
        setPhotoURL(machine.photo_url);
        setPreviewUrl(machine.photo_url);
        // Initialize selectedResources based on fetched requirements
        const initialSelected: Record<number, string> = {};
         if (plans && requirements) {
             plans.forEach((plan) => {
                const resourceId = getResourceForPlan(plan.plan_id);
                initialSelected[plan.plan_id] = resourceId ? resourceId.toString() : "none";
             });
         }
        setSelectedResources(initialSelected);

      } else {
        // Reset for new machine
        setName("");
        setDescription("");
        setPhotoURL(null);
        setPreviewUrl(null);
        setSelectedResources({}); // Clear selections
      }
    }
  }, [open, machine, plans, requirements, getResourceForPlan, setPreviewUrl]); // Add dependencies


  // --- Handlers ---

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    // Show preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      const uploadedUrl = await uploadImage(file); // Upload returns the final URL
      setPhotoURL(uploadedUrl); // Set the final URL to be saved
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      setPreviewUrl(photoURL); // Revert preview if upload fails
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Machine name is required");
      return;
    }
     if (!machineTypeId && !machine) { // Ensure we have context if editing
         // This case shouldn't happen if logic is correct, but good safeguard
         console.error("Save attempt without machine context for potential edit.");
         return;
     }

    setIsSaving(true);
    let savedMachineTypeId: number | undefined;

    try {
      let machineData;
      // --- Save Machine Type Info ---
      if (machine) {
        // Update existing machine
        const { data, error } = await supabase
          .from("machine_types")
          .update({
            name,
            description,
            photo_url: photoURL, // Use the potentially updated photoURL
          })
          .eq("machine_type_id", machine.machine_type_id)
          .select('machine_type_id') // Select ID for consistency
          .single();

        if (error) throw error;
        machineData = data;
        toast.success("Machine updated successfully");
      } else {
        // Create new machine
        const { data, error } = await supabase
          .from("machine_types")
          .insert({
            name,
            description,
            photo_url: photoURL,
          })
          .select('machine_type_id') // Get the ID of the new machine
          .single();

        if (error) throw error;
        machineData = data;
        toast.success("Machine created successfully");
      }

      savedMachineTypeId = machineData?.machine_type_id;

      if (!savedMachineTypeId) {
        throw new Error("Failed to get machine ID after save/update.");
      }

      // --- Save Training Requirements ---
      const requirementPromises = [];
      for (const planIdStr in selectedResources) {
          const planId = parseInt(planIdStr, 10);
          const resourceValue = selectedResources[planId]; // 'none' or resource_id as string
          const resourceId = resourceValue === "none" ? undefined : parseInt(resourceValue, 10);

          // Check if this requirement differs from the initial fetched state
          const initialResourceId = getResourceForPlan(planId);
          const initialResourceValue = initialResourceId ? initialResourceId.toString() : "none";

          if (resourceValue !== initialResourceValue) {
             console.log(`Requirement changed for plan ${planId}: ${initialResourceValue} -> ${resourceValue}`);
             if (resourceId !== undefined) {
                // Save or update requirement
                requirementPromises.push(saveRequirement(planId, resourceId, savedMachineTypeId)); // Pass savedMachineTypeId
             } else {
                // Delete requirement if set back to 'none'
                requirementPromises.push(deleteRequirement(planId, savedMachineTypeId)); // Pass savedMachineTypeId
             }
          }
      }

      if (requirementPromises.length > 0) {
           console.log(`Saving ${requirementPromises.length} requirement changes...`);
           await Promise.all(requirementPromises);
           toast.success("Training requirements updated.");
      }

      // --- Sync & Close ---
      await syncMachineTypeChanges(savedMachineTypeId); // Sync after all changes

      onSave(); // Callback to refresh list in parent
      onClose(); // Close modal

    } catch (error: any) {
      console.error("Error saving machine:", error);
      toast.error(error.message || "Failed to save machine");
    } finally {
      setIsSaving(false);
    }
  };


 const handleDelete = async () => {
    if (!machine || !machine.machine_type_id) return; // Ensure we have a machine with ID

    const idToDelete = machine.machine_type_id;

    setIsDeleting(true);
    try {
      // 1. Delete related training topics (if using the hook)
      await deleteTopicsByItemId(idToDelete, "machine");

      // 2. Delete related training requirements (handle potential errors)
      try {
        await supabase
          .from("machine_training_requirements")
          .delete()
          .eq("machine_type_id", idToDelete);
      } catch (reqError: any) {
        console.warn("Could not delete all training requirements:", reqError.message);
        // Decide if this should prevent machine deletion
      }

      // 3. Delete related training offers (handle potential errors)
      try {
        await supabase
          .from("training_offers")
          .delete()
          .eq("machine_type_id", idToDelete);
      } catch (offerError: any) {
        console.warn("Could not delete all training offers:", offerError.message);
        // Decide if this should prevent machine deletion
      }

      // 4. Delete the machine type itself
      const { error: deleteError } = await supabase
        .from("machine_types")
        .delete()
        .eq("machine_type_id", idToDelete);

      if (deleteError) throw deleteError; // This is likely critical

      toast.success("Machine deleted successfully");

      // 5. Sync changes
      await syncMachineTypeChanges(idToDelete); // Sync after successful delete

      onSave(); // Refresh parent list
      onClose(); // Close modal

    } catch (error: any) {
      console.error("Error deleting machine:", error);
      toast.error(error.message || "Failed to delete machine");
    } finally {
      setIsDeleting(false);
    }
  };

  // Update local state for immediate UI feedback when select changes
  const handleResourceSelectionChange = (planId: number, value: string) => {
     setSelectedResources(prev => ({
        ...prev,
        [planId]: value,
     }));
  };

  // --- Render ---

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>
            {machine ? "Edit Machine" : "Add New Machine"}
          </DialogTitle>
        </DialogHeader>

        {/* Added overflow-y-auto to content area */}
        <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">

          {/* Left Column: Machine Details */}
          <div className="space-y-4">
            {/* Name */}
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

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-blue-500 focus:ring-0 focus:ring-offset-0 min-h-[100px] resize-y" // Allow vertical resize
                placeholder="Enter machine description"
              />
            </div>

            {/* Photo Upload */}
            <div className="grid gap-2">
              <Label htmlFor="photo-upload" className="text-white">Photo</Label>
              <div className="flex flex-col items-center gap-4">
                {/* Preview Area */}
                <div className="relative w-40 h-40 mx-auto overflow-hidden rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center">
                    {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={name || 'Machine preview'}
                          className="w-full h-full object-contain" // Use contain to avoid distortion
                          onError={(e) => {
                             console.error("Error loading image preview:", previewUrl);
                             (e.target as HTMLImageElement).src = "/placeholder.svg"; // Fallback
                          }}
                        />
                     ) : (
                        <span className="text-slate-500 text-sm">No image</span>
                    )}
                </div>
                {/* Upload Button/Label */}
                <label
                  htmlFor="photo-upload-input" // Link label to input
                  className={`cursor-pointer flex items-center justify-center gap-2 p-2 border border-dashed rounded-lg w-full transition-colors ${isUploading ? 'border-slate-500 bg-slate-800/30 text-slate-500' : 'border-slate-600 hover:bg-slate-800/50 hover:border-blue-600 text-slate-300'}`}
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">
                    {isUploading ? "Uploading..." : (photoURL ? "Change Image" : "Upload Image")}
                  </span>
                  <input
                    id="photo-upload-input" // Actual input element
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

          {/* Right Column: Training Requirements */}
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
                        // Use local state `selectedResources` for the value
                        value={selectedResources[plan.plan_id] || "none"}
                        // Update local state on change
                        onValueChange={(value) => handleResourceSelectionChange(plan.plan_id, value)}
                        // Disable select if saving/deleting or if it's a new machine (no ID yet)
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
          {/* Delete Button */}
          {machine && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="mr-auto" // Pushes delete button to the left
            >
              {isDeleting ? (
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting... </>
              ) : (
                "Delete Machine"
              )}
            </Button>
          )}
          {/* Cancel Button */}
          <Button
            type="button" // Ensure it doesn't submit form
            variant="outline"
            onClick={onClose}
            className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </Button>
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || isDeleting || isUploading} // Also disable while uploading image
            className="bg-blue-700 hover:bg-blue-800"
          >
            {isSaving ? (
              <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>
            ) : (
              machine ? "Save Changes" : "Create Machine" // Dynamic button text
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MachineTypeModal;