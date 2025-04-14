
import React, { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TopicItem } from "@/hooks/useSoftwareTrainingRequirements";

interface QuoteTrainingTopicsTreeProps {
  topics: Record<string, TopicItem[]>;
}

const QuoteTrainingTopicsTree: React.FC<QuoteTrainingTopicsTreeProps> = ({ topics }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  const toggleSection = (machineKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [machineKey]: !prev[machineKey]
    }));
  };
  
  return (
    <div className="space-y-2">
      {Object.entries(topics).map(([entityKey, topicsList]) => {
        const isOpen = openSections[entityKey] || false;
        const isForMachine = entityKey.startsWith('machine_');
        const isSoftware = entityKey.startsWith('software_');
        const entityType = isForMachine ? 'Machine' : isSoftware ? 'Software' : 'Unknown';
        const entityId = entityKey.split('_')[1];
        
        return (
          <Collapsible key={entityKey} open={isOpen}>
            <CollapsibleTrigger 
              className="flex w-full items-center justify-between p-2 rounded hover:bg-slate-700/30 transition-colors"
              onClick={() => toggleSection(entityKey)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg text-blue-300">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <span className="text-gray-200">
                  {entityType} {entityId}: {topicsList.length} Topics
                </span>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pl-4 ml-4 border-l border-slate-700 mt-1">
              <div className="text-sm text-gray-300 space-y-1 py-1">
                {topicsList.map((topic, idx) => (
                  <div key={`${entityKey}-${topic.topic_id}-${idx}`} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                    <span>{topic.topic_name}</span>
                    {topic.hours_required && (
                      <span className="text-xs text-blue-300 ml-auto">
                        {topic.hours_required}h
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default QuoteTrainingTopicsTree;
