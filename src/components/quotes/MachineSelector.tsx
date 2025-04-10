
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

  const toggleMachineSelection = async (machineTypeId: number) => {
    const updatedSelection = selectedMachineIds.includes(machineTypeId)
      ? selectedMachineIds.filter(id => id !== machineTypeId)
      : [...selectedMachineIds, machineTypeId];
    
    // Auto-save machine selection
    onSave(updatedSelection);
    
    if (!quoteId) return;

    try {
      if (selectedMachineIds.includes(machineTypeId) && !updatedSelection.includes(machineTypeId)) {
        // Machine was removed - delete all planning details for this machine
        console.log("Removing planning details for machine:", machineTypeId);
        
        const { error } = await supabase
          .from("planning_details")
          .delete()
          .eq("quote_id", quoteId)
          .eq("machine_types_id", machineTypeId);
          
        if (error) throw error;
        toast.success("Planning details for machine removed");
      } 
      else if (!selectedMachineIds.includes(machineTypeId) && updatedSelection.includes(machineTypeId)) {
        // Machine was added - create planning details for all training plans
        console.log("Adding planning details for machine:", machineTypeId);
        
        // Get all training offers for this machine type to get the hours_required
        const { data: trainingOffers, error: offersError } = await supabase
          .from("training_offers")
          .select("plan_id, hours_required")
          .eq("machine_type_id", machineTypeId);
          
        if (offersError) throw offersError;
        
        // Process each training plan
        for (const plan of plans) {
          // Find matching training offer for this plan and machine
          const offer = trainingOffers?.find(o => o.plan_id === plan.plan_id);
          const hoursRequired = offer ? offer.hours_required : 0;
          
          // Get resources that can train on this machine type for this plan
          const { data: requirements, error: requirementsError } = await supabase
            .from("machine_training_requirements")
            .select("resource_id")
            .eq("machine_type_id", machineTypeId)
            .eq("plan_id", plan.plan_id);
            
          if (requirementsError) throw requirementsError;
          
          // For each resource that can train on this machine, create a planning detail
          if (requirements && requirements.length > 0) {
            for (const requirement of requirements) {
              if (requirement.resource_id) {
                // Insert planning detail for this resource and machine
                await supabase.from("planning_details").insert({
                  quote_id: quoteId,
                  plan_id: plan.plan_id,
                  machine_types_id: machineTypeId,
                  software_types_id: null,
                  resource_id: requirement.resource_id,
                  allocated_hours: hoursRequired,
                  work_on_saturday: false,
                  work_on_sunday: false
                });
              }
            }
            console.log(`Created planning details for machine ${machineTypeId} with plan ${plan.plan_id}`);
          } else {
            // If no specific resources are assigned for training this machine,
            // create a default entry with no resource assigned
            await supabase.from("planning_details").insert({
              quote_id: quoteId,
              plan_id: plan.plan_id,
              machine_types_id: machineTypeId,
              software_types_id: null,
              resource_id: null,
              allocated_hours: hoursRequired,
              work_on_saturday: false,
              work_on_sunday: false
            });
            console.log(`Created default planning detail for machine ${machineTypeId} with plan ${plan.plan_id}`);
          }
        }
        
        toast.success("Planning details for machine created");
      }
    } catch (err: any) {
      console.error("Error managing planning details:", err);
      toast.error("Failed to update planning details");
    }
  };

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
