
import React, { useState } from "react";
import { useMachineTypes, MachineType } from "@/hooks/useMachineTypes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Plus } from "lucide-react";

const MachineTypesTab = () => {
  const { machines, loading, error, fetchMachines } = useMachineTypes();

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
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Machine Types</h2>
        <Button className="bg-blue-700 hover:bg-blue-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add New Machine Type
        </Button>
      </div>

      {machines.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 mb-6">No machine types available. Add your first one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((machine) => (
            <Card key={machine.machine_type_id} className="p-4 bg-slate-800/80 border border-white/5">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-200">{machine.name}</h3>
                <div className={`px-2 py-1 rounded text-xs ${machine.is_active ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                  {machine.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <p className="text-gray-400 text-sm my-2">{machine.description || 'No description available'}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MachineTypesTab;
