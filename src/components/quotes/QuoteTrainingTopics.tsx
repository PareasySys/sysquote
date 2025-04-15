import React from "react"; // Removed useEffect
import QuoteTrainingTopicsTree from "./QuoteTrainingTopicsTree";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
// Removed syncSoftwareTrainingHoursAndResources import

interface QuoteTrainingTopicsProps {
  selectedMachines: QuoteMachine[];
  selectedSoftware: QuoteSoftware[];
}

// This is now purely a wrapper component that uses the tree view implementation
const QuoteTrainingTopics: React.FC<QuoteTrainingTopicsProps> = ({
  selectedMachines,
  selectedSoftware
}) => {

  // Removed the useEffect that was triggering sync

  return (
    <QuoteTrainingTopicsTree
      selectedMachines={selectedMachines}
      selectedSoftware={selectedSoftware}
    />
  );
};

export default QuoteTrainingTopics;