
import React from "react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { SoftwareType } from "@/hooks/useSoftwareTypes";
import { Check, Edit, Server } from "lucide-react";

interface SoftwareTypeCardProps {
  software?: SoftwareType;
  isAddCard?: boolean;
  onEdit?: (software: SoftwareType) => void;
  onAddNew?: () => void;
  isSelected?: boolean;
  showSelectionIndicator?: boolean;
  isAlwaysIncluded?: boolean;
}

const SoftwareTypeCard: React.FC<SoftwareTypeCardProps> = ({ 
  software, 
  isAddCard = false,
  onEdit,
  onAddNew,
  isSelected = false,
  showSelectionIndicator = false,
  isAlwaysIncluded = false
}) => {
  const handleClick = () => {
    if (isAddCard && onAddNew) {
      onAddNew();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (software && onEdit) {
      onEdit(software);
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
            <div className="p-4 text-center flex flex-col items-center">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-12 h-12 mb-3 mx-auto"
              >
                <g id="SVGRepo_iconCarrier">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3.75 4.5L4.5 3.75H10.5L11.25 4.5V10.5L10.5 11.25H4.5L3.75 10.5V4.5ZM5.25 5.25V9.75H9.75V5.25H5.25ZM13.5 3.75L12.75 4.5V10.5L13.5 11.25H19.5L20.25 10.5V4.5L19.5 3.75H13.5ZM14.25 9.75V5.25H18.75V9.75H14.25ZM17.25 20.25H15.75V17.25H12.75V15.75H15.75V12.75H17.25V15.75H20.25V17.25H17.25V20.25ZM4.5 12.75L3.75 13.5V19.5L4.5 20.25H10.5L11.25 19.5V13.5L10.5 12.75H4.5ZM5.25 18.75V14.25H9.75V18.75H5.25Z" fill="#ffffff"></path>
                </g>
              </svg>
              <h3 className="text-sm font-medium text-gray-200 mb-1">Add New Software</h3>
              <p className="text-gray-400 text-xs">Click to add a new software type</p>
            </div>
          </Card>
        </AspectRatio>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AspectRatio ratio={3/4} className="w-full">
        <Card 
          className={`relative overflow-hidden h-full cursor-pointer w-full border-0 ${isSelected && showSelectionIndicator ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
          {software?.photo_url ? (
            <img 
              src={software.photo_url} 
              alt={software.name} 
              className="object-cover w-full h-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          ) : (
            <div className="bg-slate-800 w-full h-full flex items-center justify-center">
              <Server className="h-12 w-12 text-slate-600" />
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 w-full p-3 z-20">
            <h3 className="text-sm font-medium text-white line-clamp-2 mb-0.5">{software?.name}</h3>
            {software?.description && (
              <p className="text-xs text-gray-300 line-clamp-2 opacity-80">{software.description}</p>
            )}
          </div>

          {showSelectionIndicator && isSelected && (
            <div className="absolute top-2 right-2 z-20 bg-blue-500 text-white rounded-full p-1">
              <Check className="h-4 w-4" />
            </div>
          )}

          {isAlwaysIncluded && (
            <div className="absolute top-2 left-2 z-20 bg-amber-600/90 text-white text-xs px-1.5 py-0.5 rounded">
              Required
            </div>
          )}

          {onEdit && software && (
            <Button
              onClick={handleEditClick}
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 z-20 text-white hover:bg-black/30 hover:text-white"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </Card>
      </AspectRatio>
    </div>
  );
};

export default SoftwareTypeCard;
