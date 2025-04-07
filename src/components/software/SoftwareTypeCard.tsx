
import React from "react";
import { Card } from "@/components/ui/card";
import { SoftwareType } from "@/hooks/useSoftwareTypes";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Plus } from "lucide-react";

interface SoftwareTypeCardProps {
  software?: SoftwareType;
  isAddCard?: boolean;
  onAddNew?: () => void;
  onEdit?: () => void;
}

const SoftwareTypeCard: React.FC<SoftwareTypeCardProps> = ({
  software,
  isAddCard = false,
  onAddNew,
  onEdit,
}) => {
  if (isAddCard) {
    return (
      <Card
        className="p-2 bg-slate-800/50 border border-dashed border-blue-500/50 cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={onAddNew}
      >
        <AspectRatio ratio={1} className="mb-2">
          <div className="w-full h-full flex items-center justify-center">
            <Plus className="w-12 h-12 text-blue-500/70" />
          </div>
        </AspectRatio>
        <div className="text-center text-sm text-blue-400 font-medium py-2">
          Add New Software
        </div>
      </Card>
    );
  }

  if (!software) return null;

  return (
    <Card
      className="p-2 bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/50 cursor-pointer hover:bg-slate-800 transition-colors"
      onClick={onEdit}
    >
      <AspectRatio ratio={1} className="mb-2 bg-slate-900 rounded-md overflow-hidden">
        {software.photo_url ? (
          <img
            src={software.photo_url}
            alt={software.name}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
            No Image
          </div>
        )}
      </AspectRatio>
      
      <div className="p-1">
        <div className="flex justify-between items-start gap-1 mb-1">
          <h3 className="font-medium text-sm text-slate-200 truncate">
            {software.name}
          </h3>
          <div className="flex gap-1">
            {software.always_included && (
              <div className="px-1 py-0.5 bg-blue-900/50 rounded text-[10px] text-blue-300 whitespace-nowrap">
                Always
              </div>
            )}
            <div
              className={`px-1 py-0.5 rounded text-[10px] whitespace-nowrap ${
                software.is_active
                  ? "bg-green-900/50 text-green-300"
                  : "bg-red-900/50 text-red-300"
              }`}
            >
              {software.is_active ? "Active" : "Inactive"}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SoftwareTypeCard;
