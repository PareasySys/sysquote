
import React, { useEffect, useState } from "react";
import GanttChart from "./GanttChart";
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { fetchPlanningDetails, updateWeekendSettings } from "@/services/planningDetailsService";
import { TrainingRequirement } from "@/hooks/useTrainingRequirements";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [requirements, setRequirements] = useState<TrainingRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planningDetails, setPlanningDetails] = useState<any[]>([]);

  // Fetch planning details and convert to training requirements
  const fetchRequirements = async () => {
    if (!quoteId || !planId) {
      setRequirements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch planning details from our service
      const details = await fetchPlanningDetails(quoteId, planId);
      setPlanningDetails(details);
      
      // Transform planning details into training requirements
      // Each planning detail record will be treated as a unique requirement
      const transformedRequirements: TrainingRequirement[] = details.map((detail, index) => {
        const resourceId = detail.resource_id || 0;
        const resourceName = detail.resource_name || "Unassigned";
        const hours = detail.allocated_hours || 0;
        const machineName = detail.type_name || "Unknown Machine";
        
        // Calculate duration in days (assuming 8 hours per working day)
        let durationDays = Math.ceil(hours / 8);
        if (durationDays < 1) durationDays = 1;
        
        // If not working on weekends, extend duration to account for skipped days
        if (!workOnSaturday || !workOnSunday) {
          // Calculate how many weekends will be encountered during the duration
          // For simplicity, assuming uniform distribution of weekends (2 days per 7)
          const daysOff = (!workOnSaturday && !workOnSunday) ? 2 : 1;
          const weekendAdjustment = Math.floor(durationDays / 5) * daysOff;
          durationDays += weekendAdjustment;
        }
        
        // Use simple spacing algorithm for start days based on resource grouping
        // Group by resource to better space out tasks for the same resource
        const resourceDetails = details.filter(d => d.resource_id === detail.resource_id);
        const resourceIndex = resourceDetails.findIndex(d => d.id === detail.id);
        const startDay = resourceIndex * 5 + 1;
        
        return {
          requirement_id: index + 1, // Use index for unique requirement_id
          resource_id: resourceId,
          resource_name: resourceName,
          machine_name: machineName,
          training_hours: hours,
          start_day: startDay,
          duration_days: durationDays || 1
        };
      });
      
      setRequirements(transformedRequirements);
      
    } catch (err: any) {
      console.error("Error fetching planning details:", err);
      setError(err.message || "Failed to load training requirements");
    } finally {
      setLoading(false);
    }
  };

  // Update weekend settings when they change
  useEffect(() => {
    if (quoteId && planId) {
      fetchRequirements();
      
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
        <p className="text-gray-400 text-sm">
          {loading ? (
            <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]">
              Loading schedule...
            </TextShimmerWave>
          ) : (
            `Showing ${planningDetails.length} training assignments`
          )}
        </p>
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
