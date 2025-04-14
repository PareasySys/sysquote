
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
import { MachineType } from "@/hooks/useMachineTypes";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { dataSyncService } from "@/services/dataSyncService";

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
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (machine) {
      setName(machine.name || "");
      setDescription(machine.description || "");
      setPhotoUrl(machine.photo_url || "");
    } else {
      setName("");
      setDescription("");
      setPhotoUrl("");
    }
  }, [machine]);

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
            photo_url: photoUrl,
          })
          .eq("machine_type_id", machine.machine_type_id);

        if (error) {
          console.error("Error updating machine type:", error);
          throw error;
        }
        
        // Sync changes to planning details
        await dataSyncService.syncMachineTypeChanges(machine.machine_type_id);
        
        toast.success("Machine type updated successfully");
      } else {
        const { data, error } = await supabase.from("machine_types").insert({
          name,
          description,
          photo_url: photoUrl,
        }).select();

        if (error) {
          console.error("Error creating machine type:", error);
          throw error;
        }
        
        // Sync changes to planning details if we have a new machine
        if (data && data.length > 0) {
          await dataSyncService.syncMachineTypeChanges(data[0].machine_type_id);
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
      
      // Store machine ID before deletion for syncing
      const machineTypeId = machine.machine_type_id;

      const { error } = await supabase
        .from("machine_types")
        .delete()
        .eq("machine_type_id", machineTypeId);

      if (error) throw error;

      // Sync changes after deletion
      await dataSyncService.syncMachineTypeChanges(machineTypeId);
      
      toast.success("Machine type deleted successfully");
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error deleting machine type:", error);
      toast.error(error.message || "Failed to delete machine type");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>
            {machine ? "Edit Machine Type" : "Add New Machine Type"}
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
            <Label htmlFor="photoUrl" className="text-white">Photo URL</Label>
            <Input
              id="photoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter photo URL"
            />
          </div>
        </div>

        <DialogFooter>
          {machine && (
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

export default MachineTypeModal;
