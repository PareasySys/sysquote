
import React, { useMemo, useRef, useEffect } from "react";
import "./GanttChart.css";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingRequirement } from "@/hooks/useTrainingRequirements";

interface GanttChartProps {
  requirements: TrainingRequirement[];
  loading: boolean;
  error: string | null;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  onRetry?: () => void;
}

interface ResourceGroup {
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
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const resourceGroups = useMemo(() => {
    const groups = new Map<number, ResourceGroup>();
    requirements.forEach(req => {
      if (!groups.has(req.resource_id)) {
        groups.set(req.resource_id, {
          resourceId: req.resource_id,
          resourceName: req.resource_name || `Resource ${req.resource_id}`,
          machines: []
        });
      }
      const resourceGroup = groups.get(req.resource_id)!;

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

      machineGroup.requirements.push(req);
      machineGroup.hours += req.training_hours;
    });

    return Array.from(groups.values()).map(group => {
      group.machines.sort((a, b) => a.machineName.localeCompare(b.machineName));
      return group;
    });
  }, [requirements]);

  const months = useMemo(() => {
    return Array.from({
      length: 12
    }, (_, i) => i + 1);
  }, []);

  const days = useMemo(() => {
    return Array.from({
      length: 30
    }, (_, i) => i + 1);
  }, []);

  const getDayPosition = (day: number): {
    month: number;
    dayOfMonth: number;
  } => {
    const month = Math.floor((day - 1) / 30) + 1;
    const dayOfMonth = (day - 1) % 30 + 1;
    return {
      month,
      dayOfMonth
    };
  };

  const isWeekend = (month: number, day: number): boolean => {
    const dayOfYear = (month - 1) * 30 + day;
    const dayOfWeek = dayOfYear % 7;
    return (dayOfWeek === 6 && !workOnSaturday) || (dayOfWeek === 0 && !workOnSunday);
  };

  const handleGridScroll = () => {
    if (gridRef.current && headerRef.current) {
      headerRef.current.scrollLeft = gridRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    const adjustGridHeight = () => {
      if (gridRef.current) {
        const container = gridRef.current.closest('.gantt-container');
        if (container) {
          gridRef.current.style.minHeight = `${container.clientHeight - 70}px`;
        }
      }
    };

    adjustGridHeight();
    window.addEventListener('resize', adjustGridHeight);
    return () => window.removeEventListener('resize', adjustGridHeight);
  }, []);

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

  return (
    <div className="gantt-container">
      <div className="gantt-header">
        <div className="gantt-resource-column">
          <div className="gantt-resource-header">Resources & Machines</div>
        </div>
        <div className="gantt-timeline" ref={headerRef}>
          <div>
            <div className="gantt-months">
              {months.map(month => (
                <div key={`month-${month}`} className="gantt-month">
                  Month {month}
                </div>
              ))}
            </div>
            <div className="gantt-days">
              {months.map(month => (
                <div key={`month-days-${month}`} className="gantt-month-days">
                  {days.map(day => (
                    <div 
                      key={`day-${month}-${day}`} 
                      className={`gantt-day ${isWeekend(month, day) ? 'weekend' : ''}`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="gantt-resources-and-grid">
        <div className="gantt-resources">
          {resourceGroups.map(group => (
            <div key={`resource-${group.resourceId}`} className="gantt-resource">
              <div className="gantt-resource-name">{group.resourceName}</div>
              {group.machines.map((machine, idx) => (
                <div 
                  key={`machine-${group.resourceId}-${idx}`} 
                  className="gantt-resource-machine"
                >
                  {machine.machineName} ({machine.hours}h)
                </div>
              ))}
            </div>
          ))}
        </div>
        
        <div className="gantt-grid" ref={gridRef} onScroll={handleGridScroll}>
          <div className= "gantt-columns">
            {resourceGroups.map(group => (
              <div key={`group-${group.resourceId}`}>
                {group.machines.map((machine, machineIndex) => (
                  <div key={`machine-row-${group.resourceId}-${machineIndex}`} className="gantt-machine-row">
                    {months.map(month => (
                      <div key={`month-cells-${month}-${group.resourceId}-${machineIndex}`} className="gantt-month-cells">
                        {days.map(day => (
                          <div 
                            key={`cell-${group.resourceId}-${machineIndex}-${month}-${day}`} 
                            className={`gantt-cell ${isWeekend(month, day) ? 'weekend' : ''}`}
                          />
                        ))}
                      </div>
                    ))}
                    
                    {machine.requirements.map(req => {
                      const { month, dayOfMonth } = getDayPosition(req.start_day);
                      const left = ((month - 1) * 30 + (dayOfMonth - 1)) * 30;
                      const width = req.duration_days * 30;
                      return (
                        <div 
                          key={`task-${req.requirement_id}`} 
                          className="gantt-task" 
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                            backgroundColor: getResourceColor(req.resource_id)
                          }}
                          title={`${req.machine_name}: ${req.training_hours}h, Start: Month ${month}, Day ${dayOfMonth}, Duration: ${req.duration_days} days`}
                        >
                          {req.machine_name}: {req.training_hours}h
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function getResourceColor(id: number): string {
  const colors = [
    '#3B82F6',
    '#F97316',
    '#10B981',
    '#8B5CF6',
    '#EC4899',
    '#EF4444',
    '#F59E0B',
    '#06B6D4'
  ];
  return colors[id % colors.length];
}

export default GanttChart;
