
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
import { Loader2, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [iconName, setIconName] = useState("skill-level-basic");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { icons, loading: loadingIcons, fetchIcons } = useTrainingIcons();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadIcon, uploading } = useStorageTrainingIcons();
  
  useEffect(() => {
    if (plan) {
      setName(plan.name || "");
      setDescription(plan.description || "");
      setIconName(plan.icon_name || "skill-level-basic");
    } else {
      setName("");
      setDescription("");
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
      }
    } catch (error) {
      console.error("Error uploading icon:", error);
      toast.error("Failed to upload icon");
    }
  };

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
              <div className="flex justify-between items-center">
                <Label className="text-white">Icon</Label>
                <label className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
                  Upload new SVG
                  <input 
                    type="file"
                    accept=".svg"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
              </div>
              
              {loadingIcons ? (
                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 bg-slate-800 rounded-md border border-slate-700">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton 
                      key={i}
                      className="aspect-square rounded-md h-16"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 bg-slate-800 rounded-md border border-slate-700">
                  {icons.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setIconName(icon.name)}
                      className={`cursor-pointer rounded-md p-2 hover:bg-slate-700 flex flex-col items-center justify-center transition-all ${
                        iconName === icon.name ? 'ring-2 ring-blue-500 bg-slate-700' : 'bg-slate-800'
                      }`}
                      title={icon.name}
                    >
                      <div className="h-10 w-10 flex items-center justify-center">
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
                    </button>
                  ))}
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
