
import React from "react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { TrainingPlan } from "@/hooks/useTrainingPlans";
import { useTrainingIcons } from "@/hooks/useTrainingIcons";

interface TrainingPlanCardProps {
  plan: TrainingPlan;
  onEdit: (plan: TrainingPlan) => void;
}

const TrainingPlanCard: React.FC<TrainingPlanCardProps> = ({
  plan,
  onEdit
}) => {
  const { icons } = useTrainingIcons();
  
  // Find the icon that matches the plan's icon_name
  const iconUrl = icons.find(icon => icon.name === plan.icon_name)?.url || 
                  icons.find(icon => icon.name === "skill-level-basic")?.url || 
                  "/training-plan-icons/skill-level-basic.svg";

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(plan);
  };

  return (
    <div className="w-full">
      <AspectRatio ratio={3/4} className="w-full">
        <Card className="relative overflow-hidden h-full cursor-pointer w-full border-0 bg-slate-800 flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
          
          <div className="flex-1 flex items-center justify-center p-4">
            <img 
              src={iconUrl}
              alt={plan.name}
              className="w-12 h-12 object-contain"
            />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-2 z-20">
            <h3 className="text-sm font-semibold text-white mb-1">{plan.name}</h3>
            {plan.display_order !== null && (
              <div className="text-xs text-gray-500">Order: {plan.display_order}</div>
            )}
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-1 right-1 bg-slate-800/60 hover:bg-slate-700 z-20 h-8 w-8"
            onClick={handleEditClick}
          >
            <svg 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6"
            >
              <g id="Complete">
                <g id="edit">
                  <g>
                    <path d="M20,16v4a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V6A2,2,0,0,1,4,4H8" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    <polygon fill="none" points="12.5 15.8 22 6.2 17.8 2 8.3 11.5 8 16 12.5 15.8" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></polygon>
                  </g>
                </g>
              </g>
            </svg>
          </Button>
        </Card>
      </AspectRatio>
    </div>
  );
};

export default TrainingPlanCard;
