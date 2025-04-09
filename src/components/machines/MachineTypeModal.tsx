
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MachineType } from "@/hooks/useMachineTypes";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useImageUpload } from "@/hooks/use-image-upload";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Loader2, XCircle } from "lucide-react";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useResources } from "@/hooks/useResources";
import { useMachineTrainingRequirements } from "@/hooks/useMachineTrainingRequirements";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { plans, loading: loadingPlans } = useTrainingPlans();
  const { resources, loading: loadingResources } = useResources();
  const { requirements, saveRequirement } = useMachineTrainingRequirements(machine?.machine_type_id);
  
  const { 
    previewUrl, 
    fileInputRef, 
    handleThumbnailClick, 
    handleFileChange,
    handleRemove,
    setPreviewUrl,
    isUploading 
  } = useImageUpload(machine?.photo_url);

  useEffect(() => {
    if (machine) {
      setName(machine.name || "");
      setDescription(machine.description || "");
      setPreviewUrl(machine.photo_url);
    } else {
      setName("");
      setDescription("");
      setPreviewUrl(null);
    }
  }, [machine, setPreviewUrl]);

  const handleDeletePhoto = async () => {
    if (!machine?.photo_url) return;

    try {
      const fileName = machine.photo_url.split('/').pop();
      
      if (fileName) {
        const { error: deleteError } = await supabase.storage
          .from('machine_images')
          .remove([fileName]);
          
        if (deleteError) {
          console.error("Error deleting image from storage:", deleteError);
          throw deleteError;
        }
      }
      
      const { error: updateError } = await supabase
        .from('machine_types')
        .update({ photo_url: null })
        .eq('machine_type_id', machine.machine_type_id);
        
      if (updateError) {
        console.error("Error updating machine record:", updateError);
        throw updateError;
      }
      
      setPreviewUrl(null);
      toast.success("Photo deleted successfully");
      
    } catch (error: any) {
      console.error("Error deleting photo:", error);
      toast.error(error.message || "Failed to delete photo");
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
            photo_url: previewUrl,
          })
          .eq("machine_type_id", machine.machine_type_id);

        if (error) {
          console.error("Error updating machine type:", error);
          throw error;
        }
        toast.success("Machine type updated successfully");
      } else {
        const { error } = await supabase.from("machine_types").insert({
          name,
          description,
          photo_url: previewUrl,
        });

        if (error) {
          console.error("Error creating machine type:", error);
          throw error;
        }
        toast.success("Machine type created successfully");
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving machine type:", error);
      toast.error(error.message || "Failed to save machine type");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!machine) return;

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from("machine_types")
        .delete()
        .eq("machine_type_id", machine.machine_type_id);

      if (error) throw error;

      if (machine.photo_url) {
        const fileName = machine.photo_url.split("/").pop();
        if (fileName) {
          await supabase.storage
            .from("machine_images")
            .remove([fileName]);
        }
      }

      toast.success("Machine type deleted successfully");
      onSave();
      onClose();
      setConfirmDeleteOpen(false);
    } catch (error: any) {
      console.error("Error deleting machine type:", error);
      toast.error(error.message || "Failed to delete machine type");
    } finally {
      setIsDeleting(false);
    }
  };

  const getResourceForPlan = (planId: number) => {
    const requirement = requirements.find(req => req.plan_id === planId);
    return requirement ? requirement.resource_id : null;
  };

  const handleResourceSelect = async (planId: number, resourceId: number) => {
    try {
      await saveRequirement(planId, resourceId);
      toast.success("Training requirement updated");
    } catch (error: any) {
      console.error("Error saving requirement:", error);
      toast.error("Failed to update training requirement");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] bg-slate-900 border-slate-800 text-slate-100 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {machine ? "Edit Machine Type" : "Add New Machine Type"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Machine Information */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-white">Name</Label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-blue-500"
                  placeholder="Enter machine name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description" className="text-white">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-blue-500 min-h-[100px]"
                  placeholder="Enter machine description"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-white">Machine Photo</Label>
                <div className="relative">
                  <AspectRatio ratio={1} className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-md overflow-hidden">
                    {previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt="Machine preview"
                          className="object-cover w-full h-full"
                        />
                        <button
                          type="button"
                          onClick={handleRemove}
                          className="absolute top-2 right-2 bg-red-900/80 p-1 rounded-full hover:bg-red-800 transition-colors"
                        >
                          <XCircle className="h-5 w-5 text-white" />
                        </button>
                      </>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center h-full cursor-pointer"
                        onClick={handleThumbnailClick}
                      >
                        <p className="text-slate-400 text-center">
                          Click to upload an image
                        </p>
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                      </div>
                    )}
                  </AspectRatio>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Training Plans and Resources */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Training Resources</h3>
                {loadingPlans || loadingResources ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plans.length === 0 ? (
                      <p className="text-slate-400">No training plans available</p>
                    ) : (
                      plans.map((plan) => (
                        <div key={plan.plan_id} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-md">
                          <div>
                            <p className="text-white font-medium">{plan.name}</p>
                            {plan.description && (
                              <p className="text-xs text-slate-400">{plan.description}</p>
                            )}
                          </div>
                          <Select 
                            value={getResourceForPlan(plan.plan_id)?.toString() || ''}
                            onValueChange={(value) => handleResourceSelect(plan.plan_id, parseInt(value))}
                          >
                            <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Select a resource" />
                            </SelectTrigger>
                            <SelectContent 
                              position="popper" 
                              className="bg-slate-800 border-slate-700 text-slate-100 z-[1000]"
                              sideOffset={5}
                            >
                              {resources.map((resource) => (
                                <SelectItem 
                                  key={resource.resource_id} 
                                  value={resource.resource_id.toString()}
                                  className="text-slate-100 hover:bg-slate-700 focus:bg-slate-700 focus:text-white"
                                >
                                  {resource.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            {machine && (
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
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
              disabled={isSaving || isUploading}
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

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. This will permanently delete the
              machine type and remove the data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-blue-700 border-slate-700 hover:bg-slate-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MachineTypeModal;
