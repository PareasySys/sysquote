import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import MachineTypeCard from "@/components/machines/MachineTypeCard";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
// Removed import for syncMachinePlanningDetails and useTrainingPlans / toast

interface MachineSelectorProps {
  selectedMachineIds: number[];
  onSave: (selectedMachines: number[]) => void; // Keep onSave to report changes up
  quoteId?: string; // Keep quoteId if needed for other purposes, but not for sync here
}

const MachineSelector: React.FC<MachineSelectorProps> = ({
  selectedMachineIds,
  onSave,
  quoteId // Keep quoteId prop if needed elsewhere
}) => {
  const { machines, loading, error } = useMachineTypes();
  // Removed isSyncing state and useTrainingPlans

  // Function to handle machine selection changes
  const toggleMachineSelection = (machineTypeId: number) => {
    // Create a new selection array
    const updatedSelection = selectedMachineIds.includes(machineTypeId)
      ? selectedMachineIds.filter(id => id !== machineTypeId)
      : [...selectedMachineIds, machineTypeId];

    // Report the change up to the parent (QuoteConfigPage) via onSave
    onSave(updatedSelection);

    // DO NOT sync planning details here. Syncing will happen after the parent saves.
  };

  // Removed the useEffect that was triggering initial sync

  const isSelected = (machineTypeId: number) => selectedMachineIds.includes(machineTypeId);

  return (
    <div className="w-full">
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Machine Selection</h2>

        {loading ? (
          <div className="p-4 text-center">
            <TextShimmerWave
              className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
            >
              Loading Machine Types
            </TextShimmerWave>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
            <p className="text-red-300">{error}</p>
          </div>
        ) : machines.length === 0 ? (
            <div className="p-4 text-center text-slate-400">No machine types available.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {machines.map((machine) => (
              <div
                key={machine.machine_type_id}
                className="relative cursor-pointer" // Added cursor-pointer
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