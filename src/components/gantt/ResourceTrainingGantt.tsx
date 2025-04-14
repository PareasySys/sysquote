
import React, { useEffect, useState } from "react";
import GanttChart from "./GanttChart";
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { fetchPlanningDetails, updateWeekendSettings } from "@/services/planningDetailsService";
import { TrainingRequirement } from "@/hooks/useTrainingRequirements";

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
      
      // Group planning details by resource_id to process sequentially
      const resourceGroups = details.reduce((acc, detail) => {
        const resourceId = detail.resource_id || 0;
        if (!acc[resourceId]) {
          acc[resourceId] = [];
        }
        acc[resourceId].push(detail);
        return acc;
      }, {} as Record<number, typeof details>);
      
      let allRequirements: TrainingRequirement[] = [];
      let requirementId = 1;
      
      // Process each resource's training details sequentially
      Object.entries(resourceGroups).forEach(([resourceId, details]) => {
        const numericResourceId = parseInt(resourceId);
        // Sort by machine/software type name for consistent ordering
        const sortedDetails = details.sort((a, b) => {
          const nameA = a.type_name || '';
          const nameB = b.type_name || '';
          return nameA.localeCompare(nameB);
        });
        
        // Start day for this resource's first training
        // Stagger start days by resource ID to avoid overlap
        let currentDay = 1 + (numericResourceId % 3);
        
        // Process each detail for this resource sequentially
        sortedDetails.forEach((detail) => {
          const resourceName = detail.resource_name || "Unassigned";
          const hours = detail.allocated_hours || 0;
          const machineName = detail.type_name || "Unknown Machine";
          
          // Calculate duration in days (assuming 8 hours per working day)
          let durationDays = Math.ceil(hours / 8);
          if (durationDays < 1) durationDays = 1;
          
          // Get weekend settings from the database record
          const detailWorkOnSaturday = detail.work_on_saturday || false;
          const detailWorkOnSunday = detail.work_on_sunday || false;
          
          // Create the requirement
          const requirement: TrainingRequirement = {
            requirement_id: requirementId++,
            resource_id: numericResourceId,
            resource_name: resourceName,
            machine_name: machineName,
            training_hours: hours,
            start_day: currentDay,
            duration_days: durationDays
          };
          
          allRequirements.push(requirement);
          
          // Move to next available starting day
          currentDay += durationDays;
          
          // Skip weekends for the next training if needed
          if (!detailWorkOnSaturday || !detailWorkOnSunday) {
            // Find how many weekend days to skip
            for (let day = currentDay; day < currentDay + 7; day++) {
              // Check if this is a weekend day that should be skipped
              const dayOfWeek = day % 7;
              const isSaturday = dayOfWeek === 6;
              const isSunday = dayOfWeek === 0;
              
              if ((isSaturday && !detailWorkOnSaturday) || (isSunday && !detailWorkOnSunday)) {
                currentDay++; // Skip this day
              }
            }
          }
        });
      });
      
      setRequirements(allRequirements);
      
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
