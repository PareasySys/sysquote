// TrainingOffersTab.tsx
import React, { useState } from "react";
import { DataGrid, GridColDef, GridValueGetterParams } from "@mui/x-data-grid";
import { useTrainingOffers } from "@/hooks/useTrainingOffers";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import { useSoftwareTypes } from "@/hooks/useSoftwareTypes";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
// Import the dataSyncService instead of syncPlanningDetailsAfterChanges
import { dataSyncService } from "@/services/planningDetailsSync";

const TrainingOffersTab = () => {
  const {
    offersMatrix,
    softwareOffersMatrix,
    loading,
    error,
    updateTrainingHours,
    updateSoftwareTrainingHours
  } = useTrainingOffers();
  const { machines, loading: loadingMachines } = useMachineTypes();
  const { software, loading: loadingSoftware } = useSoftwareTypes();
  const { plans, loading: loadingPlans } = useTrainingPlans();
  const [localOffersMatrix, setLocalOffersMatrix] = useState(offersMatrix);
  const [localSoftwareOffersMatrix, setLocalSoftwareOffersMatrix] = useState(softwareOffersMatrix);

  useEffect(() => {
    setLocalOffersMatrix(offersMatrix);
  }, [offersMatrix]);

  useEffect(() => {
    setLocalSoftwareOffersMatrix(softwareOffersMatrix);
  }, [softwareOffersMatrix]);

  const handleHoursChange = async (
    itemId: number,
    planId: number,
    hours: number,
    isSoftware: boolean = false
  ) => {
    if (isSoftware) {
      const success = await updateSoftwareTrainingHours(itemId, planId, hours);
      if (success) {
        setLocalSoftwareOffersMatrix(prevMatrix =>
          prevMatrix.map(softwareRow =>
            softwareRow.itemId === itemId
              ? {
                  ...softwareRow,
                  plans: softwareRow.plans.map(plan =>
                    plan.planId === planId ? { ...plan, hoursRequired: hours } : plan
                  ),
                }
              : softwareRow
          )
        );
      }
    } else {
      const success = await updateTrainingHours(itemId, planId, hours);
      if (success) {
        setLocalOffersMatrix(prevMatrix =>
          prevMatrix.map(machineRow =>
            machineRow.itemId === itemId
              ? {
                  ...machineRow,
                  plans: machineRow.plans.map(plan =>
                    plan.planId === planId ? { ...plan, hoursRequired: hours } : plan
                  ),
                }
              : machineRow
          )
        );
      }
    }
  };

  if (loadingMachines || loadingSoftware || loadingPlans) {
    return (
      <Card className="col-span-2 bg-slate-800/80 border border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-200">Training Hour Offers</CardTitle>
          <CardDescription className="text-gray-400">Loading machine types, software types and training plans...</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-white">Loading...</Label>
            <Skeleton className="h-10 w-[200px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-2 bg-red-900/30 border border-red-800/30 text-red-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Error</CardTitle>
          <CardDescription>Failed to load training hour offers.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="col-span-2 bg-slate-800/80 border border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-200">Machine Training Hour Offers</CardTitle>
          <CardDescription className="text-gray-400">Set the default training hours required for each machine type and training plan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {localOffersMatrix.length === 0 ? (
            <p className="text-gray-500">No machines or training plans available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localOffersMatrix.map((machineRow) => (
                <div key={machineRow.itemId} className="border border-white/10 rounded-md p-4">
                  <h3 className="text-md font-semibold text-gray-200 mb-2">{machineRow.itemName}</h3>
                  {machineRow.plans.map((plan) => (
                    <div key={plan.planId} className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
                      <span className="text-sm text-gray-300">{plan.planName}</span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          defaultValue={plan.hoursRequired}
                          onChange={(e) => {
                            const hours = Number(e.target.value);
                            handleHoursChange(machineRow.itemId, plan.planId, hours);
                          }}
                          className="w-20 text-sm bg-slate-700 border-slate-600 text-gray-100"
                        />
                        <span className="text-sm text-gray-300">hours</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-2 bg-slate-800/80 border border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-200">Software Training Hour Offers</CardTitle>
          <CardDescription className="text-gray-400">Set the default training hours required for each software type and training plan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {localSoftwareOffersMatrix.length === 0 ? (
            <p className="text-gray-500">No software or training plans available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localSoftwareOffersMatrix.map((softwareRow) => (
                <div key={softwareRow.itemId} className="border border-white/10 rounded-md p-4">
                  <h3 className="text-md font-semibold text-gray-200 mb-2">{softwareRow.itemName}</h3>
                  {softwareRow.plans.map((plan) => (
                    <div key={plan.planId} className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
                      <span className="text-sm text-gray-300">{plan.planName}</span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          defaultValue={plan.hoursRequired}
                          onChange={(e) => {
                            const hours = Number(e.target.value);
                            handleHoursChange(softwareRow.itemId, plan.planId, hours, true);
                          }}
                          className="w-20 text-sm bg-slate-700 border-slate-600 text-gray-100"
                        />
                        <span className="text-sm text-gray-300">hours</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default TrainingOffersTab;
