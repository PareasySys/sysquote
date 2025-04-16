

import React, { useEffect, useState, useCallback } from "react";
import GanttChart from "./GanttChart"; // Adjust path if needed
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react"; // Added Loader2
import { updateWeekendSettings } from "@/services/planningDetailsService"; // Keep this
import { useTrainingRequirements } from "@/hooks/useTrainingRequirements"; // Adjust path if needed
import { usePlanningDetailsSync } from "@/services/planningDetailsSync"; // Import the hook
import { supabase } from "@/integrations/supabase/client"; // Fixed import

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
  // State to track initial sync per planId change
  const [syncPerformedForPlan, setSyncPerformedForPlan] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get the specific sync function needed
  const { syncSoftwareTrainingHours } = usePlanningDetailsSync();

  // Use the requirements hook
  const {
    scheduledTasks,
    loading: loadingRequirements,
    error: requirementsError,
    fetchRequirements // Get fetch function to call after sync
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
          await fetchRequirements(); // Re-fetch requirements AFTER sync
          setSyncPerformedForPlan(planId); // Mark sync as done for this plan
        } else {
          console.error("Software hours sync failed.");
          // Handle sync failure if needed (e.g., show an error)
        }
      } catch (err) {
        console.error("Error during initial sync or fetch:", err);
        // Handle error
      } finally {
        setIsSyncing(false);
      }
    } else if (!quoteId || !planId) {
        // If quote or plan is invalid, reset the sync state
        setSyncPerformedForPlan(null);
    }
  }, [quoteId, planId, syncSoftwareTrainingHours, fetchRequirements, syncPerformedForPlan, isSyncing]);

  useEffect(() => {
    performInitialSync();
  }, [performInitialSync]); // Dependency array includes the memoized function

  // --- Weekend Settings Update ---
  useEffect(() => {
    // Ensure quoteId and planId are valid before attempting update
    if (quoteId && typeof planId === 'number') {
      console.log(`Gantt: Updating weekend settings for quote ${quoteId}, plan ${planId}: Sat=${workOnSaturday}, Sun=${workOnSunday}`);
      updateWeekendSettings(quoteId, planId, workOnSaturday, workOnSunday)
        .catch(err => console.error("Gantt: Failed to update weekend settings:", err));
    }
  }, [quoteId, planId, workOnSaturday, workOnSunday]); // Keep original dependencies


  // --- Display Logic ---
  if (!planId) {
     return (
      <div className="text-center text-gray-400 py-8">
        Please select a training plan to view the resource schedule.
      </div>
    );
  }

  // Combined loading state
  const isLoading = loadingRequirements || isSyncing;
  const displayError = requirementsError; // Use error from requirements hook

  const totalAssignments = scheduledTasks?.length ?? 0;

  return (
    <>
      {/* Removed the Card wrapper to let parent component handle the styling */}
      <div className="mb-2 h-5 flex items-center"> {/* Fixed height */}
        {isLoading ? (
           <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]">
                {isSyncing ? "Syncing hours..." : "Loading schedule..."}
              </TextShimmerWave>
           </div>
        ) : displayError ? (
           <span className="text-red-400">Error loading schedule</span>
        ): (
           `Showing ${totalAssignments} scheduled training segments`
        )}
      </div>

      {/* Error Alert */}
      {displayError && !isLoading && ( // Show error only if not loading
        <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-800/30 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      {/* Gantt Chart Area */}
      <div className="h-[500px] overflow-hidden border border-slate-700 rounded-md bg-slate-900/50">
        <GanttChart
          // Pass empty array while loading to avoid errors in Gantt component
          requirements={isLoading ? [] : (scheduledTasks || [])}
          loading={isLoading}
          error={null} // Error is handled above
          workOnSaturday={workOnSaturday}
          workOnSunday={workOnSunday}
          onRetry={fetchRequirements} // Allow retry on error
        />
      </div>
    </>
  );
};

export default ResourceTrainingGantt;
