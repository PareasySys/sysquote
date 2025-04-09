import React, { useState } from "react";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import { useSoftwareTypes } from "@/hooks/useSoftwareTypes"; 
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useTrainingTopics, TrainingTopic } from "@/hooks/useTrainingTopics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Trash, Plus, Edit, Save, X, Server, Database, List, Cpu, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { software, loading: softwareLoading } = useSoftwareTypes();
  const { plans, loading: plansLoading } = useTrainingPlans();
  
  const [activeTab, setActiveTab] = useState<string>("machines");
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  
  const { 
    topics, 
    loading: topicsLoading, 
    addTopic, 
    deleteTopic, 
    updateTopic 
  } = useTrainingTopics(selectedItemId || undefined, selectedPlanId || undefined, selectedItemType || undefined);

  const handleItemSelect = (itemId: number, itemType: string) => {
    if (expandedItemId === itemId && selectedItemType === itemType) {
      setExpandedItemId(null);
      setExpandedPlanId(null);
      setSelectedItemId(null);
      setSelectedPlanId(null);
      setSelectedItemType(null);
    } else {
      setExpandedItemId(itemId);
      setExpandedPlanId(null);
      setSelectedItemId(null);
      setSelectedPlanId(null);
      setSelectedItemType(itemType);
    }
  };
  
  const handlePlanSelect = (itemId: number, planId: number, itemType: string) => {
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
    if (!newTopic.trim() || !selectedItemId || !selectedPlanId || !selectedItemType) return;
    
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
  
  if (machinesLoading || plansLoading || softwareLoading) {
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
          Manage specific topics for each machine/software-plan combination
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="bg-slate-700/50 mb-2">
          <TabsTrigger 
            value="machines" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Machines
          </TabsTrigger>
          <TabsTrigger 
            value="software" 
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Software
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="machines" className="mt-0">
          <div className="grid grid-cols-1 gap-4">
            {machines.map((machine) => (
              <Card key={machine.machine_type_id} className="bg-slate-800/80 border-slate-700/50">
                <Accordion type="single" collapsible value={expandedItemId === machine.machine_type_id && selectedItemType === "machine" ? machine.machine_type_id.toString() : ""}>
                  <AccordionItem value={machine.machine_type_id.toString()} className="border-0">
                    <AccordionTrigger 
                      onClick={() => handleItemSelect(machine.machine_type_id, "machine")}
                      className="px-4 py-3 hover:bg-slate-700/30 text-gray-100"
                    >
                      <span className="flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-blue-400" />
                        {machine.name}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-3 space-y-2">
                        {plans.map((plan) => (
                          <Card key={plan.plan_id} className="bg-slate-700/50 border-slate-600/50">
                            <Accordion type="single" collapsible value={
                              expandedPlanId === plan.plan_id && expandedItemId === machine.machine_type_id && selectedItemType === "machine"
                                ? `${machine.machine_type_id}-${plan.plan_id}` 
                                : ""
                            }>
                              <AccordionItem value={`${machine.machine_type_id}-${plan.plan_id}`} className="border-0">
                                <AccordionTrigger
                                  onClick={() => handlePlanSelect(machine.machine_type_id, plan.plan_id, "machine")}
                                  className="px-4 py-2 hover:bg-slate-600/30 text-gray-200"
                                >
                                  <span className="flex items-center gap-2">
                                    <List className="w-4 h-4 text-green-400" />
                                    {plan.name}
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  {topicsLoading ? (
                                    <div className="p-4 text-center text-sm text-gray-400">
                                      Loading topics...
                                    </div>
                                  ) : (
                                    <CardContent className="p-4 bg-slate-800/50">
                                      <div className="mb-4">
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
                                          disabled={!newTopic.trim()}
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
                            </Accordion>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="software" className="mt-0">
          <div className="grid grid-cols-1 gap-4">
            {software.map((softwareItem) => (
              <Card key={softwareItem.software_type_id} className="bg-slate-800/80 border-slate-700/50">
                <Accordion type="single" collapsible value={expandedItemId === softwareItem.software_type_id && selectedItemType === "software" ? softwareItem.software_type_id.toString() : ""}>
                  <AccordionItem value={softwareItem.software_type_id.toString()} className="border-0">
                    <AccordionTrigger 
                      onClick={() => handleItemSelect(softwareItem.software_type_id, "software")}
                      className="px-4 py-3 hover:bg-slate-700/30 text-gray-100"
                    >
                      <span className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-green-400" />
                        {softwareItem.name}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-3 space-y-2">
                        {plans.map((plan) => (
                          <Card key={plan.plan_id} className="bg-slate-700/50 border-slate-600/50">
                            <Accordion type="single" collapsible value={
                              expandedPlanId === plan.plan_id && expandedItemId === softwareItem.software_type_id && selectedItemType === "software"
                                ? `${softwareItem.software_type_id}-${plan.plan_id}` 
                                : ""
                            }>
                              <AccordionItem value={`${softwareItem.software_type_id}-${plan.plan_id}`} className="border-0">
                                <AccordionTrigger
                                  onClick={() => handlePlanSelect(softwareItem.software_type_id, plan.plan_id, "software")}
                                  className="px-4 py-2 hover:bg-slate-600/30 text-gray-200"
                                >
                                  <span className="flex items-center gap-2">
                                    <List className="w-4 h-4 text-green-400" />
                                    {plan.name}
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  {topicsLoading ? (
                                    <div className="p-4 text-center text-sm text-gray-400">
                                      Loading topics...
                                    </div>
                                  ) : (
                                    <CardContent className="p-4 bg-slate-800/50">
                                      <div className="mb-4">
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
                                          disabled={!newTopic.trim()}
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
                            </Accordion>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingTopicsTab;
