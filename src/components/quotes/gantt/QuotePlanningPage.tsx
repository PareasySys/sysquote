
import React, { useState } from 'react';
import { useQuoteGanttData } from '@/hooks/useQuoteGanttData';
import PlanGanttChart from './PlanGanttChart';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Calendar, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';

interface QuotePlanningPageProps {
  quoteId: string;
}

const QuotePlanningPage: React.FC<QuotePlanningPageProps> = ({ quoteId }) => {
  const [workOnSaturday, setWorkOnSaturday] = useState(false);
  const [workOnSunday, setWorkOnSunday] = useState(false);
  
  // Fetch Gantt data
  const { 
    ganttData, 
    planHours,
    loading, 
    error, 
    refreshData 
  } = useQuoteGanttData(quoteId, { workOnSaturday, workOnSunday });
  
  // Get plan IDs in order (1: Standard, 2: Extended, 3: Advanced, 4: Shadowing)
  const orderedPlanIds = [1, 2, 3, 4];

  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center">
            <Calendar className="mr-2 h-6 w-6" />
            Training Schedule Planning
          </h2>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="work-saturday"
                checked={workOnSaturday}
                onCheckedChange={setWorkOnSaturday}
              />
              <Label htmlFor="work-saturday" className="text-sm text-slate-300">
                Work on Saturdays
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="work-sunday"
                checked={workOnSunday}
                onCheckedChange={setWorkOnSunday}
              />
              <Label htmlFor="work-sunday" className="text-sm text-slate-300">
                Work on Sundays
              </Label>
            </div>
          </div>
        </div>
        
        <Card className="p-4 bg-blue-900/30 border-blue-700/50 mb-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="mb-1">
                This page shows the scheduled training activities for each plan. The schedule is generated based on:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Selected machines and software</li>
                <li>Required resources (trainers) for each item</li>
                <li>Training hours specified for each combination</li>
              </ul>
              <p className="mt-2">
                Tasks are scheduled sequentially with a maximum of 8 hours per resource per day.
                Weekend days can be toggled using the switches above.
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <TextShimmerWave
            className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-2xl"
            duration={1}
            spread={1}
            zDistance={1}
            scaleDistance={1.1}
            rotateYDistance={10}
          >
            Loading Training Schedule...
          </TextShimmerWave>
        </div>
      ) : error ? (
        <Card className="p-4 bg-red-900/50 border-red-700/50 text-center">
          <p className="text-red-300 mb-2">{error}</p>
          <button 
            onClick={refreshData}
            className="px-4 py-2 bg-red-800/50 hover:bg-red-700/50 text-white rounded"
          >
            Try Again
          </button>
        </Card>
      ) : (
        <div>
          {/* Display each plan's Gantt chart in order */}
          {orderedPlanIds.map(planId => {
            // Only show the plan if it has data
            if (!ganttData[planId]) return null;
            
            return (
              <PlanGanttChart
                key={planId}
                data={ganttData[planId]}
                workOnSaturday={workOnSaturday}
                workOnSunday={workOnSunday}
                totalHours={planHours[planId] || 0}
              />
            );
          })}
          
          {/* Show message if no data is available */}
          {orderedPlanIds.every(id => !ganttData[id]) && (
            <Card className="p-8 bg-slate-800 border-slate-700 text-center">
              <p className="text-slate-300 mb-4">
                No training schedule data available for this quote.
              </p>
              <p className="text-slate-400 text-sm">
                Please ensure you have selected machines/software and configured training hours.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default QuotePlanningPage;
