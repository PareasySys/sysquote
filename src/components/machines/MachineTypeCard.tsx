
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
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 rounded-full bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-800/50 transition-colors duration-300 w-16 h-16">
                <span className="text-4xl text-blue-400 group-hover:text-blue-300 flex items-center justify-center">+</span>
              </div>
              <h3 className="text-xl font-medium text-gray-200 mb-2">Add New Machine</h3>
              <p className="text-gray-400 text-sm">Click to add a new machine type</p>
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
              <span className="text-slate-500 text-4xl">No Image</span>
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
            <h3 className="text-xl font-semibold text-white mb-1">{machine?.name}</h3>
            <div className={`px-2 py-1 rounded text-xs inline-block ${machine?.is_active ? 'bg-green-900/70 text-green-300' : 'bg-red-900/70 text-red-300'}`}>
              {machine?.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 bg-slate-800/60 hover:bg-slate-700 z-20 h-8 w-8"
            onClick={handleEditClick}
          >
            <Edit className="h-4 w-4 text-slate-200" />
          </Button>
        </Card>
      </AspectRatio>
    </div>
  );
};

export default MachineTypeCard;
