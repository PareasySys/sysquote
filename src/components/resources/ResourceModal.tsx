
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
import { Resource } from "@/hooks/useResources";
import { useResourceIcons } from "@/hooks/useResourceIcons";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { icons, loading: loadingIcons } = useResourceIcons();
  
  useEffect(() => {
    if (resource) {
      setName(resource.name || "");
      setHourlyRate(resource.hourly_rate || 0);
      setIconName(resource.icon_name || "");
    } else {
      setName("");
      setHourlyRate(0);
      setIconName("");
    }
  }, [resource]);

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
            is_active: true, // Always set to true since we're removing the switch
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
          is_active: true, // Always set to true since we're removing the switch
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
    } catch (error: any) {
      console.error("Error saving resource:", error);
      toast.error(error.message || "Failed to save resource");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resource) return;

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("resource_id", resource.resource_id);

      if (error) throw error;

      toast.success("Resource deleted successfully");
      onSave();
      onClose();
      setConfirmDeleteOpen(false);
    } catch (error: any) {
      console.error("Error deleting resource:", error);
      toast.error(error.message || "Failed to delete resource");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHourlyRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
    setHourlyRate(value);
  };

  return (
    <>
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
              <Label htmlFor="hourlyRate" className="text-white">Hourly Rate ($)</Label>
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
          </div>

          <DialogFooter>
            {resource && (
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

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. This will permanently delete the
              resource and remove the data from our servers.
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

export default ResourceModal;
