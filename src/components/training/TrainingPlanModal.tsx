
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
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface TrainingPlanModalProps {
  open: boolean;
  onClose: () => void;
  plan?: TrainingPlan | null;
  onSave: () => void;
}

const iconOptions = [
  { value: "skill-level-basic", label: "Basic" },
  { value: "skill-level-intermediate", label: "Intermediate" },
  { value: "skill-level-advanced", label: "Advanced" },
  { value: "team-training", label: "Team Training" }
];

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

  // Render SVG based on selected icon
  const renderSelectedIcon = () => {
    switch (iconName) {
      case "skill-level-basic":
        return (
          <svg fill="#ffffff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" className="w-10 h-10">
            <g>
              <defs>
                <style>{`.cls-1 { fill: none; }`}</style>
              </defs>
              <title>skill-level-basic</title>
              <path d="M30,30H22V4h8Zm-6-2h4V6H24Z"></path>
              <path d="M20,30H12V12h8Zm-6-2h4V14H14Z"></path>
              <path d="M10,30H2V18h8Z"></path>
              <rect className="cls-1" width="32" height="32"></rect>
            </g>
          </svg>
        );
      case "skill-level-intermediate":
        return (
          <svg fill="#ffffff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" className="w-10 h-10">
            <g>
              <defs>
                <style>{`.cls-1 { fill: none; }`}</style>
              </defs>
              <title>skill-level-intermediate</title>
              <path d="M30,30H22V4h8Zm-6-2h4V6H24Z"></path>
              <path d="M20,30H12V12h8Z"></path>
              <path d="M10,30H2V18h8Z"></path>
              <rect className="cls-1" width="32" height="32"></rect>
            </g>
          </svg>
        );
      case "skill-level-advanced":
        return (
          <svg fill="#ffffff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" className="w-10 h-10">
            <g>
              <defs>
                <style>{`.cls-1 { fill: none; }`}</style>
              </defs>
              <title>skill-level-advanced</title>
              <path d="M30,30H22V4h8Z"></path>
              <path d="M20,30H12V12h8Z"></path>
              <path d="M10,30H2V18h8Z"></path>
              <rect className="cls-1" width="32" height="32"></rect>
            </g>
          </svg>
        );
      case "team-training":
        return (
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" className="w-10 h-10">
            <g>
              <path d="M8 3.5C8 4.88071 6.88071 6 5.5 6C4.11929 6 3 4.88071 3 3.5C3 2.11929 4.11929 1 5.5 1C6.88071 1 8 2.11929 8 3.5Z" fill="#ffffff"></path>
              <path d="M3 8C1.34315 8 0 9.34315 0 11V15H8V8H3Z" fill="#ffffff"></path>
              <path d="M13 8H10V15H16V11C16 9.34315 14.6569 8 13 8Z" fill="#ffffff"></path>
              <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" fill="#ffffff"></path>
            </g>
          </svg>
        );
      default:
        return null;
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Training plan name is required");
      return;
    }

    try {
      setIsSaving(true);

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
              <RadioGroup 
                value={iconName} 
                onValueChange={setIconName}
                className="grid grid-cols-2 gap-4"
              >
                {iconOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option.value} 
                      id={option.value}
                      className="sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer border ${iconName === option.value ? 'bg-blue-800/40 border-blue-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700/60'}`}
                    >
                      {iconName === option.value && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"></div>
                      )}
                      <div className="mb-2">
                        {option.value === "skill-level-basic" && (
                          <svg fill="#ffffff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" className="w-8 h-8">
                            <g>
                              <defs><style>{`.cls-1 { fill: none; }`}</style></defs>
                              <path d="M30,30H22V4h8Zm-6-2h4V6H24Z"></path>
                              <path d="M20,30H12V12h8Zm-6-2h4V14H14Z"></path>
                              <path d="M10,30H2V18h8Z"></path>
                              <rect className="cls-1" width="32" height="32"></rect>
                            </g>
                          </svg>
                        )}
                        {option.value === "skill-level-intermediate" && (
                          <svg fill="#ffffff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" className="w-8 h-8">
                            <g>
                              <defs><style>{`.cls-1 { fill: none; }`}</style></defs>
                              <path d="M30,30H22V4h8Zm-6-2h4V6H24Z"></path>
                              <path d="M20,30H12V12h8Z"></path>
                              <path d="M10,30H2V18h8Z"></path>
                              <rect className="cls-1" width="32" height="32"></rect>
                            </g>
                          </svg>
                        )}
                        {option.value === "skill-level-advanced" && (
                          <svg fill="#ffffff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" className="w-8 h-8">
                            <g>
                              <defs><style>{`.cls-1 { fill: none; }`}</style></defs>
                              <path d="M30,30H22V4h8Z"></path>
                              <path d="M20,30H12V12h8Z"></path>
                              <path d="M10,30H2V18h8Z"></path>
                              <rect className="cls-1" width="32" height="32"></rect>
                            </g>
                          </svg>
                        )}
                        {option.value === "team-training" && (
                          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" className="w-8 h-8">
                            <g>
                              <path d="M8 3.5C8 4.88071 6.88071 6 5.5 6C4.11929 6 3 4.88071 3 3.5C3 2.11929 4.11929 1 5.5 1C6.88071 1 8 2.11929 8 3.5Z" fill="#ffffff"></path>
                              <path d="M3 8C1.34315 8 0 9.34315 0 11V15H8V8H3Z" fill="#ffffff"></path>
                              <path d="M13 8H10V15H16V11C16 9.34315 14.6569 8 13 8Z" fill="#ffffff"></path>
                              <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" fill="#ffffff"></path>
                            </g>
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-300">{option.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            {plan && (
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
