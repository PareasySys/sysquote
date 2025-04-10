
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuoteTrainingHours, TrainingPlanHours } from "@/hooks/useQuoteTrainingHours";
import { Clock, Calendar, Minus, Plus, Save, PenLine } from "lucide-react";

interface TrainingHoursSummaryProps {
  quoteId?: string;
}

const TrainingHoursSummary: React.FC<TrainingHoursSummaryProps> = ({ quoteId }) => {
  const { 
    trainingHours, 
    totalHours, 
    loading, 
    error, 
    updateTrainingHours 
  } = useQuoteTrainingHours(quoteId);

  const [editMode, setEditMode] = useState<{ [key: number]: boolean }>({});
  const [editValues, setEditValues] = useState<{ [key: number]: number }>({});

  const handleEditToggle = (planId: number, currentHours: number) => {
    setEditMode(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));

    if (!editMode[planId]) {
      setEditValues(prev => ({
        ...prev,
        [planId]: currentHours
      }));
    }
  };

  const handleInputChange = (planId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditValues(prev => ({
      ...prev,
      [planId]: numValue < 0 ? 0 : numValue
    }));
  };

  const handleIncrement = (planId: number) => {
    setEditValues(prev => ({
      ...prev,
      [planId]: (prev[planId] || 0) + 1
    }));
  };

  const handleDecrement = (planId: number) => {
    setEditValues(prev => ({
      ...prev,
      [planId]: Math.max(0, (prev[planId] || 0) - 1)
    }));
  };

  const handleSave = async (planId: number) => {
    const hours = editValues[planId] || 0;
    const success = await updateTrainingHours(planId, hours);
    if (success) {
      setEditMode(prev => ({
        ...prev,
        [planId]: false
      }));
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-200 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-white" />
            Training Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 p-4 text-center">Loading training hours...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-200 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-white" />
            Training Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-400 p-4 text-center">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/80 border border-white/5 p-4">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-200 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-white" />
          Training Hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trainingHours.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingHours.map((plan) => (
                  <Card key={plan.plan_id} className="bg-slate-700/50 border border-slate-600/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {plan.icon_name ? (
                            <div className="w-8 h-8 flex items-center justify-center bg-slate-600 rounded-md">
                              <Clock className="h-5 w-5 text-gray-300" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center bg-slate-600 rounded-md">
                              <Clock className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                          <h4 className="font-medium text-gray-200">{plan.plan_name}</h4>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                          onClick={() => handleEditToggle(plan.plan_id, plan.training_hours)}
                        >
                          <PenLine className="h-4 w-4" />
                        </Button>
                      </div>

                      {editMode[plan.plan_id] ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDecrement(plan.plan_id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <Input
                            type="number"
                            min="0"
                            value={editValues[plan.plan_id] || 0}
                            onChange={(e) => handleInputChange(plan.plan_id, e.target.value)}
                            className="bg-slate-800 border-slate-700 text-center"
                          />
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleIncrement(plan.plan_id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            variant="default"
                            size="sm"
                            className="ml-2"
                            onClick={() => handleSave(plan.plan_id)}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-white text-center">
                          {plan.training_hours}
                          <span className="text-sm font-normal text-gray-400 ml-1">hours</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="mt-6 p-4 border-t border-slate-700">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-200">Total Training Hours:</h3>
                  <div className="text-2xl font-bold text-white">
                    {totalHours}
                    <span className="text-sm font-normal text-gray-400 ml-1">hours</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-400 p-4 text-center border border-dashed border-gray-700 rounded-lg">
              No training plans configured. Training hours will appear here once plans are added.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrainingHoursSummary;
