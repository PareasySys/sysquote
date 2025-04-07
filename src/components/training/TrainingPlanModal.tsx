
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
import { Input } from "@/components/ui/input";
import { TrainingPlan } from "@/hooks/useTrainingPlans";
import { useTrainingIcons, TrainingIcon } from "@/hooks/useTrainingIcons";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStorageTrainingIcons } from "@/hooks/useStorageTrainingIcons";

interface TrainingPlanModalProps {
  open: boolean;
  onClose: () => void;
  plan?: TrainingPlan | null;
  onSave: () => void;
}

const TrainingPlanModal: React.FC<TrainingPlanModalProps> = ({
  open,
  onClose,
  plan,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number | null>(null);
  const [iconName, setIconName] = useState("skill-level-basic");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { icons, loading: loadingIcons, fetchIcons } = useTrainingIcons();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadIcon, uploading } = useStorageTrainingIcons();
  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  
  useEffect(() => {
    if (plan) {
      setName(plan.name || "");
      setDescription(plan.description || "");
      setDisplayOrder(plan.display_order);
      setIconName(plan.icon_name || "skill-level-basic");
    } else {
      setName("");
      setDescription("");
      setDisplayOrder(null);
      setIconName("skill-level-basic");
    }
  }, [plan]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Training plan name is required");
      return;
    }

    try {
      setIsSaving(true);

      // Handle file upload if a new SVG was selected
      if (selectedFile) {
        const newIconPath = await uploadIcon(selectedFile);
        if (newIconPath) {
          // Extract filename without extension
          const fileName = selectedFile.name.replace('.svg', '').toLowerCase().replace(/[^a-z0-9_.]/g, '-');
          setIconName(fileName);
        }
        setSelectedFile(null);
      }

      if (plan) {
        const { error } = await supabase
          .from("training_plans")
          .update({
            name,
            description,
            display_order: displayOrder,
            icon_name: iconName,
          })
          .eq("plan_id", plan.plan_id);

        if (error) {
          console.error("Error updating training plan:", error);
          throw error;
        }
        toast.success("Training plan updated successfully");
      } else {
        const { error } = await supabase.from("training_plans").insert({
          name,
          description,
          display_order: displayOrder,
          icon_name: iconName,
        });

        if (error) {
          console.error("Error creating training plan:", error);
          throw error;
        }
        toast.success("Training plan created successfully");
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving training plan:", error);
      toast.error(error.message || "Failed to save training plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!plan) return;

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from("training_plans")
        .delete()
        .eq("plan_id", plan.plan_id);

      if (error) throw error;

      toast.success("Training plan deleted successfully");
      onSave();
      onClose();
      setConfirmDeleteOpen(false);
    } catch (error: any) {
      console.error("Error deleting training plan:", error);
      toast.error(error.message || "Failed to delete training plan");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/svg+xml') {
      toast.error("Please upload an SVG file");
      return;
    }

    setSelectedFile(file);
    
    try {
      const iconPath = await uploadIcon(file);
      if (iconPath) {
        // Extract filename without extension
        const fileName = file.name.replace('.svg', '').toLowerCase().replace(/[^a-z0-9_.]/g, '-');
        setIconName(fileName);
        await fetchIcons(); // Refresh icons list
        setIconPopoverOpen(false); // Close the popover after upload
      }
    } catch (error) {
      console.error("Error uploading icon:", error);
      toast.error("Failed to upload icon");
    }
  };

  // Find the currently selected icon
  const selectedIcon = icons.find(icon => icon.name === iconName) || icons[0];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>
              {plan ? "Edit Training Plan" : "Add New Training Plan"}
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
                placeholder="Enter plan name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-blue-500 min-h-[100px]"
                placeholder="Enter plan description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayOrder" className="text-white">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={displayOrder === null ? '' : displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value === '' ? null : parseInt(e.target.value))}
                className="bg-slate-800 border-slate-700 text-slate-100"
                placeholder="Enter display order (optional)"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-white">Icon</Label>
              <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    className="w-full justify-between bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
                    variant="outline"
                  >
                    <div className="flex items-center gap-2">
                      {!loadingIcons && selectedIcon && (
                        <img 
                          src={selectedIcon.url} 
                          alt={selectedIcon.name}
                          className="h-5 w-5"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/training-plan-icons/skill-level-basic.svg";
                          }}
                        />
                      )}
                      <span>{selectedIcon?.name || "Select an icon"}</span>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-72 p-0 bg-slate-800 border-slate-700 text-slate-100" 
                  align="start"
                  side="bottom"
                >
                  {loadingIcons ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <>
                      <div className="p-2 border-b border-slate-700">
                        <label className="flex justify-center cursor-pointer p-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors">
                          <span className="text-sm font-medium">Upload new SVG</span>
                          <input 
                            type="file"
                            accept=".svg"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={uploading}
                          />
                        </label>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        <div className="grid grid-cols-3 gap-2">
                          {icons.map((icon) => (
                            <button
                              key={icon.name}
                              onClick={() => {
                                setIconName(icon.name);
                                setIconPopoverOpen(false);
                              }}
                              className={`cursor-pointer rounded-md p-2 hover:bg-slate-700 flex flex-col items-center justify-center ${
                                iconName === icon.name ? 'bg-slate-700 ring-2 ring-blue-500' : ''
                              }`}
                            >
                              <div className="h-12 w-12 flex items-center justify-center mb-1">
                                <img 
                                  src={icon.url} 
                                  alt={icon.name}
                                  className="max-h-full max-w-full"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "/training-plan-icons/skill-level-basic.svg";
                                  }}
                                />
                              </div>
                              <span className="text-xs text-center truncate max-w-full">
                                {icon.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="mt-2 flex justify-center">
              {!loadingIcons && selectedIcon && (
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <img 
                    src={selectedIcon.url} 
                    alt={selectedIcon.name} 
                    className="h-16 w-16"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/training-plan-icons/skill-level-basic.svg";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            {plan && (
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isDeleting || isSaving || uploading}
                className="mr-auto"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Plan"
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
              disabled={isSaving || uploading}
              className="bg-blue-700 hover:bg-blue-800"
            >
              {isSaving || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Uploading..." : "Saving..."}
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
              training plan and remove the data from our servers.
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

export default TrainingPlanModal;
