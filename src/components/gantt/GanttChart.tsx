// src/components/gantt/GanttChart.tsx

import React, { useMemo, useRef, useCallback, useEffect } from "react"; // Added useEffect
import "./GanttChart.css";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// Import the type for scheduled segments
import { ScheduledTaskSegment } from '@/utils/types'; // Adjust path if necessary

// --- Constants ---
const DAY_WIDTH = 30; // px
const RESOURCE_HEADER_HEIGHT = 40; // px - For resource name row
const MACHINE_ROW_HEIGHT = 30; // px - For machine name and task row

interface GanttChartProps {
  // Update the prop type here to expect scheduled segments
  requirements: ScheduledTaskSegment[];
  loading: boolean;
  error: string | null; // Keep error for potential direct display
  workOnSaturday: boolean;
  workOnSunday: boolean;
  onRetry?: () => void;
}

// Updated Resource Group structure to hold segments for display grouping
interface ResourceGroup {
  resourceId: number;
  resourceName: string;
  machines: {
    machineName: string;
    displayHours?: number; // Added for displaying total original hours in the list
    requirements: ScheduledTaskSegment[]; // Store segments here
  }[];
}


const GanttChart: React.FC<GanttChartProps> = ({
  requirements, // This is now ScheduledTaskSegment[]
  loading,
  error, // Keep prop, but might not display directly
  workOnSaturday,
  workOnSunday,
  onRetry // Keep prop
}) => {
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resourceListRef = useRef<HTMLDivElement>(null); // Ref for vertical scroll sync

  // Calculate total number of days for width calculation
  const totalMonths = 12; // Example: Fixed 12 months
  const daysPerMonth = 30; // Fixed 30 days per month
  const totalDays = totalMonths * daysPerMonth;
  const totalTimelineWidth = totalDays * DAY_WIDTH;

  // --- Data Processing (Resource Grouping for Display) ---
  const resourceGroups = useMemo(() => {
    const groups = new Map<number, ResourceGroup>();
    // Group the *scheduled segments* for display purposes
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
          displayHours: 0, // Initialize display hours
          requirements: [] // Will hold segments for this machine
        };
        resourceGroup.machines.push(machineGroup);
      }
      machineGroup.requirements.push(seg);
    });

    // Calculate total original hours per machine for display in the resource list
    groups.forEach(group => {
      group.machines.forEach(machine => {
        const uniqueTasks = new Map<string | number, number>();
        machine.requirements.forEach(seg => {
          if (!uniqueTasks.has(seg.originalRequirementId)) {
            // Store the *total* training hours from the original requirement
            uniqueTasks.set(seg.originalRequirementId, seg.total_training_hours);
          }
        });
        // Sum the hours of the unique original tasks associated with this machine
        machine.displayHours = Array.from(uniqueTasks.values()).reduce((sum, h) => sum + h, 0);
      });
      // Sort machines within the group alphabetically
      group.machines.sort((a, b) => a.machineName.localeCompare(b.machineName));
    });

    return Array.from(groups.values());
  }, [requirements]); // Depend on the scheduled segments


  // --- Calculate Total Grid Height ---
  const totalGridHeight = useMemo(() => {
    return resourceGroups.reduce((height, group) => {
      // Add height for the resource name row + height for each machine row
      return height + RESOURCE_HEADER_HEIGHT + (group.machines.length * MACHINE_ROW_HEIGHT);
    }, 0);
  }, [resourceGroups]);


  // --- Day/Month Calculations ---
  const months = useMemo(() => Array.from({ length: totalMonths }, (_, i) => i + 1), [totalMonths]);
  const days = useMemo(() => Array.from({ length: daysPerMonth }, (_, i) => i + 1), [daysPerMonth]);

  const getDayPosition = useCallback((startDay: number): { month: number; dayOfMonth: number } => {
    // Ensure startDay is at least 1
    const validStartDay = Math.max(1, startDay);
    const month = Math.floor((validStartDay - 1) / daysPerMonth) + 1;
    const dayOfMonth = ((validStartDay - 1) % daysPerMonth) + 1;
    return { month, dayOfMonth };
  }, [daysPerMonth]);

  const isWeekend = useCallback((month: number, day: number): boolean => {
    const dayOfYear = (month - 1) * daysPerMonth + day;
    // Corrected modulo logic: (dayOfYear - 1) % 7 gives 0 for Day 1 (Mon), 5 for Sat, 6 for Sun
    const dayOfWeek = (dayOfYear - 1) % 7;
    return (dayOfWeek === 5 && !workOnSaturday) || (dayOfWeek === 6 && !workOnSunday);
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

  // --- Task Rendering Data --- (Iterates through segments)
  interface TaskRenderInfo extends ScheduledTaskSegment { // Base on segment type
    top: number;
    left: number;
    width: number;
    month: number; // Add month/dayOfMonth needed for tooltips
    dayOfMonth: number;
  }

  const tasksToRender = useMemo(() => {
    const tasks: TaskRenderInfo[] = [];
    let currentTop = 0;
    resourceGroups.forEach(group => {
      currentTop += RESOURCE_HEADER_HEIGHT; // Account for resource name row height
      group.machines.forEach(machine => {
        // Iterate through the segments associated with this machine for rendering
        machine.requirements.forEach(seg => {
          const { month, dayOfMonth } = getDayPosition(seg.start_day);
          const left = ((month - 1) * daysPerMonth + (dayOfMonth - 1)) * DAY_WIDTH;
          // Width based on segment's duration_days
          const width = Math.max(seg.duration_days * DAY_WIDTH, DAY_WIDTH / 2); // Ensure a minimum visual width

          tasks.push({
            ...seg, // Spread the segment data
            top: currentTop, // Top position is based on the start of the machine row
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
  }, [resourceGroups, getDayPosition, daysPerMonth]); // Depends on grouped segments


  // --- Loading/Error/Empty States ---
  if (loading) { // Show loading indicator passed from parent
     return <div className="gantt-loading">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading & Scheduling...</span>
      </div>;
  }
   // Error display is primarily handled in ResourceTrainingGantt
   /* if (error) { ... } */

  // Show empty state only if not loading and requirements array is empty
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
        {/* Fixed Resource Header Cell */}
        <div className="gantt-resource-header-cell">
          Resources & Machines
        </div>
        {/* Scrollable Timeline Header Wrapper */}
        <div className="gantt-timeline-header-wrapper">
          {/* Actual Timeline Header Content (Wider than wrapper) */}
          <div className="gantt-timeline-header-content" ref={timelineHeaderRef} style={{ width: `${totalTimelineWidth}px` }}>
            <div className="gantt-months">
              {months.map(month => (
                <div key={`month-${month}`} className="gantt-month" style={{ minWidth: `${daysPerMonth * DAY_WIDTH}px`, width: `${daysPerMonth * DAY_WIDTH}px` }}>
                  Month {month}
                </div>
              ))}
            </div>
            <div className="gantt-days">
              {months.map(month => days.map(day => (
                <div
                  key={`day-${month}-${day}`}
                  className={`gantt-day ${isWeekend(month, day) ? 'weekend' : ''}`}
                  style={{ minWidth: `${DAY_WIDTH}px`, width: `${DAY_WIDTH}px` }}
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
                  {/* Resource Name Row */}
                  <div className="gantt-resource-name" style={{ height: `${RESOURCE_HEADER_HEIGHT}px` }}>
                    {group.resourceName}
                  </div>
                  {/* Machine Rows */}
                  {group.machines.map((machine) => (
                    <div
                      key={`machine-label-${group.resourceId}-${machine.machineName}`}
                      className="gantt-resource-machine"
                      style={{ height: `${MACHINE_ROW_HEIGHT}px` }}
                    >
                      {/* Use the calculated displayHours */}
                      {machine.machineName} ({ machine.displayHours || 0}h)
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
                      currentTop += RESOURCE_HEADER_HEIGHT; // Move past resource header row
                      group.machines.forEach((machine) => {
                          // Add line below each machine row
                          rows.push(<div key={`hr-mac-${group.resourceId}-${machine.machineName}`} className="gantt-grid-hline" style={{ top: `${currentTop + MACHINE_ROW_HEIGHT - 1}px` }} />);
                          currentTop += MACHINE_ROW_HEIGHT;
                      });
                      // Add bolder line between resource groups (at the bottom of the last machine row)
                      rows.push(<div key={`hr-group-${group.resourceId}`} className="gantt-grid-hline group-separator" style={{ top: `${currentTop - 1}px` }} />);
                  });
                  return rows;
              })()}
              {/* Weekend Day Backgrounds */}
              {months.map(month => days.map(day => {
                 const dayNum = (month - 1) * daysPerMonth + day; // Overall day number
                 return isWeekend(month, day) && ( // Use the component's isWeekend check
                    <div
                      key={`weekend-bg-${month}-${day}`}
                      className="gantt-grid-weekend-bg"
                      style={{
                          left: `${(dayNum - 1) * DAY_WIDTH}px`, // Position based on overall day number
                          width: `${DAY_WIDTH}px`,
                      }}
                    />
                 );
              }))}
            </div>

            {/* Task Layer - Renders the calculated task segments */}
            <div className="gantt-task-layer">
              {tasksToRender.map(seg => (
                <div
                  // Use the unique segment ID for the key
                  key={seg.id}
                  className="gantt-task"
                  style={{
                    top: `${seg.top + 3}px`, // Position based on calculated top + offset
                    left: `${seg.left}px`, // Position based on calculated left
                    width: `${seg.width}px`, // Width based on calculated width
                    height: `${MACHINE_ROW_HEIGHT - 6}px`, // Height based on constant - padding
                    backgroundColor: getResourceColor(seg.resource_id), // Use the color function
                  }}
                  title={`${seg.machine_name}: ${seg.total_training_hours}h total. Segment: ${seg.segment_hours}h. Start: M${seg.month} D${seg.dayOfMonth}. Duration: ${seg.duration_days} day(s).`}
                >
                  {/* Display machine name and segment hours */}
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

// --- getResourceColor Function ---
// Ensure this function is defined *outside* the component function
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
  // Use modulo operator to safely cycle through colors
  return colors[id % colors.length];
}

export default GanttChart;