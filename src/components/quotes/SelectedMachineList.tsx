
import React, { useState, useEffect } from "react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { Card } from "@/components/ui/card";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface SelectedMachineListProps {
  machines: QuoteMachine[];
  onRemove: (machineTypeId: number) => void;
  loading?: boolean;
  quoteId?: string;
}

interface TrainingHours {
  machineId: number;
  planId: number;
  hours: number;
}

const SelectedMachineList: React.FC<SelectedMachineListProps> = ({
  machines,
  onRemove,
  loading = false,
  quoteId
}) => {
  const { plans, loading: plansLoading } = useTrainingPlans();
  const [trainingHours, setTrainingHours] = useState<TrainingHours[]>([]);
  const [totalsByPlan, setTotalsByPlan] = useState<Record<number, number>>({});

  // Fetch training offers data (default hours) for each machine
  useEffect(() => {
    const fetchTrainingOffers = async () => {
      if (machines.length === 0) return;

      try {
        const machineIds = machines.map(m => m.machine_type_id);
        
        const { data, error } = await supabase
          .from('training_offers')
          .select('*')
          .in('machine_type_id', machineIds);
          
        if (error) throw error;
        
        // Process initial hours from training_offers
        if (data) {
          const initialHours = data.map(offer => ({
            machineId: offer.machine_type_id,
            planId: offer.plan_id,
            hours: offer.hours_required || 0
          }));
          
          setTrainingHours(initialHours);
          
          // Calculate total hours per plan
          calculatePlanTotals(initialHours);
        }
      } catch (err) {
        console.error("Error fetching training offers:", err);
      }
    };

    // If we have a quoteId, fetch saved hours from quote_training_plan_hours
    const fetchSavedHours = async () => {
      if (!quoteId || machines.length === 0) return;
      
      try {
        const { data, error } = await supabase
          .from('quote_training_plan_hours')
          .select('*')
          .eq('quote_id', quoteId);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Override with saved hours from the quote
          const savedHours = data.map(item => ({
            machineId: -1, // We'll match this with machine later
            planId: item.plan_id,
            hours: item.training_hours || 0
          }));
          
          // Update hours with saved data
          setTrainingHours(prev => {
            const updatedHours = [...prev];
            savedHours.forEach(saved => {
              const index = updatedHours.findIndex(h => h.planId === saved.planId);
              if (index >= 0) {
                updatedHours[index].hours = saved.hours;
              } else {
                updatedHours.push(saved);
              }
            });
            return updatedHours;
          });
          
          // Recalculate totals
          calculatePlanTotals(trainingHours);
        }
      } catch (err) {
        console.error("Error fetching saved hours:", err);
      }
    };
    
    fetchTrainingOffers();
    fetchSavedHours();
  }, [machines, quoteId]);
  
  // Calculate total hours for each plan across all machines
  const calculatePlanTotals = (hours: TrainingHours[]) => {
    const totals: Record<number, number> = {};
    
    hours.forEach(item => {
      totals[item.planId] = (totals[item.planId] || 0) + item.hours;
    });
    
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
  
  // Update hours for a specific machine and plan
  const handleHoursChange = (machineId: number, planId: number, hours: number) => {
    const safeHours = Math.max(0, Math.round(Number(hours) || 0));
    
    setTrainingHours(prev => {
      const index = prev.findIndex(item => 
        item.machineId === machineId && item.planId === planId
      );
      
      const updated = [...prev];
      if (index >= 0) {
        updated[index].hours = safeHours;
      } else {
        updated.push({ machineId, planId, hours: safeHours });
      }
      
      // Recalculate plan totals, which will also save to database
      calculatePlanTotals(updated);
      
      return updated;
    });
  };
  
  // Get hours for a specific machine and plan
  const getHours = (machineId: number, planId: number): number => {
    const entry = trainingHours.find(item => 
      item.machineId === machineId && item.planId === planId
    );
    return entry?.hours || 0;
  };

  if (machines.length === 0) {
    return <div className="text-gray-400 p-4 text-center border border-dashed border-gray-700 rounded-lg">
        No machines selected. Please add machines from the selection panel.
      </div>;
  }
  
  return <div className="space-y-3">
      {machines.map(machine => (
        <div key={machine.machine_type_id} className="space-y-2">
          <Card className="bg-slate-800/80 border border-white/5 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded flex-shrink-0 overflow-hidden">
                  {machine.photo_url ? 
                    <img 
                      src={machine.photo_url} 
                      alt={machine.name} 
                      className="w-full h-full object-cover" 
                      onError={e => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }} 
                    /> 
                    : 
                    <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500 text-xs">
                      No img
                    </div>
                  }
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-medium text-gray-200 truncate">
                    {machine.name || "Unknown Machine"}
                  </h4>
                  {machine.description && 
                    <p className="text-xs text-gray-400 truncate max-w-md text-left">
                      {machine.description}
                    </p>
                  }
                </div>
              </div>

              {/* Training Plans Icons - moved to the same row with machine name, aligned right */}
              <div className="flex flex-wrap gap-2 justify-end">
                {!plansLoading && plans.map(plan => {
                  const hours = getHours(machine.machine_type_id, plan.plan_id);
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
      <Card className="bg-slate-700/50 border border-white/5 p-3">
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

export default SelectedMachineList;
