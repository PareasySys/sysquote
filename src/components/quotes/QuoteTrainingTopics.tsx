
import React from "react";
import { Card } from "@/components/ui/card";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
import { useMachineTrainingRequirements } from "@/hooks/useMachineTrainingRequirements";
import { useSoftwareTrainingRequirements } from "@/hooks/useSoftwareTrainingRequirements";
import QuoteTrainingTopicsTree from "./QuoteTrainingTopicsTree";
import TrainingHoursSummary from "./TrainingHoursSummary";

interface QuoteTrainingTopicsProps {
  selectedMachines: QuoteMachine[];
  selectedSoftware?: QuoteSoftware[];
}

const QuoteTrainingTopics: React.FC<QuoteTrainingTopicsProps> = ({ 
  selectedMachines,
  selectedSoftware = []
}) => {
  // Fetch machine training requirements
  const { 
    topicsByMachine,
    loading: loadingMachineReqs,
    error: machineReqsError
  } = useMachineTrainingRequirements(selectedMachines.map(machine => machine.machine_type_id));
  
  // Fetch software training requirements
  const {
    topicsBySoftware,
    loading: loadingSoftwareReqs,
    error: softwareReqsError
  } = useSoftwareTrainingRequirements(selectedSoftware.map(software => software.software_type_id));

  // Combine all requirements
  const allTopicsByItem = { ...topicsByMachine, ...topicsBySoftware };
  
  // Are we loading either type of requirements?
  const isLoading = loadingMachineReqs || loadingSoftwareReqs;
  
  // Do we have an error with either type of requirements?
  const hasError = machineReqsError || softwareReqsError;
  const errorMessage = machineReqsError || softwareReqsError || "Failed to load training requirements";
  
  // Count the total number of topics
  const topicsCount = Object.values(allTopicsByItem).flat().length;
  
  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Training Topics</h2>
        <div className="animate-pulse p-4">
          <div className="h-6 bg-slate-700/50 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-700/50 rounded w-4/5 mb-2"></div>
          <div className="h-4 bg-slate-700/50 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }
  
  if (hasError) {
    return (
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Training Topics</h2>
        <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
          <p className="text-red-300">{errorMessage}</p>
        </div>
      </Card>
    );
  }
  
  if (topicsCount === 0) {
    return (
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Training Topics</h2>
        <div className="text-gray-400 p-4 text-center border border-dashed border-gray-700 rounded-lg">
          No training topics available for selected machines and software
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Training Topics</h2>
        <QuoteTrainingTopicsTree 
          topicsByItem={allTopicsByItem} 
          machines={selectedMachines}
          software={selectedSoftware}
        />
      </Card>
      
      <TrainingHoursSummary />
    </>
  );
};

export default QuoteTrainingTopics;
