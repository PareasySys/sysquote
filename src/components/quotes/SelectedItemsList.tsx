
import React, { useState, useEffect, useCallback, useRef } from "react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
import { Card } from "@/components/ui/card";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Cpu, Server, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";

interface SelectedItemsListProps {
  machines: QuoteMachine[];
  software: QuoteSoftware[];
  onRemoveMachine: (machineTypeId: number) => Promise<boolean> | void;
  onRemoveSoftware: (softwareTypeId: number) => Promise<boolean> | void;
  loading?: boolean;
  quoteId?: string;
}

interface TrainingHours {
  itemId: number;
  itemType: 'machine' | 'software';
  planId: number;
  hours: number;
}

function isQuoteMachine(item: any): item is QuoteMachine & { itemType: 'machine' } {
  return item.itemType === 'machine' && typeof item.machine_type_id === 'number';
}

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
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  
  // Use a ref to store previous state for comparison without triggering re-renders
  const prevDataRef = useRef({
    machineIds: '',
    softwareIds: '',
    planIds: ''
  });

  // First effect: track selection changes without causing re-renders
  useEffect(() => {
    if (plansLoading || !plans) return;

    const machineIds = machines.map(m => m.machine_type_id).sort().join(',');
    const softwareIds = software.map(s => s.software_type_id).sort().join(',');
    const planIds = plans.map(p => p.plan_id).sort().join(',');
    
    const current = {
      machineIds,
      softwareIds,
      planIds
    };
    
    const prev = prevDataRef.current;
    
    // Only fetch if data has actually changed
    if (prev.machineIds !== current.machineIds || 
        prev.softwareIds !== current.softwareIds ||
        prev.planIds !== current.planIds) {
      
      console.log("[SelectedItemsList] Data changed, triggering fetch");
      
      // Update ref with current values
      prevDataRef.current = current;
      
      // Only start a fetch if we're not already fetching
      if (!calculatingHours) {
        fetchTrainingOffersAndCalculate();
      }
    }
  }, [machines, software, plans, plansLoading]);

  const fetchTrainingOffersAndCalculate = useCallback(async () => {
    console.log("[SelectedItemsList] fetchTrainingOffersAndCalculate triggered.");

    if (plansLoading || !plans || plans.length === 0 || calculatingHours) {
      console.log("[SelectedItemsList] Skipping calculation:", { plansLoading, plansExists: !!plans, plansLength: plans?.length, calculatingHours });
      if (!plans || plans.length === 0) {
        setTrainingHours([]);
        setTotalsByPlan({});
      }
      return;
    }

    setCalculatingHours(true);
    console.log("[SelectedItemsList] Setting calculatingHours = true");

    setTrainingHours([]);
    setTotalsByPlan({});

    if (machines.length === 0 && software.length === 0) {
      console.log("[SelectedItemsList] No items selected. Resetting hours and totals.");
      const zeroHours: Record<number, number> = {};
      plans.forEach(plan => {
        zeroHours[plan.plan_id] = 0;
      });
      setTotalsByPlan(zeroHours);
      setCalculatingHours(false);
      console.log("[SelectedItemsList] Setting calculatingHours = false (no items)");
      return;
    }

    const machineIds = machines.map(m => m.machine_type_id);
    const softwareIds = software.map(s => s.software_type_id);
    const allPlanIds = plans.map(p => p.plan_id);

    console.log("[SelectedItemsList] Starting calculation for machines:", machineIds, "and software:", softwareIds, "across plans:", allPlanIds);

    try {
      const hoursMap = new Map<string, TrainingHours>();

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
          throw machineError;
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

      if (softwareIds.length > 0) {
        console.log("[SelectedItemsList] Querying software offers with IDs:", softwareIds);
        console.log("[SelectedItemsList] Querying software offers for Plan IDs:", allPlanIds);
        const { data: softwareData, error: softwareError } = await supabase
          .from('training_offers')
          .select('software_type_id, plan_id, hours_required')
          .in('software_type_id', softwareIds)
          .in('plan_id', allPlanIds)
          .is('machine_type_id', null);

        if (softwareError) {
          console.error("[SelectedItemsList] Error fetching software offers:", softwareError);
          throw softwareError;
        }

        if (softwareData && softwareData.length > 0) {
          console.log("[SelectedItemsList] Fetched software offers:", JSON.stringify(softwareData));
          softwareData.forEach(offer => {
            const key = `software-${offer.software_type_id}-${offer.plan_id}`;
            console.log(`[SelectedItemsList] Mapping software offer: key=${key}, hours=${offer.hours_required}`);
            hoursMap.set(key, {
              itemId: offer.software_type_id,
              itemType: 'software' as const,
              planId: offer.plan_id,
              hours: offer.hours_required || 0
            });
          });
        } else {
          console.log("[SelectedItemsList] No specific training offers found for selected software IDs in DB.");
        }
      }

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
            console.log(`[SelectedItemsList] Adding 0h entry for missing software key: ${key}`);
            hoursMap.set(key, { itemId: s.software_type_id, itemType: 'software', planId: p.plan_id, hours: 0 });
          }
        });
      });

      console.log("[SelectedItemsList] Final hoursMap:", hoursMap);
      const hoursArray = Array.from(hoursMap.values());
      console.log("[SelectedItemsList] Final hoursArray before setting state:", hoursArray);
      setTrainingHours(hoursArray);

      calculatePlanTotals(hoursArray);
    } catch (err: any) {
      console.error("[SelectedItemsList] Error during fetchTrainingOffersAndCalculate:", err);
      toast.error(`Failed to calculate training hours: ${err.message}`);
      setTrainingHours([]);
      setTotalsByPlan({});
    } finally {
      setCalculatingHours(false);
      console.log("[SelectedItemsList] Setting calculatingHours = false (end of calculation)");
    }
  }, [machines, software, plans, plansLoading, calculatingHours]);

  const calculatePlanTotals = (hours: TrainingHours[]) => {
    const totals: Record<number, number> = {};

    plans.forEach(plan => {
      totals[plan.plan_id] = 0;
    });

    hours.forEach(item => {
      if (totals[item.planId] !== undefined) {
        totals[item.planId] += item.hours;
      } else {
        console.warn(`[SelectedItemsList] calculatePlanTotals: Plan ID ${item.planId} from hours array not found in current plans.`);
      }
    });

    console.log("[SelectedItemsList] Calculated new plan totals:", totals);
    setTotalsByPlan(totals);
  };

  const getHours = (itemId: number, itemType: 'machine' | 'software', planId: number): number => {
    const entry = trainingHours.find(item =>
      item.itemId === itemId && item.itemType === itemType && item.planId === planId
    );
    return entry?.hours || 0;
  };

  const getSoftwareIcon = (name: string) => {
    const lowerName = name?.toLowerCase() || '';
    if (lowerName.includes('database')) return <Database className="w-6 h-6 text-blue-400" />;
    if (lowerName.includes('code') || lowerName.includes('program')) return <Cpu className="w-6 h-6 text-green-400" />;
    return <Server className="w-6 h-6 text-purple-400" />;
  };

  const handleRemoveClick = async (itemId: number, itemType: 'machine' | 'software') => {
    const uniqueItemId = `${itemType}-${itemId}`;
    console.log(`[SelectedItemsList] handleRemoveClick: Trying to remove ${uniqueItemId}`);
    setRemovingItemId(uniqueItemId);
    try {
      let success = false;
      if (itemType === 'machine') {
        const result = await onRemoveMachine(itemId);
        success = typeof result === 'boolean' ? result : true;
      } else {
        const result = await onRemoveSoftware(itemId);
        success = typeof result === 'boolean' ? result : true;
      }
      if (success) {
        console.log(`[SelectedItemsList] Successfully removed ${uniqueItemId} via parent callback.`);
      } else {
        console.warn(`[SelectedItemsList] Parent callback indicated failure removing ${uniqueItemId}.`);
        toast.error(`Failed to remove ${itemType}.`);
      }
    } catch (error: any) {
      console.error(`[SelectedItemsList] Error removing ${itemType} (${uniqueItemId}):`, error);
      toast.error(`Error removing ${itemType}: ${error.message}`);
    } finally {
      setRemovingItemId(null);
      console.log(`[SelectedItemsList] Finished removal attempt for ${uniqueItemId}`);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">
      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-400" />
      <p className="text-slate-400 mt-2">Loading selected items...</p>
    </div>;
  }

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
      {allItems.map(item => {
        const itemId = isQuoteMachine(item) ? item.machine_type_id : item.software_type_id;
        const isBeingRemoved = removingItemId === item.uniqueId;

        return (
          <Card key={item.uniqueId} className="bg-slate-800/80 border border-white/5 p-3 hover:bg-slate-800 transition-colors duration-150 group">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-slate-700 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : item.itemType === 'software' ? (
                    getSoftwareIcon(item.name)
                  ) : (
                    <div className="text-xs text-slate-500">No img</div>
                  )}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-medium text-gray-200 truncate">
                    {item.name || "Unknown Item"}
                    {item.itemType === 'software' && (item as QuoteSoftware).always_included && (
                      <span className="ml-2 text-xs bg-amber-600/70 text-white px-1 rounded-sm">Required</span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-400 truncate">
                    {item.description || `Type: ${item.itemType === 'machine' ? 'Machine' : 'Software'}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between pl-0 sm:pl-4">
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {calculatingHours ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : plansLoading ? (
                    <span className="text-xs text-slate-500">Loading plans...</span>
                  ) : (
                    plans.map(plan => {
                      const hours = getHours(itemId, item.itemType, plan.plan_id);
                      const iconUrl = plan.icon_name ? `/icons/${plan.icon_name}` : null;

                      return (
                        <div key={plan.plan_id} className="flex items-center gap-1 bg-slate-700/60 rounded px-1.5 py-0.5" title={plan.name}>
                          {iconUrl ? (
                            <img src={iconUrl} alt={plan.name} className="w-3.5 h-3.5 object-contain" />
                          ) : (
                            <div className="w-3.5 h-3.5 bg-slate-600 rounded-sm"></div>
                          )}
                          <span className={`text-xs font-medium ${hours > 0 ? 'text-gray-200' : 'text-gray-500'}`}>{hours}h</span>
                        </div>
                      );
                    })
                  )}
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-500 hover:text-red-500 hover:bg-red-900/20 rounded-full w-7 h-7 flex-shrink-0"
                      disabled={isBeingRemoved}
                      title={`Remove ${item.name}`}
                    >
                      {isBeingRemoved ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {item.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the {item.itemType} from your quote. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
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
        );
      })}

      <Card className="bg-slate-800 border border-white/5 p-3 mt-4 sticky bottom-0 shadow-lg">
        <div className="mb-2">
          <h4 className="text-sm font-medium text-gray-300">Total Training Hours by Plan</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {calculatingHours ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : plansLoading ? (
            <span className="text-xs text-slate-500">Loading totals...</span>
          ) : (
            plans.map(plan => {
              const totalHours = totalsByPlan[plan.plan_id] || 0;
              const iconUrl = plan.icon_name ? `/icons/${plan.icon_name}` : null;

              return (
                <div key={plan.plan_id} className="flex items-center gap-1.5 bg-slate-700/80 rounded px-2 py-1" title={plan.name}>
                  {iconUrl ? (
                    <img src={iconUrl} alt={plan.name} className="w-4 h-4 object-contain" />
                  ) : (
                    <div className="w-4 h-4 bg-slate-600 rounded-sm"></div>
                  )}
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
