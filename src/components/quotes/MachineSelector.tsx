
import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import MachineTypeCard from "@/components/machines/MachineTypeCard";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";

interface MachineSelectorProps {
  selectedMachineIds: number[];
  onSave: (selectedMachines: number[]) => void;
  quoteId?: string;
}

const MachineSelector: React.FC<MachineSelectorProps> = ({ 
  selectedMachineIds,
  onSave,
  quoteId
}) => {
  const { machines, loading, error } = useMachineTypes();
  const { plans } = useTrainingPlans();

  // Function to create planning details for all machines and plans when selection changes
  const updatePlanningDetails = async (machineIds: number[]) => {
    if (!quoteId) return;
    
    try {
      console.log("Updating planning details for all machines and plans");
      
      // Get all training offers to get hours_required for each machine-plan combination
      const { data: allTrainingOffers, error: offersError } = await supabase
        .from("training_offers")
        .select("machine_type_id, plan_id, hours_required");
        
      if (offersError) {
        console.error("Error fetching training offers:", offersError);
        throw offersError;
      }
      
      console.log("Fetched training offers:", allTrainingOffers);
      
      // First delete any planning details for machines that are no longer selected
      const { error: deleteError } = await supabase
        .from("planning_details")
        .delete()
        .eq("quote_id", quoteId)
        .neq("machine_types_id", null) // Only delete machine-related records
        .not("machine_types_id", "in", `(${machineIds.length > 0 ? machineIds.join(",") : 0})`);
        
      if (deleteError) {
        console.error("Error deleting planning details:", deleteError);
        throw deleteError;
      }
      
      // For each selected machine ID and each training plan, ensure there's a planning_details entry
      for (const machineId of machineIds) {
        for (const plan of plans) {
          // Find the corresponding training offer for this machine-plan combination
          const trainingOffer = allTrainingOffers?.find(
            offer => offer.machine_type_id === machineId && offer.plan_id === plan.plan_id
          );
          
          // Default hours if no specific training offer is found
          const hoursRequired = trainingOffer?.hours_required || 0;
          
          // Check if there's already a planning detail for this machine-plan combination
          const { data: existingDetail, error: checkError } = await supabase
            .from("planning_details")
            .select("id")
            .eq("quote_id", quoteId)
            .eq("plan_id", plan.plan_id)
            .eq("machine_types_id", machineId)
            .maybeSingle();
            
          if (checkError) {
            console.error("Error checking existing planning details:", checkError);
            throw checkError;
          }
          
          console.log(`Machine ${machineId}, Plan ${plan.plan_id}: ${existingDetail ? 'exists' : 'needs creation'}`);
          
          try {
            // If no planning detail exists, create one
            if (!existingDetail) {
              console.log(`Creating planning detail for machine ${machineId}, plan ${plan.plan_id}`);
              const { error: insertError } = await supabase
                .from("planning_details")
                .insert({
                  quote_id: quoteId,
                  plan_id: plan.plan_id,
                  machine_types_id: machineId,
                  software_types_id: null,
                  resource_id: null,
                  allocated_hours: hoursRequired,
                  work_on_saturday: false,
                  work_on_sunday: false
                });
                
              if (insertError) {
                console.error("Error inserting planning detail:", insertError);
                throw insertError;
              }
            } else {
              // Ensure allocated hours are updated to match current training offer
              console.log(`Updating planning detail for machine ${machineId}, plan ${plan.plan_id}`);
              const { error: updateError } = await supabase
                .from("planning_details")
                .update({
                  allocated_hours: hoursRequired,
                  updated_at: new Date().toISOString()
                })
                .eq("id", existingDetail.id);
                
              if (updateError) {
                console.error("Error updating planning detail:", updateError);
                throw updateError;
              }
            }
          } catch (err) {
            console.error("Error processing planning detail:", err);
            toast.error("Failed to update planning details");
          }
        }
      }
      
      console.log("Planning details updated for all machines and plans");
      
    } catch (err: any) {
      console.error("Error updating planning details:", err);
      toast.error("Failed to update planning details");
    }
  };

  const toggleMachineSelection = async (machineTypeId: number) => {
    const updatedSelection = selectedMachineIds.includes(machineTypeId)
      ? selectedMachineIds.filter(id => id !== machineTypeId)
      : [...selectedMachineIds, machineTypeId];
    
    // Auto-save machine selection
    onSave(updatedSelection);
    
    // Update planning details for all machines and plans
    await updatePlanningDetails(updatedSelection);
  };

  // Initial setup of planning details when component mounts
  useEffect(() => {
    if (quoteId && selectedMachineIds.length > 0 && plans.length > 0) {
      updatePlanningDetails(selectedMachineIds);
    }
  }, [quoteId, plans.length]);

  const isSelected = (machineTypeId: number) => selectedMachineIds.includes(machineTypeId);

  return (
    <div className="w-full">
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Machine Selection</h2>
        
        {loading ? (
          <div className="p-4 text-center">
            <TextShimmerWave
              className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
              duration={1}
              spread={1}
              zDistance={1}
              scaleDistance={1.1}
              rotateYDistance={10}
            >
              Loading Machine Types
            </TextShimmerWave>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
            <p className="text-red-300">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {machines.map((machine) => (
              <div 
                key={machine.machine_type_id}
                className="relative"
                onClick={() => toggleMachineSelection(machine.machine_type_id)}
              >
                <MachineTypeCard 
                  machine={machine} 
                  isSelected={isSelected(machine.machine_type_id)}
                  showSelectionIndicator={true}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MachineSelector;
