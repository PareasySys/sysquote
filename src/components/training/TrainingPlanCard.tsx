
import React from "react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { TrainingPlan } from "@/hooks/useTrainingPlans";
import { useTrainingIcons } from "@/hooks/useTrainingIcons";
import { Edit2 } from "lucide-react";

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
    <Card className="overflow-hidden bg-slate-700/50 border-slate-600/30 hover:border-blue-500/50 hover:bg-slate-700/80 transition-all cursor-pointer group">
      <div className="relative">
        <AspectRatio ratio={16/9} className="bg-slate-800 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
          <img
            src={iconUrl}
            alt={plan.name}
            className="w-16 h-16 object-contain p-2 z-0"
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 bg-slate-800/60 hover:bg-slate-700 z-20 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleEditClick}
          >
            <Edit2 className="h-4 w-4 text-white" />
          </Button>
        </AspectRatio>
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-200 mb-1">{plan.name}</h3>
        {plan.display_order !== null && (
          <div className="text-xs text-gray-400">Order: {plan.display_order}</div>
        )}
        {plan.description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{plan.description}</p>
        )}
      </div>
    </Card>
  );
};

export default TrainingPlanCard;
