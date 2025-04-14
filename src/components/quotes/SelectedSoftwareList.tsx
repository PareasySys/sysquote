
import React from "react";
import { Card } from "@/components/ui/card";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectedSoftwareListProps {
  software: QuoteSoftware[];
  onRemove: (softwareTypeId: number) => void;
  loading?: boolean;
}

const SelectedSoftwareList: React.FC<SelectedSoftwareListProps> = ({
  software,
  onRemove,
  loading = false
}) => {
  const handleRemove = (softwareTypeId: number, alwaysIncluded: boolean) => {
    if (alwaysIncluded) {
      return; // Prevent removal of always included software
    }
    onRemove(softwareTypeId);
  };

  if (software.length === 0) {
    return <div className="text-gray-400 p-4 text-center border border-dashed border-gray-700 rounded-lg">
        No software selected. Please add software from the selection panel.
      </div>;
  }
  
  return <div className="space-y-3">
    {software.map(item => (
      <Card key={item.software_type_id} className="bg-slate-800/80 border border-white/5 p-3 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded flex-shrink-0 overflow-hidden">
              {item.photo_url ? 
                <img 
                  src={item.photo_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover" 
                  onError={e => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }} 
                /> 
                : 
                <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500 text-xs">
                  No img
                </div>
              }
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-medium text-gray-200 truncate flex items-center gap-2">
                {item.name || "Unknown Software"}
                {item.always_included && (
                  <span className="px-1.5 py-0.5 bg-blue-900/70 rounded text-[10px] text-blue-300 inline-flex">
                    Always
                  </span>
                )}
              </h4>
              {item.description && 
                <p className="text-xs text-gray-400 truncate max-w-md text-left">
                  {item.description}
                </p>
              }
            </div>
          </div>
          
          {/* Training Hours Indicators (placeholder for now) */}
          <div className="flex flex-wrap gap-2 justify-end">
            {/* These would be populated with actual training hours data */}
          </div>
          
          {!item.always_included && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-3 text-gray-400 hover:text-gray-200 hover:bg-red-900/20"
              onClick={() => handleRemove(item.software_type_id, item.always_included)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    ))}
  </div>;
};

export default SelectedSoftwareList;
