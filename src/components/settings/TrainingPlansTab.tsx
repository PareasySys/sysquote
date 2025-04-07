
import React from "react";
import { useTrainingPlans, TrainingPlan } from "@/hooks/useTrainingPlans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Plus } from "lucide-react";

const TrainingPlansTab = () => {
  const { plans, loading, error, fetchPlans } = useTrainingPlans();

  if (loading) {
    return (
      <div className="p-4">
        <TextShimmerWave
          className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
          duration={1}
          spread={1}
          zDistance={1}
          scaleDistance={1.1}
          rotateYDistance={10}
        >
          Loading Training Plans
        </TextShimmerWave>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
        <p className="text-red-300">{error}</p>
        <Button 
          onClick={() => fetchPlans()} 
          variant="outline" 
          className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Training Plans</h2>
        <Button className="bg-blue-700 hover:bg-blue-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add New Training Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 mb-6">No training plans available. Add your first one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.plan_id} className="p-4 bg-slate-800/80 border border-white/5">
              <h3 className="font-semibold text-gray-200">{plan.name}</h3>
              <p className="text-gray-400 text-sm my-2">{plan.description || 'No description available'}</p>
              {plan.display_order !== null && (
                <div className="text-xs text-gray-500">Display Order: {plan.display_order}</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingPlansTab;
