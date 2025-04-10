
import React, { useState, useEffect, useMemo } from "react";
import { useTrainingTopics } from "@/hooks/useTrainingTopics";
import { useMachineTypes } from "@/hooks/useMachineTypes";
import { useSoftwareTypes } from "@/hooks/useSoftwareTypes";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { Card } from "@/components/ui/card";
import { TreeView, TreeNode } from "@/components/ui/tree-view";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { ListChecks, HardDrive, Database, FileText, Folder, FolderOpen } from "lucide-react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";

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
  
  // Expanded state for tree nodes
  const [expanded, setExpanded] = useState<ExpandedState>({
    'machines': true,
    'software': true,
  });
  
  // Filter machines to only show selected ones in the quote
  const filteredMachines = useMemo(() => {
    const selectedMachineIds = selectedMachines.map(m => m.machine_type_id);
    return machines.filter(machine => selectedMachineIds.includes(machine.machine_type_id));
  }, [machines, selectedMachines]);
  
  // Fetch topics based on selection
  const { 
    topics, 
    loading: topicsLoading,
  } = useTrainingTopics(
    selectedItemId || undefined,
    selectedPlanId || undefined,
    selectedItemType || undefined
  );

  // Toggle expanded state of a node
  const toggleExpanded = (nodeKey: string) => {
    setExpanded(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };
  
  // Select a node and load topics
  const selectNode = (itemId: number, planId: number, itemType: string, nodeKey: string) => {
    setSelectedItemId(itemId);
    setSelectedPlanId(planId);
    setSelectedItemType(itemType);
    setSelectedNodeKey(nodeKey);
    
    // Ensure parent nodes are expanded
    const itemNodeKey = `${itemType}-${itemId}`;
    setExpanded(prev => ({
      ...prev,
      [itemType === 'machine' ? 'machines' : 'software']: true,
      [itemNodeKey]: true,
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
      <h2 className="text-xl font-semibold mb-4 text-gray-200 flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-blue-400" />
        Training Topics
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tree View */}
        <div className="bg-slate-700/30 rounded-md p-2 border border-slate-600/30">
          <TreeView className="max-h-[60vh] overflow-y-auto pr-2">
            {/* Machine Topics Section */}
            <TreeNode 
              id="machines"
              label="Machine Topics"
              icon={expanded['machines'] ? <FolderOpen size={16} className="text-blue-400" /> : <Folder size={16} className="text-blue-400" />}
              expanded={expanded['machines']}
              onToggle={() => toggleExpanded('machines')}
            />
            
            {expanded['machines'] && filteredMachines.map(machine => {
              const machineKey = `machine-${machine.machine_type_id}`;
              return (
                <React.Fragment key={machineKey}>
                  {/* Machine Type Node */}
                  <TreeNode 
                    id={machineKey}
                    label={machine.name}
                    icon={<HardDrive size={14} className="text-blue-300" />}
                    expanded={expanded[machineKey]}
                    level={1}
                    onToggle={() => toggleExpanded(machineKey)}
                  />
                  
                  {/* Plans under this machine */}
                  {expanded[machineKey] && plans.map(plan => {
                    const planKey = `${machineKey}-plan-${plan.plan_id}`;
                    const isSelected = selectedItemId === machine.machine_type_id && 
                                      selectedPlanId === plan.plan_id && 
                                      selectedItemType === 'machine';
                    
                    return (
                      <TreeNode 
                        key={planKey}
                        id={planKey}
                        label={plan.name}
                        icon={expanded[planKey] ? <FolderOpen size={14} className="text-green-300" /> : <Folder size={14} className="text-green-300" />}
                        expanded={expanded[planKey]}
                        selected={isSelected}
                        level={2}
                        onClick={() => selectNode(machine.machine_type_id, plan.plan_id, 'machine', planKey)}
                        onToggle={() => toggleExpanded(planKey)}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
            
            {/* Software Topics Section */}
            <TreeNode 
              id="software"
              label="Software Topics"
              icon={expanded['software'] ? <FolderOpen size={16} className="text-green-400" /> : <Folder size={16} className="text-green-400" />}
              expanded={expanded['software']}
              onToggle={() => toggleExpanded('software')}
            />
            
            {expanded['software'] && software.map(softwareItem => {
              const softwareKey = `software-${softwareItem.software_type_id}`;
              return (
                <React.Fragment key={softwareKey}>
                  {/* Software Type Node */}
                  <TreeNode 
                    id={softwareKey}
                    label={softwareItem.name}
                    icon={<Database size={14} className="text-green-300" />}
                    expanded={expanded[softwareKey]}
                    level={1}
                    onToggle={() => toggleExpanded(softwareKey)}
                  />
                  
                  {/* Plans under this software */}
                  {expanded[softwareKey] && plans.map(plan => {
                    const planKey = `${softwareKey}-plan-${plan.plan_id}`;
                    const isSelected = selectedItemId === softwareItem.software_type_id && 
                                      selectedPlanId === plan.plan_id && 
                                      selectedItemType === 'software';
                    
                    return (
                      <TreeNode 
                        key={planKey}
                        id={planKey}
                        label={plan.name}
                        icon={expanded[planKey] ? <FolderOpen size={14} className="text-blue-300" /> : <Folder size={14} className="text-blue-300" />}
                        expanded={expanded[planKey]}
                        selected={isSelected}
                        level={2}
                        onClick={() => selectNode(softwareItem.software_type_id, plan.plan_id, 'software', planKey)}
                        onToggle={() => toggleExpanded(planKey)}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </TreeView>
        </div>
        
        {/* Topics Display */}
        <div className="bg-slate-700/30 rounded-md p-4 border border-slate-600/30">
          {!selectedItemId || !selectedPlanId ? (
            <div className="text-center text-gray-400 p-4">
              Select a topic from the tree to view details
            </div>
          ) : topicsLoading ? (
            <div className="p-4 text-center">
              <TextShimmerWave
                className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-sm"
                duration={1}
                spread={1}
                zDistance={1}
                scaleDistance={1.1}
                rotateYDistance={10}
              >
                Loading Topics...
              </TextShimmerWave>
            </div>
          ) : topics.length === 0 ? (
            <div className="text-gray-400 p-2 text-center">
              No training topics found for this selection.
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-3">
                {selectedItemType === 'machine' 
                  ? filteredMachines.find(m => m.machine_type_id === selectedItemId)?.name
                  : software.find(s => s.software_type_id === selectedItemId)?.name}
                {' - '}
                {plans.find(p => p.plan_id === selectedPlanId)?.name}
              </h3>
              
              <ul className="list-disc list-inside space-y-2 pl-2">
                {topics.map((topic) => (
                  <li key={topic.topic_id} className="text-gray-200 flex items-start gap-2">
                    <FileText size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                    <span>{topic.topic_text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default QuoteTrainingTopicsTree;
