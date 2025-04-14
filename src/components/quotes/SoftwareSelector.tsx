
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useSoftwareTypes } from "@/hooks/useSoftwareTypes";
import SoftwareTypeCard from "@/components/software/SoftwareTypeCard";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { toast } from "sonner";

interface SoftwareSelectorProps {
  selectedSoftwareIds: number[];
  onSave: (selectedSoftware: number[]) => void;
  quoteId?: string;
}

const SoftwareSelector: React.FC<SoftwareSelectorProps> = ({ 
  selectedSoftwareIds,
  onSave,
  quoteId
}) => {
  const { software, loading, error } = useSoftwareTypes();
  const [isSaving, setIsSaving] = useState(false);

  // Function to handle software selection changes
  const toggleSoftwareSelection = async (softwareTypeId: number) => {
    if (isSaving) {
      toast.info("Please wait, saving in progress...");
      return;
    }

    try {
      // Create a new selection array
      const updatedSelection = selectedSoftwareIds.includes(softwareTypeId)
        ? selectedSoftwareIds.filter(id => id !== softwareTypeId)
        : [...selectedSoftwareIds, softwareTypeId];
      
      // Auto-save software selection
      setIsSaving(true);
      await onSave(updatedSelection);
      setIsSaving(false);
    } catch (err) {
      console.error("Error toggling software selection:", err);
      toast.error("Failed to update software selection");
      setIsSaving(false);
    }
  };

  // Pre-select software that has always_included flag
  useEffect(() => {
    const alwaysIncludedSoftware = software
      .filter(item => item.always_included)
      .map(item => item.software_type_id);
    
    // Only add always_included software that isn't already selected
    if (alwaysIncludedSoftware.length > 0) {
      const newSoftwareToAdd = alwaysIncludedSoftware.filter(
        id => !selectedSoftwareIds.includes(id)
      );
      
      if (newSoftwareToAdd.length > 0) {
        onSave([...selectedSoftwareIds, ...newSoftwareToAdd]);
      }
    }
  }, [software, selectedSoftwareIds, onSave]);

  const isSelected = (softwareTypeId: number) => selectedSoftwareIds.includes(softwareTypeId);

  return (
    <div className="w-full">
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Software Selection</h2>
        
        {loading ? (
          <div className="p-4 text-center">
            <TextShimmerWave
              className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
              duration={1}
              spread={1}
              zDistance={1}
              scaleDistance={1.1}
              rotateYDistance={10}
            >
              Loading Software Types
            </TextShimmerWave>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
            <p className="text-red-300">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {software.map((softwareItem) => (
              <div 
                key={softwareItem.software_type_id}
                className="relative"
                onClick={() => toggleSoftwareSelection(softwareItem.software_type_id)}
              >
                <SoftwareTypeCard 
                  software={softwareItem} 
                  isSelected={isSelected(softwareItem.software_type_id)}
                  showSelectionIndicator={true}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SoftwareSelector;
