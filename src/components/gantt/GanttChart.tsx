// GanttChart.tsx

import React, { useMemo, useRef, useCallback /* ... other imports ... */ } from "react";
import "./GanttChart.css";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// Import the new type
import { ScheduledTaskSegment } from '@/utils/types'; // Adjust path

// Constants remain the same...
const DAY_WIDTH = 30;
const RESOURCE_HEADER_HEIGHT = 40;
const MACHINE_ROW_HEIGHT = 30;

interface GanttChartProps {
  // Update the prop type here
  requirements: ScheduledTaskSegment[]; // Now expects scheduled segments
  loading: boolean;
  error: string | null; // Keep error for direct display if needed, though handled above now
  workOnSaturday: boolean;
  workOnSunday: boolean;
  onRetry?: () => void;
}

// Updated Resource Group structure to hold segments
interface ResourceGroup {
  resourceId: number;
  resourceName: string;
  machines: {
    machineName: string;
    // hours: number; // Total hours might be less relevant now, maybe sum segment hours?
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
  const resourceListRef = useRef<HTMLDivElement>(null);

  const totalMonths = 12;
  const daysPerMonth = 30;
  const totalDays = totalMonths * daysPerMonth;
  const totalTimelineWidth = totalDays * DAY_WIDTH;

  // --- Data Processing (Resource Grouping for Display) ---
  const resourceGroups = useMemo(() => {
    const groups = new Map<number, ResourceGroup>();
    // Group the *scheduled segments*
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
          // hours: 0, // Decide how to calculate total hours display if needed
          requirements: [] // Will hold segments for this machine
        };
        resourceGroup.machines.push(machineGroup);
      }

      machineGroup.requirements.push(seg); // Add the segment
      // Optionally sum hours if needed for display in the resource list
      // machineGroup.hours += seg.segment_hours; // Example
    });

    // Calculate total hours per machine for display in the resource list
     groups.forEach(group => {
        group.machines.forEach(machine => {
            // Calculate unique original tasks and sum their hours for the label
            const uniqueTasks = new Map<string | number, number>();
            machine.requirements.forEach(seg => {
                if (!uniqueTasks.has(seg.originalRequirementId)) {
                    uniqueTasks.set(seg.originalRequirementId, seg.total_training_hours);
                }
            });
             (machine as any).displayHours = Array.from(uniqueTasks.values()).reduce((sum, h) => sum + h, 0);
        });
         // Sort machines within the group
         group.machines.sort((a, b) => a.machineName.localeCompare(b.machineName));
     });


    return Array.from(groups.values());
  }, [requirements]); // Depend on the scheduled segments


  // --- Calculate Total Grid Height --- (Remains the same logic)
   const totalGridHeight = useMemo(() => {
    return resourceGroups.reduce((height, group) => {
      return height + RESOURCE_HEADER_HEIGHT + (group.machines.length * MACHINE_ROW_HEIGHT);
    }, 0);
  }, [resourceGroups]);


  // --- Day/Month Calculations --- (Remain the same)
  const months = useMemo(() => Array.from({ length: totalMonths }, (_, i) => i + 1), [totalMonths]);
  const days = useMemo(() => Array.from({ length: daysPerMonth }, (_, i) => i + 1), [daysPerMonth]);
  const getDayPosition = useCallback(/* ... same ... */ (startDay: number): { month: number; dayOfMonth: number } => {
    const month = Math.floor((startDay - 1) / daysPerMonth) + 1;
    const dayOfMonth = (startDay - 1) % daysPerMonth + 1;
    return { month, dayOfMonth };
  }, [daysPerMonth]);
  const isWeekend = useCallback(/* ... same ... */ (month: number, day: number): boolean => {
     const dayOfYear = (month - 1) * daysPerMonth + day;
     const dayOfWeek = (dayOfYear-1) % 7; // Assuming day 1 is Monday (0)
     return (dayOfWeek === 5 && !workOnSaturday) || (dayOfWeek === 6 && !workOnSunday);
  }, [workOnSaturday, workOnSunday, daysPerMonth]);

  // --- Scroll Synchronization --- (Remains the same)
  const handleScroll = useCallback(/* ... same ... */ () => {
    if (scrollContainerRef.current && timelineHeaderRef.current && resourceListRef.current) {
      timelineHeaderRef.current.style.transform = `translateX(-${scrollContainerRef.current.scrollLeft}px)`;
      resourceListRef.current.style.transform = `translateY(-${scrollContainerRef.current.scrollTop}px)`;
    }
  }, []);


  // --- Task Rendering Data --- (Now iterates through segments)
  interface TaskRenderInfo extends ScheduledTaskSegment { // Base on segment type
    top: number;
    left: number;
    width: number;
    month: number; // Add month/dayOfMonth if needed for tooltips
    dayOfMonth: number;
  }

  const tasksToRender = useMemo(() => {
    const tasks: TaskRenderInfo[] = [];
    let currentTop = 0;
    resourceGroups.forEach(group => {
      currentTop += RESOURCE_HEADER_HEIGHT;
      group.machines.forEach(machine => {
        // Iterate through the segments associated with this machine
        machine.requirements.forEach(seg => {
          const { month, dayOfMonth } = getDayPosition(seg.start_day); // Use segment's start_day
          const left = ((month - 1) * daysPerMonth + (dayOfMonth - 1)) * DAY_WIDTH;
           // Use segment's duration_days
           // Ensure width is at least a minimum visual size even for short durations if needed
          const width = Math.max(seg.duration_days * DAY_WIDTH, DAY_WIDTH / 2); // Min width example

          tasks.push({
            ...seg, // Spread the segment data
            top: currentTop, // Top position based on the machine row
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


  // --- Loading/Error/Empty States --- (Adjust logic slightly)
  if (loading) { // Show loading indicator from parent
     return <div className="gantt-loading">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading & Scheduling...</span> {/* Updated text */}
      </div>;
  }
   // Error display is now primarily handled in ResourceTrainingGantt
   /* if (error) { ... } */
  if (!loading && requirements.length === 0 && !error) { // Check requirements length
    return <div className="gantt-empty">
        <p>No training assignments scheduled for the selected plan.</p> {/* Updated text */}
      </div>;
  }


  // --- Render --- (Main structure remains, loops iterate differently)
  return (
    <div className="gantt-container">
      {/* Fixed Header Row - No change */}
      <div className="gantt-header-row">
        {/* ... */}
      </div>

      {/* Main Content Row */}
      <div className="gantt-main-content-row">
        {/* Fixed Resource List Wrapper */}
        <div className="gantt-resource-list-wrapper">
           <div className="gantt-resource-list-content" ref={resourceListRef}>
              {resourceGroups.map(group => (
                <div key={`resource-group-${group.resourceId}`} className="gantt-resource-group">
                  <div className="gantt-resource-name" style={{ height: `${RESOURCE_HEADER_HEIGHT}px` }}>
                    {group.resourceName}
                  </div>
                  {/* Use grouped machine data */}
                  {group.machines.map((machine, idx) => (
                    <div
                      key={`machine-label-${group.resourceId}-${machine.machineName}`} // Use machineName for key stability
                      className="gantt-resource-machine"
                      style={{ height: `${MACHINE_ROW_HEIGHT}px` }}
                    >
                      {/* Use the calculated displayHours */}
                      {machine.machineName} ({ (machine as any).displayHours || 0}h)
                    </div>
                  ))}
                </div>
              ))}
           </div>
        </div>

        {/* Scrollable Grid Container */}
        <div className="gantt-grid-scroll-container" ref={scrollContainerRef} onScroll={handleScroll}>
          <div className="gantt-grid-content" style={{ width: `${totalTimelineWidth}px`, height: `${totalGridHeight}px` }}>
            {/* Grid Background Layer - No change */}
            <div className="gantt-grid-background">
               {/* ... vlines / hlines / weekend backgrounds ... */}
               {/* Horizontal Lines adjusted */}
                {(() => {
                    let currentTop = 0;
                    const rows: React.ReactNode[] = [];
                    resourceGroups.forEach(group => {
                        currentTop += RESOURCE_HEADER_HEIGHT;
                        group.machines.forEach((machine, idx) => {
                            // Add line below each machine row
                            rows.push(<div key={`hr-mac-${group.resourceId}-${machine.machineName}`} className="gantt-grid-hline" style={{ top: `${currentTop + MACHINE_ROW_HEIGHT - 1}px` }} />);
                            currentTop += MACHINE_ROW_HEIGHT;
                        });
                        // Add bolder line between resource groups
                        rows.push(<div key={`hr-group-${group.resourceId}`} className="gantt-grid-hline group-separator" style={{ top: `${currentTop -1}px` }} />);
                    });
                    return rows;
                })()}
                {/* Weekend Day Backgrounds - Needs correct isWeekend function */}
                 {months.map(month => days.map(day => {
                    // Calculate day number relative to the start (1-based)
                    const dayNum = (month - 1) * daysPerMonth + day;
                    // Call the correct isWeekend check
                    return isWeekend(month, day) && ( // Use the component's isWeekend
                        <div
                            key={`weekend-bg-${month}-${day}`}
                            className="gantt-grid-weekend-bg"
                            style={{
                                left: `${(dayNum - 1) * DAY_WIDTH}px`, // Use calculated dayNum
                                width: `${DAY_WIDTH}px`,
                            }}
                        />
                    );
                 }))}
            </div>

            {/* Task Layer - Render tasksToRender */}
            <div className="gantt-task-layer">
              {tasksToRender.map(seg => ( // Iterate through calculated segments to render
                <div
                  // Use the unique segment ID for the key
                  key={seg.id}
                  className="gantt-task"
                  style={{
                    top: `${seg.top + 3}px`,
                    left: `${seg.left}px`,
                    width: `${seg.width}px`, // Use calculated width
                    height: `${MACHINE_ROW_HEIGHT - 6}px`,
                    backgroundColor: getResourceColor(seg.resource_id),
                  }}
                  // Update tooltip to show segment details or original task info
                   title={`${seg.machine_name}: ${seg.total_training_hours}h total. This segment: ${seg.segment_hours}h. Start: Month ${seg.month}, Day ${seg.dayOfMonth}. Duration: ${seg.duration_days} day(s).`}
                >
                  {/* Display machine name and maybe segment hours or original hours */}
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

// getResourceColor function remains the same...

export default GanttChart;