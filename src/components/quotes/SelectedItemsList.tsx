
import React, { useState, useEffect } from "react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
import { Card } from "@/components/ui/card";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Database, Cpu, Server } from "lucide-react";

interface SelectedItemsListProps {
  machines: QuoteMachine[];
  software: QuoteSoftware[];
  onRemoveMachine: (machineTypeId: number) => void;
  onRemoveSoftware: (softwareTypeId: number) => void;
  loading?: boolean;
  quoteId?: string;
}

interface TrainingHours {
  itemId: number;
  itemType: 'machine' | 'software';
  planId: number;
  hours: number;
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
  const [initialDataLoaded, setInitialDataLoaded] = useState<boolean>(false);

  // Fetch saved hours from quote_training_plan_hours first
  useEffect(() => {
    const fetchSavedPlanHours = async () => {
      if (!quoteId) return;
      
      try {
        console.log("Fetching saved training hours for quote:", quoteId);
        const { data, error } = await supabase
          .from('quote_training_plan_hours')
          .select('*')
          .eq('quote_id', quoteId);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          console.log("Fetched saved training hours:", data);
          
          // Store the total hours by plan
          const savedTotalsByPlan: Record<number, number> = {};
          data.forEach(item => {
            savedTotalsByPlan[item.plan_id] = item.training_hours || 0;
          });
          
          setTotalsByPlan(savedTotalsByPlan);
        }
        
      } catch (err) {
        console.error("Error fetching saved plan hours:", err);
      }
      
      setInitialDataLoaded(true);
    };
    
    fetchSavedPlanHours();
  }, [quoteId]);

  // Effect to trigger recalculation when machines or software change
  useEffect(() => {
    if (initialDataLoaded) {
      fetchTrainingOffersAndCalculate();
    }
  }, [machines, software, initialDataLoaded]); // This will run when machines or software arrays change

  // Fetch training offers data and calculate hours
  const fetchTrainingOffersAndCalculate = async () => {
    if (machines.length === 0 && software.length === 0) {
      // If no items, set all plans to 0 hours and save to database
      if (plans.length > 0 && quoteId) {
        const zeroHours: Record<number, number> = {};
        plans.forEach(plan => {
          zeroHours[plan.plan_id] = 0;
        });
        setTotalsByPlan(zeroHours);
        savePlanTotalsToDatabase(zeroHours);
      }
      return;
    }

    try {
      const machineIds = machines.map(m => m.machine_type_id);
      const softwareIds = software.map(s => s.software_type_id);
      const hoursArray: TrainingHours[] = [];
      
      // Fetch machine training offers
      if (machineIds.length > 0) {
        const { data: machineData, error: machineError } = await supabase
          .from('training_offers')
          .select('*')
          .in('machine_type_id', machineIds);
          
        if (machineError) throw machineError;
        
        if (machineData) {
          const machineHours = machineData.map(offer => ({
            itemId: offer.machine_type_id,
            itemType: 'machine' as const,
            planId: offer.plan_id,
            hours: offer.hours_required || 0
          }));
          
          hoursArray.push(...machineHours);
        }
      }
      
      // Create a function to fetch software training hours (might need to be implemented in the future)
      // For now we'll use a dummy approach with estimated hours
      if (softwareIds.length > 0) {
        // For each software, check if we have plans
        for (const softwareId of softwareIds) {
          // For now, assign a default value for each plan
          // This should be replaced with actual DB values when available
          for (const plan of plans) {
            hoursArray.push({
              itemId: softwareId,
              itemType: 'software',
              planId: plan.plan_id,
              hours: 4 // Default value, replace with actual logic later
            });
          }
        }
      }
      
      setTrainingHours(hoursArray);
      
      // Calculate totals from all item hours
      calculatePlanTotals(hoursArray);
      
    } catch (err) {
      console.error("Error fetching training offers:", err);
    }
  };
  
  // Calculate total hours for each plan across all machines and software
  const calculatePlanTotals = (hours: TrainingHours[]) => {
    const totals: Record<number, number> = {};
    
    hours.forEach(item => {
      totals[item.planId] = (totals[item.planId] || 0) + item.hours;
    });
    
    console.log("Calculated new plan totals:", totals);
    setTotalsByPlan(totals);
    
    // Save the plan totals to the database
    if (quoteId) {
      savePlanTotalsToDatabase(totals);
    }
  };
  
  // Save total hours by plan to the database
  const savePlanTotalsToDatabase = async (totals: Record<number, number>) => {
    if (!quoteId) return;
    
    try {
      // Get all plans to ensure we save totals for each one
      const planIds = plans.map(p => p.plan_id);
      
      // Create upsert payload for all plans
      const upsertData = planIds.map(planId => ({
        quote_id: quoteId,
        plan_id: planId,
        training_hours: totals[planId] || 0,
        updated_at: new Date().toISOString()
      }));
      
      console.log("Saving plan totals to database:", upsertData);
      
      const { error } = await supabase
        .from('quote_training_plan_hours')
        .upsert(upsertData, {
          onConflict: 'quote_id,plan_id'
        });
      
      if (error) throw error;
      
    } catch (err) {
      console.error("Error saving plan totals:", err);
      toast.error("Failed to save training plan totals");
    }
  };
  
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
    if (lowerName.includes('database')) return <Database className="w-10 h-10 text-blue-400" />;
    if (lowerName.includes('code') || lowerName.includes('program')) return <Cpu className="w-10 h-10 text-green-400" />;
    return <Server className="w-10 h-10 text-purple-400" />;
  };

  if (machines.length === 0 && software.length === 0) {
    return <div className="text-gray-400 p-4 text-center border border-dashed border-gray-700 rounded-lg">
        No items selected. Please add machines and software from the selection panel.
      </div>;
  }
  
  // Combine both machines and software into a single array of items
  const allItems = [
    ...machines.map(machine => ({ 
      ...machine, 
      itemType: 'machine' as const,
    })), 
    ...software.map(softwareItem => ({ 
      ...softwareItem, 
      itemType: 'software' as const 
    }))
  ];
  
  return <div className="space-y-3">
      {/* All Items Section */}
      {allItems.map(item => (
        <div key={`${item.itemType}-${item.itemType === 'machine' ? item.machine_type_id : item.software_type_id}`} className="space-y-2">
          <Card className="bg-slate-800/80 border border-white/5 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {item.photo_url ? 
                    <img 
                      src={item.photo_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        if (item.itemType === 'software') {
                          (e.target as HTMLImageElement).parentElement!.appendChild(
                            getSoftwareIcon(item.name) as any
                          );
                        } else {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }
                      }} 
                    /> 
                    : item.itemType === 'software' ? 
                      getSoftwareIcon(item.name)
                      : 
                      <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500 text-xs">
                        No img
                      </div>
                  }
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-medium text-gray-200 truncate">
                    {item.name || "Unknown Item"}
                    {item.itemType === 'software' && (item as QuoteSoftware).always_included && 
                      <span className="ml-2 text-xs text-amber-400 font-medium">
                        (Always included)
                      </span>
                    }
                  </h4>
                  {item.description && 
                    <p className="text-xs text-gray-400 truncate max-w-md text-left">
                      {item.description}
                    </p>
                  }
                  <p className="text-xs text-gray-400">
                    Type: {item.itemType === 'machine' ? 'Machine' : 'Software'}
                  </p>
                </div>
              </div>

              {/* Training Plans Icons */}
              <div className="flex flex-wrap gap-2 justify-end">
                {!plansLoading && plans.map(plan => {
                  const itemId = item.itemType === 'machine' ? 
                    (item as QuoteMachine).machine_type_id : 
                    (item as QuoteSoftware).software_type_id;
                    
                  const hours = getHours(itemId, item.itemType, plan.plan_id);
                  const iconUrl = plan.icon_name ? 
                    `${supabase.storage.from('training_plan_icons').getPublicUrl(plan.icon_name + '.svg').data.publicUrl}` : 
                    null;
                    
                  return (
                    <div key={plan.plan_id} className="flex items-center gap-1 bg-slate-700/50 rounded p-1">
                      {iconUrl ? 
                        <img src={iconUrl} alt={plan.name} className="w-5 h-5" title={plan.name} /> : 
                        <div className="w-5 h-5 bg-gray-600 rounded-full"></div>
                      }
                      <span className="text-xs font-medium text-gray-200">{hours}h</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      ))}
      
      {/* Overall Total Training Hours by Plan */}
      <Card className="bg-slate-700/50 border border-white/5 p-3 mt-4">
        <div className="mb-2">
          <h4 className="text-sm font-medium text-gray-300">Total Training Hours by Plan</h4>
        </div>
        <div className="flex flex-wrap gap-3">
          {!plansLoading && plans.map(plan => {
            const totalHours = totalsByPlan[plan.plan_id] || 0;
            const iconUrl = plan.icon_name ? 
              `${supabase.storage.from('training_plan_icons').getPublicUrl(plan.icon_name + '.svg').data.publicUrl}` : 
              null;
              
            return (
              <div key={plan.plan_id} className="flex items-center gap-1 bg-slate-700/30 rounded p-2">
                {iconUrl ? 
                  <img src={iconUrl} alt={plan.name} className="w-5 h-5" title={plan.name} /> : 
                  <div className="w-5 h-5 bg-gray-600 rounded-full"></div>
                }
                <span className="text-xs font-medium text-gray-200">{totalHours}h</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>;
};

export default SelectedItemsList;
