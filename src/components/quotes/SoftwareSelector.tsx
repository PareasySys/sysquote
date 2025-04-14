
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { syncSoftwarePlanningDetails } from "@/services/planningDetailsService";
import SoftwareTypeCard from "@/components/software/SoftwareTypeCard";
import { SoftwareType } from "@/hooks/useSoftwareTypes";

interface SoftwareSelectorProps {
  selectedSoftwareIds: number[];
  alwaysIncludedIds: number[];
  onSave: (softwareIds: number[]) => void;
  quoteId?: string;
}

const SoftwareSelector: React.FC<SoftwareSelectorProps> = ({
  selectedSoftwareIds,
  alwaysIncludedIds,
  onSave,
  quoteId
}) => {
  const [softwareTypes, setSoftwareTypes] = useState<SoftwareType[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { plans } = useTrainingPlans();

  useEffect(() => {
    setSelected(selectedSoftwareIds || []);
  }, [selectedSoftwareIds]);

  useEffect(() => {
    fetchSoftwareTypes();
  }, []);

  const fetchSoftwareTypes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("software_types")
        .select("*")
        .order("always_included", { ascending: false })
        .order("name");
        
      if (error) throw error;
      
      setSoftwareTypes(data || []);
    } catch (err) {
      console.error("Error fetching software types:", err);
      toast.error("Failed to load software types");
    } finally {
      setLoading(false);
    }
  };

  const handleSoftwareClick = async (softwareTypeId: number) => {
    try {
      // Don't allow deselecting always included software
      if (alwaysIncludedIds.includes(softwareTypeId)) {
        return;
      }
      
      let updatedSelection: number[];
      
      if (selected.includes(softwareTypeId)) {
        // Remove from selection
        updatedSelection = selected.filter(id => id !== softwareTypeId);
      } else {
        // Add to selection
        updatedSelection = [...selected, softwareTypeId];
      }
      
      // Update local state immediately for responsive UI
      setSelected(updatedSelection);
      
      // Save to database
      await onSave(updatedSelection);
      
      // Also sync with planning_details if we have a quoteId and plans
      if (quoteId && plans.length > 0) {
        await syncSoftwarePlanningDetails(quoteId, updatedSelection, plans);
      }
    } catch (err) {
      console.error("Error updating software selection:", err);
      toast.error("Failed to update software selection");
      // Revert local state on error
      setSelected(selectedSoftwareIds);
    }
  };

  const isSoftwareSelected = (softwareTypeId: number) => {
    return selected.includes(softwareTypeId) || alwaysIncludedIds.includes(softwareTypeId);
  };

  return (
    <Card className="bg-slate-800/80 border border-white/5 p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Software Selection</h2>
      
      {loading ? (
        <div className="p-4 text-center text-gray-400">Loading software types...</div>
      ) : softwareTypes.length === 0 ? (
        <div className="p-4 text-center text-gray-400">
          No software types available
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {softwareTypes.map((software) => (
            <div 
              key={software.software_type_id}
              onClick={() => handleSoftwareClick(software.software_type_id)}
              className={`cursor-pointer ${software.always_included ? 'opacity-90 cursor-not-allowed' : ''}`}
            >
              <SoftwareTypeCard 
                software={software}
                isSelected={isSoftwareSelected(software.software_type_id)}
                showSelectionIndicator={true}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default SoftwareSelector;
