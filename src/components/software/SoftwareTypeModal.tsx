
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
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { dataSyncService } from "@/services/dataSyncService";

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
  const [photoUrl, setPhotoUrl] = useState("");
  const [alwaysIncluded, setAlwaysIncluded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (software) {
      setName(software.name || "");
      setDescription(software.description || "");
      setPhotoUrl(software.photo_url || "");
      setAlwaysIncluded(software.always_included || false);
    } else {
      setName("");
      setDescription("");
      setPhotoUrl("");
      setAlwaysIncluded(false);
    }
  }, [software]);

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
            photo_url: photoUrl,
            always_included: alwaysIncluded,
          })
          .eq("software_type_id", software.software_type_id);

        if (error) {
          console.error("Error updating software type:", error);
          throw error;
        }
        
        // Sync changes to planning details
        await dataSyncService.syncSoftwareTypeChanges(software.software_type_id);
        
        toast.success("Software type updated successfully");
      } else {
        const { data, error } = await supabase.from("software_types").insert({
          name,
          description,
          photo_url: photoUrl,
          always_included: alwaysIncluded,
        }).select();

        if (error) {
          console.error("Error creating software type:", error);
          throw error;
        }
        
        // Sync changes to planning details if we have a new software
        if (data && data.length > 0) {
          await dataSyncService.syncSoftwareTypeChanges(data[0].software_type_id);
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
      
      // Store software ID before deletion for syncing
      const softwareTypeId = software.software_type_id;

      const { error } = await supabase
        .from("software_types")
        .delete()
        .eq("software_type_id", softwareTypeId);

      if (error) throw error;

      // Sync changes after deletion
      await dataSyncService.syncSoftwareTypeChanges(softwareTypeId);
      
      toast.success("Software type deleted successfully");
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error deleting software type:", error);
      toast.error(error.message || "Failed to delete software type");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>
            {software ? "Edit Software Type" : "Add New Software Type"}
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

          <div className="grid gap-2">
            <Label htmlFor="photoUrl" className="text-white">Photo URL</Label>
            <Input
              id="photoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter photo URL"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="always-included"
              checked={alwaysIncluded}
              onCheckedChange={setAlwaysIncluded}
            />
            <Label htmlFor="always-included" className="text-white">Always Include in Quotes</Label>
          </div>
        </div>

        <DialogFooter>
          {software && (
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

export default SoftwareTypeModal;
