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
import { supabase } from "@/integrations/supabase/client"; // Corrected path
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useSoftwareTrainingRequirements } from "@/hooks/useSoftwareTrainingRequirements";
import { useResources } from "@/hooks/useResources";
import { useTrainingTopics } from "@/hooks/useTrainingTopics"; // Keep if needed
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync"; // Import the hook

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

  const { plans, loading: loadingPlans } = useTrainingPlans();
  const { resources, loading: loadingResources } = useResources();
  const { syncSoftwareTypeChanges } = usePlanningDetailsSync(); // Use the hook

  const softwareTypeId = software?.software_type_id ?? null;
  const {
    requirements,
    saveRequirement,
    removeRequirement, // Renamed from deleteRequirement for clarity if needed
    getResourceForPlan,
    loading: loadingRequirements,
  } = useSoftwareTrainingRequirements(softwareTypeId);

  const { deleteTopicsByItemId } = useTrainingTopics([]);

  // Local state for UI selections
  const [selectedResources, setSelectedResources] = useState<Record<number, string>>({});

  // --- Effects ---

  // Reset form state
  useEffect(() => {
    if (open) {
        if (software) {
            setName(software.name || "");
            setDescription(software.description || "");
            setAlwaysIncluded(software.always_included);
            setPhotoURL(software.photo_url);
            setPreviewUrl(software.photo_url);
            // Initialize selections based on fetched requirements
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
            setAlwaysIncluded(false);
            setPhotoURL(null);
            setPreviewUrl(null);
            setSelectedResources({});
        }
    }
  }, [open, software, plans, requirements, getResourceForPlan, setPreviewUrl]); // Added dependencies

  // --- Handlers ---

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
      setPreviewUrl(photoURL); // Revert preview
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Software name is required");
      return;
    }

    setIsSaving(true);
    let savedSoftwareTypeId: number | undefined;

    try {
        let softwareData;
        // --- Save Software Type Info ---
        if (software) {
            // Update existing software
            const { data, error } = await supabase
              .from("software_types")
              .update({
                name,
                description,
                always_included: alwaysIncluded,
                photo_url: photoURL,
              })
              .eq("software_type_id", software.software_type_id)
              .select('software_type_id')
              .single();
            if (error) throw error;
            softwareData = data;
            toast.success("Software updated successfully");
        } else {
            // Create new software
            const { data, error } = await supabase
              .from("software_types")
              .insert({
                name,
                description,
                always_included: alwaysIncluded,
                photo_url: photoURL,
              })
              .select('software_type_id')
              .single();
            if (error) throw error;
            softwareData = data;
            toast.success("Software created successfully");
        }

        savedSoftwareTypeId = softwareData?.software_type_id;

        if (!savedSoftwareTypeId) {
            throw new Error("Failed to get software ID after save/update.");
        }

        // --- Save Training Requirements ---
        const requirementPromises = [];
         for (const planIdStr in selectedResources) {
            const planId = parseInt(planIdStr, 10);
            const resourceValue = selectedResources[planId];
            const resourceId = resourceValue === "none" ? undefined : parseInt(resourceValue, 10);

            const initialResourceId = getResourceForPlan(planId);
            const initialResourceValue = initialResourceId ? initialResourceId.toString() : "none";

            if (resourceValue !== initialResourceValue) {
                console.log(`Software requirement changed for plan ${planId}: ${initialResourceValue} -> ${resourceValue}`);
                if (resourceId !== undefined) {
                    requirementPromises.push(saveRequirement(planId, resourceId, savedSoftwareTypeId));
                } else {
                    // Use removeRequirement (or deleteRequirement)
                    requirementPromises.push(removeRequirement(planId, savedSoftwareTypeId));
                }
            }
        }

        if (requirementPromises.length > 0) {
            console.log(`Saving ${requirementPromises.length} software requirement changes...`);
            await Promise.all(requirementPromises);
            toast.success("Software training requirements updated.");
        }


        // --- Sync & Close ---
        await syncSoftwareTypeChanges(savedSoftwareTypeId); // Sync changes

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
    if (!software || !software.software_type_id) return;

    const idToDelete = software.software_type_id;

    setIsDeleting(true);
    try {
      // 1. Delete related topics
      await deleteTopicsByItemId(idToDelete, "software");

      // 2. Delete related requirements
      try {
        await supabase
          .from("software_training_requirements")
          .delete()
          .eq("software_type_id", idToDelete);
      } catch (reqError: any) {
        console.warn("Could not delete all software training requirements:", reqError.message);
      }
      
      // 3. Delete related offers
       try {
        await supabase
          .from("training_offers")
          .delete()
          .eq("software_type_id", idToDelete);
      } catch (offerError: any) {
        console.warn("Could not delete all training offers:", offerError.message);
      }

      // 4. Delete software type
      const { error: deleteError } = await supabase
        .from("software_types")
        .delete()
        .eq("software_type_id", idToDelete);

      if (deleteError) throw deleteError;

      toast.success("Software deleted successfully");

      // 5. Sync changes
      await syncSoftwareTypeChanges(idToDelete); // Sync after delete

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error deleting software:", error);
      toast.error(error.message || "Failed to delete software");
    } finally {
      setIsDeleting(false);
    }
  };

  // Update local state for UI select
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
            {software ? "Edit Software" : "Add New Software"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {/* Left Column: Software Details */}
          <div className="space-y-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-white">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-0 focus:ring-offset-0 focus:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Enter software name"
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-blue-500 focus:ring-0 focus:ring-offset-0 min-h-[100px] resize-y"
                placeholder="Enter software description"
              />
            </div>

            {/* Always Included Switch */}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="alwaysIncluded" className="text-white cursor-pointer pr-4">
                Always Included in New Quotes
              </Label>
              <Switch
                id="alwaysIncluded"
                checked={alwaysIncluded}
                onCheckedChange={setAlwaysIncluded}
                 className="data-[state=checked]:bg-blue-600" // Style checked state
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
                           alt={name || 'Software preview'}
                           className="w-full h-full object-contain"
                           onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                         />
                      ) : (
                         <span className="text-slate-500 text-sm">No image</span>
                     )}
                 </div>
                 {/* Upload Button/Label */}
                 <label
                   htmlFor="photo-upload-input-sw" // Unique ID
                   className={`cursor-pointer flex items-center justify-center gap-2 p-2 border border-dashed rounded-lg w-full transition-colors ${isUploading ? 'border-slate-500 bg-slate-800/30 text-slate-500' : 'border-slate-600 hover:bg-slate-800/50 hover:border-blue-600 text-slate-300'}`}
                 >
                   <Upload className="h-4 w-4" />
                   <span className="text-sm">
                     {isUploading ? "Uploading..." : (photoURL ? "Change Image" : "Upload Image")}
                   </span>
                   <input
                     id="photo-upload-input-sw" // Match label's htmlFor
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
                        value={selectedResources[plan.plan_id] || "none"}
                        onValueChange={(value) => handleResourceSelectionChange(plan.plan_id, value)}
                        disabled={isSaving || isDeleting || (!software && !softwareTypeId)}
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
                       {!software && !softwareTypeId && (
                         <p className="text-xs text-slate-500 mt-1">Save the software first to assign requirements.</p>
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
          {software && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="mr-auto"
            >
              {isDeleting ? (
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting... </>
              ) : (
                "Delete Software"
              )}
            </Button>
          )}
          {/* Cancel Button */}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </Button>
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || isDeleting || isUploading}
            className="bg-blue-700 hover:bg-blue-800"
          >
            {isSaving ? (
              <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>
            ) : (
              software ? "Save Changes" : "Create Software"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SoftwareTypeModal;