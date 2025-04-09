
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
import { Save, Edit2 } from "lucide-react";

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

  const handleCellDoubleClick = (machineId: number, planId: number, currentValue: number) => {
    setEditCells({
      ...editCells,
      [`${machineId}-${planId}`]: currentValue
    });
  };

  const handleInputChange = (machineId: number, planId: number, value: string) => {
    const numericValue = value === '' ? 0 : Number(value);
    if (!isNaN(numericValue)) {
      setEditCells({
        ...editCells,
        [`${machineId}-${planId}`]: numericValue
      });
    }
  };

  const handleSaveCell = async (machineId: number, planId: number) => {
    const key = `${machineId}-${planId}`;
    const hours = editCells[key];
    
    await updateTrainingHours(machineId, planId, hours);
    
    // Remove cell from edit mode
    const newEditCells = { ...editCells };
    delete newEditCells[key];
    setEditCells(newEditCells);
  };

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
    machineId: number,
    planId: number
  ) => {
    if (e.key === 'Enter') {
      handleSaveCell(machineId, planId);
    } else if (e.key === 'Escape') {
      const newEditCells = { ...editCells };
      delete newEditCells[`${machineId}-${planId}`];
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
        <Table className="border-collapse border-slate-700">
          <TableHeader className="bg-slate-800 border-b-2 border-slate-600">
            <TableRow>
              <TableHead className="bg-slate-800 sticky left-0 z-10 border-r-2 border-slate-600 text-gray-300">
                Machine / Training Plan
              </TableHead>
              {plans.map((plan) => (
                <TableHead key={plan.plan_id} className="text-center whitespace-nowrap min-w-[150px] text-gray-300 font-medium border-r border-slate-700">
                  {plan.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {offersMatrix.map((row) => (
              <TableRow key={row.machineId} className="border-b border-slate-700 hover:bg-slate-800/40">
                <TableCell className="bg-slate-800 sticky left-0 z-10 whitespace-nowrap font-medium border-r-2 border-slate-600 text-gray-300">
                  {row.machineName}
                </TableCell>
                {row.plans.map((cell) => {
                  const isEditing = editCells[`${row.machineId}-${cell.planId}`] !== undefined;
                  return (
                    <TableCell 
                      key={`${row.machineId}-${cell.planId}`} 
                      className="text-center relative border-r border-slate-700 py-3"
                      onDoubleClick={() => handleCellDoubleClick(
                        row.machineId, 
                        cell.planId, 
                        cell.hoursRequired
                      )}
                    >
                      {isEditing ? (
                        <div className="flex items-center justify-center">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            className="w-20 text-center p-1 bg-slate-700 border-slate-500 text-white"
                            value={editCells[`${row.machineId}-${cell.planId}`]}
                            onChange={(e) => handleInputChange(
                              row.machineId, 
                              cell.planId, 
                              e.target.value
                            )}
                            onKeyDown={(e) => handleKeyPress(
                              e, 
                              row.machineId, 
                              cell.planId
                            )}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="ml-1 h-7 w-7 hover:bg-emerald-900/50 hover:text-emerald-400"
                            onClick={() => handleSaveCell(row.machineId, cell.planId)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center group">
                          <span className={`px-3 py-1 rounded-md ${
                            cell.hoursRequired > 0 ? 'bg-blue-900/30 text-blue-300 font-medium' : 'text-gray-500'
                          }`}>
                            {cell.hoursRequired}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="ml-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-900/30 hover:text-blue-300"
                            onClick={() => handleCellDoubleClick(
                              row.machineId, 
                              cell.planId, 
                              cell.hoursRequired
                            )}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 text-sm text-gray-400 flex items-center gap-2">
        <Edit2 className="h-4 w-4" /> 
        <span>Double-click on a cell or click the edit icon to modify training hours</span>
      </div>
    </div>
  );
};

export default TrainingOffersTab;
