
import React, { useState } from 'react';
import { PlanGanttData, GanttResource } from '@/hooks/useQuoteGanttData';
import GanttTimelineHeader from './GanttTimelineHeader';
import GanttResourceList from './GanttResourceList';
import GanttTimeline from './GanttTimeline';
import { Card } from '@/components/ui/card';

interface PlanGanttChartProps {
  data: PlanGanttData;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  totalHours: number;
}

const PlanGanttChart: React.FC<PlanGanttChartProps> = ({
  data,
  workOnSaturday = false,
  workOnSunday = false,
  totalHours = 0
}) => {
  const [expandedResources, setExpandedResources] = useState<Record<number, boolean>>(
    // Initially expand all resources
    data.resources.reduce((acc, resource) => ({
      ...acc,
      [resource.id]: true
    }), {})
  );
  
  // Handle toggling a resource expansion state
  const handleToggleResource = (resourceId: number) => {
    setExpandedResources(prev => ({
      ...prev,
      [resourceId]: !prev[resourceId]
    }));
  };
  
  // Apply the expansion state to the resources
  const resourcesWithExpansion: GanttResource[] = data.resources.map(resource => ({
    ...resource,
    isExpanded: !!expandedResources[resource.id]
  }));
  
  // Calculate the visible months needed (use either data.totalDays or a minimum of 3 months)
  const visibleMonths = Math.max(Math.ceil(data.totalDays / 30), 3);

  return (
    <Card className="mb-6 bg-slate-900 border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
        <h3 className="text-lg font-medium text-slate-200">{data.planName} Plan</h3>
        <span className="text-sm text-slate-400">Total: {totalHours} hours</span>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Timeline header (months and days) */}
          <GanttTimelineHeader 
            months={visibleMonths}
            workOnSaturday={workOnSaturday}
            workOnSunday={workOnSunday}
          />
          
          {/* Main gantt content */}
          <div className="flex">
            {/* Resource list (left side) */}
            <GanttResourceList 
              resources={resourcesWithExpansion}
              onToggleResource={handleToggleResource}
            />
            
            {/* Timeline with task bars (right side) */}
            <div className="flex-1 relative">
              <GanttTimeline 
                resources={resourcesWithExpansion}
                visibleMonths={visibleMonths}
                workOnSaturday={workOnSaturday}
                workOnSunday={workOnSunday}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PlanGanttChart;
