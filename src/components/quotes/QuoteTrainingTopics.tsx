
import React, { useEffect } from "react";
import QuoteTrainingTopicsTree from "./QuoteTrainingTopicsTree";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
import { dataSyncService } from "@/services/planningDetailsSync";

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
      // Get software type IDs from the selected software
      const softwareTypeIds = selectedSoftware.map(item => item.software_type_id);
      
      // Call the appropriate method from dataSyncService
      softwareTypeIds.forEach(id => {
        if (id) {
          dataSyncService.syncSoftwareTypeChanges(id).catch(err => {
            console.error(`Error syncing software type ${id}:`, err);
          });
        }
      });
    }
  }, [selectedSoftware]);
  
  return (
    <QuoteTrainingTopicsTree 
      selectedMachines={selectedMachines}
      selectedSoftware={selectedSoftware}
    />
  );
};

export default QuoteTrainingTopics;
