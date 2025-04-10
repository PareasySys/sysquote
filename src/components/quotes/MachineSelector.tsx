
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
    
    // If a machine was removed, clean up its planning_details
    if (quoteId && selectedMachineIds.includes(machineTypeId) && !updatedSelection.includes(machineTypeId)) {
      try {
        console.log("Removing planning details for machine:", machineTypeId);
        
        const { error } = await supabase
          .from("planning_details")
          .delete()
          .eq("quote_id", quoteId)
          .eq("machine_types_id", machineTypeId);
          
        if (error) throw error;
      } catch (err: any) {
        console.error("Error cleaning up planning details:", err);
        toast.error("Failed to clean up planning details");
      }
    } 
    // If a machine was added, create planning_details entries for each plan
    else if (quoteId && !selectedMachineIds.includes(machineTypeId) && updatedSelection.includes(machineTypeId)) {
      try {
        console.log("Adding planning details for machine:", machineTypeId);
        
        // Get training offers for this machine type
        const { data: trainingOffers, error: offersError } = await supabase
          .from("training_offers")
          .select("plan_id, hours_required")
          .eq("machine_type_id", machineTypeId);
          
        if (offersError) throw offersError;
        
        // Create planning details for each plan, using hours from training offers when available
        for (const plan of plans) {
          // Find matching training offer for this plan and machine
          const offer = trainingOffers?.find(o => o.plan_id === plan.plan_id);
          const hoursRequired = offer ? offer.hours_required : 0;
          
          // Get resources that should be assigned to this machine type
          const { data: resources, error: resourcesError } = await supabase
            .from("machine_training_requirements")
            .select("resource_id")
            .eq("machine_type_id", machineTypeId)
            .eq("plan_id", plan.plan_id);
            
          if (resourcesError) throw resourcesError;
          
          // For each resource, create a planning detail
          if (resources && resources.length > 0) {
            for (const resource of resources) {
              if (resource.resource_id) {
                await supabase.rpc(
                  'save_training_plan_detail',
                  {
                    p_quote_id: quoteId,
                    p_plan_id: plan.plan_id,
                    p_resource_category: 'Machine',
                    p_machine_types_id: machineTypeId,
                    p_software_types_id: null,
                    p_resource_id: resource.resource_id,
                    p_allocated_hours: hoursRequired,
                    p_start_day: 1, // Default values
                    p_duration_days: Math.ceil(hoursRequired / 8), // Assuming 8 hours per day
                    p_work_on_saturday: false,
                    p_work_on_sunday: false
                  }
                );
              }
            }
          }
        }
        
        console.log("Created planning details for selected machine");
      } catch (err: any) {
        console.error("Error creating planning details:", err);
        toast.error("Failed to create planning details");
      }
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
