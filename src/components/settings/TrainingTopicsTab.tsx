
import React, { useState } from "react";
import { useTrainingTopics } from "@/hooks/useTrainingTopics";
import { Button } from "@/components/ui/button";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { syncAllPlanningDetailsWithRequirements } from "@/services/planningDetailsService";
import { toast } from "sonner";

const TrainingTopicsTab = () => {
  const { topics, loading, error, fetchTopics } = useTrainingTopics();

  const handleSync = async () => {
    try {
      await syncAllPlanningDetailsWithRequirements();
      toast.success("Planning details synchronized with training topics");
    } catch (err: any) {
      console.error("Error syncing planning details:", err);
      toast.error(err.message || "Failed to sync planning details");
    }
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
          Loading Training Topics
        </TextShimmerWave>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
        <p className="text-red-300">{error}</p>
        <Button 
          onClick={() => fetchTopics()} 
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
        <h2 className="text-xl font-semibold text-gray-100">Training Topics</h2>
        <Button 
          onClick={handleSync}
          className="bg-blue-700 hover:bg-blue-800"
        >
          Sync Planning Details
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {topics.length > 0 ? (
          topics.map((topic) => (
            <div 
              key={topic.id} 
              className="p-4 bg-slate-800 rounded-lg border border-slate-700"
            >
              <h3 className="text-md font-medium text-gray-100">{topic.name}</h3>
              {topic.description && (
                <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-400">No training topics available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingTopicsTab;
