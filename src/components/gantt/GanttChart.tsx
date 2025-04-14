// src/components/gantt/GanttChart.tsx

import React, { useMemo, useRef, useCallback, useEffect } from "react";
import "./GanttChart.css"; // Ensure CSS is imported
import { Loader2, PlaneTakeoff, PlaneLanding } from "lucide-react"; // Import plane icons
import { Button } from "@/components/ui/button";
// Adjust path if your types file is located elsewhere
import { ScheduledTaskSegment } from '@/utils/types';

// --- Constants ---
const DAY_WIDTH = 30; // px
const RESOURCE_HEADER_HEIGHT = 40; // px - For resource name row
const MACHINE_ROW_HEIGHT = 30; // px - For machine name and task row
const DAILY_HOUR_LIMIT = 8; // Use the same limit as the scheduler for width calc

// --- Interfaces ---
interface GanttChartProps {
  requirements: ScheduledTaskSegment[]; // Expects scheduled segments
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
    displayHours?: number; // For displaying total original hours in the list
    requirements: ScheduledTaskSegment[]; // Stores segments for this machine
  }[];
}

interface TotalEngagementBar {
  resourceId: number;
  resourceName: string;
  travelStartDay: number; // Start day including travel (Day 1 or later)
  travelEndDay: number;   // End day including travel
  totalDuration: number; // Total duration including travel
  top: number;            // Vertical position for the resource header row
}

interface TaskRenderInfo extends ScheduledTaskSegment {
  top: number;
  left: number;
  width: number; // This will now potentially represent partial days
  month: number;
  dayOfMonth: number;
}

// --- Helper Function for Colors ---
// Defined outside the component
function getResourceColor(id: number): string {
  const colors = [
    '#3B82F6', '#F97316', '#10B981', '#8B5CF6',
    '#EC4899', '#EF4444', '#F59E0B', '#06B6D4'
  ];
  return colors[id % colors.length];
}

