// ResourceTrainingGantt.tsx

import React, { useEffect, useState } from "react";
import GanttChart from "./GanttChart"; // Adjust path
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
// Remove fetchPlanningDetails from here if only used for count now
import { updateWeekendSettings } from "@/services/planningDetailsService"; // Keep this
import { useTrainingRequirements } from "@/hooks/useTrainingRequirements"; // Adjust path
// Remove TrainingRequirement if not used directly here

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
  const {
    scheduledTasks, // Use the scheduled tasks from the hook
    loading,
    error,
    fetchRequirements // Use the retry function from the hook
  } = useTrainingRequirements(quoteId, planId, workOnSaturday, workOnSunday);

  // --- Weekend Settings Update --- (Keep this effect)
  useEffect(() => {
    if (quoteId && planId) {
      updateWeekendSettings(quoteId, planId, workOnSaturday, workOnSunday);
    }
  }, [quoteId, planId, workOnSaturday, workOnSunday]);


  // --- Display Logic ---
  if (!planId) {
    // ... (keep existing message)
     return (
      <Card className="p-6 bg-slate-800/80 border border-white/5">
        <div className="text-center text-gray-400">
          Please select a training plan to view the resource schedule.
        </div>
      </Card>
    );
  }

  // Calculate total assignments based on *scheduled segments* if needed for display text
  const totalAssignments = scheduledTasks.length; // Or sum original requirements if preferred

  return (
    <Card className="p-4 bg-slate-800/80 border border-white/5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Resource Training Schedule</h3>
        <div className="text-gray-400 text-sm">
          {loading && !scheduledTasks.length ? ( // Show loading only if no data yet
            <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]">
              Loading and scheduling...
            </TextShimmerWave>
          ) : (
            // Display count based on segments or original tasks
            `Showing ${totalAssignments} scheduled training segments`
            // Or: `Showing schedule for ${uniqueOriginalTaskCount} training requirements`
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-800/30 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="h-[500px] overflow-hidden"> {/* Ensure this container has height */}
        <GanttChart
          // Pass the scheduled tasks to the GanttChart
          // The prop name is still 'requirements', we need to adapt GanttChart slightly
          // OR rename the prop in GanttChart to 'tasks' or 'segments'
          requirements={scheduledTasks}
          loading={loading && !scheduledTasks.length} // Show loading overlay if still processing
          error={null} // Error is handled above, don't pass it down again
          workOnSaturday={workOnSaturday} // Gantt still needs this for weekend styling
          workOnSunday={workOnSunday}     // Gantt still needs this for weekend styling
          onRetry={fetchRequirements}     // Pass down retry
        />
      </div>
    </Card>
  );
};

export default ResourceTrainingGantt;