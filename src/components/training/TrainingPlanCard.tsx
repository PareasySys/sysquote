
import React from "react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { TrainingPlan } from "@/hooks/useTrainingPlans";
import { useTrainingIcons } from "@/hooks/useTrainingIcons";
import { Edit, Plus, Layout } from "lucide-react";

interface TrainingPlanCardProps {
  plan?: TrainingPlan;
  isAddCard?: boolean;
  onEdit?: (plan: TrainingPlan) => void;
  onAddNew?: () => void;
}

const TrainingPlanCard: React.FC<TrainingPlanCardProps> = ({ 
  plan, 
  isAddCard = false,
  onEdit,
  onAddNew
}) => {
  const { icons } = useTrainingIcons();
  
  const handleClick = () => {
    if (isAddCard && onAddNew) {
      onAddNew();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (plan && onEdit) {
      onEdit(plan);
    }
  };

  // Find the icon from storage bucket that matches the plan's icon_name
  const iconUrl = !isAddCard && plan?.icon_name 
    ? icons.find(icon => icon.name === plan.icon_name)?.url || null
    : null;

  if (isAddCard) {
    return (
      <div className="w-full">
        <AspectRatio ratio={3/4} className="w-full">
          <Card 
            onClick={handleClick}
            className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-slate-700/70 to-slate-900/70 border-dashed border-slate-600/50 flex flex-col items-center justify-center h-full w-full"
          >
            <div className="p-4 text-center flex flex-col items-center">
              <Plus className="w-12 h-12 mb-3 mx-auto text-slate-300" />
              <h3 className="text-sm font-medium text-gray-200 mb-1">Add New Training Plan</h3>
              <p className="text-gray-400 text-xs">Click to add a new plan</p>
            </div>
          </Card>
        </AspectRatio>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AspectRatio ratio={3/4} className="w-full">
        <Card className="relative overflow-hidden h-full cursor-default w-full border-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
          <div className="bg-slate-800 w-full h-full flex items-center justify-center">
            {iconUrl ? (
              <img 
                src={iconUrl} 
                alt={plan?.name || "Training plan icon"} 
                className="w-full h-full object-contain p-8"
                onError={(e) => {
                  console.error(`Error loading icon: ${iconUrl}`);
                  const target = e.target as HTMLImageElement;
                  // Don't fallback to any local SVG, just show placeholder
                  target.src = "/placeholder.svg";
                }}
              />
            ) : (
              <Layout className="text-slate-500 w-16 h-16" />
            )}
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-2 z-20">
            <h3 className="text-sm font-semibold text-white mb-1">{plan?.name}</h3>
            {plan?.description && (
              <div className="text-xs text-gray-400 truncate">{plan.description}</div>
            )}
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-1 right-1 bg-slate-800/60 hover:bg-slate-700 z-20 h-8 w-8"
            onClick={handleEditClick}
          >
            <Edit className="h-4 w-4 text-white" />
          </Button>
        </Card>
      </AspectRatio>
    </div>
  );
};

export default TrainingPlanCard;
