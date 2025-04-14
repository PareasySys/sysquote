
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
import { AreaCost } from "@/hooks/useAreaCosts";
import { useAreaIcons } from "@/hooks/useAreaIcons";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { dataSyncService } from "@/services/dataSyncService";

interface AreaCostModalProps {
  open: boolean;
  onClose: () => void;
  areaCost?: AreaCost | null;
  onSave: () => void;
}

const AreaCostModal: React.FC<AreaCostModalProps> = ({
  open,
  onClose,
  areaCost,
  onSave,
}) => {
  const [areaName, setAreaName] = useState("");
  const [dailyAccommodationFoodCost, setDailyAccommodationFoodCost] = useState<number>(0);
  const [dailyPocketMoney, setDailyPocketMoney] = useState<number>(0);
  const [dailyAllowance, setDailyAllowance] = useState<number>(0);
  const [iconName, setIconName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { icons } = useAreaIcons();
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    if (areaCost) {
      setAreaName(areaCost.area_name || "");
      setDailyAccommodationFoodCost(areaCost.daily_accommodation_food_cost || 0);
      setDailyPocketMoney(areaCost.daily_pocket_money || 0);
      setDailyAllowance(areaCost.daily_allowance || 0);
      setIconName(areaCost.icon_name || "");
    } else {
      setAreaName("");
      setDailyAccommodationFoodCost(0);
      setDailyPocketMoney(0);
      setDailyAllowance(0);
      setIconName("");
    }
  }, [areaCost]);

  const handleSave = async () => {
    if (!areaName.trim()) {
      toast.error("Area name is required");
      return;
    }

    try {
      setIsSaving(true);

      if (areaCost) {
        const { error } = await supabase
          .from("area_costs")
          .update({
            area_name: areaName,
            daily_accommodation_food_cost: dailyAccommodationFoodCost,
            daily_pocket_money: dailyPocketMoney,
            daily_allowance: dailyAllowance,
            icon_name: iconName,
          })
          .eq("area_cost_id", areaCost.area_cost_id);

        if (error) {
          console.error("Error updating area cost:", error);
          throw error;
        }
        
        // Sync changes to planning details
        await dataSyncService.syncAreaCostChanges(areaCost.area_cost_id);
        
        toast.success("Area cost updated successfully");
      } else {
        const { data, error } = await supabase.from("area_costs").insert({
          area_name: areaName,
          daily_accommodation_food_cost: dailyAccommodationFoodCost,
          daily_pocket_money: dailyPocketMoney,
          daily_allowance: dailyAllowance,
          icon_name: iconName,
        }).select();

        if (error) {
          console.error("Error creating area cost:", error);
          throw error;
        }
        
        // Sync changes to planning details if we have a new area
        if (data && data.length > 0) {
          await dataSyncService.syncAreaCostChanges(data[0].area_cost_id);
        }
        
        toast.success("Area cost created successfully");
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving area cost:", error);
      toast.error(error.message || "Failed to save area cost");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!areaCost) return;

    try {
      setIsDeleting(true);
      
      // Store area ID before deletion for syncing
      const areaId = areaCost.area_cost_id;

      const { error } = await supabase
        .from("area_costs")
        .delete()
        .eq("area_cost_id", areaId);

      if (error) throw error;

      // Sync changes after deletion
      await dataSyncService.syncAreaCostChanges(areaId);
      
      toast.success("Area cost deleted successfully");
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error deleting area cost:", error);
      toast.error(error.message || "Failed to delete area cost");
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
            {areaCost ? "Edit Area Cost" : "Add New Area Cost"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="areaName" className="text-white">Area Name</Label>
            <Input
              id="areaName"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter area name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dailyAccommodationFoodCost" className="text-white">Daily Accommodation & Food Cost</Label>
            <Input
              id="dailyAccommodationFoodCost"
              type="number"
              value={dailyAccommodationFoodCost}
              onChange={(e) => setDailyAccommodationFoodCost(parseFloat(e.target.value) || 0)}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter daily accommodation & food cost"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dailyPocketMoney" className="text-white">Daily Pocket Money</Label>
            <Input
              id="dailyPocketMoney"
              type="number"
              value={dailyPocketMoney}
              onChange={(e) => setDailyPocketMoney(parseFloat(e.target.value) || 0)}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter daily pocket money"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dailyAllowance" className="text-white">Daily Allowance</Label>
            <Input
              id="dailyAllowance"
              type="number"
              value={dailyAllowance}
              onChange={(e) => setDailyAllowance(parseFloat(e.target.value) || 0)}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="Enter daily allowance"
            />
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
          {areaCost && (
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
                "Delete Area"
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

export default AreaCostModal;
