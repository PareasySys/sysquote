
import React, { useEffect, useState } from "react";
import GanttChart from "./GanttChart";
import { useTrainingRequirements } from "@/hooks/useTrainingRequirements";
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { supabase } from "@/lib/supabaseClient";

interface ResourceTrainingGanttProps {
  quoteId: string | undefined;
  planId: number | null;
  workOnSaturday: boolean;
  workOnSunday: boolean;
}

interface PlanningDetail {
  id: string;
  resource_id: number | null;
  resource_name: string;
  allocated_hours: number;
  machine_types_id: number | null;
  software_types_id: number | null;
  type_name: string | null;
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
    fetchRequirements,
    saveTrainingPlanDetails
  } = useTrainingRequirements(quoteId, planId, workOnSaturday, workOnSunday);

  const [storedDetails, setStoredDetails] = useState<PlanningDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Fetch saved planning details
  const fetchStoredDetails = async () => {
    if (!quoteId || !planId) return;
    
    try {
      setDetailsLoading(true);
      
      const { data, error } = await supabase
        .from("planning_details")
        .select(`
          id,
          resource_id,
          resources (name),
          allocated_hours,
          machine_types_id,
          software_types_id,
          machine_types (name),
          software_types (name)
        `)
        .eq("quote_id", quoteId)
        .eq("plan_id", planId);
      
      if (error) throw error;
      
      console.log("Stored planning details:", data);
      
      // Map the data to our expected format
      const mappedDetails: PlanningDetail[] = data.map(item => ({
        id: item.id,
        resource_id: item.resource_id,
        resource_name: item.resources?.name || "Unassigned",
        allocated_hours: item.allocated_hours,
        machine_types_id: item.machine_types_id,
        software_types_id: item.software_types_id,
        type_name: item.machine_types ? item.machine_types.name : 
                  (item.software_types ? item.software_types.name : null)
      }));
      
      setStoredDetails(mappedDetails);
      
    } catch (err: any) {
      console.error("Error fetching planning details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Refresh the data when weekend settings or plan changes
  useEffect(() => {
    if (quoteId && planId) {
      fetchStoredDetails();
    }
  }, [workOnSaturday, workOnSunday, quoteId, planId]);

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
          {loading || detailsLoading ? (
            <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]">
              Loading schedule...
            </TextShimmerWave>
          ) : (
            `Showing ${storedDetails.length} training assignments`
          )}
        </p>
      </div>
      
      <div className="h-[500px] overflow-hidden">
        <GanttChart
          requirements={requirements}
          loading={loading}
          error={error}
          onRetry={fetchRequirements}
        />
      </div>
    </Card>
  );
};

export default ResourceTrainingGantt;
