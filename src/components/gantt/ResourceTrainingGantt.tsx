// src/components/gantt/ResourceTrainingGantt.tsx

import React, { useEffect, useState, useCallback } from "react";
import GanttChart from "./GanttChart"; // Adjust path if needed
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { Switch } from "@/components/ui/switch"; // Import Switch
import { Label } from "@/components/ui/label"; // Import Label
import { TrainingPlan } from "@/hooks/useTrainingPlans"; // Assuming this type exists
import { updateWeekendSettings } from "@/services/planningDetailsService";
import { useTrainingRequirements } from "@/hooks/useTrainingRequirements";
import { usePlanningDetailsSync } from "@/services/planningDetailsSync";
import { supabase } from "@/integrations/supabase/client";

interface ResourceTrainingGanttProps {
  quoteId: string | undefined;
  planId: number | null;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  plans: TrainingPlan[]; // Receive plans list
  plansLoading: boolean; // Receive plans loading state
  onPlanChange: (planId: number) => void; // Callback for plan selection
  onWeekendChange: (key: 'workOnSaturday' | 'workOnSunday', value: boolean) => void; // Callback for weekend changes
}

const ResourceTrainingGantt: React.FC<ResourceTrainingGanttProps> = ({
  quoteId,
  planId,
  workOnSaturday,
  workOnSunday,
  plans,          // Use received prop
  plansLoading,   // Use received prop
  onPlanChange,   // Use received prop
  onWeekendChange // Use received prop
}) => {
  const [syncPerformedForPlan, setSyncPerformedForPlan] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { syncSoftwareTrainingHours } = usePlanningDetailsSync();
  const {
    scheduledTasks,
    loading: loadingRequirements,
    error: requirementsError,
    fetchRequirements
  } = useTrainingRequirements(quoteId, planId, workOnSaturday, workOnSunday);

  // --- Sync Software Hours Before Loading Requirements ---
  const performInitialSync = useCallback(async () => {
    if (quoteId && planId && planId !== syncPerformedForPlan && !isSyncing) {
      console.log(`Performing initial software hours sync for plan ${planId}...`);
      setIsSyncing(true);
      try {
        const syncSuccess = await syncSoftwareTrainingHours();
        if (syncSuccess) {
          console.log("Software hours sync complete. Fetching requirements...");
          await fetchRequirements();
          setSyncPerformedForPlan(planId);
        } else {
          console.error("Software hours sync failed.");
        }
      } catch (err) {
        console.error("Error during initial sync or fetch:", err);
      } finally {
        setIsSyncing(false);
      }
    } else if (!quoteId || !planId) {
        setSyncPerformedForPlan(null);
    }
  }, [quoteId, planId, syncSoftwareTrainingHours, fetchRequirements, syncPerformedForPlan, isSyncing]);

  useEffect(() => {
    performInitialSync();
  }, [performInitialSync]);

  // --- Weekend Settings Update (called via prop now) ---
  // This effect might still be useful if backend needs direct update, but UI interaction goes through onWeekendChange
  useEffect(() => {
    if (quoteId && typeof planId === 'number') {
      console.log(`Gantt: Updating weekend settings in backend for quote ${quoteId}, plan ${planId}: Sat=${workOnSaturday}, Sun=${workOnSunday}`);
      updateWeekendSettings(quoteId, planId, workOnSaturday, workOnSunday)
        .catch(err => console.error("Gantt: Failed to update weekend settings in backend:", err));
    }
  }, [quoteId, planId, workOnSaturday, workOnSunday]);


  // --- Display Logic ---
  if (!planId && !plansLoading && plans.length > 0) { // Show message only if plans loaded but none selected (shouldn't happen if default is set)
     return (
      <Card className="p-6 bg-slate-800/80 border border-white/5">
        <div className="text-center text-gray-400">
          Please select a training plan.
        </div>
      </Card>
    );
  }

  const isLoading = loadingRequirements || isSyncing || plansLoading; // Include plansLoading in overall loading state
  const displayError = requirementsError;
  const totalAssignments = scheduledTasks?.length ?? 0;

  return (
    // Main card - height will now be determined by content
    <Card className="bg-slate-800/80 border border-white/5 overflow-hidden"> {/* Added overflow-hidden */}

      {/* Tabs positioned above header */}
      <div className="flex justify-center bg-slate-800/80 pt-4"> {/* Centering container */}
        <Tabs
          value={planId ? planId.toString() : ""}
          onValueChange={(value) => onPlanChange(parseInt(value))} // Use callback prop
        >
          <TabsList className="bg-slate-700/80 rounded-b-none border-b-0"> {/* Removed bottom radius/border */}
            {plansLoading ? (
              <div className="px-4 py-2">
                <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]">
                  Loading Plans...
                </TextShimmerWave>
              </div>
            ) : (
              plans.map((plan) => (
                <TabsTrigger
                  key={plan.plan_id}
                  value={plan.plan_id.toString()}
                  className="data-[state=active]:bg-blue-600"
                >
                  {plan.name}
                </TabsTrigger>
              ))
            )}
          </TabsList>
          {/* No TabsContent needed here as Gantt displays selected plan */}
        </Tabs>
      </div>

      {/* Inner padding for content below tabs */}
      <div className="p-4 pt-2"> {/* Reduced top padding */}
        {/* Header */}
        <div className="mb-4 flex justify-between items-center"> {/* Flex container for title and switches */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200">Resource Training Schedule</h3>
            <div className="text-gray-400 text-sm h-5 flex items-center">
              {isLoading ? (
                 <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]">
                      {isSyncing ? "Syncing hours..." : (loadingRequirements || plansLoading ? "Loading schedule..." : "Loading...")}
                    </TextShimmerWave>
                 </div>
              ) : displayError ? (
                 <span className="text-red-400">Error loading schedule</span>
              ): (
                 `Showing ${totalAssignments} scheduled training segments`
              )}
            </div>
          </div>

          {/* Weekend Switches Moved Here */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="gantt-work-on-saturday" // Ensure unique ID if needed elsewhere
                checked={workOnSaturday}
                onCheckedChange={(checked) => onWeekendChange('workOnSaturday', checked)} // Use callback prop
                disabled={isLoading} // Disable while loading/syncing
              />
              <Label htmlFor="gantt-work-on-saturday" className="text-gray-300 text-sm">Work on Saturday</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="gantt-work-on-sunday" // Ensure unique ID
                checked={workOnSunday}
                onCheckedChange={(checked) => onWeekendChange('workOnSunday', checked)} // Use callback prop
                disabled={isLoading} // Disable while loading/syncing
              />
              <Label htmlFor="gantt-work-on-sunday" className="text-gray-300 text-sm">Work on Sunday</Label>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {displayError && !isLoading && (
          <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-800/30 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        {/* Gantt Chart Area - REMOVED fixed height and overflow */}
        <div className="border border-slate-700 rounded-md bg-slate-900/50">
          <GanttChart
            requirements={isLoading ? [] : (scheduledTasks || [])}
            loading={isLoading}
            error={null}
            workOnSaturday={workOnSaturday}
            workOnSunday={workOnSunday}
            onRetry={fetchRequirements}
          />
        </div>
      </div>
    </Card>
  );
};

export default ResourceTrainingGantt;