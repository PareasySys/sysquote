
import React from "react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MachineType } from "@/hooks/useMachineTypes";

interface MachineTypeCardProps {
  machine?: MachineType;
  isAddCard?: boolean;
  onEdit?: (machine: MachineType) => void;
  onAddNew?: () => void;
}

const MachineTypeCard: React.FC<MachineTypeCardProps> = ({ 
  machine, 
  isAddCard = false,
  onEdit,
  onAddNew
}) => {
  const handleClick = () => {
    if (isAddCard && onAddNew) {
      onAddNew();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (machine && onEdit) {
      onEdit(machine);
    }
  };

  if (isAddCard) {
    return (
      <div className="w-full">
        <AspectRatio ratio={3/4} className="w-full">
          <Card 
            onClick={handleClick}
            className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-slate-700/70 to-slate-900/70 border-dashed border-slate-600/50 flex flex-col items-center justify-center h-full w-full"
          >
            <div className="p-4 text-center">
              <div className="mx-auto mb-3 rounded-full bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-800/50 transition-colors duration-300 w-10 h-10">
                <span className="text-2xl text-blue-400 group-hover:text-blue-300 flex items-center justify-center">+</span>
              </div>
              <h3 className="text-sm font-medium text-gray-200 mb-1">Add New Machine</h3>
              <p className="text-gray-400 text-xs">Click to add a new machine type</p>
            </div>
          </Card>
        </AspectRatio>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AspectRatio ratio={3/4} className="w-full">
        <Card className="relative overflow-hidden h-full cursor-default w-full">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
          {machine?.photo_url ? (
            <img 
              src={machine.photo_url} 
              alt={machine.name} 
              className="object-cover w-full h-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          ) : (
            <div className="bg-slate-800 w-full h-full flex items-center justify-center">
              <span className="text-slate-500 text-sm">No Image</span>
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-2 z-20">
            <h3 className="text-sm font-semibold text-white mb-1">{machine?.name}</h3>
            <div className={`px-1.5 py-0.5 rounded text-xs inline-block ${machine?.is_active ? 'bg-green-900/70 text-green-300' : 'bg-red-900/70 text-red-300'}`}>
              {machine?.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-1 right-1 bg-slate-800/60 hover:bg-slate-700 z-20 h-6 w-6"
            onClick={handleEditClick}
          >
            <Edit className="h-3 w-3 text-slate-200" />
          </Button>
        </Card>
      </AspectRatio>
    </div>
  );
};

export default MachineTypeCard;
