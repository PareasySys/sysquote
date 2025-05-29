
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
import { Resource } from "@/hooks/useResources";
import { useResourceIcons } from "@/hooks/useResourceIcons";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResourceModalProps {
  open: boolean;
  onClose: () => void;
  resource?: Resource | null;
  onSave: () => void;
}

const ResourceModal: React.FC<ResourceModalProps> = ({
  open,
  onClose,
  resource,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [iconName, setIconName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [usageCount, setUsageCount] = useState<number>(0);
  const { icons, loading: loadingIcons } = useResourceIcons();
  
  useEffect(() => {
    if (resource) {
      setName(resource.name || "");
      setHourlyRate(resource.hourly_rate || 0);
      setIconName(resource.icon_name || "");
      checkResourceUsage(resource.resource_id);
    } else {
      setName("");
      setHourlyRate(0);
      setIconName("");
      setUsageCount(0);
    }
  }, [resource]);

  const checkResourceUsage = async (resourceId: number) => {
    setIsCheckingUsage(true);
    try {
      const { count, error } = await supabase
        .from("planning_details")
        .select("*", { count: "exact", head: true })
        .eq("resource_id", resourceId);

      if (error) throw error;
      setUsageCount(count || 0);
    } catch (err) {
      console.error("Error checking resource usage:", err);
      setUsageCount(0);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Resource name is required");
      return;
    }

    if (hourlyRate < 0) {
      toast.error("Hourly rate cannot be negative");
      return;
    }

    try {
      setIsSaving(true);

      if (resource) {
        const { error } = await supabase
          .from("resources")
          .update({
            name,
            hourly_rate: hourlyRate,
            is_active: true,
            icon_name: iconName,
          })
          .eq("resource_id", resource.resource_id);

        if (error) {
          console.error("Error updating resource:", error);
          throw error;
        }
        toast.success("Resource updated successfully");
      } else {
        const { error } = await supabase.from("resources").insert({
          name,
          hourly_rate: hourlyRate,
          is_active: true,
          icon_name: iconName,
        });

        if (error) {
          console.error("Error creating resource:", error);
          throw error;
        }
        toast.success("Resource created successfully");
      }

      onSave();
      onClose();
    } catch (err) {
      console.error("Error saving resource:", err);
      toast.error("Failed to save resource");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resource) return;

    try {
      setIsDeleting(true);

      // Delete references in planning_details
      const planningResult = await supabase
        .from("planning_details")
        .delete()
        .eq("resource_id", resource.resource_id);

      if (planningResult.error) {
        console.error("Error deleting planning details:", planningResult.error);
        throw planningResult.error;
      }

      // Delete references in machine_training_requirements
      const machineResult = await supabase
        .from("machine_training_requirements")
        .delete()
        .eq("resource_id", resource.resource_id);

      if (machineResult.error) {
        console.error("Error deleting machine training requirements:", machineResult.error);
        throw machineResult.error;
      }

      // Delete references in software_training_requirements
      const softwareResult = await supabase
        .from("software_training_requirements")
        .delete()
        .eq("resource_id", resource.resource_id);

      if (softwareResult.error) {
        console.error("Error deleting software training requirements:", softwareResult.error);
        throw softwareResult.error;
      }

      // Delete references in quote_training_plan_hours
      const quoteResult = await supabase
        .from("quote_training_plan_hours")
        .delete()
        .eq("resource_id", resource.resource_id);

      if (quoteResult.error) {
        console.error("Error deleting quote training plan hours:", quoteResult.error);
        throw quoteResult.error;
      }

      // Finally, delete the resource itself
      const resourceResult = await supabase
        .from("resources")
        .delete()
        .eq("resource_id", resource.resource_id);

      if (resourceResult.error) {
        console.error("Error deleting resource:", resourceResult.error);
        throw resourceResult.error;
      }

      toast.success("Resource and all its references deleted successfully");
      onSave();
      onClose();
    } catch (err) {
      console.error("Error deleting resource:", err);
      toast.error("Failed to delete resource");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHourlyRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
    setHourlyRate(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>
            {resource ? "Edit Resource" : "Add New Resource"}
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
              placeholder="Enter resource name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hourlyRate" className="text-white">Hourly Rate (€)</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              value={hourlyRate}
              onChange={handleHourlyRateChange}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter hourly rate"
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
                <p className="text-slate-400">No icons available in the resource_icons bucket.</p>
              </div>
            )}
          </div>

          {resource && (
            <div className="grid gap-2">
              {isCheckingUsage ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking resource usage...</span>
                </div>
              ) : usageCount > 0 ? (
                <Alert className="bg-orange-900/20 border-orange-700">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-200">
                    This resource is currently used in {usageCount} planning detail{usageCount > 1 ? 's' : ''}. 
                    Deleting it will also remove all these references permanently.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-900/20 border-green-700">
                  <AlertDescription className="text-green-200">
                    This resource is not currently in use and can be safely deleted.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {resource && (
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
                "Delete Resource"
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

export default ResourceModal;
