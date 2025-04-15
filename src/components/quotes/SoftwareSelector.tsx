import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client"; // Corrected path
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import SoftwareTypeCard from "@/components/software/SoftwareTypeCard";
import { SoftwareType } from "@/hooks/useSoftwareTypes";
import { Loader2 } from "lucide-react"; // Added Loader
// Removed useTrainingPlans and syncSoftwarePlanningDetails imports

interface SoftwareSelectorProps {
  selectedSoftwareIds: number[];
  alwaysIncludedIds: number[];
  onSave: (softwareIds: number[]) => void; // Keep onSave to report changes up
  quoteId?: string; // Keep quoteId if needed for other purposes
}

const SoftwareSelector: React.FC<SoftwareSelectorProps> = ({
  selectedSoftwareIds,
  alwaysIncludedIds,
  onSave,
  quoteId // Keep quoteId prop if needed elsewhere
}) => {
  const [softwareTypes, setSoftwareTypes] = useState<SoftwareType[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Removed plans state

  // Effect to update local selection when prop changes
  useEffect(() => {
    // Ensure always included are always part of the local state if present in props
    const combinedFromProps = [...new Set([...(selectedSoftwareIds || []), ...alwaysIncludedIds])];
    setSelected(combinedFromProps);
  }, [selectedSoftwareIds, alwaysIncludedIds]); // React to prop changes

  // Fetch all software types on mount
  useEffect(() => {
    fetchSoftwareTypes();
  }, []);

  const fetchSoftwareTypes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("software_types")
        .select("*")
        .order("always_included", { ascending: false })
        .order("name");

      if (fetchError) throw fetchError;

      setSoftwareTypes(data || []);
    } catch (err: any) {
      console.error("Error fetching software types:", err);
      setError(err.message || "Failed to load software types");
      toast.error("Failed to load software types");
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking on a software card
  const handleSoftwareClick = (softwareTypeId: number) => {
    // Don't allow deselecting always included software via click
    if (alwaysIncludedIds.includes(softwareTypeId)) {
      toast.info(`${softwareTypes.find(s => s.software_type_id === softwareTypeId)?.name || 'This software'} is always included.`);
      return;
    }

    let updatedSelection: number[];

    if (selected.includes(softwareTypeId)) {
      // Remove from selection (if not always included)
      updatedSelection = selected.filter(id => id !== softwareTypeId);
    } else {
      // Add to selection
      updatedSelection = [...selected, softwareTypeId];
    }

    // Update local state immediately for responsive UI
    setSelected(updatedSelection);

    // Report the final intended selection (excluding always included for saving logic)
    // The parent hook (useQuoteSoftware) will handle merging alwaysIncluded back in on save.
    const selectionToReport = updatedSelection.filter(id => !alwaysIncludedIds.includes(id));
    onSave(selectionToReport);

    // DO NOT sync planning details here. Syncing will happen after the parent saves.
  };

  const isSoftwareSelected = (softwareTypeId: number) => {
    // Selection is determined by local state 'selected' which includes prop changes
    return selected.includes(softwareTypeId);
  };

  return (
    <Card className="bg-slate-800/80 border border-white/5 p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Software Selection</h2>

      {loading ? (
         <div className="p-4 text-center flex justify-center items-center gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading software types...
         </div>
      ) : error ? (
           <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
             <p className="text-red-300">{error}</p>
           </div>
      ) : softwareTypes.length === 0 ? (
        <div className="p-4 text-center text-gray-400">
          No software types available.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {softwareTypes.map((software) => (
            <div
              key={software.software_type_id}
              onClick={() => handleSoftwareClick(software.software_type_id)}
              className={`cursor-pointer rounded-lg ${software.always_included ? 'opacity-70 cursor-not-allowed group' : ''}`} // Style always included
              title={software.always_included ? `${software.name} is always included` : `Select ${software.name}`}
            >
              <SoftwareTypeCard
                software={software}
                isSelected={isSoftwareSelected(software.software_type_id)}
                showSelectionIndicator={true}
                isAlwaysIncluded={software.always_included} // Pass down always_included status
              />
               {software.always_included && (
                 <div className="absolute top-1 right-1 text-xs bg-amber-500 text-black px-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Auto
                 </div>
               )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default SoftwareSelector;