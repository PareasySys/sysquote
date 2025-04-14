import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import "./GanttChart.css";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingRequirement } from "@/hooks/useTrainingRequirements";

// ... (keep existing interfaces: GanttChartProps, ResourceGroup) ...

// --- Constants ---
const DAY_WIDTH = 30; // px
const RESOURCE_HEADER_HEIGHT = 40; // px - For resource name
const MACHINE_ROW_HEIGHT = 30; // px - For machine name and task row

const GanttChart: React.FC<GanttChartProps> = ({
  requirements,
  loading,
  error,
  workOnSaturday,
  workOnSunday,
  onRetry
}) => {
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resourceListRef = useRef<HTMLDivElement>(null); // Ref for vertical scroll sync

  // Calculate total number of days for width calculation
  const totalMonths = 12; // Example: Fixed 12 months
  const daysPerMonth = 30; // Fixed 30 days per month
  const totalDays = totalMonths * daysPerMonth;
  const totalTimelineWidth = totalDays * DAY_WIDTH;

  // --- Data Processing (Resource Grouping) ---
  const resourceGroups = useMemo(() => {
      // ... (keep your existing resource grouping logic) ...
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

  // --- Calculate Total Grid Height ---
  const totalGridHeight = useMemo(() => {
    return resourceGroups.reduce((height, group) => {
      return height + RESOURCE_HEADER_HEIGHT + (group.machines.length * MACHINE_ROW_HEIGHT);
    }, 0);
  }, [resourceGroups]);

  // --- Day/Month Calculations ---
  const months = useMemo(() => {
    return Array.from({ length: totalMonths }, (_, i) => i + 1);
  }, [totalMonths]);

  const days = useMemo(() => {
    return Array.from({ length: daysPerMonth }, (_, i) => i + 1);
  }, [daysPerMonth]);

  const getDayPosition = useCallback((startDay: number): { month: number; dayOfMonth: number } => {
    const month = Math.floor((startDay - 1) / daysPerMonth) + 1;
    const dayOfMonth = (startDay - 1) % daysPerMonth + 1;
    return { month, dayOfMonth };
  }, [daysPerMonth]);

  const isWeekend = useCallback((month: number, day: number): boolean => {
    const dayOfYear = (month - 1) * daysPerMonth + day;
    // Simple modulo 7 assuming day 1 is Monday (adjust if needed)
    // Day 6 (Saturday) and Day 0 (Sunday)
    const dayOfWeek = dayOfYear % 7; 
    return (dayOfWeek === 6 && !workOnSaturday) || (dayOfWeek === 0 && !workOnSunday);
  }, [workOnSaturday, workOnSunday, daysPerMonth]);

  // --- Scroll Synchronization ---
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current && timelineHeaderRef.current && resourceListRef.current) {
      // Sync timeline header horizontally
      timelineHeaderRef.current.style.transform = `translateX(-${scrollContainerRef.current.scrollLeft}px)`;
      // Sync resource list vertically
      resourceListRef.current.style.transform = `translateY(-${scrollContainerRef.current.scrollTop}px)`;
    }
  }, []);

  // --- Task Rendering Data ---
  interface TaskRenderInfo extends TrainingRequirement {
    top: number;
    left: number;
    width: number;
    month: number;
    dayOfMonth: number;
  }

  const tasksToRender = useMemo(() => {
    const tasks: TaskRenderInfo[] = [];
    let currentTop = 0;
    resourceGroups.forEach(group => {
      currentTop += RESOURCE_HEADER_HEIGHT; // Add height for the resource name row
      group.machines.forEach(machine => {
        machine.requirements.forEach(req => {
          const { month, dayOfMonth } = getDayPosition(req.start_day);
          const left = ((month - 1) * daysPerMonth + (dayOfMonth - 1)) * DAY_WIDTH;
          const width = req.duration_days * DAY_WIDTH;
          tasks.push({
            ...req,
            top: currentTop, // Top position is the start of the machine row
            left: left,
            width: width,
            month: month,
            dayOfMonth: dayOfMonth,
          });
        });
        currentTop += MACHINE_ROW_HEIGHT; // Move down for the next machine row
      });
    });
    return tasks;
  }, [resourceGroups, getDayPosition, daysPerMonth]);

  // --- Loading/Error/Empty States ---
  if (loading) {
    // ... (keep existing loading indicator) ...
     return <div className="gantt-loading">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading training schedule...</span>
      </div>;
  }
  if (error) {
    // ... (keep existing error display) ...
    return <div className="gantt-error">
        <p>Error: {error}</p>
        {onRetry && <Button onClick={onRetry} variant="outline">
            Retry
          </Button>}
      </div>;
  }
  if (resourceGroups.length === 0) {
    // ... (keep existing empty state) ...
    return <div className="gantt-empty">
        <p>No training requirements found for the selected plan.</p>
      </div>;
  }

  // --- Render ---
  return (
    <div className="gantt-container">
      {/* Fixed Header Row */}
      <div className="gantt-header-row">
        {/* Fixed Resource Header */}
        <div className="gantt-resource-header-cell">
          Resources & Machines
        </div>
        {/* Scrollable Timeline Header Wrapper */}
        <div className="gantt-timeline-header-wrapper">
          {/* Actual Timeline Header Content (Wider than wrapper) */}
          <div className="gantt-timeline-header-content" ref={timelineHeaderRef} style={{ width: `${totalTimelineWidth}px` }}>
            <div className="gantt-months">
              {months.map(month => (
                <div key={`month-${month}`} className="gantt-month" style={{ width: `${daysPerMonth * DAY_WIDTH}px` }}>
                  Month {month}
                </div>
              ))}
            </div>
            <div className="gantt-days">
              {months.map(month => days.map(day => (
                <div
                  key={`day-${month}-${day}`}
                  className={`gantt-day ${isWeekend(month, day) ? 'weekend' : ''}`}
                  style={{ minWidth: `${DAY_WIDTH}px` }}
                >
                  {day}
                </div>
              )))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Row (Resources + Scrollable Grid) */}
      <div className="gantt-main-content-row">
        {/* Fixed Resource List Wrapper */}
        <div className="gantt-resource-list-wrapper">
           {/* Actual Resource List (Taller than wrapper, synced with scroll) */}
           <div className="gantt-resource-list-content" ref={resourceListRef}>
              {resourceGroups.map(group => (
                <div key={`resource-group-${group.resourceId}`} className="gantt-resource-group">
                  <div className="gantt-resource-name" style={{ height: `${RESOURCE_HEADER_HEIGHT}px` }}>
                    {group.resourceName}
                  </div>
                  {group.machines.map((machine, idx) => (
                    <div
                      key={`machine-label-${group.resourceId}-${idx}`}
                      className="gantt-resource-machine"
                      style={{ height: `${MACHINE_ROW_HEIGHT}px` }}
                    >
                      {machine.machineName} ({machine.hours}h)
                    </div>
                  ))}
                </div>
              ))}
           </div>
        </div>

        {/* Scrollable Grid Container */}
        <div className="gantt-grid-scroll-container" ref={scrollContainerRef} onScroll={handleScroll}>
          {/* Grid Content (Wider and Taller than container) */}
          <div className="gantt-grid-content" style={{ width: `${totalTimelineWidth}px`, height: `${totalGridHeight}px` }}>
            {/* Grid Background Layer */}
            <div className="gantt-grid-background">
              {/* Vertical Lines */}
              {Array.from({ length: totalDays + 1 }).map((_, index) => (
                <div
                  key={`vline-${index}`}
                  className="gantt-grid-vline"
                  style={{ left: `${index * DAY_WIDTH}px` }}
                />
              ))}
              {/* Horizontal Lines and Weekend Shading */}
              {(() => {
                  let currentTop = 0;
                  const rows: React.ReactNode[] = [];
                  resourceGroups.forEach(group => {
                      // Row for resource name (no horizontal line needed if grouped visually)
                      // Optionally add a faint line: rows.push(<div key={`hr-res-${group.resourceId}`} className="gantt-grid-hline" style={{ top: `${currentTop + RESOURCE_HEADER_HEIGHT -1}px` }} />);
                      currentTop += RESOURCE_HEADER_HEIGHT;
                      group.machines.forEach((machine, idx) => {
                          rows.push(<div key={`hr-mac-${group.resourceId}-${idx}`} className="gantt-grid-hline" style={{ top: `${currentTop + MACHINE_ROW_HEIGHT - 1}px` }} />);
                          currentTop += MACHINE_ROW_HEIGHT;
                      });
                       // Add bolder line between resource groups
                      rows.push(<div key={`hr-group-${group.resourceId}`} className="gantt-grid-hline group-separator" style={{ top: `${currentTop -1}px` }} />);
                  });
                  return rows;
              })()}
              {/* Weekend Day Backgrounds */}
              {months.map(month => days.map(day => (
                 isWeekend(month, day) && (
                    <div
                      key={`weekend-bg-${month}-${day}`}
                      className="gantt-grid-weekend-bg"
                      style={{
                          left: `${((month - 1) * daysPerMonth + (day - 1)) * DAY_WIDTH}px`,
                          width: `${DAY_WIDTH}px`,
                      }}
                    />
                 )
              )))}
            </div>

            {/* Task Layer */}
            <div className="gantt-task-layer">
              {tasksToRender.map(req => (
                <div
                  key={`task-${req.requirement_id}`}
                  className="gantt-task"
                  style={{
                    top: `${req.top + 3}px`, // Add small offset for vertical centering
                    left: `${req.left}px`,
                    width: `${req.width}px`,
                    height: `${MACHINE_ROW_HEIGHT - 6}px`, // Slightly smaller than row height
                    backgroundColor: getResourceColor(req.resource_id),
                  }}
                  title={`${req.machine_name}: ${req.training_hours}h, Start: Month ${req.month}, Day ${req.dayOfMonth}, Duration: ${req.duration_days} days`}
                >
                  <span className="gantt-task-label">{req.machine_name}: {req.training_hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... (keep getResourceColor function) ...
function getResourceColor(id: number): string {
  const colors = [
    '#3B82F6', // blue-500
    '#F97316', // orange-500
    '#10B981', // emerald-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#EF4444', // red-500
    '#F59E0B', // amber-500
    '#06B6D4'  // cyan-500
  ];
  return colors[id % colors.length];
}


export default GanttChart;