// --- GanttChart Component ---
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
  const resourceListRef = useRef<HTMLDivElement>(null);

  // --- Chart Dimensions & Time Scale ---
  const totalMonths = 12;
  const daysPerMonth = 30;
  const totalDays = totalMonths * daysPerMonth;
  const totalTimelineWidth = totalDays * DAY_WIDTH;

  // --- Group Segments by Resource (for display and calculations) ---
  const resourceGroups = useMemo(() => {
    const groups = new Map<number, ResourceGroup>();
    requirements.forEach(seg => {
      if (!groups.has(seg.resource_id)) {
        groups.set(seg.resource_id, {
          resourceId: seg.resource_id,
          resourceName: seg.resource_name || `Resource ${seg.resource_id}`,
          machines: []
        });
      }
      const resourceGroup = groups.get(seg.resource_id)!;
      const machineName = seg.machine_name || "Unknown Machine";
      let machineGroup = resourceGroup.machines.find(m => m.machineName === machineName);
      if (!machineGroup) {
        machineGroup = { machineName, displayHours: 0, requirements: [] };
        resourceGroup.machines.push(machineGroup);
      }
      machineGroup.requirements.push(seg);
    });
    groups.forEach(group => {
      group.machines.forEach(machine => {
        const uniqueTasks = new Map<string | number, number>();
        machine.requirements.forEach(seg => { if (!uniqueTasks.has(seg.originalRequirementId)) uniqueTasks.set(seg.originalRequirementId, seg.total_training_hours); });
        machine.displayHours = Array.from(uniqueTasks.values()).reduce((sum, h) => sum + h, 0);
      });
      group.machines.sort((a, b) => a.machineName.localeCompare(b.machineName));
    });
    return Array.from(groups.values());
  }, [requirements]);

  // --- Calculate Total Grid Height ---
  const totalGridHeight = useMemo(() => {
    return resourceGroups.reduce((height, group) => height + RESOURCE_HEADER_HEIGHT + (group.machines.length * MACHINE_ROW_HEIGHT), 0);
  }, [resourceGroups]);

  // --- Day/Month Calculation Helpers ---
  const months = useMemo(() => Array.from({ length: totalMonths }, (_, i) => i + 1), [totalMonths]);
  const days = useMemo(() => Array.from({ length: daysPerMonth }, (_, i) => i + 1), [daysPerMonth]);
  const getDayPosition = useCallback((startDay: number): { month: number; dayOfMonth: number } => {
    const validStartDay = Math.max(1, startDay);
    const month = Math.floor((validStartDay - 1) / daysPerMonth) + 1;
    const dayOfMonth = ((validStartDay - 1) % daysPerMonth) + 1;
    return { month, dayOfMonth };
  }, [daysPerMonth]);
  const isWeekend = useCallback((month: number, day: number): boolean => {
    const dayOfYear = (month - 1) * daysPerMonth + day;
    const dayOfWeek = (dayOfYear - 1) % 7;
    return (dayOfWeek === 5 && !workOnSaturday) || (dayOfWeek === 6 && !workOnSunday);
  }, [workOnSaturday, workOnSunday, daysPerMonth]);

  // --- Scroll Synchronization ---
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current && timelineHeaderRef.current && resourceListRef.current) {
      timelineHeaderRef.current.style.transform = `translateX(-${scrollContainerRef.current.scrollLeft}px)`;
      resourceListRef.current.style.transform = `translateY(-${scrollContainerRef.current.scrollTop}px)`;
    }
  }, []);

  // --- Calculate Task Rendering Info & Total Engagement Bars ---
  const { tasksToRender, totalEngagementBars } = useMemo(() => {
    const tasks: TaskRenderInfo[] = [];
    const engagements: TotalEngagementBar[] = [];
    const resourceMinMax: { [key: number]: { min: number; max: number } } = {};

    // 1. Find min start and max end day for each resource
    requirements.forEach(seg => {
      const resourceId = seg.resource_id;
      const startDay = seg.start_day;
      const endDay = seg.start_day + seg.duration_days - 1;
      if (!resourceMinMax[resourceId]) { resourceMinMax[resourceId] = { min: startDay, max: endDay }; }
      else { resourceMinMax[resourceId].min = Math.min(resourceMinMax[resourceId].min, startDay); resourceMinMax[resourceId].max = Math.max(resourceMinMax[resourceId].max, endDay); }
    });

    // 2. Calculate rendering info for bars and tasks
    let currentTop = 0;
    resourceGroups.forEach(group => {
      const resourceId = group.resourceId;
      const resourceTop = currentTop; // Store top for engagement bar

      // Calculate engagement bar data for this resource
      if (resourceMinMax[resourceId]) {
        const earliestTaskStart = resourceMinMax[resourceId].min;
        const latestTaskEnd = resourceMinMax[resourceId].max;
        const travelStartDay = earliestTaskStart - 1;
        const travelEndDay = latestTaskEnd + 1;
        const totalDuration = Math.max(1, travelEndDay - Math.max(1, travelStartDay) + 1);
        engagements.push({ resourceId, resourceName: group.resourceName, travelStartDay: Math.max(1, travelStartDay), travelEndDay, totalDuration, top: resourceTop });
      }

      currentTop += RESOURCE_HEADER_HEIGHT; // Move currentTop past the resource header row

      // Calculate individual task segment positions for machines under this resource
      group.machines.forEach(machine => {
        machine.requirements.forEach(seg => {
          const { month, dayOfMonth } = getDayPosition(seg.start_day);
          const left = (Math.max(1, seg.start_day) - 1) * DAY_WIDTH;
          // Calculate width based on hours
          let width = (seg.segment_hours / DAILY_HOUR_LIMIT) * DAY_WIDTH;
          width = Math.max(width, 4); // Minimum width

          tasks.push({
            ...seg,
            top: currentTop, // Use currentTop for machine row
            left: left,
            width: width,
            month: month,
            dayOfMonth: dayOfMonth,
          });
        });
        currentTop += MACHINE_ROW_HEIGHT; // Move currentTop past this machine row
      });
    }); // End of resourceGroups.forEach

    // IMPORTANT: Return statement should be *outside* the forEach loop
    return { tasksToRender: tasks, totalEngagementBars: engagements };
  }, [resourceGroups, requirements, getDayPosition, daysPerMonth]); // Correct dependencies


  // --- Loading/Error/Empty States ---
  if (loading) { return <div className="gantt-loading"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Loading & Scheduling...</span></div>; }
  if (!loading && requirements.length === 0 && !error) { return <div className="gantt-empty"><p>No training assignments scheduled for the selected plan.</p></div>; }

  // --- Render ---
  return (
    <div className="gantt-container">
      {/* Fixed Header Row */}
      <div className="gantt-header-row">
        <div className="gantt-resource-header-cell">Resources & Machines</div>
        <div className="gantt-timeline-header-wrapper">
          <div className="gantt-timeline-header-content" ref={timelineHeaderRef} style={{ width: `${totalTimelineWidth}px` }}>
            <div className="gantt-months">{months.map(month => (<div key={`month-${month}`} className="gantt-month" style={{ minWidth: `${daysPerMonth * DAY_WIDTH}px`, width: `${daysPerMonth * DAY_WIDTH}px` }}>Month {month}</div>))}</div>
            <div className="gantt-days">{months.map(month => days.map(day => (<div key={`day-${month}-${day}`} className={`gantt-day ${isWeekend(month, day) ? 'weekend' : ''}`} style={{ minWidth: `${DAY_WIDTH}px`, width: `${DAY_WIDTH}px` }}>{day}</div>)))}</div>
          </div>
        </div>
      </div>
      {/* Main Content Row */}
      <div className="gantt-main-content-row">
        {/* Resource List */}
         <div className="gantt-resource-list-wrapper">
           <div className="gantt-resource-list-content" ref={resourceListRef}>
              {resourceGroups.map(group => (
                <div key={`resource-group-${group.resourceId}`} className="gantt-resource-group">
                  <div className="gantt-resource-name" style={{ height: `${RESOURCE_HEADER_HEIGHT}px` }}>{group.resourceName}</div>
                  {group.machines.map((machine) => (<div key={`machine-label-${group.resourceId}-${machine.machineName}`} className="gantt-resource-machine" style={{ height: `${MACHINE_ROW_HEIGHT}px` }}>{machine.machineName} ({ machine.displayHours || 0}h)</div>))}
                </div>
              ))}
           </div>
         </div>
        {/* Scrollable Grid Container */}
        <div className="gantt-grid-scroll-container" ref={scrollContainerRef} onScroll={handleScroll}>
          <div className="gantt-grid-content" style={{ width: `${totalTimelineWidth}px`, height: `${totalGridHeight}px` }}>
            {/* Grid Background */}
            <div className="gantt-grid-background">
              {Array.from({ length: totalDays + 1 }).map((_, index) => ( <div key={`vline-${index}`} className="gantt-grid-vline" style={{ left: `${index * DAY_WIDTH}px` }} /> ))}
              {(() => { let currentTop = 0; const rows: React.ReactNode[] = []; resourceGroups.forEach(group => { currentTop += RESOURCE_HEADER_HEIGHT; group.machines.forEach((machine) => { rows.push(<div key={`hr-mac-${group.resourceId}-${machine.machineName}`} className="gantt-grid-hline" style={{ top: `${currentTop + MACHINE_ROW_HEIGHT - 1}px` }} />); currentTop += MACHINE_ROW_HEIGHT; }); rows.push(<div key={`hr-group-${group.resourceId}`} className="gantt-grid-hline group-separator" style={{ top: `${currentTop - 1}px` }} />); }); return rows; })()}
              {months.map(month => days.map(day => { const dayNum = (month - 1) * daysPerMonth + day; return isWeekend(month, day) && ( <div key={`weekend-bg-${month}-${day}`} className="gantt-grid-weekend-bg" style={{ left: `${(dayNum - 1) * DAY_WIDTH}px`, width: `${DAY_WIDTH}px` }} /> ); }))}
            </div>
            {/* Total Engagement Layer */}
            <div className="gantt-total-engagement-layer">
              {totalEngagementBars.map(bar => {
                  const left = (bar.travelStartDay - 1) * DAY_WIDTH;
                  const width = bar.totalDuration * DAY_WIDTH;
                  return ( <div key={`total-${bar.resourceId}`} className="gantt-total-engagement-bar" style={{ top: `${bar.top + 5}px`, left: `${left}px`, width: `${width}px`, height: `${RESOURCE_HEADER_HEIGHT - 10}px` }} title={`Total Engagement for ${bar.resourceName}: Day ${bar.travelStartDay} to ${bar.travelEndDay} (Includes Travel)`}> {width > DAY_WIDTH * 1.5 && ( <> <span className="gantt-travel-icon start" title="Travel Start"><PlaneTakeoff size={14} /></span> <span className="gantt-travel-icon end" title="Travel End"><PlaneLanding size={14} /></span> </> )} </div> );
              })}
            </div>
            {/* Task Layer */}
            <div className="gantt-task-layer">
              {tasksToRender.map(seg => (
                <div key={seg.id} className="gantt-task" style={{ top: `${seg.top + 3}px`, left: `${seg.left}px`, width: `${seg.width}px`, height: `${MACHINE_ROW_HEIGHT - 6}px`, backgroundColor: getResourceColor(seg.resource_id) }} title={`${seg.machine_name}: ${seg.segment_hours}h this block (Total ${seg.total_training_hours}h). Start: M${seg.month} D${seg.dayOfMonth}. Logical Duration: ${seg.duration_days} day(s).`}> <span className="gantt-task-label">{seg.machine_name}: {seg.segment_hours}h</span> </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; // <-- Correct closing brace for the component function

export default GanttChart;