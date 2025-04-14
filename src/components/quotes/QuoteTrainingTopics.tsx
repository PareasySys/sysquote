
import React from "react";
import QuoteTrainingTopicsTree from "./QuoteTrainingTopicsTree";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";

interface QuoteTrainingTopicsProps {
  selectedMachines: QuoteMachine[];
  selectedSoftware: QuoteSoftware[];
}

// This is now a wrapper component that uses the tree view implementation
const QuoteTrainingTopics: React.FC<QuoteTrainingTopicsProps> = ({ 
  selectedMachines,
  selectedSoftware
}) => {
  return (
    <QuoteTrainingTopicsTree 
      selectedMachines={selectedMachines}
      selectedSoftware={selectedSoftware}
    />
  );
};

export default QuoteTrainingTopics;
