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
import { Loader2 } from "lucide-react";
import { dataSyncService } from "@/services/dataSyncService";

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
  const [isActive, setIsActive] = useState<boolean>(true);
  const [iconName, setIconName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { icons } = useResourceIcons();
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    if (resource) {
      setName(resource.name || "");
      setHourlyRate(resource.hourly_rate || 0);
      setIsActive(resource.is_active !== undefined ? resource.is_active : true);
      setIconName(resource.icon_name || "");
    } else {
      setName("");
      setHourlyRate(0);
      setIsActive(true);
      setIconName("");
    }
  }, [resource]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Resource name is required");
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
            is_active: isActive,
            icon_name: iconName,
          })
          .eq("resource_id", resource.resource_id);

        if (error) {
          console.error("Error updating resource:", error);
          throw error;
        }
        
        await dataSyncService.syncResourceChanges(resource.resource_id);
        
        toast.success("Resource updated successfully");
      } else {
        const { data, error } = await supabase.from("resources").insert({
          name,
          hourly_rate: hourlyRate,
          is_active: isActive,
          icon_name: iconName,
        }).select();

        if (error) {
          console.error("Error creating resource:", error);
          throw error;
        }
        
        if (data && data.length > 0) {
          await dataSyncService.syncResourceChanges(data[0].resource_id);
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
      
      const resourceId = resource.resource_id;

      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("resource_id", resourceId);

      if (error) throw error;
      
      await dataSyncService.syncResourceChanges(resourceId);

      toast.success("Resource deleted successfully");
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error deleting resource:", error);
      toast.error(error.message || "Failed to delete resource");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredIcons = icons.filter(
    (icon) => icon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Label htmlFor="hourlyRate" className="text-white">Hourly Rate</Label>
            <Input
              id="hourlyRate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter hourly rate"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="isActive" className="text-white">Status</Label>
            <div className="flex items-center space-x-2">
              <select
                id="isActive"
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
                className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-white">Icon</Label>
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2 bg-slate-800 border-slate-700 text-slate-100"
            />
            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto border border-slate-700 rounded-md p-2 bg-slate-800">
              {filteredIcons.map((icon) => (
                <div
                  key={icon.name}
                  className={`cursor-pointer p-2 rounded-md flex flex-col items-center justify-center ${
                    iconName === icon.name ? "ring-2 ring-blue-500 bg-slate-700" : "hover:bg-slate-700"
                  }`}
                  onClick={() => setIconName(icon.name)}
                >
                  <img
                    src={icon.url}
                    alt={icon.name}
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />
                  <span className="text-xs mt-1 text-center overflow-hidden text-ellipsis w-full">
                    {icon.name}
                  </span>
                </div>
              ))}
              {filteredIcons.length === 0 && (
                <div className="col-span-4 text-center py-4 text-slate-400">
                  No icons match your search
                </div>
              )}
            </div>
          </div>
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
