
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMachineTypes } from '@/hooks/useMachineTypes';
import { useSoftwareTypes } from '@/hooks/useSoftwareTypes';
import { useTrainingPlans } from '@/hooks/useTrainingPlans';
import { useTrainingTopics } from '@/hooks/useTrainingTopics';
import { PlusCircle, Pencil, Save, X, Trash2, CheckSquare } from 'lucide-react';

// Static items for the sidebar
export default function TrainingTopicsTab() {
  const { machines, loading: machinesLoading } = useMachineTypes();
  const { software, loading: softwareLoading } = useSoftwareTypes();
  const { plans, loading: plansLoading } = useTrainingPlans();
  
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<"machine" | "software" | null>(null);
  
  const [newTopic, setNewTopic] = useState<string>('');
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editedTopicText, setEditedTopicText] = useState<string>('');
  
  // Get topics for the selected item and plan
  const { 
    topics, 
    loading: topicsLoading, 
    error: topicsError, 
    addTopic, 
    deleteTopic, 
    updateTopic 
  } = useTrainingTopics(
    selectedItemId ? [selectedItemId] : [],
    selectedPlanId,
    selectedItemType
  );

  const handleItemSelect = (itemId: number, itemType: "machine" | "software") => {
    if (expandedItemId === itemId && selectedItemType === itemType) {
      setExpandedItemId(null);
      setExpandedPlanId(null);
      setSelectedItemId(null);
      setSelectedPlanId(null);
      setSelectedItemType(null);
    } else {
      setExpandedItemId(itemId);
      setExpandedPlanId(null);
      setSelectedItemId(itemId);
      setSelectedPlanId(null);
      setSelectedItemType(itemType);
    }
  };
  
  const handlePlanSelect = (itemId: number, planId: number, itemType: "machine" | "software") => {
    if (expandedPlanId === planId && expandedItemId === itemId && selectedItemType === itemType) {
      setExpandedPlanId(null);
      setSelectedItemId(null);
      setSelectedPlanId(null);
      setSelectedItemType(null);
    } else {
      setExpandedPlanId(planId);
      setSelectedItemId(itemId);
      setSelectedPlanId(planId);
      setSelectedItemType(itemType);
    }
  };
  
  const handleAddTopic = async () => {
    if (!newTopic.trim()) return;
    
    const success = await addTopic(newTopic);
    if (success) {
      setNewTopic('');
    }
  };
  
  const handleStartEdit = (topicId: number, currentText: string) => {
    setEditingTopicId(topicId);
    setEditedTopicText(currentText);
  };
  
  const handleCancelEdit = () => {
    setEditingTopicId(null);
    setEditedTopicText('');
  };
  
  const handleSaveEdit = async (topicId: number) => {
    if (!editedTopicText.trim()) return;
    
    const success = await updateTopic(topicId, editedTopicText);
    if (success) {
      setEditingTopicId(null);
      setEditedTopicText('');
    }
  };
  
  const handleDeleteTopic = async (topicId: number) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      await deleteTopic(topicId);
    }
  };
  
  const isLoading = machinesLoading || softwareLoading || plansLoading;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-4">
        <Card className="bg-slate-800/80 border border-white/5 p-4">
          <h3 className="text-xl font-semibold mb-4 text-gray-200">Machines</h3>
          {machinesLoading ? (
            <p className="text-gray-400">Loading machines...</p>
          ) : (
            <Accordion type="single" collapsible>
              {machines.map((machine) => (
                <AccordionItem key={machine.machine_type_id} value={machine.machine_type_id.toString()}>
                  <AccordionTrigger 
                    onClick={() => handleItemSelect(machine.machine_type_id, "machine")}
                    className={selectedItemId === machine.machine_type_id && selectedItemType === "machine" ? 'font-semibold' : ''}
                  >
                    {machine.name}
                  </AccordionTrigger>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </Card>

        <Card className="bg-slate-800/80 border border-white/5 p-4 mt-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-200">Software</h3>
          {softwareLoading ? (
            <p className="text-gray-400">Loading software...</p>
          ) : (
            <Accordion type="single" collapsible>
              {software.map((soft) => (
                <AccordionItem key={soft.software_type_id} value={soft.software_type_id.toString()}>
                  <AccordionTrigger 
                    onClick={() => handleItemSelect(soft.software_type_id, "software")}
                    className={selectedItemId === soft.software_type_id && selectedItemType === "software" ? 'font-semibold' : ''}
                  >
                    {soft.name}
                  </AccordionTrigger>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </Card>
      </div>

      <div className="md:col-span-8">
        {selectedItemId && selectedItemType && (
          <Card className="bg-slate-800/80 border border-white/5 p-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">Training Plans</h3>
            {plansLoading ? (
              <p className="text-gray-400">Loading training plans...</p>
            ) : (
              <Accordion type="single" collapsible>
                {plans.map((plan) => (
                  <AccordionItem key={plan.plan_id} value={plan.plan_id.toString()}>
                    <AccordionTrigger
                      onClick={() => handlePlanSelect(selectedItemId, plan.plan_id, selectedItemType)}
                      className={selectedPlanId === plan.plan_id && selectedItemId === selectedItemId && selectedItemType === selectedItemType ? 'font-semibold' : ''}
                    >
                      {plan.name}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-4">
                        <Label htmlFor="new-topic" className="text-gray-300">New Topic:</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Input
                            type="text"
                            id="new-topic"
                            className="bg-slate-700 border-slate-600 text-gray-200"
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                          />
                          <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm"
                            onClick={handleAddTopic}
                            disabled={isLoading}
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Topic
                          </Button>
                        </div>
                      </div>

                      {topicsLoading ? (
                        <p className="text-gray-400">Loading topics...</p>
                      ) : topicsError ? (
                        <p className="text-red-400">Error: {topicsError}</p>
                      ) : (
                        <ul className="space-y-2">
                          {topics.map((topic) => (
                            <li key={topic.topic_id} className="flex items-center justify-between bg-slate-700/50 rounded p-2">
                              {editingTopicId === topic.topic_id ? (
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="text"
                                    className="bg-slate-600 border-slate-500 text-gray-200"
                                    value={editedTopicText}
                                    onChange={(e) => setEditedTopicText(e.target.value)}
                                  />
                                  <Button 
                                    type="button" 
                                    variant="secondary" 
                                    size="sm"
                                    onClick={() => handleSaveEdit(topic.topic_id)}
                                    disabled={isLoading}
                                  >
                                    <CheckSquare className="h-4 w-4 mr-2" />
                                    Save
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    disabled={isLoading}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-gray-300">{topic.topic_text}</span>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStartEdit(topic.topic_id, topic.topic_text)}
                                      disabled={isLoading}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteTopic(topic.topic_id)}
                                      disabled={isLoading}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
