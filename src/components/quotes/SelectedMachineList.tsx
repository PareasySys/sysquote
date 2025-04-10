
import React from "react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

interface SelectedMachineListProps {
  machines: QuoteMachine[];
  onRemove: (machineTypeId: number) => void;
  loading?: boolean;
}

const SelectedMachineList: React.FC<SelectedMachineListProps> = ({
  machines,
  onRemove,
  loading = false
}) => {
  if (machines.length === 0) {
    return <div className="text-gray-400 p-4 text-center border border-dashed border-gray-700 rounded-lg">
        No machines selected. Please add machines from the selection panel.
      </div>;
  }
  
  return <div className="space-y-2">
      {machines.map(machine => <Card key={machine.machine_type_id} className="bg-slate-800/80 border border-white/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded flex-shrink-0 overflow-hidden">
              {machine.photo_url ? <img src={machine.photo_url} alt={machine.name} className="w-full h-full object-cover" onError={e => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }} /> : <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500 text-xs">
                  No img
                </div>}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-medium text-gray-200 truncate">
                {machine.name || "Unknown Machine"}
              </h4>
              {machine.description && <p className="text-xs text-gray-400 truncate max-w-md text-left">
                  {machine.description}
                </p>}
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => onRemove(machine.machine_type_id)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </Card>)}
    </div>;
};

export default SelectedMachineList;
