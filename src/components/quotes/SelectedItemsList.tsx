import React, { useState, useEffect, useCallback } from "react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
import { Card } from "@/components/ui/card";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { supabase } from "@/integrations/supabase/client"; // Corrected path
import { toast } from "sonner";
import { Database, Cpu, Server, Trash2, Loader2 } from "lucide-react"; // Added Trash2, Loader2
import { Button } from "@/components/ui/button"; // Added Button for remove
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Added AlertDialog

interface SelectedItemsListProps {
  machines: QuoteMachine[];
  software: QuoteSoftware[];
  onRemoveMachine: (machineTypeId: number) => Promise<boolean> | void; // Expect promise or void
  onRemoveSoftware: (softwareTypeId: number) => Promise<boolean> | void; // Expect promise or void
  loading?: boolean; // Loading state from parent (fetching selected items)
  quoteId?: string;
}

interface TrainingHours {
  itemId: number;
  itemType: 'machine' | 'software';
  planId: number;
  hours: number;
}

// Type guard to check if item is QuoteMachine
function isQuoteMachine(item: any): item is QuoteMachine & { itemType: 'machine' } {
  return item.itemType === 'machine' && typeof item.machine_type_id === 'number';
}

// Type guard to check if item is QuoteSoftware
function isQuoteSoftware(item: any): item is QuoteSoftware & { itemType: 'software' } {
  return item.itemType === 'software' && typeof item.software_type_id === 'number';
}


