
import React, { useState } from "react";
import { 
  Accordion, 
  AccordionItem, 
  AccordionTrigger, 
  AccordionContent 
} from "@/components/ui/accordion";
import { ChevronRight, ChevronDown } from "lucide-react";
import { QuoteMachine } from "@/hooks/useQuoteMachines";
import { QuoteSoftware } from "@/hooks/useQuoteSoftware";
import { TopicItem } from "@/hooks/useMachineTrainingRequirements";

interface QuoteTrainingTopicsTreeProps {
  topicsByItem: Record<string, TopicItem[]>;
  machines: QuoteMachine[];
  software?: QuoteSoftware[];
}

const QuoteTrainingTopicsTree: React.FC<QuoteTrainingTopicsTreeProps> = ({ 
  topicsByItem,
  machines,
  software = []
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // Toggle expand/collapse of a specific machine/software node
  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Format a machine name with item type prefix
  const formatItemName = (name: string, type: string, id: number) => {
    return `${type}_${id}_${name}`;
  };

  // Find machine/software details by ID 
  const getMachineById = (id: number) => machines.find(m => m.machine_type_id === id);
  const getSoftwareById = (id: number) => software.find(s => s.software_type_id === id);

  // Build tree structure
  const renderTree = () => {
    // Get all item IDs that have topics (both machines and software)
    const itemKeys = Object.keys(topicsByItem);
    
    // No items with topics
    if (itemKeys.length === 0) {
      return <div className="text-gray-400 py-2">No training topics available</div>;
    }
    
    return (
      <div className="space-y-2">
        {/* Machines with topics */}
        {machines.map(machine => {
          // Skip if this machine has no topics
          const machineKey = `machine_${machine.machine_type_id}`;
          const machineTopics = topicsByItem[machineKey] || [];
          if (machineTopics.length === 0) return null;
          
          return (
            <div key={machineKey} className="border border-slate-700/50 rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between px-4 py-3 bg-slate-800/50 cursor-pointer"
                onClick={() => toggleExpand(machineKey)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-700 rounded-md flex-shrink-0 overflow-hidden">
                    {machine.photo_url ? (
                      <img 
                        src={machine.photo_url} 
                        alt={machine.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500 text-xs">
                        M
                      </div>
                    )}
                  </div>
                  <div className="text-gray-200 font-semibold">{machine.name}</div>
                </div>
                
                <div className="flex gap-2 items-center">
                  <span className="text-gray-400 text-sm">{machineTopics.length} topics</span>
                  {expandedKeys[machineKey] ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
              
              {expandedKeys[machineKey] && (
                <div className="border-t border-slate-700/50 bg-slate-800/30 p-3">
                  <Accordion type="multiple" className="w-full">
                    {machineTopics.map(topic => (
                      <AccordionItem key={`${machineKey}-${topic.topic_id}`} value={`${machineKey}-${topic.topic_id}`} className="border-slate-700/50">
                        <AccordionTrigger className="py-3 text-gray-200 hover:text-gray-100 hover:no-underline">
                          {topic.topic_name}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-400 text-sm">
                          {topic.description || "No description available."}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Software with topics */}
        {software.map(softwareItem => {
          // Skip if this software has no topics
          const softwareKey = `software_${softwareItem.software_type_id}`;
          const softwareTopics = topicsByItem[softwareKey] || [];
          if (softwareTopics.length === 0) return null;
          
          return (
            <div key={softwareKey} className="border border-slate-700/50 rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between px-4 py-3 bg-slate-800/50 cursor-pointer"
                onClick={() => toggleExpand(softwareKey)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-700 rounded-md flex-shrink-0 overflow-hidden">
                    {softwareItem.photo_url ? (
                      <img 
                        src={softwareItem.photo_url} 
                        alt={softwareItem.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-500 text-xs">
                        S
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-gray-200 font-semibold">{softwareItem.name}</div>
                    {softwareItem.always_included && (
                      <span className="px-1.5 py-0.5 bg-blue-900/70 rounded text-[10px] text-blue-300 inline-flex">
                        Always
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 items-center">
                  <span className="text-gray-400 text-sm">{softwareTopics.length} topics</span>
                  {expandedKeys[softwareKey] ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
              
              {expandedKeys[softwareKey] && (
                <div className="border-t border-slate-700/50 bg-slate-800/30 p-3">
                  <Accordion type="multiple" className="w-full">
                    {softwareTopics.map(topic => (
                      <AccordionItem key={`${softwareKey}-${topic.topic_id}`} value={`${softwareKey}-${topic.topic_id}`} className="border-slate-700/50">
                        <AccordionTrigger className="py-3 text-gray-200 hover:text-gray-100 hover:no-underline">
                          {topic.topic_name}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-400 text-sm">
                          {topic.description || "No description available."}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return renderTree();
};

export default QuoteTrainingTopicsTree;
