
import React, { useState } from "react";
import { useTrainingPlans, TrainingPlan } from "@/hooks/useTrainingPlans";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import TrainingPlanCard from "@/components/training/TrainingPlanCard";
import TrainingPlanModal from "@/components/training/TrainingPlanModal";
import { Button } from "@/components/ui/button";

const TrainingPlansTab = () => {
  const { plans, loading, error, fetchPlans } = useTrainingPlans();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);

  const handleAddNew = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const handleEdit = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

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
    <div className="p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Training Plans</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {/* Add New Card */}
        <TrainingPlanCard isAddCard onAddNew={handleAddNew} />
        
        {/* Training Plan Cards */}
        {plans.map((plan) => (
          <TrainingPlanCard 
            key={plan.plan_id} 
            plan={plan} 
            onEdit={() => handleEdit(plan)}
          />
        ))}
      </div>

      {/* Modal for adding/editing training plans */}
      <TrainingPlanModal
        open={isModalOpen}
        onClose={handleCloseModal}
        plan={selectedPlan}
        onSave={fetchPlans}
      />
    </div>
  );
};

export default TrainingPlansTab;