const SelectedItemsList: React.FC<SelectedItemsListProps> = ({
  machines,
  software,
  onRemoveMachine,
  onRemoveSoftware,
  loading = false, // Use parent loading state
  quoteId
}) => {
  // --- CONSOLE LOG: Check props on render/update ---
  console.log("[SelectedItemsList] Rendering with Props:", { machines, software, loading, quoteId });

  const { plans, loading: plansLoading } = useTrainingPlans();
  const [trainingHours, setTrainingHours] = useState<TrainingHours[]>([]);
  const [totalsByPlan, setTotalsByPlan] = useState<Record<number, number>>({});
  const [calculatingHours, setCalculatingHours] = useState<boolean>(false); // Internal loading state for hour calculation
  const [removingItemId, setRemovingItemId] = useState<string | null>(null); // Track which item is being removed

  // --- CONSOLE LOG: Check plans state ---
  useEffect(() => {
      console.log("[SelectedItemsList] Plans State Update:", { plans, plansLoading });
  }, [plans, plansLoading]);

  // Fetch training offers data and calculate hours - memoized
  const fetchTrainingOffersAndCalculate = useCallback(async () => {
    console.log("[SelectedItemsList] fetchTrainingOffersAndCalculate triggered."); // Log trigger

    // Prevent running if plans haven't loaded yet or if already calculating
    if (plansLoading || !plans || plans.length === 0 || calculatingHours) {
        console.log("[SelectedItemsList] Skipping calculation:", { plansLoading, plansExists: !!plans, plansLength: plans?.length, calculatingHours });
        // Keep existing state if skipping, or clear if appropriate
         if (!plans || plans.length === 0) {
             setTrainingHours([]);
             setTotalsByPlan({});
         }
        return;
    }

    setCalculatingHours(true); // Indicate calculation start
    console.log("[SelectedItemsList] Setting calculatingHours = true");

    // Reset state at the beginning of calculation
    setTrainingHours([]);
    setTotalsByPlan({});

    if (machines.length === 0 && software.length === 0) {
      console.log("[SelectedItemsList] No items selected. Resetting hours and totals.");
      // If no items, set all plans to 0 hours (no need to save to DB from here)
      const zeroHours: Record<number, number> = {};
      plans.forEach(plan => {
        zeroHours[plan.plan_id] = 0;
      });
      setTotalsByPlan(zeroHours);
      setCalculatingHours(false);
      console.log("[SelectedItemsList] Setting calculatingHours = false (no items)");
      return; // Exit if no items selected
    }

    const machineIds = machines.map(m => m.machine_type_id);
    const softwareIds = software.map(s => s.software_type_id);
    const allPlanIds = plans.map(p => p.plan_id);
    console.log("[SelectedItemsList] Starting calculation for machines:", machineIds, "and software:", softwareIds, "across plans:", allPlanIds);

    try {
      const hoursMap = new Map<string, TrainingHours>(); // Use map for easier lookup: key = 'type-itemId-planId'

      // Fetch machine training offers
      if (machineIds.length > 0) {
        console.log("[SelectedItemsList] Fetching training offers for machine IDs:", machineIds);
        const { data: machineData, error: machineError } = await supabase
          .from('training_offers')
          .select('machine_type_id, plan_id, hours_required')
          .in('machine_type_id', machineIds)
          .in('plan_id', allPlanIds)
          .is('software_type_id', null);

        if (machineError) {
            console.error("[SelectedItemsList] Error fetching machine offers:", machineError);
            throw machineError; // Rethrow to be caught by outer catch
        }

        if (machineData && machineData.length > 0) {
          console.log("[SelectedItemsList] Fetched machine offers:", machineData);
          machineData.forEach(offer => {
            const key = `machine-${offer.machine_type_id}-${offer.plan_id}`;
            hoursMap.set(key, {
                itemId: offer.machine_type_id,
                itemType: 'machine' as const,
                planId: offer.plan_id,
                hours: offer.hours_required || 0
            });
          });
        } else {
            console.log("[SelectedItemsList] No specific training offers found for selected machine IDs in DB.");
        }
      }

      // Fetch software training offers
      if (softwareIds.length > 0) {
        // --- CONSOLE LOG: Check IDs before query ---
        console.log("[SelectedItemsList] Querying software offers with IDs:", softwareIds);
        console.log("[SelectedItemsList] Querying software offers for Plan IDs:", allPlanIds);
        const { data: softwareData, error: softwareError } = await supabase
          .from('training_offers')
          .select('software_type_id, plan_id, hours_required')
          .in('software_type_id', softwareIds)
          .in('plan_id', allPlanIds)
          .is('machine_type_id', null); // CRUCIAL filter

        if (softwareError) {
            console.error("[SelectedItemsList] Error fetching software offers:", softwareError);
            throw softwareError; // Rethrow
        }

        if (softwareData && softwareData.length > 0) {
          // --- CONSOLE LOG: Log successful fetch result ---
          console.log("[SelectedItemsList] Fetched software offers:", JSON.stringify(softwareData)); // Log the actual data
          softwareData.forEach(offer => {
             const key = `software-${offer.software_type_id}-${offer.plan_id}`;
             console.log(`[SelectedItemsList] Mapping software offer: key=${key}, hours=${offer.hours_required}`); // Log each mapping
             hoursMap.set(key, {
                 itemId: offer.software_type_id,
                 itemType: 'software' as const,
                 planId: offer.plan_id,
                 hours: offer.hours_required || 0 // Use hours_required from DB
             });
          });
        } else {
           // --- CONSOLE LOG: Log if no offers found ---
           console.log("[SelectedItemsList] No specific training offers found for selected software IDs in DB.");
        }
      }

       // Ensure all selected items have entries for all plans (even if 0 hours)
        machines.forEach(m => {
            plans.forEach(p => {
                const key = `machine-${m.machine_type_id}-${p.plan_id}`;
                if (!hoursMap.has(key)) {
                    // console.log(`[SelectedItemsList] Adding 0h entry for missing machine key: ${key}`);
                    hoursMap.set(key, { itemId: m.machine_type_id, itemType: 'machine', planId: p.plan_id, hours: 0 });
                }
            });
        });
        software.forEach(s => {
            plans.forEach(p => {
                const key = `software-${s.software_type_id}-${p.plan_id}`;
                 if (!hoursMap.has(key)) {
                    // --- CONSOLE LOG: Explicitly log adding 0h for missing software combo ---
                    console.log(`[SelectedItemsList] Adding 0h entry for missing software key: ${key}`);
                    hoursMap.set(key, { itemId: s.software_type_id, itemType: 'software', planId: p.plan_id, hours: 0 });
                }
            });
        });

      // --- CONSOLE LOG: Log the final map before converting to array ---
      console.log("[SelectedItemsList] Final hoursMap:", hoursMap);
      const hoursArray = Array.from(hoursMap.values());
      // --- CONSOLE LOG: Log the array that will be set to state ---
      console.log("[SelectedItemsList] Final hoursArray before setting state:", hoursArray);
      setTrainingHours(hoursArray);

      // Calculate totals from the correctly fetched item hours
      calculatePlanTotals(hoursArray);

    } catch (err: any) {
      console.error("[SelectedItemsList] Error during fetchTrainingOffersAndCalculate:", err);
      toast.error(`Failed to calculate training hours: ${err.message}`);
      setTrainingHours([]); // Clear hours on error
      setTotalsByPlan({}); // Clear totals on error
    } finally {
       setCalculatingHours(false); // Calculation finished
       console.log("[SelectedItemsList] Setting calculatingHours = false (end of calculation)");
    }
  }, [machines, software, plans, plansLoading, quoteId, calculatingHours]); // Added calculatingHours to prevent re-entry


  // Effect to trigger recalculation when machines, software or plans change
  useEffect(() => {
      console.log("[SelectedItemsList] useEffect for fetchTrainingOffersAndCalculate triggered.");
      fetchTrainingOffersAndCalculate();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machines, software, plans]); // Rerun only when these props change, rely on useCallback for function identity


  // Calculate total hours for each plan across all machines and software
  const calculatePlanTotals = (hours: TrainingHours[]) => {
    const totals: Record<number, number> = {};

    // Initialize totals for all plans to 0
    plans.forEach(plan => {
        totals[plan.plan_id] = 0;
    });

    // Sum hours from the fetched/calculated data
    hours.forEach(item => {
      if (totals[item.planId] !== undefined) { // Ensure plan exists in totals
         totals[item.planId] += item.hours;
      } else {
         console.warn(`[SelectedItemsList] calculatePlanTotals: Plan ID ${item.planId} from hours array not found in current plans.`);
      }
    });

    // --- CONSOLE LOG: Log calculated totals ---
    console.log("[SelectedItemsList] Calculated new plan totals:", totals);
    setTotalsByPlan(totals);
  };


  // Get hours for a specific machine/software and plan
  const getHours = (itemId: number, itemType: 'machine' | 'software', planId: number): number => {
    const entry = trainingHours.find(item =>
      item.itemId === itemId && item.itemType === itemType && item.planId === planId
    );
    // --- CONSOLE LOG: Log hour lookup result ---
    // console.log(`[SelectedItemsList] getHours lookup: itemId=${itemId}, itemType=${itemType}, planId=${planId}, Found hours: ${entry?.hours ?? 0}`);
    return entry?.hours || 0;
  };

  // Get software icon based on name
  const getSoftwareIcon = (name: string) => {
    const lowerName = name?.toLowerCase() || '';
    if (lowerName.includes('database')) return <Database className="w-6 h-6 text-blue-400" />; // Smaller icon
    if (lowerName.includes('code') || lowerName.includes('program')) return <Cpu className="w-6 h-6 text-green-400" />;
    return <Server className="w-6 h-6 text-purple-400" />;
  };

  // Handle Remove Item Click
  const handleRemoveClick = async (itemId: number, itemType: 'machine' | 'software') => {
      const uniqueItemId = `${itemType}-${itemId}`;
      console.log(`[SelectedItemsList] handleRemoveClick: Trying to remove ${uniqueItemId}`);
      setRemovingItemId(uniqueItemId); // Show loading state on the specific item's button
      try {
          let success = false;
          if (itemType === 'machine') {
              const result = await onRemoveMachine(itemId);
              success = typeof result === 'boolean' ? result : true; // Assume success if void
          } else {
              const result = await onRemoveSoftware(itemId);
              success = typeof result === 'boolean' ? result : true; // Assume success if void
          }
          if (success) {
              console.log(`[SelectedItemsList] Successfully removed ${uniqueItemId} via parent callback.`);
              // Recalculation will be triggered by the useEffect watching machines/software props
          } else {
              console.warn(`[SelectedItemsList] Parent callback indicated failure removing ${uniqueItemId}.`);
              toast.error(`Failed to remove ${itemType}.`);
          }
      } catch (error: any) {
          console.error(`[SelectedItemsList] Error removing ${itemType} (${uniqueItemId}):`, error);
          toast.error(`Error removing ${itemType}: ${error.message}`);
      } finally {
           setRemovingItemId(null); // Hide loading state
           console.log(`[SelectedItemsList] Finished removal attempt for ${uniqueItemId}`);
      }
  };


  if (loading) { // Check parent loading state first
       return <div className="p-4 text-center">
         <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-400" />
         <p className="text-slate-400 mt-2">Loading selected items...</p>
       </div>;
  }

  // Combine both machines and software into a single array for rendering
   const allItems = [
    ...machines.map(machine => ({
      ...machine,
      itemType: 'machine' as const,
      uniqueId: `machine-${machine.machine_type_id}`
    })),
    ...software.map(softwareItem => ({
      ...softwareItem,
      itemType: 'software' as const,
      uniqueId: `software-${softwareItem.software_type_id}`
    }))
  ];


  if (allItems.length === 0 && !loading) {
    return <div className="text-gray-400 p-4 text-center border border-dashed border-gray-700 rounded-lg">
        No items selected. Please add machines and software from the selection panel.
      </div>;
  }


  return (
    <div className="space-y-3">
      {/* All Items Section */}
      {allItems.map(item => {
         const itemId = isQuoteMachine(item) ? item.machine_type_id : item.software_type_id;
         const isBeingRemoved = removingItemId === item.uniqueId;
         // --- CONSOLE LOG: Log item being rendered ---
         // console.log(`[SelectedItemsList] Rendering item card: ${item.uniqueId}`, item);

         return (
           <Card key={item.uniqueId} className="bg-slate-800/80 border border-white/5 p-3 hover:bg-slate-800 transition-colors duration-150 group">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
               {/* Item Info */}
               <div className="flex items-center gap-3 flex-1 min-w-0">
                 <div className="w-10 h-10 bg-slate-700 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                   {/* Image/Icon rendering */}
                   {item.photo_url ?
                     <img /* ... */ />
                     : item.itemType === 'software' ?
                       getSoftwareIcon(item.name)
                       :
                       <div /* ... */ >No img</div>
                   }
                 </div>
                 <div className="overflow-hidden">
                   <h4 className="text-sm font-medium text-gray-200 truncate">
                     {item.name || "Unknown Item"}
                     {item.itemType === 'software' && (item as QuoteSoftware).always_included &&
                       <span /* ... */ >Always included</span>
                     }
                   </h4>
                   <p className="text-xs text-gray-400 truncate">
                      {item.description || `Type: ${item.itemType === 'machine' ? 'Machine' : 'Software'}`}
                   </p>
                 </div>
               </div>

                {/* Training Plans & Remove Button */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between pl-0 sm:pl-4">
                  {/* Training Plans Icons */}
                  <div className="flex flex-wrap gap-1.5 justify-end">
                     {calculatingHours ? ( // Use internal calculation state
                         <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                     ) : plansLoading ? (
                        <span className="text-xs text-slate-500">Loading plans...</span>
                     ) : (
                       plans.map(plan => {
                         const hours = getHours(itemId, item.itemType, plan.plan_id);
                         const iconUrl = plan.icon_name ? /* ... url ... */ : null;
                         // --- CONSOLE LOG: Log hours displayed per plan badge ---
                         // console.log(`[SelectedItemsList] Rendering badge for ${item.uniqueId}, plan ${plan.plan_id}, hours: ${hours}`);

                         return (
                           <div key={plan.plan_id} className="flex items-center gap-1 bg-slate-700/60 rounded px-1.5 py-0.5" title={plan.name}>
                             {iconUrl ? <img /* ... */ /> : <div /* ... */ ></div> }
                             <span className={`text-xs font-medium ${hours > 0 ? 'text-gray-200' : 'text-gray-500'}`}>{hours}h</span>
                           </div>
                         );
                       })
                     )}
                   </div>

                  {/* Remove Button */}
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-500 hover:text-red-500 hover:bg-red-900/20 rounded-full w-7 h-7 flex-shrink-0"
                              disabled={isBeingRemoved}
                              title={`Remove ${item.name}`}
                          >
                              {isBeingRemoved ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" /> }
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent /* ... */ >
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {item.name}?</AlertDialogTitle>
                            <AlertDialogDescription /* ... */ />
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel /* ... */ >Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                /* ... */
                                onClick={() => handleRemoveClick(itemId, item.itemType)}
                                disabled={isBeingRemoved}
                            >
                                {isBeingRemoved ? "Removing..." : "Yes, Remove"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </div>
             </div>
           </Card>
         )
      })}

      {/* Overall Total Training Hours by Plan */}
      <Card className="bg-slate-800 border border-white/5 p-3 mt-4 sticky bottom-0 shadow-lg">
        <div className="mb-2">
          <h4 className="text-sm font-medium text-gray-300">Total Training Hours by Plan</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {calculatingHours ? (
             <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ): plansLoading ? (
              <span className="text-xs text-slate-500">Loading totals...</span>
          ) : (
            plans.map(plan => {
              const totalHours = totalsByPlan[plan.plan_id] || 0;
              const iconUrl = plan.icon_name ? /* ... url ... */ : null;
              // --- CONSOLE LOG: Log total hours per plan ---
              // console.log(`[SelectedItemsList] Rendering total for plan ${plan.plan_id}: ${totalHours}h`);

              return (
                <div key={plan.plan_id} className="flex items-center gap-1.5 bg-slate-700/80 rounded px-2 py-1" title={plan.name}>
                  {iconUrl ? <img /* ... */ /> : <div /* ... */ ></div> }
                  <span className={`text-sm font-semibold ${totalHours > 0 ? 'text-gray-100' : 'text-gray-500'}`}>{totalHours}h</span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};

export default SelectedItemsList;