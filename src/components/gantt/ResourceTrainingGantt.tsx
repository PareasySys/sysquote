
import React, { useEffect, useState } from "react";
import GanttChart from "./GanttChart";
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { fetchPlanningDetails, updateWeekendSettings } from "@/services/planningDetailsService";
import { TrainingRequirement, useTrainingRequirements } from "@/hooks/useTrainingRequirements";

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
    requirements,
    loading,
    error,
    fetchRequirements
  } = useTrainingRequirements(quoteId, planId, workOnSaturday, workOnSunday);
  
  const [planningDetails, setPlanningDetails] = useState<any[]>([]);

  // Fetch planning details for counting
  useEffect(() => {
    const loadPlanningDetails = async () => {
      if (!quoteId || !planId) {
        setPlanningDetails([]);
        return;
      }
      
      try {
        const details = await fetchPlanningDetails(quoteId, planId);
        setPlanningDetails(details);
      } catch (err) {
        console.error("Error fetching planning details:", err);
      }
    };
    
    loadPlanningDetails();
  }, [quoteId, planId]);

  // Update weekend settings when they change
  useEffect(() => {
    if (quoteId && planId) {
      // Update weekend settings in database
      updateWeekendSettings(quoteId, planId, workOnSaturday, workOnSunday);
    }
  }, [quoteId, planId, workOnSaturday, workOnSunday]);

  if (!planId) {
    return (
      <Card className="p-6 bg-slate-800/80 border border-white/5">
        <div className="text-center text-gray-400">
          Please select a training plan to view the resource schedule.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-slate-800/80 border border-white/5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Resource Training Schedule</h3>
        <div className="text-gray-400 text-sm">
          {loading ? (
            <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]">
              Loading schedule...
            </TextShimmerWave>
          ) : (
            `Showing ${planningDetails.length} training assignments`
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-800/30 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="h-[500px] overflow-hidden">
        <GanttChart
          requirements={requirements}
          loading={loading}
          error={error}
          workOnSaturday={workOnSaturday}
          workOnSunday={workOnSunday}
          onRetry={fetchRequirements}
        />
      </div>
    </Card>
  );
};

export default ResourceTrainingGantt;
