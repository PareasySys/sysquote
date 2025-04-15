import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AreaCost } from "@/hooks/useAreaCosts";
import { useAreaIcons } from "@/hooks/useAreaIcons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync";

interface AreaCostModalProps {
  open: boolean;
  onClose: () => void;
  areaCost?: AreaCost | null;
  onSave: () => void;
}

const areaCostSchema = z.object({
  areaName: z.string().min(1, "Area name is required"),
  dailyAccommodationFoodCost: z.coerce.number().min(0, "Cost cannot be negative"),
  dailyAllowance: z.coerce.number().min(0, "Allowance cannot be negative"),
  dailyPocketMoney: z.coerce.number().min(0, "Pocket money cannot be negative"),
  iconName: z.string().optional(),
});

type AreaCostFormValues = z.infer<typeof areaCostSchema>;

const AreaCostModal: React.FC<AreaCostModalProps> = ({
  open,
  onClose,
  areaCost,
  onSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { icons, loading: loadingIcons } = useAreaIcons();
  const { syncAreaCostChanges } = usePlanningDetailsSync();

  const form = useForm<AreaCostFormValues>({
    resolver: zodResolver(areaCostSchema),
    defaultValues: {
      areaName: "",
      dailyAccommodationFoodCost: 0,
      dailyAllowance: 0,
      dailyPocketMoney: 0,
      iconName: "",
    },
  });

  useEffect(() => {
    if (areaCost) {
      form.reset({
        areaName: areaCost.area_name || "",
        dailyAccommodationFoodCost: areaCost.daily_accommodation_food_cost,
        dailyAllowance: areaCost.daily_allowance,
        dailyPocketMoney: areaCost.daily_pocket_money,
        iconName: areaCost.icon_name || "",
      });
    } else {
      form.reset({
        areaName: "",
        dailyAccommodationFoodCost: 0,
        dailyAllowance: 0,
        dailyPocketMoney: 0,
        iconName: "",
      });
    }
  }, [areaCost, form]);

  const checkAreaNameExists = async (name: string, currentAreaId?: number): Promise<boolean> => {
    try {
      let query = supabase
        .from("area_costs")
        .select("area_id", { count: 'exact', head: true })
        .eq("area_name", name);

      if (currentAreaId) {
        query = query.neq("area_id", currentAreaId);
      }

      const { error, count } = await query;

      if (error) {
        console.error("Error checking area name:", error);
        throw error;
      }

      return (count ?? 0) > 0;
    } catch (err) {
      console.error("Error in checkAreaNameExists:", err);
      return false;
    }
  };

  const handleSave = async (values: AreaCostFormValues) => {
    let savedAreaId: number | undefined;
    try {
      setIsSaving(true);

      const nameExists = await checkAreaNameExists(
        values.areaName,
        areaCost ? areaCost.area_id : undefined
      );

      if (nameExists) {
        toast.error(`An area with the name "${values.areaName}" already exists`);
        setIsSaving(false);
        return;
      }

      const costData = {
        area_name: values.areaName,
        daily_accommodation_food_cost: values.dailyAccommodationFoodCost,
        daily_allowance: values.dailyAllowance,
        daily_pocket_money: values.dailyPocketMoney,
        icon_name: values.iconName || null,
      };

      if (areaCost) {
        const { error } = await supabase
          .from("area_costs")
          .update(costData)
          .eq("area_cost_id", areaCost.area_cost_id);

        if (error) {
          console.error("Error updating area cost:", error);
          throw error;
        }
        toast.success("Area cost updated successfully");
        savedAreaId = areaCost.area_id;
      } else {
        const { data: maxIdData, error: maxIdError } = await supabase
          .from('area_costs')
          .select('area_id')
          .order('area_id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (maxIdError) {
          console.error("Error getting max area_id:", maxIdError);
          throw maxIdError;
        }

        const nextId = maxIdData ? maxIdData.area_id + 1 : 1;
        const insertData = { ...costData, area_id: nextId };

        const { data: insertedData, error } = await supabase
          .from("area_costs")
          .insert(insertData)
          .select('area_id')
          .single();

        if (error) {
          console.error("Error creating area cost:", error);
          throw error;
        }
        toast.success("Area cost created successfully");
        savedAreaId = insertedData?.area_id;
      }

      if (savedAreaId !== undefined) {
        await syncAreaCostChanges();
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

    const areaIdToDelete = areaCost.area_id;
    const areaCostIdToDelete = areaCost.area_cost_id;

    try {
      setIsDeleting(true);

      const { error: updateError } = await supabase
        .from("quotes")
        .update({ area_id: null })
        .eq("area_id", areaIdToDelete);

      if (updateError) {
        console.warn("Warning: Could not nullify area_id in quotes:", updateError.message);
      }

      const { error } = await supabase
        .from("area_costs")
        .delete()
        .eq("area_cost_id", areaCostIdToDelete);

      if (error) {
        console.error("Error deleting area cost:", error);
        throw error;
      }

      toast.success("Area cost deleted successfully");

      await syncAreaCostChanges();

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error deleting area cost:", error);
      toast.error(error.message || "Failed to delete area cost");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>
            {areaCost ? "Edit Area Cost" : "Add New Area Cost"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <FormField
              control={form.control}
              name="areaName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Area Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter area name"
                      className="bg-slate-800 border-slate-700 text-slate-100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dailyAccommodationFoodCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Daily Accommodation & Food (€)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter cost"
                      className="bg-slate-800 border-slate-700 text-slate-100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dailyAllowance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Daily Allowance (€)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter allowance"
                      className="bg-slate-800 border-slate-700 text-slate-100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dailyPocketMoney"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Daily Pocket Money (€)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter amount"
                      className="bg-slate-800 border-slate-700 text-slate-100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="iconName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Icon</FormLabel>
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-2 bg-slate-800 rounded-md border border-slate-700">
                    {loadingIcons ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          className="aspect-square rounded-md h-16"
                        />
                      ))
                    ) : icons.length > 0 ? (
                      icons.map((icon) => (
                        <button
                          key={icon.name}
                          type="button"
                          onClick={() => form.setValue("iconName", icon.name)}
                          className={`cursor-pointer rounded-md p-2 hover:bg-slate-700 flex flex-col items-center justify-center transition-all ${
                            field.value === icon.name ? 'ring-2 ring-blue-500 bg-slate-700' : 'bg-slate-800'
                          }`}
                          title={icon.name}
                        >
                          <div className="h-10 w-10 flex items-center justify-center">
                            <img
                              src={icon.url}
                              alt={icon.name}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                console.error(`Error loading icon: ${icon.url}`);
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder.svg";
                              }}
                            />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-slate-800 rounded-md border border-slate-700 col-span-3">
                        <p className="text-slate-400">No icons available in the storage bucket.</p>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              {areaCost && (
                <Button
                  type="button"
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
                    "Delete Area Cost"
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || form.formState.isSubmitting}
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AreaCostModal;
