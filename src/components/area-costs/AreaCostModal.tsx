
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
import { Input } from "@/components/ui/input";
import { AreaCost } from "@/hooks/useAreaCosts";
import { useAreaIcons } from "@/hooks/useAreaIcons";
import { supabase } from "@/lib/supabaseClient";
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
import { useGeographicAreas } from "@/hooks/useGeographicAreas";

interface AreaCostModalProps {
  open: boolean;
  onClose: () => void;
  areaCost?: AreaCost | null;
  onSave: () => void;
}

// Create the schema for validation
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { icons, loading: loadingIcons } = useAreaIcons();
  const { checkAreaNameExists } = useGeographicAreas();

  // Initialize the form with default values or the existing area cost values
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

  // Set form values when areaCost changes or on initial load
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

  const handleSave = async (values: AreaCostFormValues) => {
    try {
      setIsSaving(true);

      // If this is a new area cost, check if the name already exists
      if (!areaCost) {
        const { exists } = await checkAreaNameExists(values.areaName);
        if (exists) {
          toast.error(`An area with the name "${values.areaName}" already exists`);
          return;
        }
      }

      const costData = {
        area_name: values.areaName,
        daily_accommodation_food_cost: values.dailyAccommodationFoodCost,
        daily_allowance: values.dailyAllowance,
        daily_pocket_money: values.dailyPocketMoney,
        icon_name: values.iconName || null,
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
        // Create new area cost - generate a new area_id for new entries
        // Get the highest area_id and increment it
        const { data: maxIdData, error: maxIdError } = await supabase
          .from('area_costs')
          .select('area_id')
          .order('area_id', { ascending: false })
          .limit(1);
          
        if (maxIdError) {
          console.error("Error getting max area_id:", maxIdError);
          throw maxIdError;
        }
        
        const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].area_id + 1 : 1;
        
        // Insert with the new area_id
        const { error } = await supabase
          .from("area_costs")
          .insert({
            ...costData,
            area_id: nextId
          });

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
      
      // Check if this area cost is referenced in quotes table
      const { data: quotesUsingArea, error: quotesError } = await supabase
        .from("quotes")
        .select("quote_id")
        .eq("area_id", areaCost.area_id);

      if (quotesError) {
        console.error("Error checking quotes references:", quotesError);
        throw quotesError;
      }

      // If there are quotes using this area, update them to remove the reference
      if (quotesUsingArea && quotesUsingArea.length > 0) {
        console.log(`Found ${quotesUsingArea.length} quotes using this area. Removing references...`);
        
        const { error: updateError } = await supabase
          .from("quotes")
          .update({ area_id: null })
          .eq("area_id", areaCost.area_id);

        if (updateError) {
          console.error("Error removing references from quotes:", updateError);
          throw updateError;
        }
      }

      // Now delete the area cost
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

  return (
    <>
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
                        disabled={Boolean(areaCost)} // Disable editing if editing existing area cost
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
                                className="max-h-full max-w-full"
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
                          <p className="text-slate-400">No icons available in the area_icons bucket.</p>
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
                  type="button"
                  variant="outline" 
                  onClick={onClose}
                  className="text-blue-700 border-slate-700 hover:bg-slate-800 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
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
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100 z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. This will permanently delete the
              area cost and remove all references to it from the database.
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
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AreaCostModal;
