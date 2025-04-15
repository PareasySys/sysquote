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
  loading?: boolean;
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
  loading = false,
  quoteId
}) => {
  const { plans, loading: plansLoading } = useTrainingPlans();
  const [trainingHours, setTrainingHours] = useState<TrainingHours[]>([]);
  const [totalsByPlan, setTotalsByPlan] = useState<Record<number, number>>({});
  const [calculatingHours, setCalculatingHours] = useState<boolean>(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null); // Track which item is being removed

  // Fetch training offers data and calculate hours - memoized
  const fetchTrainingOffersAndCalculate = useCallback(async () => {
    // Prevent running if plans haven't loaded yet
    if (plansLoading || !plans || plans.length === 0) {
        console.log("SelectedItemsList: Plans not ready, skipping calculation.");
        // Optionally clear state if needed when plans are empty/loading
        setTrainingHours([]);
        setTotalsByPlan({});
        return;
    }

    setCalculatingHours(true); // Indicate calculation start

    // Reset state at the beginning of calculation
    setTrainingHours([]);
    setTotalsByPlan({});

    if (machines.length === 0 && software.length === 0) {
      console.log("SelectedItemsList: No items selected.");
      // If no items, set all plans to 0 hours and save to database
      if (plans.length > 0 && quoteId) {
        const zeroHours: Record<number, number> = {};
        plans.forEach(plan => {
          zeroHours[plan.plan_id] = 0;
        });
        setTotalsByPlan(zeroHours); // Update state
        // savePlanTotalsToDatabase(zeroHours); // Consider if saving zeros is desired here
      }
      setCalculatingHours(false); // Calculation done (no items)
      return; // Exit if no items selected
    }

    console.log("SelectedItemsList: Starting calculation for machines:", machines.map(m=>m.machine_type_id), "and software:", software.map(s=>s.software_type_id));

    try {
      const machineIds = machines.map(m => m.machine_type_id);
      const softwareIds = software.map(s => s.software_type_id);
      const allPlanIds = plans.map(p => p.plan_id);
      const hoursMap = new Map<string, TrainingHours>(); // Use map for easier lookup: key = 'type-itemId-planId'

      // Fetch machine training offers
      if (machineIds.length > 0) {
        console.log("SelectedItemsList: Fetching training offers for machine IDs:", machineIds);
        const { data: machineData, error: machineError } = await supabase
          .from('training_offers')
          .select('machine_type_id, plan_id, hours_required') // Select only needed fields
          .in('machine_type_id', machineIds)
          .in('plan_id', allPlanIds) // Ensure we only get offers for existing plans
          .is('software_type_id', null); // Ensure we only get machine offers

        if (machineError) throw machineError;

        if (machineData) {
          console.log("SelectedItemsList: Fetched machine offers:", machineData);
          machineData.forEach(offer => {
            const key = `machine-${offer.machine_type_id}-${offer.plan_id}`;
            hoursMap.set(key, {
                itemId: offer.machine_type_id,
                itemType: 'machine' as const,
                planId: offer.plan_id,
                hours: offer.hours_required || 0
            });
          });
        }
      }

      // Fetch software training offers
      if (softwareIds.length > 0) {
        console.log("SelectedItemsList: Fetching training offers for software IDs:", softwareIds);
        const { data: softwareData, error: softwareError } = await supabase
          .from('training_offers')
          .select('software_type_id, plan_id, hours_required') // Select only needed fields
          .in('software_type_id', softwareIds)
          .in('plan_id', allPlanIds) // Ensure we only get offers for existing plans
          .is('machine_type_id', null); // CRUCIAL: Filter for software offers

        if (softwareError) throw softwareError;

        if (softwareData) {
          console.log("SelectedItemsList: Fetched software offers:", softwareData);
          softwareData.forEach(offer => {
             const key = `software-${offer.software_type_id}-${offer.plan_id}`;
             hoursMap.set(key, {
                 itemId: offer.software_type_id,
                 itemType: 'software' as const,
                 planId: offer.plan_id,
                 hours: offer.hours_required || 0 // Use hours_required from DB
             });
          });
        } else {
           console.log("SelectedItemsList: No specific training offers found for selected software IDs.");
        }
      }

       // Ensure all selected items have entries for all plans (even if 0 hours)
        machines.forEach(m => {
            plans.forEach(p => {
                const key = `machine-${m.machine_type_id}-${p.plan_id}`;
                if (!hoursMap.has(key)) {
                    hoursMap.set(key, { itemId: m.machine_type_id, itemType: 'machine', planId: p.plan_id, hours: 0 });
                }
            });
        });
        software.forEach(s => {
            plans.forEach(p => {
                const key = `software-${s.software_type_id}-${p.plan_id}`;
                 if (!hoursMap.has(key)) {
                    hoursMap.set(key, { itemId: s.software_type_id, itemType: 'software', planId: p.plan_id, hours: 0 });
                }
            });
        });

      const hoursArray = Array.from(hoursMap.values());
      console.log("SelectedItemsList: Final hoursArray before setting state:", hoursArray);
      setTrainingHours(hoursArray);

      // Calculate totals from the correctly fetched item hours
      calculatePlanTotals(hoursArray);

    } catch (err: any) {
      console.error("SelectedItemsList: Error fetching training offers:", err);
      toast.error(`Failed to load training hours: ${err.message}`);
      setTrainingHours([]);
      setTotalsByPlan({});
    } finally {
       setCalculatingHours(false); // Calculation finished
    }
  }, [machines, software, plans, plansLoading, quoteId]); // Dependencies


  // Effect to trigger recalculation when machines, software or plans change
  useEffect(() => {
      fetchTrainingOffersAndCalculate();
  }, [fetchTrainingOffersAndCalculate]); // Dependency is the memoized callback

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
      }
    });

    console.log("SelectedItemsList: Calculated new plan totals:", totals);
    setTotalsByPlan(totals);

    // Consider if saving totals to a separate table is necessary or if calculation on demand is sufficient
    // if (quoteId) {
    //   savePlanTotalsToDatabase(totals);
    // }
  };

  // --- Removed savePlanTotalsToDatabase function as it's not typically needed here ---
  // Totals are usually calculated dynamically or stored/synced within the main planning data

  // Get hours for a specific machine/software and plan
  const getHours = (itemId: number, itemType: 'machine' | 'software', planId: number): number => {
    const entry = trainingHours.find(item =>
      item.itemId === itemId && item.itemType === itemType && item.planId === planId
    );
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
              // Recalculation will be triggered by the useEffect watching machines/software props
          } else {
              // Handle failure if onRemove returns false
              toast.error(`Failed to remove ${itemType}.`);
          }
      } catch (error: any) {
          console.error(`Error removing ${itemType}:`, error);
          toast.error(`Error removing ${itemType}: ${error.message}`);
      } finally {
           setRemovingItemId(null); // Hide loading state
      }
  };


  if (loading) {
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

         return (
           <Card key={item.uniqueId} className="bg-slate-800/80 border border-white/5 p-3 hover:bg-slate-800 transition-colors duration-150 group">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
               {/* Item Info */}
               <div className="flex items-center gap-3 flex-1 min-w-0"> {/* Added min-w-0 for truncation */}
                 <div className="w-10 h-10 bg-slate-700 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                   {item.photo_url ?
                     <img
                       src={item.photo_url}
                       alt={item.name}
                       className="w-full h-full object-cover"
                       onError={e => {
                         // Fallback logic if image fails
                         const parent = (e.target as HTMLImageElement).parentElement;
                         if (parent) {
                            parent.innerHTML = ''; // Clear the img tag
                            if (item.itemType === 'software') {
                                // Render SVG icon directly (requires React approach)
                                const iconElement = getSoftwareIcon(item.name);
                                // This is tricky without ReactDOMServer or specific library
                                // For simplicity, show a placeholder or default icon
                                parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-purple-400"><path d="M12 2 L2 7 L12 12 L22 7 Z M2 17 L12 22 L22 17 L12 12 Z M2 12 L12 17 L22 12 L12 7 Z"></path></svg>'; // Example placeholder

                            } else {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500 text-xs">No img</div>';
                            }
                         }
                       }}
                     />
                     : item.itemType === 'software' ?
                       getSoftwareIcon(item.name) // Render directly
                       :
                       <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500 text-xs">
                         No img
                       </div>
                   }
                 </div>
                 <div className="overflow-hidden"> {/* Container for text */}
                   <h4 className="text-sm font-medium text-gray-200 truncate">
                     {item.name || "Unknown Item"}
                     {item.itemType === 'software' && item.always_included &&
                       <span className="ml-2 text-xs text-amber-400 font-normal bg-amber-900/50 px-1.5 py-0.5 rounded">
                         Always included
                       </span>
                     }
                   </h4>
                   <p className="text-xs text-gray-400 truncate"> {/* Ensure description truncates */}
                      {item.description || `Type: ${item.itemType === 'machine' ? 'Machine' : 'Software'}`}
                   </p>
                 </div>
               </div>

                {/* Training Plans & Remove Button */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between pl-0 sm:pl-4">
                  {/* Training Plans Icons */}
                  <div className="flex flex-wrap gap-1.5 justify-end">
                     {calculatingHours ? (
                         <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                     ) : plansLoading ? (
                        <span className="text-xs text-slate-500">Loading plans...</span>
                     ) : (
                       plans.map(plan => {
                         const hours = getHours(itemId, item.itemType, plan.plan_id);
                         const iconUrl = plan.icon_name ?
                             `${supabase.storage.from('training_plan_icons').getPublicUrl(plan.icon_name + '.svg').data.publicUrl}` :
                             null;

                         return (
                           <div key={plan.plan_id} className="flex items-center gap-1 bg-slate-700/60 rounded px-1.5 py-0.5" title={plan.name}>
                             {iconUrl ?
                               <img src={iconUrl} alt="" className="w-4 h-4" /* Removed redundant title */ /> :
                               <div className="w-4 h-4 bg-slate-600 rounded-sm"></div> // Placeholder shape
                             }
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
                              {isBeingRemoved ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                  <Trash2 className="h-4 w-4" />
                              )}
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-200">
                          <AlertDialogHeader>
                          <AlertDialogTitle>Remove {item.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                              Are you sure you want to remove "{item.name}" from this quote? This action cannot be undone immediately.
                          </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                          <AlertDialogCancel className="bg-transparent border-slate-600 hover:bg-slate-800">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
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
              const iconUrl = plan.icon_name ?
                `${supabase.storage.from('training_plan_icons').getPublicUrl(plan.icon_name + '.svg').data.publicUrl}` :
                null;

              return (
                <div key={plan.plan_id} className="flex items-center gap-1.5 bg-slate-700/80 rounded px-2 py-1" title={plan.name}>
                  {iconUrl ?
                    <img src={iconUrl} alt="" className="w-4 h-4" /> :
                    <div className="w-4 h-4 bg-slate-600 rounded-sm"></div>
                  }
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