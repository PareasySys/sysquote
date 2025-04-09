
import React, { useState, useEffect } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMachineTypes, MachineType } from "@/hooks/useMachineTypes";
import MachineTypeCard from "@/components/machines/MachineTypeCard";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Plus, Check } from "lucide-react";

interface MachineSelectorProps {
  selectedMachineIds: number[];
  onSave: (selectedMachines: number[]) => void;
}

const MachineSelector: React.FC<MachineSelectorProps> = ({ 
  selectedMachineIds,
  onSave
}) => {
  const [open, setOpen] = useState(false);
  const { machines, loading, error } = useMachineTypes();
  const [selection, setSelection] = useState<number[]>([]);

  useEffect(() => {
    // Initialize with current selection when dialog opens
    if (open) {
      setSelection([...selectedMachineIds]);
    }
  }, [open, selectedMachineIds]);

  const toggleMachineSelection = (machineTypeId: number) => {
    setSelection(prev => {
      if (prev.includes(machineTypeId)) {
        return prev.filter(id => id !== machineTypeId);
      } else {
        return [...prev, machineTypeId];
      }
    });
  };

  const handleSave = () => {
    onSave(selection);
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const isSelected = (machineTypeId: number) => selection.includes(machineTypeId);

  return (
    <>
      <div 
        className="w-full cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <div className="aspect-[3/4] w-full">
          <div className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-slate-700/70 to-slate-900/70 border-dashed border-slate-600/50 flex flex-col items-center justify-center h-full w-full rounded-lg">
            <div className="p-4 text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-slate-700/80 flex items-center justify-center mb-3">
                <Plus className="h-6 w-6 text-gray-300" />
              </div>
              <h3 className="text-sm font-medium text-gray-200 mb-1">Select Machines</h3>
              <p className="text-gray-400 text-xs">Add machines to this quote</p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-800 border-gray-700 text-gray-200 max-w-[90vw] w-[1200px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-100">Select Machine Types</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto py-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-1">
                {machines.map((machine) => (
                  <div 
                    key={machine.machine_type_id}
                    className="relative"
                    onClick={() => toggleMachineSelection(machine.machine_type_id)}
                  >
                    <MachineTypeCard 
                      machine={machine} 
                      isSelected={isSelected(machine.machine_type_id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="border-gray-600 hover:bg-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-blue-700 hover:bg-blue-800 text-white"
              disabled={loading}
            >
              Save Selection ({selection.length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MachineSelector;
