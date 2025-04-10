
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
  resource_id: number;
  resource_name: string;
  allocated_hours: number;
  start_day: number;
  duration_days: number;
  resource_category: string;
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
    if (!quoteId) return;
    
    try {
      setDetailsLoading(true);
      
      const { data, error } = await supabase.rpc(
        'get_quote_training_plan_details', 
        { quote_id_param: quoteId }
      );
      
      if (error) throw error;
      
      console.log("Stored planning details:", data);
      setStoredDetails(data || []);
      
    } catch (err: any) {
      console.error("Error fetching planning details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Refresh the data when weekend settings change
  useEffect(() => {
    if (planId && requirements.length > 0) {
      saveTrainingPlanDetails(requirements, planId, workOnSaturday, workOnSunday);
    }
    
    // Also fetch stored details whenever dependencies change
    fetchStoredDetails();
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
            `Showing ${requirements.length} training requirements`
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
