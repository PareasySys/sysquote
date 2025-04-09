
import React, { useState } from "react";
import { useTrainingOffers } from "@/hooks/useTrainingOffers";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Button } from "@/components/ui/button";
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";

const TrainingOffersTab = () => {
  const { offersMatrix, loading, error, fetchOffers, updateTrainingHours } = useTrainingOffers();
  const { machines, loading: loadingMachines } = useMachineTypes();
  const { plans, loading: loadingPlans } = useTrainingPlans();
  const [editCells, setEditCells] = useState<Record<string, number>>({});

  if (loading || loadingMachines || loadingPlans) {
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
          Loading Training Offers
        </TextShimmerWave>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
        <p className="text-red-300">{error}</p>
        <Button 
          onClick={() => fetchOffers()} 
          variant="outline" 
          className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50"
        >
          Try Again
        </Button>
      </div>
    );
  }

  const handleCellDoubleClick = (planId: number, machineId: number, currentValue: number) => {
    setEditCells({
      ...editCells,
      [`${planId}-${machineId}`]: currentValue
    });
  };

  const handleInputChange = (planId: number, machineId: number, value: string) => {
    const numericValue = value === '' ? 0 : Number(value);
    if (!isNaN(numericValue)) {
      setEditCells({
        ...editCells,
        [`${planId}-${machineId}`]: numericValue
      });
    }
  };

  const handleSaveCell = async (planId: number, machineId: number) => {
    const key = `${planId}-${machineId}`;
    const hours = editCells[key];
    
    await updateTrainingHours(machineId, planId, hours);
    
    // Remove cell from edit mode
    const newEditCells = { ...editCells };
    delete newEditCells[key];
    setEditCells(newEditCells);
  };

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
    planId: number,
    machineId: number
  ) => {
    if (e.key === 'Enter') {
      handleSaveCell(planId, machineId);
    } else if (e.key === 'Escape') {
      const newEditCells = { ...editCells };
      delete newEditCells[`${planId}-${machineId}`];
      setEditCells(newEditCells);
    }
  };

  if (machines.length === 0 || plans.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-amber-900/30 border border-amber-700/30 rounded-lg p-4 text-center">
          <p className="text-amber-200">
            {machines.length === 0 && plans.length === 0 && "Both machine types and training plans need to be added before configuring training offers."}
            {machines.length === 0 && plans.length > 0 && "Machine types need to be added before configuring training offers."}
            {machines.length > 0 && plans.length === 0 && "Training plans need to be added before configuring training offers."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Training Offers</h2>
        <p className="text-sm text-gray-400 mt-1">Configure required training hours for each machine type per training plan</p>
      </div>

      <div className="overflow-x-auto">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow>
              <TableHead className="bg-slate-800 sticky left-0 z-10">Training Plan / Machine</TableHead>
              {machines.map((machine) => (
                <TableHead key={machine.machine_type_id} className="text-center whitespace-nowrap min-w-[150px]">
                  {machine.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {offersMatrix.map((row) => (
              <TableRow key={row.planId}>
                <TableCell className="bg-slate-800 sticky left-0 z-10 whitespace-nowrap font-medium">
                  {row.planName}
                </TableCell>
                {row.machines.map((cell) => {
                  const isEditing = editCells[`${row.planId}-${cell.machineId}`] !== undefined;
                  return (
                    <TableCell 
                      key={`${row.planId}-${cell.machineId}`} 
                      className="text-center relative"
                      onDoubleClick={() => handleCellDoubleClick(
                        row.planId, 
                        cell.machineId, 
                        cell.hoursRequired
                      )}
                    >
                      {isEditing ? (
                        <div className="flex items-center justify-center">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            className="w-20 text-center p-1 bg-slate-700 border-slate-500"
                            value={editCells[`${row.planId}-${cell.machineId}`]}
                            onChange={(e) => handleInputChange(
                              row.planId, 
                              cell.machineId, 
                              e.target.value
                            )}
                            onKeyDown={(e) => handleKeyPress(
                              e, 
                              row.planId, 
                              cell.machineId
                            )}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="ml-1 h-7 w-7"
                            onClick={() => handleSaveCell(row.planId, cell.machineId)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="cursor-pointer hover:text-blue-300">
                          {cell.hoursRequired}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 text-sm text-gray-400">
        <p>Double-click on a cell to edit training hours</p>
      </div>
    </div>
  );
};

export default TrainingOffersTab;
