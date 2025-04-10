
import React, { useEffect, useState } from "react";
import GanttChart from "./GanttChart";
import { useTrainingRequirements } from "@/hooks/useTrainingRequirements";
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { supabase } from "@/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

interface MachineTrainingRequirement {
  machine_type_id: number;
  resource_id: number;
  plan_id: number;
}

interface TrainingOffer {
  machine_type_id: number;
  plan_id: number;
  hours_required: number;
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
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch training requirements to correlate resources with machines
  const fetchMachineTrainingRequirements = async () => {
    if (!planId) return [];
    
    try {
      const { data, error } = await supabase
        .from("machine_training_requirements")
        .select("*")
        .eq("plan_id", planId);
      
      if (error) {
        console.error("Error fetching machine training requirements:", error);
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error("Failed to fetch machine training requirements:", err);
      return [];
    }
  };

  // Fetch training offers to get allocated hours
  const fetchTrainingOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("training_offers")
        .select("*");
      
      if (error) {
        console.error("Error fetching training offers:", error);
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error("Failed to fetch training offers:", err);
      return [];
    }
  };

  // Generate and update planning details for each machine in the quote
  const updatePlanningDetails = async () => {
    if (!quoteId || !planId) return;
    
    try {
      setDetailsLoading(true);
      setFetchError(null);

      // 1. First get machine IDs from the quote
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select("machine_type_ids")
        .eq("quote_id", quoteId)
        .single();
      
      if (quoteError) {
        console.error("Error fetching quote data:", quoteError);
        setFetchError(quoteError.message);
        return;
      }
      
      if (!quoteData || !quoteData.machine_type_ids || quoteData.machine_type_ids.length === 0) {
        console.log("No machines found for this quote");
        return;
      }
      
      const machineIds = quoteData.machine_type_ids;
      console.log("Machine IDs for this quote:", machineIds);
      
      // 2. Get machine training requirements to find resources for each machine
      const machineTrainingReqs: MachineTrainingRequirement[] = await fetchMachineTrainingRequirements();
      console.log("Machine training requirements:", machineTrainingReqs);
      
      // 3. Get training offers to determine hours required for each machine-plan combination
      const trainingOffers: TrainingOffer[] = await fetchTrainingOffers();
      console.log("Training offers:", trainingOffers);
      
      // 4. For each machine, ensure a planning detail exists with the correct resource and hours
      for (const machineId of machineIds) {
        // Find the training requirement for this machine and plan to determine resource
        const trainingReq = machineTrainingReqs.find(
          req => req.machine_type_id === machineId && req.plan_id === planId
        );
        
        // Find the training offer for this machine and plan to determine hours
        const trainingOffer = trainingOffers.find(
          offer => offer.machine_type_id === machineId && offer.plan_id === planId
        );
        
        const resourceId = trainingReq?.resource_id || null;
        const allocatedHours = trainingOffer?.hours_required || 0;
        
        // Check if a record exists for this machine, plan, and quote
        const { data: existingDetails, error: findError } = await supabase
          .from("planning_details")
          .select("id")
          .eq("quote_id", quoteId)
          .eq("plan_id", planId)
          .eq("machine_types_id", machineId)
          .maybeSingle();
        
        if (findError) {
          console.error("Error checking existing planning details:", findError);
          continue;
        }
        
        try {
          if (!existingDetails) {
            // Create a new planning detail
            console.log(`Creating planning detail for machine ${machineId}, plan ${planId}`);
            const { error: insertError } = await supabase
              .from("planning_details")
              .insert({
                quote_id: quoteId,
                plan_id: planId,
                machine_types_id: machineId,
                software_types_id: null,
                resource_id: resourceId,
                allocated_hours: allocatedHours,
                work_on_saturday: workOnSaturday,
                work_on_sunday: workOnSunday
              });
            
            if (insertError) {
              console.error("Failed to insert planning detail:", insertError);
            }
          } else {
            // Update the existing planning detail
            console.log(`Updating planning detail for machine ${machineId}, plan ${planId}`);
            const { error: updateError } = await supabase
              .from("planning_details")
              .update({
                resource_id: resourceId,
                allocated_hours: allocatedHours,
                work_on_saturday: workOnSaturday,
                work_on_sunday: workOnSunday,
                updated_at: new Date().toISOString()
              })
              .eq("id", existingDetails.id);
            
            if (updateError) {
              console.error("Failed to update planning detail:", updateError);
            }
          }
        } catch (err) {
          console.error("Error processing planning detail:", err);
        }
      }
      
      // Refresh the stored details after update
      fetchStoredDetails();
      
    } catch (err: any) {
      console.error("Error updating planning details:", err);
      setFetchError(err.message || "Failed to update planning details");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Fetch saved planning details
  const fetchStoredDetails = async () => {
    if (!quoteId || !planId) return;
    
    try {
      setDetailsLoading(true);
      setFetchError(null);
      
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
      
      if (error) {
        console.error("Error fetching planning details:", error);
        setFetchError(error.message);
        throw error;
      }
      
      console.log("Stored planning details:", data);
      
      // Map the data to our expected format
      if (data && data.length > 0) {
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
      } else {
        // If no planning details found, create them
        await updatePlanningDetails();
      }
      
    } catch (err: any) {
      console.error("Error fetching planning details:", err);
      setFetchError(err.message || "Failed to fetch planning details");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Refresh the data when weekend settings or plan changes
  useEffect(() => {
    if (quoteId && planId) {
      fetchStoredDetails();
    }
  }, [quoteId, planId]);
  
  // Update weekend settings when they change
  useEffect(() => {
    if (quoteId && planId && (storedDetails.length > 0)) {
      updatePlanningDetails();
    }
  }, [workOnSaturday, workOnSunday]);

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

      {fetchError && (
        <Alert variant="destructive" className="mb-4 bg-red-900/30 border-red-800/30 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}
      
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
