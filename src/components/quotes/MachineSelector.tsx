
import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import MachineTypeCard from "@/components/machines/MachineTypeCard";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { syncMachinePlanningDetails } from "@/services/planningDetailsService";

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

  // Function to handle machine selection changes
  const toggleMachineSelection = async (machineTypeId: number) => {
    const updatedSelection = selectedMachineIds.includes(machineTypeId)
      ? selectedMachineIds.filter(id => id !== machineTypeId)
      : [...selectedMachineIds, machineTypeId];
    
    // Auto-save machine selection
    onSave(updatedSelection);
    
    // Sync planning details with our service if we have a quote ID
    if (quoteId) {
      await syncMachinePlanningDetails(quoteId, updatedSelection, plans);
    }
  };

  // Initial setup of planning details when component mounts
  useEffect(() => {
    if (quoteId && selectedMachineIds.length > 0 && plans.length > 0) {
      syncMachinePlanningDetails(quoteId, selectedMachineIds, plans);
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
