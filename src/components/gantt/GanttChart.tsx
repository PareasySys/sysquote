// src/components/gantt/GanttChart.tsx

import React, { useMemo, useRef, useCallback, useEffect } from "react";
import "./GanttChart.css"; // Ensure CSS is imported
import { Loader2, PlaneTakeoff, PlaneLanding } from "lucide-react"; // Import plane icons
import { Button } from "@/components/ui/button";
import { ScheduledTaskSegment } from '@/utils/types'; // Adjust path if necessary

// --- Constants --- (Keep existing constants)
const DAY_WIDTH = 30;
const RESOURCE_HEADER_HEIGHT = 40;
const MACHINE_ROW_HEIGHT = 30;

interface GanttChartProps {
  requirements: ScheduledTaskSegment[];
  loading: boolean;
  error: string | null;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  onRetry?: () => void;
}

// --- ResourceGroup Interface --- (Keep existing interface)
interface ResourceGroup {
  resourceId: number;
  resourceName: string;
  machines: {
    machineName: string;
    displayHours?: number;
    requirements: ScheduledTaskSegment[];
  }[];
}

// --- New Interface for Total Engagement Bars ---
interface TotalEngagementBar {
  resourceId: number;
  resourceName: string;
  travelStartDay: number; // Start day including travel
  travelEndDay: number;   // End day including travel
  totalDuration: number; // Total duration including travel
  top: number;            // Vertical position for the resource header row
}

// --- TaskRenderInfo Interface --- (Keep existing interface)
interface TaskRenderInfo extends ScheduledTaskSegment {
  top: number;
  left: number;
  width: number;
  month: number;
  dayOfMonth: number;
}

