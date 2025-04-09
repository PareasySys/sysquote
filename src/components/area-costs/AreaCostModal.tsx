
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
import { AreaCost } from "@/hooks/useAreaCosts";
import { useAreaIcons } from "@/hooks/useAreaIcons";
import { supabase } from "@/lib/supabaseClient";
import { useGeographicAreas } from "@/hooks/useGeographicAreas";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [areaId, setAreaId] = useState<number | null>(null);
  const [dailyAccommodationFoodCost, setDailyAccommodationFoodCost] = useState<number>(0);
  const [dailyAllowance, setDailyAllowance] = useState<number>(0);
  const [dailyCarRentalCost, setDailyCarRentalCost] = useState<number | null>(null);
  const [dailyTaxiCost, setDailyTaxiCost] = useState<number | null>(null);
  const [dailyPocketMoney, setDailyPocketMoney] = useState<number>(0);
  const [travelCostFlight, setTravelCostFlight] = useState<number | null>(null);
  const [iconName, setIconName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { icons, loading: loadingIcons } = useAreaIcons();
  const { areas, loading: loadingAreas } = useGeographicAreas();

  useEffect(() => {
    if (areaCost) {
      setAreaId(areaCost.area_id);
      setDailyAccommodationFoodCost(areaCost.daily_accommodation_food_cost);
      setDailyAllowance(areaCost.daily_allowance);
      setDailyCarRentalCost(areaCost.daily_car_rental_cost);
      setDailyTaxiCost(areaCost.daily_taxi_cost);
      setDailyPocketMoney(areaCost.daily_pocket_money);
      setTravelCostFlight(areaCost.travel_cost_flight);
      setIconName(areaCost.icon_name || "");
    } else {
      setAreaId(null);
      setDailyAccommodationFoodCost(0);
      setDailyAllowance(0);
      setDailyCarRentalCost(null);
      setDailyTaxiCost(null);
      setDailyPocketMoney(0);
      setTravelCostFlight(null);
      setIconName("");
    }
  }, [areaCost]);

  const handleSave = async () => {
    if (areaId === null) {
      toast.error("Please select an area");
      return;
    }

    if (dailyAccommodationFoodCost < 0 || dailyAllowance < 0 || dailyPocketMoney < 0) {
      toast.error("Costs cannot be negative");
      return;
    }

    // Check if optional costs are negative when provided
    if ((dailyCarRentalCost !== null && dailyCarRentalCost < 0) ||
        (dailyTaxiCost !== null && dailyTaxiCost < 0) ||
        (travelCostFlight !== null && travelCostFlight < 0)) {
      toast.error("Costs cannot be negative");
      return;
    }

    try {
      setIsSaving(true);

      const costData = {
        area_id: areaId,
        daily_accommodation_food_cost: dailyAccommodationFoodCost,
        daily_allowance: dailyAllowance,
        daily_car_rental_cost: dailyCarRentalCost,
        daily_taxi_cost: dailyTaxiCost,
        daily_pocket_money: dailyPocketMoney,
        travel_cost_flight: travelCostFlight,
        icon_name: iconName || null,
      };

      if (areaCost) {
        // Update existing area cost
        const { error } = await supabase
          .from("area_costs")
          .update(costData)
          .eq("area_cost_id", areaCost.area_cost_id);

        if (error) {
          console.error("Error updating area cost:", error);
          throw error;
        }
        toast.success("Area cost updated successfully");
      } else {
        // Create new area cost
        const { error } = await supabase
          .from("area_costs")
          .insert(costData);

        if (error) {
          console.error("Error creating area cost:", error);
          throw error;
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

      const { error } = await supabase
        .from("area_costs")
        .delete()
        .eq("area_cost_id", areaCost.area_cost_id);

      if (error) throw error;

      toast.success("Area cost deleted successfully");
      onSave();
      onClose();
      setConfirmDeleteOpen(false);
    } catch (error: any) {
      console.error("Error deleting area cost:", error);
      toast.error(error.message || "Failed to delete area cost");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNumericInputChange = (setter: React.Dispatch<React.SetStateAction<number | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === "" ? null : parseFloat(e.target.value);
    setter(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>
              {areaCost ? "Edit Area Cost" : "Add New Area Cost"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="area" className="text-white">Geographic Area</Label>
              <Select 
                value={areaId?.toString() || ""} 
                onValueChange={(value) => setAreaId(parseInt(value))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Select an area" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                  {loadingAreas ? (
                    <div className="p-2">Loading areas...</div>
                  ) : areas.length > 0 ? (
                    areas.map(area => (
                      <SelectItem key={area.area_id} value={area.area_id.toString()}>
                        {area.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2">No areas available</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dailyAccommodationFood" className="text-white">Daily Accommodation & Food (€)</Label>
                <Input
                  id="dailyAccommodationFood"
                  type="number"
                  step="0.01"
                  value={dailyAccommodationFoodCost !== null ? dailyAccommodationFoodCost : ''}
                  onChange={handleNumericInputChange(setDailyAccommodationFoodCost)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                  placeholder="Enter cost"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dailyAllowance" className="text-white">Daily Allowance (€)</Label>
                <Input
                  id="dailyAllowance"
                  type="number"
                  step="0.01"
                  value={dailyAllowance !== null ? dailyAllowance : ''}
                  onChange={handleNumericInputChange(setDailyAllowance)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                  placeholder="Enter cost"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dailyCarRental" className="text-white">Daily Car Rental (€, optional)</Label>
                <Input
                  id="dailyCarRental"
                  type="number"
                  step="0.01"
                  value={dailyCarRentalCost !== null ? dailyCarRentalCost : ''}
                  onChange={handleNumericInputChange(setDailyCarRentalCost)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                  placeholder="Enter cost (optional)"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dailyTaxi" className="text-white">Daily Taxi (€, optional)</Label>
                <Input
                  id="dailyTaxi"
                  type="number"
                  step="0.01"
                  value={dailyTaxiCost !== null ? dailyTaxiCost : ''}
                  onChange={handleNumericInputChange(setDailyTaxiCost)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                  placeholder="Enter cost (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dailyPocketMoney" className="text-white">Daily Pocket Money (€)</Label>
                <Input
                  id="dailyPocketMoney"
                  type="number"
                  step="0.01"
                  value={dailyPocketMoney !== null ? dailyPocketMoney : ''}
                  onChange={handleNumericInputChange(setDailyPocketMoney)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                  placeholder="Enter amount"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="travelFlight" className="text-white">Flight Travel Cost (€, optional)</Label>
                <Input
                  id="travelFlight"
                  type="number"
                  step="0.01"
                  value={travelCostFlight !== null ? travelCostFlight : ''}
                  onChange={handleNumericInputChange(setTravelCostFlight)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                  placeholder="Enter cost (optional)"
                />
              </div>
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
                  <p className="text-slate-400">No icons available in the area_icons bucket.</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            {areaCost && (
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
                  "Delete Area Cost"
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
              area cost and remove the data from our servers.
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

export default AreaCostModal;
