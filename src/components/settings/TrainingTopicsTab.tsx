
import React, { useState, useEffect } from "react";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useMachineTrainingRequirements } from "@/hooks/useMachineTrainingRequirements";
import { useTrainingTopics, TrainingTopic } from "@/hooks/useTrainingTopics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Trash, Plus, Edit, Save, X, Book, List } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

interface TopicItemProps {
  topic: TrainingTopic;
  onDelete: (topicId: number) => Promise<void>;
  onUpdate: (topicId: number, text: string) => Promise<void>;
}

const TopicItem: React.FC<TopicItemProps> = ({ topic, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(topic.topic_text);

  const handleSave = async () => {
    if (editText.trim() === "") return;
    await onUpdate(topic.topic_id, editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(topic.topic_text);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-gray-700/50 group">
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 bg-slate-800 border-slate-700 text-gray-100"
            autoFocus
          />
          <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-900/20">
            <Save size={16} />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleCancel} className="h-8 w-8 text-gray-400 hover:text-gray-300 hover:bg-gray-700/20">
            <X size={16} />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 text-gray-200">{topic.topic_text}</div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setIsEditing(true)} 
              className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
            >
              <Edit size={16} />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => onDelete(topic.topic_id)}
              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <Trash size={16} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

const TrainingTopicsTab: React.FC = () => {
  const { machines, loading: machinesLoading } = useMachineTypes();
  const { plans, loading: plansLoading } = useTrainingPlans();
  const [expandedMachineId, setExpandedMachineId] = useState<number | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [currentRequirementId, setCurrentRequirementId] = useState<number | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [requirements, setRequirements] = useState<Record<string, number>>({});
  const [isLoadingRequirement, setIsLoadingRequirement] = useState(false);
  
  const { topics, loading: topicsLoading, addTopic, deleteTopic, updateTopic } = useTrainingTopics(currentRequirementId || undefined);

  const fetchRequirement = async (machineId: number, planId: number) => {
    setIsLoadingRequirement(true);
    const key = `${machineId}-${planId}`;
    
    try {
      // Check if we already have this requirement in our local cache
      if (requirements[key]) {
        setCurrentRequirementId(requirements[key]);
        return requirements[key];
      }
      
      // Check if requirement exists
      const { data: existingReq, error: fetchError } = await supabase
        .from('machine_training_requirements')
        .select('id')
        .eq('machine_type_id', machineId)
        .eq('plan_id', planId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (existingReq) {
        // Requirement exists, use it
        setRequirements(prev => ({ ...prev, [key]: existingReq.id }));
        setCurrentRequirementId(existingReq.id);
        return existingReq.id;
      } else {
        // Create a new requirement
        const { data: newReq, error: insertError } = await supabase
          .from('machine_training_requirements')
          .insert({
            machine_type_id: machineId,
            plan_id: planId,
            resource_id: null // Default to null as it's not needed for topics
          })
          .select();
        
        if (insertError) throw insertError;
        
        if (newReq && newReq[0]) {
          setRequirements(prev => ({ ...prev, [key]: newReq[0].id }));
          setCurrentRequirementId(newReq[0].id);
          return newReq[0].id;
        }
      }
      
      return null;
    } catch (err) {
      console.error("Error fetching/creating requirement:", err);
      toast.error("Failed to load training topics");
      return null;
    } finally {
      setIsLoadingRequirement(false);
    }
  };
  
  const handleMachineSelect = (machineId: number) => {
    setExpandedMachineId(prevId => prevId === machineId ? null : machineId);
    setExpandedPlanId(null);
    setCurrentRequirementId(null);
  };
  
  const handlePlanSelect = async (machineId: number, planId: number) => {
    if (expandedPlanId === planId && expandedMachineId === machineId) {
      setExpandedPlanId(null);
      setCurrentRequirementId(null);
      return;
    }
    
    setExpandedPlanId(planId);
    await fetchRequirement(machineId, planId);
  };
  
  const handleAddTopic = async () => {
    if (!newTopic.trim() || !currentRequirementId) return;
    
    const success = await addTopic(newTopic);
    if (success) {
      setNewTopic("");
      toast.success("Topic added");
    }
  };
  
  const handleDeleteTopic = async (topicId: number) => {
    const success = await deleteTopic(topicId);
    if (success) {
      toast.success("Topic deleted");
    }
  };
  
  const handleUpdateTopic = async (topicId: number, text: string) => {
    if (!text.trim()) return;
    const success = await updateTopic(topicId, text);
    if (success) {
      toast.success("Topic updated");
    }
  };
  
  if (machinesLoading || plansLoading) {
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

  return (
    <div className="p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Training Topics</h2>
        <div className="text-sm text-gray-400">
          Manage specific topics for each machine-plan combination
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {machines.map((machine) => (
          <Card key={machine.machine_type_id} className="bg-slate-800/80 border-slate-700/50">
            <AccordionItem value={machine.machine_type_id.toString()} className="border-0">
              <AccordionTrigger 
                onClick={() => handleMachineSelect(machine.machine_type_id)}
                className="px-4 py-3 hover:bg-slate-700/30 text-gray-100"
              >
                <span className="flex items-center gap-2">
                  <Book className="w-5 h-5 text-blue-400" />
                  {machine.name}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-4 pb-3 space-y-2">
                  {plans.map((plan) => (
                    <Card key={plan.plan_id} className="bg-slate-700/50 border-slate-600/50">
                      <AccordionItem value={`${machine.machine_type_id}-${plan.plan_id}`} className="border-0">
                        <AccordionTrigger
                          onClick={() => handlePlanSelect(machine.machine_type_id, plan.plan_id)}
                          className="px-4 py-2 hover:bg-slate-600/30 text-gray-200"
                        >
                          <span className="flex items-center gap-2">
                            <List className="w-4 h-4 text-green-400" />
                            {plan.name}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          {isLoadingRequirement ? (
                            <div className="p-4 text-center text-sm text-gray-400">
                              Loading topics...
                            </div>
                          ) : (
                            <CardContent className="p-4 bg-slate-800/50">
                              <div className="mb-4">
                                <div className="font-medium text-gray-300 mb-3">Topics</div>
                                <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                                  {topics.length === 0 ? (
                                    <div className="text-gray-400 text-sm italic">
                                      No topics defined yet
                                    </div>
                                  ) : (
                                    topics.map((topic) => (
                                      <TopicItem 
                                        key={topic.topic_id}
                                        topic={topic}
                                        onDelete={handleDeleteTopic}
                                        onUpdate={handleUpdateTopic}
                                      />
                                    ))
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Add new topic..."
                                  value={newTopic}
                                  onChange={(e) => setNewTopic(e.target.value)}
                                  className="flex-1 bg-slate-700 border-slate-600 text-gray-200"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddTopic();
                                  }}
                                />
                                <Button 
                                  onClick={handleAddTopic} 
                                  disabled={!newTopic.trim() || !currentRequirementId}
                                  size="sm"
                                  className="gap-1"
                                >
                                  <Plus size={16} />
                                  Add
                                </Button>
                              </div>
                            </CardContent>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TrainingTopicsTab;
