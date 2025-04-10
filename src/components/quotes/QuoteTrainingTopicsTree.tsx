
import React, { useState, useEffect, useMemo } from "react";
import { useTrainingTopics, TrainingTopic } from "@/hooks/useTrainingTopics";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import { useSoftwareTypes } from "@/hooks/useSoftwareTypes";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { Card } from "@/components/ui/card";
import { TreeView, TreeNode } from "@/components/ui/tree-view";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { 
  ListChecks, 
  HardDrive, 
  Database, 
  FileText, 
  Folder, 
  FolderOpen,
  Server,
  Cpu,
  Monitor,
  Printer,
  BookOpen,
  Code,
  FileCode,
  Binary,
  Blocks,
  Forklift,
  Truck,
  Factory,
  Laptop,
  Car
} from "lucide-react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { supabase } from "@/lib/supabaseClient";

interface ExpandedState {
  [key: string]: boolean;
}

interface QuoteTrainingTopicsTreeProps {
  selectedMachines: QuoteMachine[];
}

const QuoteTrainingTopicsTree: React.FC<QuoteTrainingTopicsTreeProps> = ({ selectedMachines }) => {
  const { machines, loading: machinesLoading } = useMachineTypes();
  const { software, loading: softwareLoading } = useSoftwareTypes();
  const { plans, loading: plansLoading } = useTrainingPlans();
  
  // Selected node states
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);

  // Store all fetched topics by their item and plan
  const [topicsByItemAndPlan, setTopicsByItemAndPlan] = useState<{
    [key: string]: TrainingTopic[]
  }>({});
  const [loadingTopics, setLoadingTopics] = useState<{[key: string]: boolean}>({});
  
  // Separate expanded states for machines and software to prevent conflicts
  const [expandedMachines, setExpandedMachines] = useState<{[key: string]: boolean}>({});
  const [expandedSoftware, setExpandedSoftware] = useState<{[key: string]: boolean}>({});
  const [expandedPlans, setExpandedPlans] = useState<ExpandedState>({});
  
  // Root section expansion state (machines and software sections)
  const [expanded, setExpanded] = useState<ExpandedState>({
    'machines': true,
    'software': true,
  });
  
  // Get machine icon by machine name
  const getMachineIcon = (machineName: string) => {
    const name = machineName.toLowerCase();
    if (name.includes('server')) return <Server size={16} className="text-white" />;
    if (name.includes('storage')) return <HardDrive size={16} className="text-white" />;
    if (name.includes('processor') || name.includes('cpu')) return <Cpu size={16} className="text-white" />;
    if (name.includes('monitor') || name.includes('display')) return <Monitor size={16} className="text-white" />;
    if (name.includes('printer')) return <Printer size={16} className="text-white" />;
    if (name.includes('lgv')) return <Car size={16} className="text-white" />;
    if (name.includes('frs')) return <Truck size={16} className="text-white" />;
    if (name.includes('traslo')) return <Forklift size={16} className="text-white" />;
    return <Factory size={16} className="text-white" />;
  };
  
  // Get software icon by software name
  const getSoftwareIcon = (softwareName: string) => {
    const name = softwareName.toLowerCase();
    if (name.includes('database')) return <Database size={16} className="text-white" />;
    if (name.includes('code') || name.includes('programming')) return <Code size={16} className="text-white" />;
    if (name.includes('file') || name.includes('document')) return <FileCode size={16} className="text-white" />;
    if (name.includes('binary')) return <Binary size={16} className="text-white" />;
    if (name.includes('book') || name.includes('manual')) return <BookOpen size={16} className="text-white" />;
    return <Laptop size={16} className="text-white" />;
  };
  
  // Filter machines to only show selected ones in the quote
  const filteredMachines = useMemo(() => {
    const selectedMachineIds = selectedMachines.map(m => m.machine_type_id);
    return machines.filter(machine => selectedMachineIds.includes(machine.machine_type_id));
  }, [machines, selectedMachines]);

  // Fetch topics for a specific item and plan
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
        [key]: data?.map((topic: any) => ({
          ...topic,
          software_type_id: topic.software_type_id || null,
          machine_type_id: topic.machine_type_id || null,
          item_type: topic.item_type || itemType
        })) || []
      }));
    } catch (err) {
      console.error(`Error fetching topics for ${key}:`, err);
    } finally {
      setLoadingTopics(prev => ({
        ...prev,
        [key]: false
      }));
    }
  };
  
  // Toggle expanded state of a machine node
  const toggleMachineExpanded = (machineKey: string) => {
    setExpandedMachines(prev => ({
      ...prev,
      [machineKey]: !prev[machineKey]
    }));
  };
  
  // Toggle expanded state of a software node
  const toggleSoftwareExpanded = (softwareKey: string) => {
    setExpandedSoftware(prev => ({
      ...prev,
      [softwareKey]: !prev[softwareKey]
    }));
  };
  
  // Toggle expanded state for a root section (machines or software)
  const toggleRootExpanded = (nodeKey: string) => {
    setExpanded(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };
  
  // Toggle expanded state for a plan under a machine or software
  const togglePlanExpanded = (nodeKey: string, itemId?: number, planId?: number, itemType?: string) => {
    // If this is a plan node and it's being expanded, fetch topics
    if (itemId && planId && itemType && !expandedPlans[nodeKey]) {
      // Only fetch if we haven't already
      const key = `${itemType}-${itemId}-plan-${planId}`;
      if (!topicsByItemAndPlan[key]) {
        fetchTopicsForItemAndPlan(itemId, planId, itemType);
      }
    }
    
    setExpandedPlans(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };
  
  // Render loading state
  if (machinesLoading || softwareLoading || plansLoading) {
    return (
      <Card className="bg-slate-800/80 border border-white/5 p-4">
        <div className="p-4 text-center">
          <TextShimmerWave
            className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
            duration={1}
            spread={1}
            zDistance={1}
            scaleDistance={1.1}
            rotateYDistance={10}
          >
            Loading Training Data
          </TextShimmerWave>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/80 border border-white/5 p-4">
      <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-white" />
        Training Topics
      </h2>
      
      <div className="bg-slate-700/30 rounded-md p-2 border border-slate-600/30">
        <TreeView className="max-h-[60vh] overflow-y-auto pr-2">
          {/* Machine Topics Section */}
          <TreeNode 
            id="machines"
            label="Machine Topics"
            icon={expanded['machines'] ? <FolderOpen size={16} className="text-white" /> : <Folder size={16} className="text-white" />}
            expanded={expanded['machines']}
            onToggle={() => toggleRootExpanded('machines')}
          />
          
          {expanded['machines'] && filteredMachines.map(machine => {
            const machineKey = `machine-${machine.machine_type_id}`;
            return (
              <React.Fragment key={machineKey}>
                {/* Machine Type Node */}
                <TreeNode 
                  id={machineKey}
                  label={machine.name}
                  icon={getMachineIcon(machine.name)}
                  expanded={expandedMachines[machineKey]}
                  level={1}
                  onToggle={() => toggleMachineExpanded(machineKey)}
                />
                
                {/* Plans under this machine */}
                {expandedMachines[machineKey] && plans.map(plan => {
                  const planKey = `${machineKey}-plan-${plan.plan_id}`;
                  const topicsKey = `machine-${machine.machine_type_id}-plan-${plan.plan_id}`;
                  
                  return (
                    <React.Fragment key={planKey}>
                      <TreeNode 
                        id={planKey}
                        label={plan.name}
                        icon={expandedPlans[planKey] ? <FolderOpen size={16} className="text-white" /> : <Folder size={16} className="text-white" />}
                        expanded={expandedPlans[planKey]}
                        level={2}
                        onToggle={() => togglePlanExpanded(planKey, machine.machine_type_id, plan.plan_id, 'machine')}
                      />
                      
                      {/* Display topics when a plan is expanded */}
                      {expandedPlans[planKey] && (
                        <>
                          {loadingTopics[topicsKey] ? (
                            <TreeNode
                              id={`${planKey}-loading`}
                              label="Loading topics..."
                              isLeaf={true}
                              level={3}
                            />
                          ) : topicsByItemAndPlan[topicsKey]?.length > 0 ? (
                            topicsByItemAndPlan[topicsKey].map((topic) => (
                              <TreeNode
                                key={`topic-${topic.topic_id}`}
                                id={`topic-${topic.topic_id}`}
                                label={topic.topic_text}
                                icon={<FileText size={16} className="text-white" />}
                                isLeaf={true}
                                level={3}
                              />
                            ))
                          ) : (
                            <TreeNode
                              id={`${planKey}-no-topics`}
                              label="No topics available"
                              isLeaf={true}
                              level={3}
                            />
                          )}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
          
          {/* Software Topics Section */}
          <TreeNode 
            id="software"
            label="Software Topics"
            icon={expanded['software'] ? <FolderOpen size={16} className="text-white" /> : <Folder size={16} className="text-white" />}
            expanded={expanded['software']}
            onToggle={() => toggleRootExpanded('software')}
          />
          
          {expanded['software'] && software.map(softwareItem => {
            const softwareKey = `software-${softwareItem.software_type_id}`;
            return (
              <React.Fragment key={softwareKey}>
                {/* Software Type Node */}
                <TreeNode 
                  id={softwareKey}
                  label={softwareItem.name}
                  icon={getSoftwareIcon(softwareItem.name)}
                  expanded={expandedSoftware[softwareKey]}
                  level={1}
                  onToggle={() => toggleSoftwareExpanded(softwareKey)}
                />
                
                {/* Plans under this software */}
                {expandedSoftware[softwareKey] && plans.map(plan => {
                  const planKey = `${softwareKey}-plan-${plan.plan_id}`;
                  const topicsKey = `software-${softwareItem.software_type_id}-plan-${plan.plan_id}`;
                  
                  return (
                    <React.Fragment key={planKey}>
                      <TreeNode 
                        id={planKey}
                        label={plan.name}
                        icon={expandedPlans[planKey] ? <FolderOpen size={16} className="text-white" /> : <Folder size={16} className="text-white" />}
                        expanded={expandedPlans[planKey]}
                        level={2}
                        onToggle={() => togglePlanExpanded(planKey, softwareItem.software_type_id, plan.plan_id, 'software')}
                      />
                      
                      {/* Display topics when a plan is expanded */}
                      {expandedPlans[planKey] && (
                        <>
                          {loadingTopics[topicsKey] ? (
                            <TreeNode
                              id={`${planKey}-loading`}
                              label="Loading topics..."
                              isLeaf={true}
                              level={3}
                            />
                          ) : topicsByItemAndPlan[topicsKey]?.length > 0 ? (
                            topicsByItemAndPlan[topicsKey].map((topic) => (
                              <TreeNode
                                key={`topic-${topic.topic_id}`}
                                id={`topic-${topic.topic_id}`}
                                label={topic.topic_text}
                                icon={<FileText size={16} className="text-white" />}
                                isLeaf={true}
                                level={3}
                              />
                            ))
                          ) : (
                            <TreeNode
                              id={`${planKey}-no-topics`}
                              label="No topics available"
                              isLeaf={true}
                              level={3}
                            />
                          )}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </TreeView>
      </div>
    </Card>
  );
};

export default QuoteTrainingTopicsTree;
