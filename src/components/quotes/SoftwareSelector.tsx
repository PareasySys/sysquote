
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { Server } from "lucide-react";
import { syncSoftwarePlanningDetails } from "@/services/planningDetailsService";

interface SoftwareSelectorProps {
  selectedSoftwareIds: number[];
  alwaysIncludedIds: number[];
  onSave: (softwareIds: number[]) => void;
  quoteId?: string;
}

interface SoftwareType {
  software_type_id: number;
  name: string;
  description: string | null;
  photo_url: string | null;
  always_included: boolean;
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

  const handleCheckboxChange = (softwareTypeId: number, isChecked: boolean) => {
    setSelected(prev => {
      if (isChecked) {
        return [...prev, softwareTypeId];
      } else {
        return prev.filter(id => id !== softwareTypeId);
      }
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Save software selection
      await onSave(selected);
      
      // Also sync with planning_details if we have a quoteId and plans
      if (quoteId && plans.length > 0) {
        await syncSoftwarePlanningDetails(quoteId, selected, plans);
      }
      
    } catch (err) {
      console.error("Error saving software:", err);
    } finally {
      setLoading(false);
    }
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
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {softwareTypes.map((software) => (
            <div 
              key={software.software_type_id} 
              className={`flex items-center gap-3 p-2 rounded border ${
                software.always_included ? 'bg-amber-950/30 border-amber-800/50' : 'bg-slate-700/50 border-gray-700/50 hover:border-gray-600/50'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-slate-600 rounded-sm overflow-hidden flex items-center justify-center">
                {software.photo_url ? (
                  <img 
                    src={software.photo_url} 
                    alt={software.name} 
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.appendChild(
                        <Server className="w-6 h-6 text-gray-400" /> as unknown as Node
                      );
                    }} 
                  />
                ) : (
                  <Server className="w-5 h-5 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-200 flex items-center">
                  {software.name}
                  {software.always_included && (
                    <span className="ml-2 text-xs bg-amber-600/50 text-amber-200 px-1.5 py-0.5 rounded">
                      Always Included
                    </span>
                  )}
                </div>
                {software.description && (
                  <div className="text-xs text-gray-400 truncate">
                    {software.description}
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0">
                <Checkbox
                  checked={selected.includes(software.software_type_id) || software.always_included}
                  disabled={software.always_included}
                  onCheckedChange={(checked) => {
                    handleCheckboxChange(software.software_type_id, checked as boolean);
                  }}
                  className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Save Software Selection
        </Button>
      </div>
    </Card>
  );
};

export default SoftwareSelector;
