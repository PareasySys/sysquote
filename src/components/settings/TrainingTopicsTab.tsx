
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMachineTypes } from '@/hooks/useMachineTypes';
import { useSoftwareTypes } from '@/hooks/useSoftwareTypes';
import { useTrainingPlans } from '@/hooks/useTrainingPlans';
import { 
  PlusCircle, 
  Pencil, 
  Save, 
  X, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Server,
  HardDrive,
  Database,
  FileCode,
  Cpu,
  Monitor,
  Printer,
  Laptop,
  FileText,
  Folder,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

// Static items for the sidebar
export default function TrainingTopicsTab() {
  const { machines, loading: machinesLoading } = useMachineTypes();
  const { software, loading: softwareLoading } = useSoftwareTypes();
  const { plans, loading: plansLoading } = useTrainingPlans();
  
  // Separate expanded states for machines and software to prevent conflicts
  const [expandedMachines, setExpandedMachines] = useState<{[key: number]: boolean}>({});
  const [expandedSoftware, setExpandedSoftware] = useState<{[key: number]: boolean}>({});
  const [expandedPlans, setExpandedPlans] = useState<{[key: string]: boolean}>({});
  
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<"machine" | "software" | null>(null);
  
  const [newTopic, setNewTopic] = useState<string>('');
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editedTopicText, setEditedTopicText] = useState<string>('');
  
  const [topicsByItemAndPlan, setTopicsByItemAndPlan] = useState<{[key: string]: any[]}>({});
  const [loadingTopics, setLoadingTopics] = useState<{[key: string]: boolean}>({});
  
  // Get machine icon by machine name
  const getMachineIcon = (machineName: string) => {
    const name = machineName.toLowerCase();
    if (name.includes('server')) return <Server size={18} className="text-white" />;
    if (name.includes('storage')) return <HardDrive size={18} className="text-white" />;
    if (name.includes('processor') || name.includes('cpu')) return <Cpu size={18} className="text-white" />;
    if (name.includes('monitor') || name.includes('display')) return <Monitor size={18} className="text-white" />;
    if (name.includes('printer')) return <Printer size={18} className="text-white" />;
    return <Server size={18} className="text-white" />;  // Default icon
  };
  
  // Get software icon by software name
  const getSoftwareIcon = (softwareName: string) => {
    const name = softwareName.toLowerCase();
    if (name.includes('database')) return <Database size={18} className="text-white" />;
    if (name.includes('code') || name.includes('programming')) return <FileCode size={18} className="text-white" />;
    return <Laptop size={18} className="text-white" />;  // Default icon
  };
  
  const toggleMachine = (machineId: number, itemType: "machine" | "software") => {
    if (itemType === "machine") {
      setExpandedMachines(prev => ({
        ...prev,
        [machineId]: !prev[machineId]
      }));
      
      if (!expandedMachines[machineId]) {
        setSelectedMachineId(machineId);
        setSelectedItemType("machine");
        setSelectedPlanId(null);
      }
    } else {
      setExpandedSoftware(prev => ({
        ...prev,
        [machineId]: !prev[machineId]
      }));
      
      if (!expandedSoftware[machineId]) {
        setSelectedMachineId(machineId);
        setSelectedItemType("software");
        setSelectedPlanId(null);
      }
    }
  };
  
  const togglePlan = (machineId: number, planId: number, itemType: "machine" | "software") => {
    const key = `${itemType}-${machineId}-plan-${planId}`;
    
    setExpandedPlans(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    if (!expandedPlans[key]) {
      setSelectedMachineId(machineId);
      setSelectedPlanId(planId);
      setSelectedItemType(itemType);
      
      if (!topicsByItemAndPlan[key] && !loadingTopics[key]) {
        fetchTopicsForItemAndPlan(machineId, planId, itemType);
      }
    }
  };
  
  const fetchTopicsForItemAndPlan = async (itemId: number, planId: number, itemType: string) => {
    const key = `${itemType}-${itemId}-plan-${planId}`;
    
    setLoadingTopics(prev => ({
      ...prev,
      [key]: true
    }));
    
    try {
      console.log(`Fetching topics for ${itemType} ${itemId}, plan ${planId}`);
      
      const columnName = itemType === "machine" ? 'machine_type_id' : 'software_type_id';
      
      const { data, error } = await supabase
        .from('training_topics')
        .select('*')
        .eq(columnName, itemId)
        .eq('plan_id', planId)
        .order('display_order', { ascending: true, nullsFirst: true });
        
      if (error) throw error;
      
      console.log(`Topics for ${key}:`, data);
      
      setTopicsByItemAndPlan(prev => ({
        ...prev,
        [key]: data || []
      }));
    } catch (err) {
      console.error(`Error fetching topics for ${key}:`, err);
      toast.error(`Failed to load topics for ${itemType}`);
    } finally {
      setLoadingTopics(prev => ({
        ...prev,
        [key]: false
      }));
    }
  };
  
  const handleAddTopic = async () => {
    if (!newTopic.trim() || !selectedMachineId || !selectedPlanId || !selectedItemType) {
      toast.error("Please select a machine and plan, and enter a topic");
      return;
    }
    
    const key = `${selectedItemType}-${selectedMachineId}-plan-${selectedPlanId}`;
    
    try {
      const columnName = selectedItemType === "machine" ? 'machine_type_id' : 'software_type_id';
      const newTopicData: any = {
        topic_text: newTopic,
        plan_id: selectedPlanId,
        item_type: selectedItemType,
        [columnName]: selectedMachineId,
        requirement_id: null
      };
      
      const { data, error } = await supabase
        .from('training_topics')
        .insert([newTopicData])
        .select();
      
      if (error) throw error;
      
      if (data) {
        const newTopicsList = [...(topicsByItemAndPlan[key] || []), data[0]];
        setTopicsByItemAndPlan(prev => ({
          ...prev,
          [key]: newTopicsList
        }));
        
        setNewTopic('');
        toast.success("Topic added successfully");
      }
    } catch (err) {
      console.error("Error adding topic:", err);
      toast.error("Failed to add topic");
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
    if (!editedTopicText.trim()) {
      toast.error("Topic text cannot be empty");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('training_topics')
        .update({ topic_text: editedTopicText })
        .eq('topic_id', topicId);
      
      if (error) throw error;
      
      if (selectedMachineId && selectedPlanId && selectedItemType) {
        const key = `${selectedItemType}-${selectedMachineId}-plan-${selectedPlanId}`;
        
        setTopicsByItemAndPlan(prev => {
          const updatedTopics = prev[key].map(topic => 
            topic.topic_id === topicId ? { ...topic, topic_text: editedTopicText } : topic
          );
          return { ...prev, [key]: updatedTopics };
        });
      }
      
      setEditingTopicId(null);
      setEditedTopicText('');
      toast.success("Topic updated successfully");
    } catch (err) {
      console.error("Error updating topic:", err);
      toast.error("Failed to update topic");
    }
  };
  
  const handleDeleteTopic = async (topicId: number) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;
    
    try {
      const { error } = await supabase
        .from('training_topics')
        .delete()
        .eq('topic_id', topicId);
      
      if (error) throw error;
      
      if (selectedMachineId && selectedPlanId && selectedItemType) {
        const key = `${selectedItemType}-${selectedMachineId}-plan-${selectedPlanId}`;
        
        setTopicsByItemAndPlan(prev => {
          const updatedTopics = prev[key].filter(topic => topic.topic_id !== topicId);
          return { ...prev, [key]: updatedTopics };
        });
      }
      
      toast.success("Topic deleted successfully");
    } catch (err) {
      console.error("Error deleting topic:", err);
      toast.error("Failed to delete topic");
    }
  };
  
  const isLoading = machinesLoading || softwareLoading || plansLoading;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full px-4">
      <div className="md:col-span-12">
        <Card className="bg-slate-800/80 border border-white/5 p-4">
          <h3 className="text-xl font-semibold mb-4 text-gray-200">Machines</h3>
          {machinesLoading ? (
            <p className="text-gray-400">Loading machines...</p>
          ) : (
            <div className="space-y-2">
              {machines.map((machine) => (
                <div key={machine.machine_type_id} className="border-b border-slate-700/30 last:border-b-0">
                  <div 
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-700/30 px-2 rounded transition-colors"
                    onClick={() => toggleMachine(machine.machine_type_id, "machine")}
                  >
                    <div className="flex items-center gap-2">
                      {getMachineIcon(machine.name)}
                      <span className="text-gray-200">{machine.name}</span>
                    </div>
                    {expandedMachines[machine.machine_type_id] ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  
                  {expandedMachines[machine.machine_type_id] && (
                    <div className="pl-4 pb-2">
                      {plansLoading ? (
                        <p className="text-gray-400 text-sm">Loading plans...</p>
                      ) : (
                        <div className="space-y-1">
                          {plans.map((plan) => {
                            const planKey = `machine-${machine.machine_type_id}-plan-${plan.plan_id}`;
                            return (
                              <div key={plan.plan_id} className="border-b border-slate-700/20 last:border-b-0">
                                <div 
                                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-slate-700/20 px-2 rounded transition-colors"
                                  onClick={() => togglePlan(machine.machine_type_id, plan.plan_id, "machine")}
                                >
                                  <div className="flex items-center gap-2">
                                    {expandedPlans[planKey] ? (
                                      <FolderOpen size={16} className="text-white" />
                                    ) : (
                                      <Folder size={16} className="text-white" />
                                    )}
                                    <span className="text-gray-300 text-sm">{plan.name}</span>
                                  </div>
                                  {expandedPlans[planKey] ? (
                                    <ChevronDown className="h-3 w-3 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-gray-500" />
                                  )}
                                </div>
                                
                                {expandedPlans[planKey] && (
                                  <div className="pl-4 pr-2 py-2 bg-slate-700/10 rounded my-1">
                                    {loadingTopics[planKey] ? (
                                      <p className="text-gray-400 text-xs">Loading topics...</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {topicsByItemAndPlan[planKey] && topicsByItemAndPlan[planKey].length > 0 ? (
                                          <>
                                            {topicsByItemAndPlan[planKey].map((topic) => (
                                              <div key={topic.topic_id} className="flex items-center justify-between bg-slate-700/50 rounded p-2">
                                                {editingTopicId === topic.topic_id ? (
                                                  <div className="flex flex-1 items-center space-x-1">
                                                    <Input
                                                      type="text"
                                                      className="bg-slate-600 border-slate-500 text-gray-200 text-xs h-7"
                                                      value={editedTopicText}
                                                      onChange={(e) => setEditedTopicText(e.target.value)}
                                                    />
                                                    <div className="flex space-x-1">
                                                      <Button 
                                                        type="button" 
                                                        variant="secondary" 
                                                        size="sm"
                                                        className="h-7"
                                                        onClick={() => handleSaveEdit(topic.topic_id)}
                                                      >
                                                        <Save className="h-3 w-3 text-white" />
                                                      </Button>
                                                      <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="h-7"
                                                        onClick={handleCancelEdit}
                                                      >
                                                        <X className="h-3 w-3 text-white" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <div className="flex items-center gap-2">
                                                      <FileText size={14} className="text-white" />
                                                      <span className="text-gray-300 text-xs">{topic.topic_text}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleStartEdit(topic.topic_id, topic.topic_text)}
                                                      >
                                                        <Pencil className="h-3 w-3 text-white" />
                                                      </Button>
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleDeleteTopic(topic.topic_id)}
                                                      >
                                                        <Trash2 className="h-3 w-3 text-red-500" />
                                                      </Button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            ))}
                                            
                                            {/* Add new topic field after existing topics */}
                                            <div className="flex items-center space-x-2 mt-2">
                                              <Input
                                                type="text"
                                                className="bg-slate-700 border-slate-600 text-gray-200 text-xs h-8"
                                                value={newTopic}
                                                onChange={(e) => setNewTopic(e.target.value)}
                                                placeholder="Enter new topic"
                                              />
                                              <Button 
                                                type="button" 
                                                variant="secondary" 
                                                size="sm"
                                                className="h-8"
                                                onClick={handleAddTopic}
                                              >
                                                <PlusCircle className="h-3 w-3 mr-1 text-white" />
                                                <span className="text-xs">Add</span>
                                              </Button>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <p className="text-gray-400 text-xs mb-2">No topics available. Add one below!</p>
                                            <div className="flex items-center space-x-2">
                                              <Input
                                                type="text"
                                                className="bg-slate-700 border-slate-600 text-gray-200 text-xs h-8"
                                                value={newTopic}
                                                onChange={(e) => setNewTopic(e.target.value)}
                                                placeholder="Enter new topic"
                                              />
                                              <Button 
                                                type="button" 
                                                variant="secondary" 
                                                size="sm"
                                                className="h-8"
                                                onClick={handleAddTopic}
                                              >
                                                <PlusCircle className="h-3 w-3 mr-1 text-white" />
                                                <span className="text-xs">Add</span>
                                              </Button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="bg-slate-800/80 border border-white/5 p-4 mt-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-200">Software</h3>
          {softwareLoading ? (
            <p className="text-gray-400">Loading software...</p>
          ) : (
            <div className="space-y-2">
              {software.map((soft) => (
                <div key={soft.software_type_id} className="border-b border-slate-700/30 last:border-b-0">
                  <div 
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-700/30 px-2 rounded transition-colors"
                    onClick={() => toggleMachine(soft.software_type_id, "software")}
                  >
                    <div className="flex items-center gap-2">
                      {getSoftwareIcon(soft.name)}
                      <span className="text-gray-200">{soft.name}</span>
                    </div>
                    {expandedSoftware[soft.software_type_id] ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  
                  {expandedSoftware[soft.software_type_id] && (
                    <div className="pl-4 pb-2">
                      {plansLoading ? (
                        <p className="text-gray-400 text-sm">Loading plans...</p>
                      ) : (
                        <div className="space-y-1">
                          {plans.map((plan) => {
                            const planKey = `software-${soft.software_type_id}-plan-${plan.plan_id}`;
                            return (
                              <div key={plan.plan_id} className="border-b border-slate-700/20 last:border-b-0">
                                <div 
                                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-slate-700/20 px-2 rounded transition-colors"
                                  onClick={() => togglePlan(soft.software_type_id, plan.plan_id, "software")}
                                >
                                  <div className="flex items-center gap-2">
                                    {expandedPlans[planKey] ? (
                                      <FolderOpen size={16} className="text-white" />
                                    ) : (
                                      <Folder size={16} className="text-white" />
                                    )}
                                    <span className="text-gray-300 text-sm">{plan.name}</span>
                                  </div>
                                  {expandedPlans[planKey] ? (
                                    <ChevronDown className="h-3 w-3 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-gray-500" />
                                  )}
                                </div>
                                
                                {expandedPlans[planKey] && (
                                  <div className="pl-4 pr-2 py-2 bg-slate-700/10 rounded my-1">
                                    {loadingTopics[planKey] ? (
                                      <p className="text-gray-400 text-xs">Loading topics...</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {topicsByItemAndPlan[planKey] && topicsByItemAndPlan[planKey].length > 0 ? (
                                          <>
                                            {topicsByItemAndPlan[planKey].map((topic) => (
                                              <div key={topic.topic_id} className="flex items-center justify-between bg-slate-700/50 rounded p-2">
                                                {editingTopicId === topic.topic_id ? (
                                                  <div className="flex flex-1 items-center space-x-1">
                                                    <Input
                                                      type="text"
                                                      className="bg-slate-600 border-slate-500 text-gray-200 text-xs h-7"
                                                      value={editedTopicText}
                                                      onChange={(e) => setEditedTopicText(e.target.value)}
                                                    />
                                                    <div className="flex space-x-1">
                                                      <Button 
                                                        type="button" 
                                                        variant="secondary" 
                                                        size="sm"
                                                        className="h-7"
                                                        onClick={() => handleSaveEdit(topic.topic_id)}
                                                      >
                                                        <Save className="h-3 w-3 text-white" />
                                                      </Button>
                                                      <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="h-7"
                                                        onClick={handleCancelEdit}
                                                      >
                                                        <X className="h-3 w-3 text-white" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <div className="flex items-center gap-2">
                                                      <FileText size={14} className="text-white" />
                                                      <span className="text-gray-300 text-xs">{topic.topic_text}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleStartEdit(topic.topic_id, topic.topic_text)}
                                                      >
                                                        <Pencil className="h-3 w-3 text-white" />
                                                      </Button>
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleDeleteTopic(topic.topic_id)}
                                                      >
                                                        <Trash2 className="h-3 w-3 text-red-500" />
                                                      </Button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            ))}
                                            
                                            {/* Add new topic field after existing topics */}
                                            <div className="flex items-center space-x-2 mt-2">
                                              <Input
                                                type="text"
                                                className="bg-slate-700 border-slate-600 text-gray-200 text-xs h-8"
                                                value={newTopic}
                                                onChange={(e) => setNewTopic(e.target.value)}
                                                placeholder="Enter new topic"
                                              />
                                              <Button 
                                                type="button" 
                                                variant="secondary" 
                                                size="sm"
                                                className="h-8"
                                                onClick={handleAddTopic}
                                              >
                                                <PlusCircle className="h-3 w-3 mr-1 text-white" />
                                                <span className="text-xs">Add</span>
                                              </Button>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <p className="text-gray-400 text-xs mb-2">No topics available. Add one below!</p>
                                            <div className="flex items-center space-x-2">
                                              <Input
                                                type="text"
                                                className="bg-slate-700 border-slate-600 text-gray-200 text-xs h-8"
                                                value={newTopic}
                                                onChange={(e) => setNewTopic(e.target.value)}
                                                placeholder="Enter new topic"
                                              />
                                              <Button 
                                                type="button" 
                                                variant="secondary" 
                                                size="sm"
                                                className="h-8"
                                                onClick={handleAddTopic}
                                              >
                                                <PlusCircle className="h-3 w-3 mr-1 text-white" />
                                                <span className="text-xs">Add</span>
                                              </Button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
