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
import { TrainingPlan } from "@/hooks/useTrainingPlans";
import { useTrainingIcons } from "@/hooks/useTrainingIcons";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { syncTrainingPlanChanges } from "@/services/planningDetailsService";

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
  const [iconName, setIconName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { icons, loading: loadingIcons, fetchIcons } = useTrainingIcons();
  
  useEffect(() => {
    if (plan) {
      setName(plan.name || "");
      setDescription(plan.description || "");
      setIconName(plan.icon_name || "");
    } else {
      setName("");
      setDescription("");
      setIconName("");
    }
  }, [plan]);

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
            icon_name: iconName,
          })
          .eq("plan_id", plan.plan_id);

        if (error) {
          console.error("Error updating training plan:", error);
          throw error;
        }
        
        try {
          await syncTrainingPlanChanges(plan.plan_id);
          console.log(`Planning details synchronized after updating plan ${plan.plan_id}`);
        } catch (syncErr) {
          console.error("Error syncing planning details:", syncErr);
        }
        
        toast.success("Training plan updated successfully");
      } else {
        const { data, error } = await supabase.from("training_plans").insert({
          name,
          description,
          icon_name: iconName,
        }).select();

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
    } catch (error: any) {
      console.error("Error deleting training plan:", error);
      toast.error(error.message || "Failed to delete training plan");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
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
            <Label className="text-white">Icon</Label>
            
            {loadingIcons ? (
              <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 bg-slate-800 rounded-md border border-slate-700">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton 
                    key={i}
                    className="aspect-square rounded-md h-16"
                  />
                ))}
              </div>
            ) : icons.length > 0 ? (
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
                          console.error(`Error loading icon: ${icon.url}`);
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-800 rounded-md border border-slate-700">
                <p className="text-slate-400">No icons available in the storage bucket.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {plan && (
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
  );
};

export default TrainingPlanModal;
