
import React, { useState, useEffect } from "react";
import { useTrainingOffers } from "@/hooks/useTrainingOffers";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import { useSoftwareTypes } from "@/hooks/useSoftwareTypes";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TrainingOffersTab = () => {
  const {
    offersMatrix,
    softwareOffersMatrix,
    loading,
    error,
    fetchOffers,
    updateTrainingHours,
    updateSoftwareTrainingHours
  } = useTrainingOffers();
  const {
    machines,
    loading: loadingMachines
  } = useMachineTypes();
  const {
    software,
    loading: loadingSoftware
  } = useSoftwareTypes();
  const {
    plans,
    loading: loadingPlans
  } = useTrainingPlans();
  const [editCells, setEditCells] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>("machines");

  if (loading || loadingMachines || loadingSoftware || loadingPlans) {
    return <div className="p-4">
        <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg" duration={1} spread={1} zDistance={1} scaleDistance={1.1} rotateYDistance={10}>
          Loading Training Offers
        </TextShimmerWave>
      </div>;
  }

  if (error) {
    return <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
        <p className="text-red-300">{error}</p>
        <Button onClick={() => fetchOffers()} variant="outline" className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50">
          Try Again
        </Button>
      </div>;
  }

  const handleCellDoubleClick = (itemId: number, planId: number, currentValue: number, isForSoftware: boolean = false) => {
    const key = `${isForSoftware ? 'software' : 'machine'}-${itemId}-${planId}`;
    setEditCells({
      ...editCells,
      [key]: currentValue
    });
  };

  const handleInputChange = (itemId: number, planId: number, value: string, isForSoftware: boolean = false) => {
    const key = `${isForSoftware ? 'software' : 'machine'}-${itemId}-${planId}`;
    const numericValue = value === '' ? 0 : Number(value);
    if (!isNaN(numericValue)) {
      setEditCells({
        ...editCells,
        [key]: numericValue
      });
    }
  };

  const handleSaveCell = async (itemId: number, planId: number, isForSoftware: boolean = false) => {
    const key = `${isForSoftware ? 'software' : 'machine'}-${itemId}-${planId}`;
    const hours = editCells[key];
    
    if (isForSoftware) {
      await updateSoftwareTrainingHours(itemId, planId, hours);
    } else {
      await updateTrainingHours(itemId, planId, hours);
    }

    // Remove cell from edit mode
    const newEditCells = {
      ...editCells
    };
    delete newEditCells[key];
    setEditCells(newEditCells);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, itemId: number, planId: number, isForSoftware: boolean = false) => {
    if (e.key === 'Enter') {
      handleSaveCell(itemId, planId, isForSoftware);
    } else if (e.key === 'Escape') {
      const key = `${isForSoftware ? 'software' : 'machine'}-${itemId}-${planId}`;
      const newEditCells = {
        ...editCells
      };
      delete newEditCells[key];
      setEditCells(newEditCells);
    }
  };

  const renderMatrix = (matrix: any[], isForSoftware: boolean = false) => {
    if (matrix.length === 0) {
      return (
        <div className="bg-amber-900/30 border border-amber-700/30 rounded-lg p-4 text-center">
          <p className="text-amber-200">
            No {isForSoftware ? 'software' : 'machine'} types available.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table className="border-collapse border-slate-700">
          <TableHeader className="bg-slate-800 border-b-2 border-slate-600">
            <TableRow>
              <TableHead className="bg-slate-800 sticky left-0 z-10 border-r-2 border-slate-600 text-gray-300">
                {isForSoftware ? "Software" : "Machine"} / Training Plan Hours
              </TableHead>
              {plans.map(plan => <TableHead key={plan.plan_id} className="text-center whitespace-nowrap min-w-[150px] text-gray-300 font-medium border-r border-slate-700">
                  {plan.name}
                </TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.map(row => <TableRow key={`${isForSoftware ? 'software' : 'machine'}-${row.itemId}`} className="border-b border-slate-700 hover:bg-slate-800/40">
                <TableCell className="bg-slate-800 sticky left-0 z-10 whitespace-nowrap font-medium border-r-2 border-slate-600 text-gray-300">
                  {row.itemName}
                </TableCell>
                {row.plans.map(cell => {
                  const key = `${isForSoftware ? 'software' : 'machine'}-${row.itemId}-${cell.planId}`;
                  const isEditing = editCells[key] !== undefined;
                  return <TableCell key={key} className="text-center relative border-r border-slate-700 py-3" onDoubleClick={() => handleCellDoubleClick(row.itemId, cell.planId, cell.hoursRequired, isForSoftware)}>
                      {isEditing ? <div className="flex items-center justify-center">
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.5" 
                            className="w-20 text-center p-1 bg-slate-700 border-slate-500 text-white overflow-hidden" 
                            value={editCells[key]} 
                            onChange={e => handleInputChange(row.itemId, cell.planId, e.target.value, isForSoftware)} 
                            onKeyDown={e => handleKeyPress(e, row.itemId, cell.planId, isForSoftware)} 
                            autoFocus 
                            onFocus={e => e.target.select()}
                            style={{ overflow: 'hidden' }}
                          />
                        </div> : <div className="px-3 py-1 rounded-md cursor-pointer hover:bg-slate-700/50 transition-colors" title="Double-click to edit">
                          <span className={cell.hoursRequired > 0 ? 'bg-blue-900/30 text-blue-300 font-medium px-3 py-1 rounded-md' : 'text-gray-500'}>
                            {cell.hoursRequired}
                          </span>
                        </div>}
                    </TableCell>;
                })}
              </TableRow>)}
          </TableBody>
        </Table>
      </div>
    );
  };

  if ((machines.length === 0 && software.length === 0) || plans.length === 0) {
    return <div className="p-6">
        <div className="bg-amber-900/30 border border-amber-700/30 rounded-lg p-4 text-center">
          <p className="text-amber-200">
            {machines.length === 0 && software.length === 0 && plans.length === 0 && "Both machine/software types and training plans need to be added before configuring training offers."}
            {machines.length === 0 && software.length === 0 && plans.length > 0 && "Machine or software types need to be added before configuring training offers."}
            {(machines.length > 0 || software.length > 0) && plans.length === 0 && "Training plans need to be added before configuring training offers."}
          </p>
        </div>
      </div>;
  }

  return <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Training Offers</h2>
        <p className="text-sm text-gray-400 mt-1">Configure required training hours for each machine/software type per training plan</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="machines">Machine Types</TabsTrigger>
          <TabsTrigger value="software">Software Types</TabsTrigger>
        </TabsList>
        
        <TabsContent value="machines" className="w-full">
          {renderMatrix(offersMatrix)}
        </TabsContent>
        
        <TabsContent value="software" className="w-full">
          {renderMatrix(softwareOffersMatrix, true)}
        </TabsContent>
      </Tabs>

      <div className="mt-4 text-sm text-gray-400">
        <span>Double-click on a cell to edit, press Enter to save, or Escape to cancel</span>
      </div>
    </div>;
};

export default TrainingOffersTab;