// --- getResourceColor Function --- (Keep existing function outside component)
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

  const totalMonths = 12;
  const daysPerMonth = 30;
  const totalDays = totalMonths * daysPerMonth;
  const totalTimelineWidth = totalDays * DAY_WIDTH;

  // --- Group Segments by Resource (for display and calculations) ---
  const resourceGroups = useMemo(() => {
      // ... (Keep the existing resource grouping logic from the previous step) ...
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
              machineGroup = {
                  machineName,
                  displayHours: 0,
                  requirements: []
              };
              resourceGroup.machines.push(machineGroup);
          }
          machineGroup.requirements.push(seg);
      });

      groups.forEach(group => {
          group.machines.forEach(machine => {
              const uniqueTasks = new Map<string | number, number>();
              machine.requirements.forEach(seg => {
                  if (!uniqueTasks.has(seg.originalRequirementId)) {
                      uniqueTasks.set(seg.originalRequirementId, seg.total_training_hours);
                  }
              });
              machine.displayHours = Array.from(uniqueTasks.values()).reduce((sum, h) => sum + h, 0);
          });
          group.machines.sort((a, b) => a.machineName.localeCompare(b.machineName));
      });
      return Array.from(groups.values());
  }, [requirements]);

  // --- Calculate Grid Height --- (Keep existing logic)
  const totalGridHeight = useMemo(() => {
      return resourceGroups.reduce((height, group) => {
          return height + RESOURCE_HEADER_HEIGHT + (group.machines.length * MACHINE_ROW_HEIGHT);
      }, 0);
  }, [resourceGroups]);

  // --- Day/Month Calculations --- (Keep existing logic)
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

  // --- Scroll Synchronization --- (Keep existing logic)
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current && timelineHeaderRef.current && resourceListRef.current) {
      timelineHeaderRef.current.style.transform = `translateX(-${scrollContainerRef.current.scrollLeft}px)`;
      resourceListRef.current.style.transform = `translateY(-${scrollContainerRef.current.scrollTop}px)`;
    }
  }, []);

  // --- Calculate Task Rendering Info AND Total Engagement Bars ---
  const { tasksToRender, totalEngagementBars } = useMemo(() => {
    const tasks: TaskRenderInfo[] = [];
    const engagements: TotalEngagementBar[] = [];
    const resourceMinMax: { [key: number]: { min: number; max: number } } = {};

    // First pass: find min start and max end day for each resource
    requirements.forEach(seg => {
      const resourceId = seg.resource_id;
      const startDay = seg.start_day;
      const endDay = seg.start_day + seg.duration_days - 1; // End day is inclusive

      if (!resourceMinMax[resourceId]) {
        resourceMinMax[resourceId] = { min: startDay, max: endDay };
      } else {
        resourceMinMax[resourceId].min = Math.min(resourceMinMax[resourceId].min, startDay);
        resourceMinMax[resourceId].max = Math.max(resourceMinMax[resourceId].max, endDay);
      }
    });

    // Second pass: calculate rendering info for tasks and total bars
    let currentTop = 0;
    resourceGroups.forEach(group => {
      const resourceId = group.resourceId;
      const resourceTop = currentTop; // Top position for the total bar

      // Calculate engagement bar data if min/max exists for the resource
      if (resourceMinMax[resourceId]) {
        const earliestStart = resourceMinMax[resourceId].min;
        const latestEnd = resourceMinMax[resourceId].max;
        const travelStartDay = earliestStart - 1;
        const travelEndDay = latestEnd + 1;
        const totalDuration = travelEndDay - travelStartDay + 1;

        engagements.push({
            resourceId: resourceId,
            resourceName: group.resourceName,
            travelStartDay: Math.max(1, travelStartDay), // Ensure start day is not less than 1
            travelEndDay: travelEndDay,
            totalDuration: totalDuration,
            top: resourceTop,
        });
      }

      currentTop += RESOURCE_HEADER_HEIGHT; // Move top past the resource header row

      // Calculate positions for individual task segments
      group.machines.forEach(machine => {
        machine.requirements.forEach(seg => {
          const { month, dayOfMonth } = getDayPosition(seg.start_day);
          const left = ((month - 1) * daysPerMonth + (dayOfMonth - 1)) * DAY_WIDTH;
          const width = Math.max(seg.duration_days * DAY_WIDTH, DAY_WIDTH / 2);
          tasks.push({
            ...seg,
            top: currentTop, // Use currentTop which is now at the machine row level
            left: left,
            width: width,
            month: month,
            dayOfMonth: dayOfMonth,
          });
        });
        currentTop += MACHINE_ROW_HEIGHT; // Move top past this machine row
      });
    });
    return { tasksToRender: tasks, totalEngagementBars: engagements };
  }, [resourceGroups, requirements, getDayPosition, daysPerMonth]);


  // --- Loading/Error/Empty States --- (Keep existing logic)
  if (loading) {
     return <div className="gantt-loading">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading & Scheduling...</span>
      </div>;
  }
  if (!loading && requirements.length === 0 && !error) {
    return <div className="gantt-empty">
        <p>No training assignments scheduled for the selected plan.</p>
      </div>;
  }

  // --- Render ---
  return (
    <div className="gantt-container">
      {/* Fixed Header Row */}
      <div className="gantt-header-row">
        <div className="gantt-resource-header-cell">Resources & Machines</div>
        <div className="gantt-timeline-header-wrapper">
            <div className="gantt-timeline-header-content" ref={timelineHeaderRef} style={{ width: `${totalTimelineWidth}px` }}>
                <div className="gantt-months"> {/* ... months ... */} </div>
                <div className="gantt-days"> {/* ... days ... */} </div>
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
                  {group.machines.map((machine) => (
                    <div key={`machine-label-${group.resourceId}-${machine.machineName}`} className="gantt-resource-machine" style={{ height: `${MACHINE_ROW_HEIGHT}px` }}>
                      {machine.machineName} ({ machine.displayHours || 0}h)
                    </div>
                  ))}
                </div>
              ))}
           </div>
        </div>

        {/* Scrollable Grid Container */}
        <div className="gantt-grid-scroll-container" ref={scrollContainerRef} onScroll={handleScroll}>
          <div className="gantt-grid-content" style={{ width: `${totalTimelineWidth}px`, height: `${totalGridHeight}px` }}>
            {/* Grid Background Layer */}
            <div className="gantt-grid-background"> {/* ... vlines / hlines / weekends ... */} </div>

            {/* ---- NEW: Total Engagement Bar Layer ---- */}
            <div className="gantt-total-engagement-layer">
                {totalEngagementBars.map(bar => {
                    const left = (bar.travelStartDay - 1) * DAY_WIDTH;
                    const width = bar.totalDuration * DAY_WIDTH;
                    return (
                        <div
                            key={`total-${bar.resourceId}`}
                            className="gantt-total-engagement-bar"
                            style={{
                                top: `${bar.top + 5}px`, // Position within the resource header row
                                left: `${left}px`,
                                width: `${width}px`,
                                height: `${RESOURCE_HEADER_HEIGHT - 10}px`, // Make slightly smaller than row
                            }}
                            title={`Total Engagement for ${bar.resourceName}: Day ${bar.travelStartDay} to ${bar.travelEndDay} (Includes Travel)`}
                        >
                            {/* Travel Icons */}
                            {/* Position icons absolutely within the bar */}
                            <span className="gantt-travel-icon start">
                                <PlaneTakeoff size={14} />
                            </span>
                            <span className="gantt-travel-icon end">
                                <PlaneLanding size={14} />
                            </span>
                        </div>
                    );
                })}
            </div>
            {/* ---- END: Total Engagement Bar Layer ---- */}


            {/* Task Layer */}
            <div className="gantt-task-layer">
              {tasksToRender.map(seg => (
                <div
                  key={seg.id}
                  className="gantt-task"
                  style={{
                    top: `${seg.top + 3}px`,
                    left: `${seg.left}px`,
                    width: `${seg.width}px`,
                    height: `${MACHINE_ROW_HEIGHT - 6}px`,
                    backgroundColor: getResourceColor(seg.resource_id),
                  }}
                  title={`${seg.machine_name}: ${seg.total_training_hours}h total. Segment: ${seg.segment_hours}h. Start: M${seg.month} D${seg.dayOfMonth}. Duration: ${seg.duration_days} day(s).`}
                >
                  <span className="gantt-task-label">{seg.machine_name}: {seg.segment_hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;