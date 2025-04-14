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
    displayHours?: number;
    requirements: ScheduledTaskSegment[];
  }[];
}

interface TotalEngagementBar {
  resourceId: number;
  resourceName: string;
  travelStartDay: number;
  travelEndDay: number;
  totalDuration: number;
  top: number;
}

interface TaskRenderInfo extends ScheduledTaskSegment {
  top: number;
  left: number;
  width: number; // This will now potentially represent partial days
  month: number;
  dayOfMonth: number;
}

// --- Helper Function for Colors ---
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

  const resourceGroups = useMemo(() => {
    // --- Grouping logic (same as previous working version) ---
    const groups = new Map<number, ResourceGroup>();
    requirements.forEach(seg => { /* ... */ });
    groups.forEach(group => { /* ... calculate displayHours & sort machines ... */ });
    return Array.from(groups.values());
  }, [requirements]);

  const totalGridHeight = useMemo(() => {
    // --- Height calculation (same as previous working version) ---
    return resourceGroups.reduce((height, group) => height + RESOURCE_HEADER_HEIGHT + (group.machines.length * MACHINE_ROW_HEIGHT), 0);
  }, [resourceGroups]);

  const months = useMemo(() => Array.from({ length: totalMonths }, (_, i) => i + 1), [totalMonths]);
  const days = useMemo(() => Array.from({ length: daysPerMonth }, (_, i) => i + 1), [daysPerMonth]);
  const getDayPosition = useCallback(/* ... same ... */);
  const isWeekend = useCallback(/* ... same ... */);
  const handleScroll = useCallback(/* ... same ... */);

  // --- Calculate Task Rendering Info & Total Engagement Bars ---
  const { tasksToRender, totalEngagementBars } = useMemo(() => {
    const tasks: TaskRenderInfo[] = [];
    const engagements: TotalEngagementBar[] = [];
    const resourceMinMax: { [key: number]: { min: number; max: number } } = {};

    // 1. Find min/max dates (same as before)
    requirements.forEach(seg => { /* ... min/max logic ... */ });

    // 2. Calculate rendering info
    let currentTop = 0;
    resourceGroups.forEach(group => {
      const resourceId = group.resourceId;
      const resourceTop = currentTop;
      // Calculate total engagement bar data (same as before)
      if (resourceMinMax[resourceId]) { /* ... engagement bar calculation ... */ }

      currentTop += RESOURCE_HEADER_HEIGHT;

      // Calculate individual task segment positions
      group.machines.forEach(machine => {
        machine.requirements.forEach(seg => {
          const { month, dayOfMonth } = getDayPosition(seg.start_day);
          const left = (Math.max(1, seg.start_day) - 1) * DAY_WIDTH;

          // --- UPDATED WIDTH CALCULATION ---
          // Calculate width based on hours worked relative to a full day's work
          let width = (seg.segment_hours / DAILY_HOUR_LIMIT) * DAY_WIDTH;

          // Ensure a minimum visual width for very short tasks
          width = Math.max(width, 4); // Example: 4px minimum width

          console.log(`Task ${seg.id}: Start ${seg.start_day}, Dur ${seg.duration_days}, Hours ${seg.segment_hours}, Calculated Width ${width}px`);
          // --- END UPDATED WIDTH CALCULATION ---

          tasks.push({
            ...seg,
            top: currentTop,
            left: left,
            width: width, // Use the new width
            month: month,
            dayOfMonth: dayOfMonth,
          });
        });
        currentTop += MACHINE_ROW_HEIGHT;
      });
    });
    return { tasksToRender: tasks, totalEngagementBars: engagements };
  }, [resourceGroups, requirements, getDayPosition, daysPerMonth]); // Added daysPerMonth dependency


  // --- Loading/Error/Empty States --- (Keep existing logic)
  if (loading) { return <div className="gantt-loading"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Loading & Scheduling...</span></div>; }
  if (!loading && requirements.length === 0 && !error) { return <div className="gantt-empty"><p>No training assignments scheduled for the selected plan.</p></div>; }

  // --- Render ---
  return (
    <div className="gantt-container">
      {/* Header Row */}
      <div className="gantt-header-row">
          {/* ... */}
      </div>
      {/* Main Content Row */}
      <div className="gantt-main-content-row">
        {/* Resource List */}
         <div className="gantt-resource-list-wrapper">
              {/* ... */}
         </div>
        {/* Scrollable Grid Container */}
        <div className="gantt-grid-scroll-container" ref={scrollContainerRef} onScroll={handleScroll}>
          <div className="gantt-grid-content" style={{ width: `${totalTimelineWidth}px`, height: `${totalGridHeight}px` }}>
            {/* Grid Background */}
            <div className="gantt-grid-background">
                {/* ... */}
            </div>
            {/* Total Engagement Layer */}
            <div className="gantt-total-engagement-layer">
                {/* ... */}
            </div>

            {/* Task Layer - Uses the new width calculation */}
            <div className="gantt-task-layer">
              {tasksToRender.map(seg => (
                <div
                  key={seg.id}
                  className="gantt-task"
                  style={{
                    top: `${seg.top + 3}px`,
                    left: `${seg.left}px`,
                    width: `${seg.width}px`, // Uses the calculated width
                    height: `${MACHINE_ROW_HEIGHT - 6}px`,
                    backgroundColor: getResourceColor(seg.resource_id),
                  }}
                  // Update tooltip for clarity
                  title={`${seg.machine_name}: ${seg.segment_hours}h this block (Total ${seg.total_training_hours}h). Start: M${seg.month} D${seg.dayOfMonth}. Logical Duration: ${seg.duration_days} day(s).`}
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