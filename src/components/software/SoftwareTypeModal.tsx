
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
import { SoftwareType } from "@/hooks/useSoftwareTypes";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useImageUpload } from "@/hooks/use-image-upload";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Loader2, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useResources } from "@/hooks/useResources";
import { useSoftwareTrainingRequirements } from "@/hooks/useSoftwareTrainingRequirements";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [isActive, setIsActive] = useState(true);
  const [alwaysIncluded, setAlwaysIncluded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  const { trainingPlans } = useTrainingPlans();
  const { resources } = useResources();
  const { 
    requirements, 
    saveRequirement, 
    removeRequirement, 
    getResourceForPlan 
  } = useSoftwareTrainingRequirements(software?.software_type_id);
  
  const { 
    previewUrl, 
    fileInputRef, 
    handleThumbnailClick, 
    handleFileChange,
    handleRemove,
    setPreviewUrl,
    isUploading 
  } = useImageUpload(software?.photo_url);

  useEffect(() => {
    if (software) {
      setName(software.name || "");
      setDescription(software.description || "");
      setIsActive(software.is_active);
      setAlwaysIncluded(software.always_included);
      setPreviewUrl(software.photo_url);
    } else {
      setName("");
      setDescription("");
      setIsActive(true);
      setAlwaysIncluded(false);
      setPreviewUrl(null);
    }
  }, [software, setPreviewUrl]);

  const handleDeletePhoto = async () => {
    if (!software?.photo_url) return;

    try {
      const fileName = software.photo_url.split('/').pop();
      
      if (fileName) {
        const { error: deleteError } = await supabase.storage
          .from('software_images')
          .remove([fileName]);
          
        if (deleteError) {
          console.error("Error deleting image from storage:", deleteError);
          throw deleteError;
        }
      }
      
      const { error: updateError } = await supabase
        .from('software_types')
        .update({ photo_url: null })
        .eq('software_type_id', software.software_type_id);
        
      if (updateError) {
        console.error("Error updating software record:", updateError);
        throw updateError;
      }
      
      setPreviewUrl(null);
      toast.success("Photo deleted successfully");
      
    } catch (error: any) {
      console.error("Error deleting photo:", error);
      toast.error(error.message || "Failed to delete photo");
    }
  };

  const handleResourceSelect = (planId: number, resourceId: number) => {
    saveRequirement(planId, resourceId);
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
            photo_url: previewUrl,
            is_active: isActive,
            always_included: alwaysIncluded
          })
          .eq("software_type_id", software.software_type_id);

        if (error) {
          console.error("Error updating software type:", error);
          throw error;
        }
        toast.success("Software type updated successfully");
      } else {
        const { error } = await supabase.from("software_types").insert({
          name,
          description,
          photo_url: previewUrl,
          is_active: isActive,
          always_included: alwaysIncluded
        });

        if (error) {
          console.error("Error creating software type:", error);
          throw error;
        }
        toast.success("Software type created successfully");
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving software type:", error);
      toast.error(error.message || "Failed to save software type");
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

      if (software.photo_url) {
        const fileName = software.photo_url.split("/").pop();
        if (fileName) {
          await supabase.storage
            .from("software_images")
            .remove([fileName]);
        }
      }

      toast.success("Software type deleted successfully");
      onSave();
      onClose();
      setConfirmDeleteOpen(false);
    } catch (error: any) {
      console.error("Error deleting software type:", error);
      toast.error(error.message || "Failed to delete software type");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] bg-slate-900 border-slate-800 text-slate-100 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {software ? "Edit Software Type" : "Add New Software Type"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 bg-slate-800">
              <TabsTrigger value="details">Software Details</TabsTrigger>
              <TabsTrigger value="training" disabled={!software}>Training Plans</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="pt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-white">Name</Label>
                  <input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-blue-500"
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

                <div className="flex items-center gap-2 py-2">
                  <Checkbox 
                    id="alwaysIncluded" 
                    checked={alwaysIncluded}
                    onCheckedChange={(checked) => setAlwaysIncluded(checked === true)}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="alwaysIncluded" className="text-white cursor-pointer">Always Included</Label>
                </div>

                <div className="grid gap-2">
                  <Label className="text-white">Software Photo</Label>
                  <div className="relative">
                    <AspectRatio ratio={1} className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-md overflow-hidden">
                      {previewUrl ? (
                        <>
                          <img
                            src={previewUrl}
                            alt="Software preview"
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
            </TabsContent>
            
            <TabsContent value="training" className="pt-4">
              {software ? (
                <div>
                  <h3 className="text-lg font-medium mb-4 text-white">Training Requirements</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                      <h4 className="text-md font-medium mb-3 text-white">Training Plans</h4>
                      <div className="space-y-3">
                        {trainingPlans.map(plan => (
                          <div key={plan.plan_id} className="flex items-center justify-between">
                            <div>
                              <p className="text-white text-sm">{plan.name}</p>
                              <p className="text-xs text-gray-400">{plan.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                      <h4 className="text-md font-medium mb-3 text-white">Assign Resources</h4>
                      <div className="space-y-3">
                        {trainingPlans.map(plan => (
                          <div key={plan.plan_id} className="flex items-center justify-between">
                            <p className="text-white text-sm">{plan.name}</p>
                            <div>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Save the software type first to manage training requirements
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4">
            {software && activeTab === "details" && (
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
              software type and remove the data from our servers.
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

export default SoftwareTypeModal;
