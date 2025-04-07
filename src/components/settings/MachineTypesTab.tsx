
import React, { useState } from "react";
import { useMachineTypes, MachineType } from "@/hooks/useMachineTypes";
import { Button } from "@/components/ui/button";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import MachineTypeCard from "@/components/machines/MachineTypeCard";
import MachineTypeModal from "@/components/machines/MachineTypeModal";

const MachineTypesTab = () => {
  const { machines, loading, error, fetchMachines } = useMachineTypes();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineType | null>(null);

  const handleAddNew = () => {
    setSelectedMachine(null);
    setIsModalOpen(true);
  };

  const handleEdit = (machine: MachineType) => {
    setSelectedMachine(machine);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMachine(null);
  };

  const handleSave = () => {
    fetchMachines();
  };

  if (loading) {
    return (
      <div className="p-4">
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
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
        <p className="text-red-300">{error}</p>
        <Button 
          onClick={() => fetchMachines()} 
          variant="outline" 
          className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Machine Types</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {/* Add New Card */}
        <MachineTypeCard isAddCard onAddNew={handleAddNew} />
        
        {/* Machine Type Cards */}
        {machines.map((machine) => (
          <MachineTypeCard 
            key={machine.machine_type_id} 
            machine={machine} 
            onEdit={() => handleEdit(machine)}
          />
        ))}
      </div>

      {/* Modal for adding/editing machine types */}
      <MachineTypeModal
        open={isModalOpen}
        onClose={handleCloseModal}
        machine={selectedMachine}
        onSave={handleSave}
      />
    </div>
  );
};

export default MachineTypesTab;
