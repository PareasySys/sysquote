
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
        
      if (offersError) throw offersError;
      
      // First delete any planning details for machines that are no longer selected
      const { error: deleteError } = await supabase
        .from("planning_details")
        .delete()
        .eq("quote_id", quoteId)
        .neq("machine_types_id", null) // Only delete machine-related records
        .not("machine_types_id", "in", `(${machineIds.join(",")})`);
        
      if (deleteError) throw deleteError;
      
      // For each machine-plan combination, create or update planning details
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
            
          if (checkError) throw checkError;
          
          // Get resources that can train on this machine type for this plan
          const { data: resources, error: resourcesError } = await supabase
            .from("machine_training_requirements")
            .select("resource_id")
            .eq("machine_type_id", machineId)
            .eq("plan_id", plan.plan_id);
            
          if (resourcesError) throw resourcesError;
          
          // If no planning detail exists, create one for each resource or a default one
          if (!existingDetail) {
            if (resources && resources.length > 0) {
              // Create planning details for each resource that can train on this machine
              for (const resource of resources) {
                if (resource.resource_id) {
                  await supabase.from("planning_details").insert({
                    quote_id: quoteId,
                    plan_id: plan.plan_id,
                    machine_types_id: machineId,
                    software_types_id: null,
                    resource_id: resource.resource_id,
                    allocated_hours: hoursRequired,
                    work_on_saturday: false,
                    work_on_sunday: false
                  });
                }
              }
            } else {
              // If no specific resources are assigned, create a default entry
              await supabase.from("planning_details").insert({
                quote_id: quoteId,
                plan_id: plan.plan_id,
                machine_types_id: machineId,
                software_types_id: null,
                resource_id: null,
                allocated_hours: hoursRequired,
                work_on_saturday: false,
                work_on_sunday: false
              });
            }
          } else {
            // If a planning detail already exists, update the hours if they're different
            await supabase
              .from("planning_details")
              .update({
                allocated_hours: hoursRequired,
                updated_at: new Date().toISOString()
              })
              .eq("id", existingDetail.id);
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
