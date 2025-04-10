
import React, { useState, useEffect } from "react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash, Edit } from "lucide-react";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

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
  const [totalHours, setTotalHours] = useState<Record<number, number>>({});
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});

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
          
          // Calculate total hours per machine
          const totals: Record<number, number> = {};
          initialHours.forEach(item => {
            totals[item.machineId] = (totals[item.machineId] || 0) + item.hours;
          });
          setTotalHours(totals);
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
          calculateTotals();
        }
      } catch (err) {
        console.error("Error fetching saved hours:", err);
      }
    };
    
    fetchTrainingOffers();
    fetchSavedHours();
  }, [machines, quoteId]);
  
  // Calculate total hours for each machine
  const calculateTotals = () => {
    const totals: Record<number, number> = {};
    trainingHours.forEach(item => {
      totals[item.machineId] = (totals[item.machineId] || 0) + item.hours;
    });
    setTotalHours(totals);
  };
  
  // Update hours for a specific machine and plan
  const handleHoursChange = (machineId: number, planId: number, hours: number) => {
    const safeHours = Math.max(0, Math.round(Number(hours) || 0));
    
    setTrainingHours(prev => {
      const index = prev.findIndex(item => 
        item.machineId === machineId && item.planId === planId
      );
      
      if (index >= 0) {
        const updated = [...prev];
        updated[index].hours = safeHours;
        return updated;
      } else {
        return [...prev, { machineId, planId, hours: safeHours }];
      }
    });
    
    // Update total for this machine
    setTotalHours(prev => ({
      ...prev,
      [machineId]: Object.entries(trainingHours)
        .filter(([_, item]) => item.machineId === machineId && item.planId !== planId)
        .reduce((sum, [_, item]) => sum + item.hours, safeHours)
    }));
    
    // Save to database if quoteId is available
    if (quoteId) {
      saveHoursToDB(machineId, planId, safeHours);
    }
  };
  
  // Toggle edit mode for a specific machine
  const toggleEdit = (machineId: string) => {
    setIsEditing(prev => ({
      ...prev,
      [machineId]: !prev[machineId]
    }));
  };
  
  // Save hours to the database
  const saveHoursToDB = async (machineId: number, planId: number, hours: number) => {
    if (!quoteId) return;
    
    try {
      const { error } = await supabase
        .from('quote_training_plan_hours')
        .upsert({
          quote_id: quoteId,
          plan_id: planId,
          training_hours: hours,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'quote_id,plan_id'
        });
        
      if (error) throw error;
    } catch (err) {
      console.error("Error saving training hours:", err);
      toast.error("Failed to save training hours");
    }
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
            <div className="flex items-center justify-between mb-2">
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
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                  onClick={() => toggleEdit(machine.machine_type_id.toString())}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => onRemove(machine.machine_type_id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Training Plans Section */}
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="flex flex-wrap gap-3">
                {!plansLoading && plans.map(plan => {
                  const hours = getHours(machine.machine_type_id, plan.plan_id);
                  const iconUrl = plan.icon_name ? 
                    `${supabase.storage.from('training_plan_icons').getPublicUrl(plan.icon_name + '.svg').data.publicUrl}` : 
                    null;
                    
                  return (
                    <div key={plan.plan_id} className="flex items-center gap-1 bg-slate-700/50 rounded p-1 px-2">
                      {iconUrl ? 
                        <img src={iconUrl} alt={plan.name} className="w-4 h-4" /> : 
                        <div className="w-4 h-4 bg-gray-600 rounded-full"></div>
                      }
                      <span className="text-xs text-gray-300">{plan.name}: </span>
                      {isEditing[machine.machine_type_id.toString()] ? (
                        <Input 
                          type="number"
                          min="0"
                          value={hours}
                          onChange={(e) => handleHoursChange(
                            machine.machine_type_id, 
                            plan.plan_id, 
                            parseInt(e.target.value, 10)
                          )}
                          className="w-12 h-6 text-xs p-1 text-center bg-slate-600 border-slate-500"
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-200">{hours}h</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Machine Total Hours */}
            <div className="mt-2 pt-2 border-t border-white/10 flex justify-end">
              <div className="text-xs text-gray-400">
                Total: <span className="text-gray-200 font-medium">
                  {totalHours[machine.machine_type_id] || 0}h
                </span>
              </div>
            </div>
          </Card>
        </div>
      ))}
      
      {/* Overall Total Training Hours */}
      <Card className="bg-slate-700/50 border border-white/5 p-3">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium text-gray-300">Total Training Hours</h4>
          <div className="text-gray-200 font-medium">
            {Object.values(totalHours).reduce((sum, hours) => sum + hours, 0)}h
          </div>
        </div>
      </Card>
    </div>;
};

export default SelectedMachineList;
