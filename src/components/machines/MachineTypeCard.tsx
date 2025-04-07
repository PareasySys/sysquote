
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
                <svg 
                  fill="#ffffff" 
                  viewBox="0 0 50 50" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                >
                  <path d="M39 2.03125C38.738281 2.0625 38.503906 2.199219 38.34375 2.40625L35.34375 6.21875C34.78125 5.488281 33.898438 5 32.90625 5L30.09375 5C28.394531 5 27 6.394531 27 8.09375L27 15.90625C27 17.605469 28.394531 19 30.09375 19L32.90625 19C33.898438 19 34.78125 18.511719 35.34375 17.78125L38.34375 21.59375C38.636719 21.960938 39.148438 22.066406 39.5625 21.84375L49.46875 16.4375C49.882813 16.214844 50.074219 15.730469 49.929688 15.285156C49.78125 14.835938 49.339844 14.5625 48.875 14.625C48.753906 14.644531 48.636719 14.6875 48.53125 14.75L39.375 19.78125L36 15.5L36 8.53125L39.375 4.25L48.53125 9.25C48.835938 9.457031 49.230469 9.472656 49.550781 9.292969C49.871094 9.113281 50.0625 8.769531 50.042969 8.402344C50.027344 8.035156 49.804688 7.710938 49.46875 7.5625L39.5625 2.15625C39.390625 2.058594 39.195313 2.015625 39 2.03125 Z M 9 3C4.039063 3 0 7.039063 0 12C0 16.960938 4.039063 21 9 21C13.960938 21 18 16.960938 18 12C18 7.039063 13.960938 3 9 3 Z M 18.6875 7C19.480469 8.519531 20 10.171875 20 12C20 13.828125 19.480469 16.480469 18.6875 18L24.96875 18C24.894531 17.652344 24.90625 16.367188 24.90625 16L24.90625 8C24.90625 7.632813 24.894531 7.347656 24.96875 7 Z M 9 7.34375C11.558594 7.34375 13.65625 9.441406 13.65625 12C13.65625 14.558594 11.558594 16.65625 9 16.65625C6.441406 16.65625 4.34375 14.558594 4.34375 12C4.34375 9.441406 6.441406 7.34375 9 7.34375 Z M 17.8125 18.5625C15.804688 21.242188 12.601563 23 9 23C7.773438 23 6.601563 22.777344 5.5 22.40625L14.28125 38.96875L29.34375 38.96875 Z M 6.875 41C5.253906 41 4 42.316406 4 44L4 49C4 49.582031 4.417969 50 5 50L39 50C39.582031 50 40 49.582031 40 49L40 44C40 42.316406 38.746094 41 37.125 41Z" />
                </svg>
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
