
import React from "react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { TrainingPlan } from "@/hooks/useTrainingPlans";
import { useTrainingIcons } from "@/hooks/useTrainingIcons";
import { Edit2 } from "lucide-react";

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

  // Find the icon that matches the plan's icon_name if this is not an add card
  const iconUrl = !isAddCard && plan?.icon_name 
    ? icons.find(icon => icon.name === plan.icon_name)?.url || 
      icons.find(icon => icon.name === "skill-level-basic")?.url || 
      "/training-plan-icons/skill-level-basic.svg"
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
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-12 h-12 mb-3 mx-auto text-slate-300"
              >
                <g id="SVGRepo_iconCarrier">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3.75 4.5L4.5 3.75H10.5L11.25 4.5V10.5L10.5 11.25H4.5L3.75 10.5V4.5ZM5.25 5.25V9.75H9.75V5.25H5.25ZM13.5 3.75L12.75 4.5V10.5L13.5 11.25H19.5L20.25 10.5V4.5L19.5 3.75H13.5ZM14.25 9.75V5.25H18.75V9.75H14.25ZM17.25 20.25H15.75V17.25H12.75V15.75H15.75V12.75H17.25V15.75H20.25V17.25H17.25V20.25ZM4.5 12.75L3.75 13.5V19.5L4.5 20.25H10.5L11.25 19.5V13.5L10.5 12.75H4.5ZM5.25 18.75V14.25H9.75V18.75H5.25Z" fill="currentColor"></path>
                </g>
              </svg>
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
              />
            ) : (
              <span className="text-slate-500 text-sm">No Icon</span>
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
            <Edit2 className="h-4 w-4 text-white" />
          </Button>
        </Card>
      </AspectRatio>
    </div>
  );
};

export default TrainingPlanCard;
