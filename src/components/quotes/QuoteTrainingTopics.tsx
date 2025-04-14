
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useMachineTrainingRequirements } from "@/hooks/useMachineTrainingRequirements";
import { useSoftwareTrainingRequirements, TopicItem } from "@/hooks/useSoftwareTrainingRequirements";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import QuoteTrainingTopicsTree from "./QuoteTrainingTopicsTree";
import TrainingHoursSummary from "./TrainingHoursSummary";

interface QuoteTrainingTopicsProps {
  selectedMachines: QuoteMachine[];
  selectedSoftware: QuoteSoftware[];
}

const QuoteTrainingTopics: React.FC<QuoteTrainingTopicsProps> = ({ 
  selectedMachines, 
  selectedSoftware
}) => {
  const machineIds = selectedMachines.map(machine => machine.machine_type_id);
  const softwareIds = selectedSoftware.map(software => software.software_type_id);
  
  const { 
    requirements: machineRequirements,
    loading: machineLoading, 
    error: machineError 
  } = useMachineTrainingRequirements(machineIds);
  
  const {
    topicsBySoftware,
    loading: softwareLoading,
    error: softwareError
  } = useSoftwareTrainingRequirements(softwareIds);
  
  const [combinedTopics, setCombinedTopics] = useState<{[key: string]: any}>({});
  
  // Combine machine and software topics
  useEffect(() => {
    const combined = {
      ...machineRequirements,
      ...topicsBySoftware
    };
    setCombinedTopics(combined);
  }, [machineRequirements, topicsBySoftware]);
  
  const isLoading = machineLoading || softwareLoading;
  const hasError = machineError || softwareError;
  const errorMessage = machineError || softwareError;
  
  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Training Topics</h2>
        <div className="p-4 text-center">
          <TextShimmerWave
            className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
            duration={1}
            spread={1}
            zDistance={1}
            scaleDistance={1.1}
            rotateYDistance={10}
          >
            Loading Training Requirements
          </TextShimmerWave>
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
  
  if (Object.keys(combinedTopics).length === 0) {
    return (
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Training Topics</h2>
        <div className="text-gray-400 p-4 text-center border border-dashed border-gray-700 rounded-lg">
          No training topics found for the selected machines and software
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="bg-slate-800/80 border border-white/5 p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Training Topics</h2>
      
      <div className="space-y-6">
        <QuoteTrainingTopicsTree topics={combinedTopics} />
        <TrainingHoursSummary 
          machineIds={machineIds} 
          softwareIds={softwareIds} 
        />
      </div>
    </Card>
  );
};

export default QuoteTrainingTopics;
