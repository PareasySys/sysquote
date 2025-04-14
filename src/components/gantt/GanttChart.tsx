import React, { useMemo } from "react";
import "./GanttChart.css";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingRequirement } from "@/hooks/useTrainingRequirements";
import { ScrollArea } from "@/components/ui/scroll-area";
interface GanttChartProps {
  requirements: TrainingRequirement[];
  loading: boolean;
  error: string | null;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  onRetry?: () => void;
}
interface ResourceMachineGroup {
  resourceId: number;
  resourceName: string;
  machines: {
    machineName: string;
    hours: number;
    requirements: TrainingRequirement[];
  }[];
}
const GanttChart: React.FC<GanttChartProps> = ({
  requirements,
  loading,
  error,
  workOnSaturday,
  workOnSunday,
  onRetry
}) => {
  // Group requirements by resource and then by machine
  const resourceGroups = useMemo(() => {
    const groups = new Map<number, ResourceMachineGroup>();
    requirements.forEach(req => {
      // Create or get the resource group
      if (!groups.has(req.resource_id)) {
        groups.set(req.resource_id, {
          resourceId: req.resource_id,
          resourceName: req.resource_name || `Resource ${req.resource_id}`,
          machines: []
        });
      }
      const resourceGroup = groups.get(req.resource_id)!;

      // Find or create machine group
      const machineName = req.machine_name || "Unknown Machine";
      let machineGroup = resourceGroup.machines.find(m => m.machineName === machineName);
      if (!machineGroup) {
        machineGroup = {
          machineName,
          hours: 0,
          requirements: []
        };
        resourceGroup.machines.push(machineGroup);
      }

      // Add requirement to machine group and sum up hours
      machineGroup.requirements.push(req);
      machineGroup.hours += req.training_hours;
    });

    // Convert to array
    return Array.from(groups.values());
  }, [requirements]);

  // Generate months (1-12)
  const months = useMemo(() => {
    return Array.from({
      length: 12
    }, (_, i) => i + 1);
  }, []);

  // Generate days (1-30) for each month
  const days = useMemo(() => {
    return Array.from({
      length: 30
    }, (_, i) => i + 1);
  }, []);

  // Calculate which day of the month a particular day falls on
  const getDayPosition = (day: number): {
    month: number;
    dayOfMonth: number;
  } => {
    const month = Math.floor((day - 1) / 30) + 1; // 1-based month
    const dayOfMonth = (day - 1) % 30 + 1; // 1-based day of month
    return {
      month,
      dayOfMonth
    };
  };

  // Check if a day is a weekend (6 = Saturday, 7/0 = Sunday)
  const isWeekend = (month: number, day: number): boolean => {
    // Create a date representation (using an arbitrary year)
    const dayOfYear = (month - 1) * 30 + day;
    const dayOfWeek = dayOfYear % 7;

    // Based on our model: 6 = Saturday, 0 = Sunday
    return dayOfWeek === 6 && !workOnSaturday || dayOfWeek === 0 && !workOnSunday;
  };
  if (loading) {
    return <div className="gantt-loading">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading training schedule...</span>
      </div>;
  }
  if (error) {
    return <div className="gantt-error">
        <p>Error: {error}</p>
        {onRetry && <Button onClick={onRetry} variant="outline">
            Retry
          </Button>}
      </div>;
  }
  if (resourceGroups.length === 0) {
    return <div className="gantt-empty">
        <p>No training requirements found for the selected plan.</p>
      </div>;
  }
  return <div className="gantt-container">
      <div className="gantt-header">
        <div className="gantt-resource-column">
          <div className="gantt-resource-header">Resources</div>
        </div>
        <div className="gantt-timeline">
          <div>
            <div className="gantt-months">
              {months.map(month => <div key={`month-${month}`} className="gantt-month">
                  Month {month}
                </div>)}
            </div>
            <div className="gantt-days">
              {months.map(month => <React.Fragment key={`month-days-${month}`}>
                  {days.map(day => <div key={`day-${month}-${day}`} className={`gantt-day ${isWeekend(month, day) ? 'weekend' : ''}`}>
                      {day}
                    </div>)}
                </React.Fragment>)}
            </div>
          </div>
        </div>
      </div>
      <div className="gantt-content">
        <div className="gantt-resources">
          {resourceGroups.map(group => <div key={`resource-${group.resourceId}`} className="gantt-resource">
              <div className="gantt-resource-name">{group.resourceName}</div>
              {group.machines.map((machine, idx) => <div key={`machine-${group.resourceId}-${idx}`} className="gantt-resource-machine">
                  {machine.machineName} ({machine.hours}h)
                </div>)}
            </div>)}
        </div>
        <div className="gantt-grid">
          {resourceGroups.map(group => <div key={`row-${group.resourceId}`} className="gantt-row">
              {months.map(month => days.map(day => <div key={`cell-${group.resourceId}-${month}-${day}`} className={`gantt-cell ${isWeekend(month, day) ? 'weekend' : ''}`}></div>))}
              
              {/* Render tasks for this resource */}
              {group.machines.flatMap(machine => machine.requirements.map(req => {
            // Calculate position based on the custom calendar (12 months x 30 days)
            const {
              month,
              dayOfMonth
            } = getDayPosition(req.start_day);

            // Convert to pixels for positioning
            const left = ((month - 1) * 30 + (dayOfMonth - 1)) * 30; // 30px per day
            const width = req.duration_days * 30; // 30px per day

            return <div key={`task-${req.requirement_id}`} className="gantt-task" style={{
              left: `${left}px`,
              width: `${width}px`,
              backgroundColor: getResourceColor(req.resource_id)
            }} title={`Resource: ${req.resource_name}, Machine: ${req.machine_name}, Hours: ${req.training_hours}, Start: Month ${month}, Day ${dayOfMonth}, Duration: ${req.duration_days} days`}>
                      {req.machine_name}: {req.training_hours}H
                    </div>;
          }))}
            </div>)}
        </div>
      </div>
    </div>;
};

// Helper function to generate consistent colors based on resource ID
function getResourceColor(id: number): string {
  // Fixed set of colors for consistency
  const colors = ['#3B82F6',
  // Blue
  '#F97316',
  // Orange
  '#10B981',
  // Green
  '#8B5CF6',
  // Purple
  '#EC4899',
  // Pink
  '#EF4444',
  // Red
  '#F59E0B',
  // Amber
  '#06B6D4' // Cyan
  ];
  return colors[id % colors.length];
}
export default GanttChart;