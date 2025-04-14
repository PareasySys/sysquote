
import React from "react";
import QuoteTrainingTopicsTree from "./QuoteTrainingTopicsTree";
import { QuoteMachine } from "@/hooks/useQuoteMachines";

interface QuoteTrainingTopicsProps {
  selectedMachines: QuoteMachine[];
}

// This is now a wrapper component that uses the tree view implementation
const QuoteTrainingTopics: React.FC<QuoteTrainingTopicsProps> = ({ selectedMachines }) => {
  return <QuoteTrainingTopicsTree selectedMachines={selectedMachines} />;
};

export default QuoteTrainingTopics;
