
// ResourceTrainingGantt.tsx

import React, { useEffect, useState } from "react"; 
import GanttChart from "./GanttChart"; // Adjust path
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { updateWeekendSettings } from "@/services/planningDetailsService"; // Keep this
import { useTrainingRequirements } from "@/hooks/useTrainingRequirements"; // Adjust path
import { syncSoftwareTrainingHoursAndResources } from "@/services/planningDetailsSync";

interface ResourceTrainingGanttProps {
  quoteId: string | undefined;
  planId: number | null;
  workOnSaturday: boolean;
  workOnSunday: boolean;
}

const ResourceTrainingGantt: React.FC<ResourceTrainingGanttProps> = ({
  quoteId,
  planId,
  workOnSaturday,
  workOnSunday
}) => {
  // Track a state to make sure sync is only done once per component mount
  const [hasSynced, setHasSynced] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  const {
    scheduledTasks,
    loading,
    error,
    fetchRequirements
  } = useTrainingRequirements(quoteId, planId, workOnSaturday, workOnSunday);

  // --- Sync Software Hours Before Loading Requirements ---
  useEffect(() => {
    // This ensures we don't get into an endless sync loop
    if (quoteId && planId && !hasSynced && !syncInProgress) {
      // Set both flags to prevent multiple sync attempts
      setHasSynced(true);
      setSyncInProgress(true);
      
      console.log("Starting software training hours sync...");
      
      // Sync software hours and resources before loading requirements
      syncSoftwareTrainingHoursAndResources()
        .then(() => {
          console.log("Software training hours sync completed");
          // After syncing, fetch the requirements
          return fetchRequirements();
        })
        .catch(err => {
          console.error("Error syncing software training hours:", err);
        })
        .finally(() => {
          setSyncInProgress(false);
        });
    }
  }, [quoteId, planId, hasSynced, fetchRequirements, syncInProgress]);
  
  // Reset sync state when planId changes
  useEffect(() => {
    setHasSynced(false);
  }, [planId]);

  // --- Weekend Settings Update ---
  useEffect(() => {
    // Ensure quoteId and planId are valid before attempting update
    if (quoteId && typeof planId === 'number') {
      console.log(`Updating weekend settings for plan ${planId}: Sat=${workOnSaturday}, Sun=${workOnSunday}`);
      // Consider adding error handling for this update if needed
      updateWeekendSettings(quoteId, planId, workOnSaturday, workOnSunday)
        .catch(err => console.error("Failed to update weekend settings:", err));
    }
  }, [quoteId, planId, workOnSaturday, workOnSunday]);


  // --- Display Logic ---
  if (!planId) {
     return (
      <Card className="p-6 bg-slate-800/80 border border-white/5">
        <div className="text-center text-gray-400">
          Please select a training plan to view the resource schedule.
        </div>
      </Card>
    );
  }

  // --- Safely calculate total assignments ---
  // Use optional chaining and nullish coalescing. Default to 0 if scheduledTasks is null/undefined.
  const totalAssignments = scheduledTasks?.length ?? 0;

  return (
    <Card className="p-4 bg-slate-800/80 border border-white/5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Resource Training Schedule</h3>
        <div className="text-gray-400 text-sm">
          {loading && totalAssignments === 0 ? (
            <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]">
              Loading and scheduling...
            </TextShimmerWave>
          ) : (
            `Showing ${totalAssignments} scheduled training segments`
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-800/30 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Ensure parent container provides height */}
      <div className="h-[500px] overflow-hidden">
        <GanttChart
          requirements={scheduledTasks || []}
          loading={loading && totalAssignments === 0}
          error={null} // Error is handled above
          workOnSaturday={workOnSaturday}
          workOnSunday={workOnSunday}
          onRetry={fetchRequirements}
        />
      </div>
    </Card>
  );
};

export default ResourceTrainingGantt;
