
import React, { useEffect } from "react";
import QuoteTrainingTopicsTree from "./QuoteTrainingTopicsTree";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
import { syncSoftwareTrainingHoursAndResources } from "@/services/planningDetailsSync";

interface QuoteTrainingTopicsProps {
  selectedMachines: QuoteMachine[];
  selectedSoftware: QuoteSoftware[];
}

// This is now a wrapper component that uses the tree view implementation
const QuoteTrainingTopics: React.FC<QuoteTrainingTopicsProps> = ({ 
  selectedMachines,
  selectedSoftware
}) => {
  // Ensure software training hours are synced when the component mounts or when selected software changes
  useEffect(() => {
    if (selectedSoftware.length > 0) {
      syncSoftwareTrainingHoursAndResources().catch(err => {
        console.error("Error syncing software training hours:", err);
      });
    }
  }, [selectedSoftware.length]);
  
  return (
    <QuoteTrainingTopicsTree 
      selectedMachines={selectedMachines}
      selectedSoftware={selectedSoftware}
    />
  );
};

export default QuoteTrainingTopics;
