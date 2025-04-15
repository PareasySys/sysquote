
import React, { useState } from "react";
import { useTrainingOffers } from "@/hooks/useTrainingOffers";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import { useSoftwareTypes } from "@/hooks/useSoftwareTypes";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync";
import { Loader2 } from "lucide-react";

const TrainingOffersTab = () => {
  const {
    offersMatrix,
    softwareOffersMatrix,
    loading: loadingOffers,
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

  const { syncTrainingOfferChanges } = usePlanningDetailsSync();

  // State to track which cell is being edited { 'type-itemId-planId': currentValue }
  const [editCells, setEditCells] = useState<Record<string, number | null>>({});
  // State to track which cell is currently saving
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("machines");

  const isLoading = loadingOffers || loadingMachines || loadingSoftware || loadingPlans;

  if (isLoading) {
    return (
        <div className="p-4 flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg" duration={1.5}>
            Loading Training Offers Data...
          </TextShimmerWave>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
          <p className="text-red-300">Error loading data: {error}</p>
          <Button onClick={() => fetchOffers()} variant="outline" className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50">
            Try Again
          </Button>
        </div>
    );
  }

  // Helper to generate unique key for editing state
  const getEditKey = (itemId: number, planId: number, isForSoftware: boolean = false): string => {
    return `${isForSoftware ? 'software' : 'machine'}-${itemId}-${planId}`;
  };

  const handleCellDoubleClick = (itemId: number, planId: number, currentValue: number, isForSoftware: boolean = false) => {
    const key = getEditKey(itemId, planId, isForSoftware);
    setEditCells({ [key]: currentValue });
  };

  const handleInputChange = (key: string, value: string) => {
    // Allow empty input temporarily, treat as 0 on save
    const numericValue = value === '' ? null : Number(value);
    if (!isNaN(numericValue ?? 0)) {
      setEditCells(prev => ({
        ...prev,
        [key]: numericValue
      }));
    }
  };

  const handleSaveCell = async (key: string) => {
    const [type, itemIdStr, planIdStr] = key.split('-');
    const itemId = parseInt(itemIdStr, 10);
    const planId = parseInt(planIdStr, 10);
    const isForSoftware = type === 'software';
    const hours = editCells[key] ?? 0;

    if (isNaN(itemId) || isNaN(planId)) {
        console.error("Invalid key for saving:", key);
        toast.error("An error occurred while saving.");
        return;
    }

    setSavingCells(prev => ({ ...prev, [key]: true }));

    try {
      let success = false;
      if (isForSoftware) {
        success = await updateSoftwareTrainingHours(itemId, planId, hours);
      } else {
        success = await updateTrainingHours(itemId, planId, hours);
      }

      if (success) {
        // After successful save, sync planning details
        await syncTrainingOfferChanges();

        // Clear editing and saving state for this cell
        setEditCells(prev => {
            const newState = { ...prev };
            delete newState[key];
            return newState;
        });
        toast.success("Hours updated successfully.");
      } else {
         toast.error("Failed to save training hours.");
      }
    } catch (err: any) {
      console.error("Error saving cell:", err);
      toast.error(`Failed to save: ${err.message || "Unknown error"}`);
    } finally {
      setSavingCells(prev => {
         const newState = { ...prev };
         delete newState[key];
         return newState;
      });
    }
  };

  // Cancel editing
  const handleCancelEdit = (key: string) => {
      setEditCells(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCell(key);
    } else if (e.key === 'Escape') {
      handleCancelEdit(key);
    }
  };

  // --- Render Logic ---

  const renderMatrix = (matrixData: typeof offersMatrix | typeof softwareOffersMatrix, isForSoftware: boolean) => {
    const items = isForSoftware ? software : machines;

    if (items.length === 0) {
      return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
          <p className="text-slate-400">
            No {isForSoftware ? 'software' : 'machine'} types found. Add them in the corresponding settings tab.
          </p>
        </div>
      );
    }
    if (plans.length === 0) {
      return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
          <p className="text-slate-400">
            No training plans found. Add them in the Training Plans tab.
          </p>
        </div>
      );
    }

    // Find the corresponding data row from the matrix hook
    const findMatrixRow = (itemId: number) => {
        return matrixData.find(row => row.itemId === itemId);
    };


    return (
      <div className="overflow-x-auto relative border border-slate-700 rounded-md">
        <Table className="min-w-full border-collapse">
          {/* Table Header */}
          <TableHeader className="bg-slate-800 sticky top-0 z-20">
            <TableRow>
              <TableHead className="sticky left-0 z-30 bg-slate-800 border-r border-slate-600 text-gray-300 px-4 py-3 whitespace-nowrap min-w-[200px]">
                {isForSoftware ? "Software Type" : "Machine Type"}
              </TableHead>
              {plans.map(plan => (
                <TableHead key={plan.plan_id} className="text-center whitespace-nowrap min-w-[120px] text-gray-300 font-medium border-l border-slate-700 px-3 py-3">
                  {plan.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody>
            {items.map(item => {
               const itemId = isForSoftware ? (item as any).software_type_id : (item as any).machine_type_id;
               const itemName = item.name;
               const matrixRow = findMatrixRow(itemId);

               return (
                 <TableRow key={`${isForSoftware ? 'sw' : 'mc'}-${itemId}`} className="border-b border-slate-700 hover:bg-slate-800/40 group">
                    {/* Sticky Item Name Cell */}
                    <TableCell className="sticky left-0 z-10 bg-slate-850 group-hover:bg-slate-800 border-r border-slate-600 whitespace-nowrap font-medium text-gray-300 px-4 py-2">
                      {itemName}
                    </TableCell>

                    {/* Plan Hour Cells */}
                    {plans.map(plan => {
                      const cellData = matrixRow?.plans.find(p => p.planId === plan.plan_id);
                      const hoursRequired = cellData?.hoursRequired ?? 0;
                      const key = getEditKey(itemId, plan.plan_id, isForSoftware);
                      const isEditing = editCells[key] !== undefined;
                      const isSaving = savingCells[key];

                      return (
                        <TableCell
                          key={key}
                          className="text-center relative border-l border-slate-700 px-2 py-1 h-14"
                          onDoubleClick={() => !isSaving && handleCellDoubleClick(itemId, plan.plan_id, hoursRequired, isForSoftware)}
                        >
                          {isEditing ? (
                            <div className="flex items-center justify-center h-full">
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                className="w-20 text-center p-1 bg-slate-700 border-blue-500 text-white focus:ring-blue-500 focus:ring-1"
                                value={editCells[key] ?? ''}
                                onChange={e => handleInputChange(key, e.target.value)}
                                onKeyDown={e => handleKeyDown(e, key)}
                                autoFocus
                                onFocus={e => e.target.select()}
                                onBlur={() => handleSaveCell(key)}
                                disabled={isSaving}
                              />
                               {isSaving && <Loader2 className="absolute top-1/2 right-2 transform -translate-y-1/2 h-4 w-4 animate-spin text-blue-400" />}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full px-3 py-1 rounded-md cursor-pointer hover:bg-slate-700/50 transition-colors" title="Double-click to edit">
                               {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                                ) : (
                                     <span className={`${hoursRequired > 0 ? 'bg-blue-900/60 text-blue-300 font-medium px-2 py-0.5 rounded' : 'text-gray-500'} text-sm`}>
                                        {hoursRequired}h
                                     </span>
                                )}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                 </TableRow>
               );
             })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-100">Training Offers</h2>
        <p className="text-sm text-gray-400 mt-1">
          Configure required training hours (h) for each item per training plan. Double-click a cell to edit.
        </p>
      </div>

      {/* Tabs for Machine/Software */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-slate-800 border border-slate-700 p-1">
          <TabsTrigger value="machines" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white px-4 py-1.5">Machine Types</TabsTrigger>
          <TabsTrigger value="software" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white px-4 py-1.5">Software Types</TabsTrigger>
        </TabsList>

        <TabsContent value="machines" className="w-full focus:outline-none">
          {renderMatrix(offersMatrix, false)}
        </TabsContent>

        <TabsContent value="software" className="w-full focus:outline-none">
          {renderMatrix(softwareOffersMatrix, true)}
        </TabsContent>
      </Tabs>

      {/* Instructions */}
      <div className="text-xs text-gray-500">
        <span>Double-click cell to edit. Press Enter or click outside to save. Press Escape to cancel.</span>
      </div>
    </div>
  );
};

export default TrainingOffersTab;
