
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { useSoftwareTypes } from "@/hooks/useSoftwareTypes";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { toast } from "sonner";
import { Laptop, Database, Code } from "lucide-react";

interface SoftwareSelectorProps {
  selectedSoftwareIds: number[];
  alwaysIncludedIds: number[];
  onSave: (selectedSoftware: number[]) => void;
  quoteId?: string;
}

const SoftwareSelector: React.FC<SoftwareSelectorProps> = ({ 
  selectedSoftwareIds,
  alwaysIncludedIds,
  onSave,
  quoteId
}) => {
  const { software, loading, error } = useSoftwareTypes();
  const [isSaving, setIsSaving] = useState(false);

  // Function to handle software selection changes
  const toggleSoftwareSelection = async (softwareTypeId: number, alwaysIncluded: boolean) => {
    if (isSaving) {
      toast.info("Please wait, saving in progress...");
      return;
    }

    if (alwaysIncluded) {
      toast.info("This software is always included and cannot be removed");
      return;
    }

    try {
      // Create a new selection array
      const updatedSelection = selectedSoftwareIds.includes(softwareTypeId)
        ? selectedSoftwareIds.filter(id => id !== softwareTypeId)
        : [...selectedSoftwareIds, softwareTypeId];
      
      setIsSaving(true);
      
      // Save software selection
      await onSave(updatedSelection);
    } catch (err) {
      console.error("Error toggling software selection:", err);
      toast.error("Failed to update software selection");
    } finally {
      setIsSaving(false);
    }
  };

  const isSelected = (softwareTypeId: number) => selectedSoftwareIds.includes(softwareTypeId);
  const isAlwaysIncluded = (softwareTypeId: number) => alwaysIncludedIds.includes(softwareTypeId);

  // Get software icon based on name
  const getSoftwareIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('database')) return <Database className="h-8 w-8 text-blue-400" />;
    if (lowerName.includes('code') || lowerName.includes('program')) return <Code className="h-8 w-8 text-green-400" />;
    return <Laptop className="h-8 w-8 text-purple-400" />;
  };

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {software.map((softwareItem) => (
              <div 
                key={softwareItem.software_type_id}
                className="relative cursor-pointer"
                onClick={() => toggleSoftwareSelection(softwareItem.software_type_id, softwareItem.always_included)}
              >
                <div 
                  className={`
                    bg-slate-700/80 rounded-lg border p-3 transition-all 
                    ${isSelected(softwareItem.software_type_id) ? 'border-blue-500 shadow-md shadow-blue-500/20' : 'border-slate-600/50 hover:border-slate-500/50'}
                    ${isAlwaysIncluded(softwareItem.software_type_id) ? 'ring-2 ring-amber-400/50' : ''}
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center">
                      {softwareItem.photo_url ? (
                        <img 
                          src={softwareItem.photo_url} 
                          alt={softwareItem.name} 
                          className="w-10 h-10 object-cover rounded" 
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.appendChild(
                              getSoftwareIcon(softwareItem.name) as any
                            );
                          }}
                        />
                      ) : (
                        getSoftwareIcon(softwareItem.name)
                      )}
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-sm font-medium text-gray-200 truncate max-w-[100px] mx-auto">
                        {softwareItem.name}
                      </h3>
                      
                      {isAlwaysIncluded(softwareItem.software_type_id) && (
                        <span className="text-xs text-amber-400 font-medium">Always included</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {isSelected(softwareItem.software_type_id) && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SoftwareSelector;
