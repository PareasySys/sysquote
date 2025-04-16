
// src/components/gantt/GanttChart.tsx
// NO CHANGES NEEDED in this file based on the prompt.
// It already adapts its height based on content via its parent.

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import "./GanttChart.css";
import { Loader2, PlaneTakeoff, PlaneLanding, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduledTaskSegment, ResourceCategory } from '@/utils/types';

// --- Constants ---
const INITIAL_DAY_WIDTH = 80;
const MIN_DAY_WIDTH = 20;
const MAX_DAY_WIDTH = 200;
const ZOOM_STEP = 15;
const RESOURCE_HEADER_HEIGHT = 40;
const MACHINE_ROW_HEIGHT = 30;
const DAILY_HOUR_LIMIT = 8;
const TOTAL_BAR_OPACITY = 0.4;
const RESOURCE_GROUP_PADDING_BOTTOM = 10;

// --- Interfaces ---
interface GanttChartProps {
  requirements: ScheduledTaskSegment[];
  loading: boolean;
  error: string | null; // Error display handled by parent now
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
    resourceCategory?: ResourceCategory; 
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
  width: number; 
  month: number; 
  dayOfMonth: number; 
}

// --- Helper Function for Colors ---
function getResourceColor(id: number): string {
  const colors = [ '#3B82F6', '#F97316', '#10B981', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#06B6D4' ];
  const index = Math.abs(id || 0) % colors.length;
  return colors[index];
}
function hexToRgb(hex: string): { r: number; g: number; b: number } | null { const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i; hex = hex.replace(shorthandRegex, (m, r, g, b) => { return r + r + g + g + b + b; }); const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null; }

// --- GanttChart Component ---
const GanttChart: React.FC<GanttChartProps> = ({
  requirements, loading, error, workOnSaturday, workOnSunday, onRetry
}) => {
  const [dayWidth, setDayWidth] = useState<number>(INITIAL_DAY_WIDTH);
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const totalMonths = 12;
  const daysPerMonth = 30;
  const totalDays = totalMonths * daysPerMonth;
  const totalTimelineWidth = useMemo(() => totalDays * dayWidth, [totalDays, dayWidth]);

  const resourceGroups = useMemo(() => { const groups = new Map<number, ResourceGroup>(); requirements.forEach(seg => { if (seg.resource_id == null) return; if (!groups.has(seg.resource_id)) { groups.set(seg.resource_id, { resourceId: seg.resource_id, resourceName: seg.resource_name || `Resource ${seg.resource_id}`, machines: [] }); } const resourceGroup = groups.get(seg.resource_id)!; const machineName = seg.machine_name || "Unknown Machine"; let machineGroup = resourceGroup.machines.find(m => m.machineName === machineName); if (!machineGroup) { machineGroup = { machineName, displayHours: 0, requirements: [], resourceCategory: seg.resource_category }; resourceGroup.machines.push(machineGroup); } machineGroup.requirements.push(seg); }); groups.forEach(group => { group.machines.forEach(machine => { const uniqueTasks = new Map<string | number, number>(); machine.requirements.forEach(seg => { if (seg.originalRequirementId != null && !uniqueTasks.has(seg.originalRequirementId)) uniqueTasks.set(seg.originalRequirementId, seg.total_training_hours); }); machine.displayHours = Array.from(uniqueTasks.values()).reduce((sum, h) => sum + (h || 0), 0); }); group.machines.sort((a, b) => { if ((a.resourceCategory || 'Machine') !== (b.resourceCategory || 'Machine')) { return (a.resourceCategory || 'Machine') === 'Machine' ? -1 : 1; } return a.machineName.localeCompare(b.machineName); }); }); return Array.from(groups.values()); }, [requirements]);

  const totalGridHeight = useMemo(() => { let height = 0; resourceGroups.forEach(group => { height += RESOURCE_HEADER_HEIGHT; height += group.machines.length * MACHINE_ROW_HEIGHT; height += RESOURCE_GROUP_PADDING_BOTTOM; }); if (resourceGroups.length > 0) { height -= RESOURCE_GROUP_PADDING_BOTTOM; } return Math.max(height, 100); }, [resourceGroups]);

  const months = useMemo(() => Array.from({ length: totalMonths }, (_, i) => i + 1), [totalMonths]);
  const days = useMemo(() => Array.from({ length: daysPerMonth }, (_, i) => i + 1), [daysPerMonth]);
  const getDayPosition = useCallback((startDay: number): { month: number; dayOfMonth: number } => { const validStartDay = Math.max(1, startDay); const month = Math.floor((validStartDay - 1) / daysPerMonth) + 1; const dayOfMonth = ((validStartDay - 1) % daysPerMonth) + 1; return { month, dayOfMonth }; }, [daysPerMonth]);
  const isWeekend = useCallback((month: number, day: number): boolean => { const dayOfYear = (month - 1) * daysPerMonth + day; const dayOfWeek = (dayOfYear - 1) % 7; return (dayOfWeek === 5 && !workOnSaturday) || (dayOfWeek === 6 && !workOnSunday); }, [workOnSaturday, workOnSunday, daysPerMonth]);

  const handleScroll = useCallback(() => { if (scrollContainerRef.current && timelineHeaderRef.current) { timelineHeaderRef.current.style.transform = `translateX(-${scrollContainerRef.current.scrollLeft}px)`; } }, []);

  const { tasksToRender, totalEngagementBars } = useMemo(() => { const tasks: TaskRenderInfo[] = []; const engagements: TotalEngagementBar[] = []; const resourceMinMax: { [key: number]: { min: number; max: number } } = {}; requirements.forEach(seg => { if (seg.resource_id == null || seg.start_day == null || seg.duration_days == null) return; const resourceId = seg.resource_id; const startDay = seg.start_day; const endDay = seg.start_day + seg.duration_days - 1; if (!resourceMinMax[resourceId]) { resourceMinMax[resourceId] = { min: startDay, max: endDay }; } else { resourceMinMax[resourceId].min = Math.min(resourceMinMax[resourceId].min, startDay); resourceMinMax[resourceId].max = Math.max(resourceMinMax[resourceId].max, endDay); } }); let currentTop = 0; resourceGroups.forEach((group, groupIndex) => { const resourceId = group.resourceId; const resourceTop = currentTop; if (resourceMinMax[resourceId]) { const earliestTaskStart = resourceMinMax[resourceId].min; const latestTaskEnd = resourceMinMax[resourceId].max; const travelStartDay = earliestTaskStart - 1; const travelEndDay = latestTaskEnd + 1; const safeTravelStartDay = Math.max(1, travelStartDay); const totalDuration = Math.max(1, travelEndDay - safeTravelStartDay + 1); engagements.push({ resourceId, resourceName: group.resourceName, travelStartDay: safeTravelStartDay, travelEndDay, totalDuration, top: resourceTop }); } currentTop += RESOURCE_HEADER_HEIGHT; group.machines.forEach(machine => { machine.requirements.forEach(seg => { if (seg.start_day == null || seg.resource_id == null || seg.start_hour_offset == null || seg.segment_hours == null) { console.warn("Skipping segment render due to missing data:", seg); return; } const { month, dayOfMonth } = getDayPosition(seg.start_day); const baseLeft = (Math.max(1, seg.start_day) - 1) * dayWidth; const hourOffsetPixels = (seg.start_hour_offset / DAILY_HOUR_LIMIT) * dayWidth; const left = baseLeft + hourOffsetPixels; let width = (seg.segment_hours / DAILY_HOUR_LIMIT) * dayWidth; width = Math.max(width, 4); tasks.push({ ...seg, top: currentTop, left: left, width: width, month: month, dayOfMonth: dayOfMonth, }); }); currentTop += MACHINE_ROW_HEIGHT; }); if (groupIndex < resourceGroups.length - 1) { currentTop += RESOURCE_GROUP_PADDING_BOTTOM; } }); return { tasksToRender: tasks, totalEngagementBars: engagements }; }, [resourceGroups, requirements, getDayPosition, daysPerMonth, dayWidth]);

  const handleZoomIn = useCallback(() => { setDayWidth(prev => Math.min(MAX_DAY_WIDTH, prev + ZOOM_STEP)); }, []);
  const handleZoomOut = useCallback(() => { setDayWidth(prev => Math.max(MIN_DAY_WIDTH, prev - ZOOM_STEP)); }, []);

  // Loading/Error display is now handled by the parent ResourceTrainingGantt
  // if (loading) { ... }
  // if (!loading && requirements.length === 0 && !error) { ... }
  // if (error) { ... }

  const isZoomOutDisabled = dayWidth <= MIN_DAY_WIDTH;
  const isZoomInDisabled = dayWidth >= MAX_DAY_WIDTH;

  // Main container height adapts based on the internal calculated totalGridHeight
  return (
    <div className="gantt-container">
      {/* --- Zoom Controls --- */}
      <div className="gantt-controls">
        <div className="gantt-controls-inner">
            <ZoomOut 
              className={`gantt-zoom-icon ${isZoomOutDisabled ? 'disabled' : ''}`} 
              size={18} 
              onClick={!isZoomOutDisabled ? handleZoomOut : undefined} 
              aria-disabled={isZoomOutDisabled}
            />
            <span className="gantt-zoom-level">{Math.round(dayWidth / INITIAL_DAY_WIDTH * 100)}%</span>
            <ZoomIn 
              className={`gantt-zoom-icon ${isZoomInDisabled ? 'disabled' : ''}`} 
              size={18} 
              onClick={!isZoomInDisabled ? handleZoomIn : undefined} 
              aria-disabled={isZoomInDisabled}
            />
        </div>
      </div>

      {/* --- Fixed Header Row --- */}
      <div className="gantt-header-row">
         <div className="gantt-resource-header-cell">Resources</div>
         <div className="gantt-timeline-header-wrapper">
             <div className="gantt-timeline-header-content" ref={timelineHeaderRef} style={{ width: `${totalTimelineWidth}px` }}>
                 <div className="gantt-months">{months.map(month => (<div key={`month-${month}`} className="gantt-month" style={{ minWidth: `${daysPerMonth * dayWidth}px`, width: `${daysPerMonth * dayWidth}px` }}>Month {month}</div>))}</div>
                 <div className="gantt-days">{months.map(month => days.map(day => (<div key={`day-${month}-${day}`} className={`gantt-day ${isWeekend(month, day) ? 'weekend' : ''}`} style={{ minWidth: `${dayWidth}px`, width: `${dayWidth}px` }}>{day}</div>)))}</div>
             </div>
         </div>
      </div>

      {/* --- Main Content Row (height adapts) --- */}
      <div className="gantt-main-content-row">
        {/* --- Resource List (height matches grid content) --- */}
         <div className="gantt-resource-list-wrapper">
            <div className="gantt-resource-list-content" style={{ height: `${totalGridHeight}px` }}>
                 {resourceGroups.map(group => (
                    <div key={`resource-group-${group.resourceId}`} className="gantt-resource-group">
                        <div className="gantt-resource-name" style={{ height: `${RESOURCE_HEADER_HEIGHT}px` }}>{group.resourceName}</div>
                        {group.machines.map((machine) => (
                            <div key={`machine-label-${group.resourceId}-${machine.machineName}`} className={`gantt-resource-machine ${machine.resourceCategory === 'Software' ? 'software-resource' : ''}`} style={{ height: `${MACHINE_ROW_HEIGHT}px` }} >
                                <div className="flex items-center">
                                    {machine.resourceCategory === 'Software' ? (<span className="mr-1 text-xs px-1 bg-indigo-700/50 rounded">SW</span>) : null}
                                    {machine.machineName} ({machine.displayHours || 0}h)
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
         </div>

        {/* --- Scrollable Grid Container (HORIZONTAL SCROLL ONLY) --- */}
        <div className="gantt-grid-scroll-container" ref={scrollContainerRef} onScroll={handleScroll}>
          <div className="gantt-grid-content" style={{ width: `${totalTimelineWidth}px`, height: `${totalGridHeight}px` }}>
            {/* Grid Background */}
            <div className="gantt-grid-background">
                 {Array.from({ length: totalDays + 1 }).map((_, index) => ( <div key={`vline-${index}`} className="gantt-grid-vline" style={{ left: `${index * dayWidth}px` }} /> ))}
                 {(() => { let currentTop = 0; const rows: React.ReactNode[] = []; resourceGroups.forEach((group, groupIndex) => { rows.push(<div key={`hr-res-${group.resourceId}`} className="gantt-grid-hline" style={{ top: `${currentTop + RESOURCE_HEADER_HEIGHT -1}px` }} />); currentTop += RESOURCE_HEADER_HEIGHT; group.machines.forEach((machine) => { rows.push(<div key={`hr-mac-${group.resourceId}-${machine.machineName}`} className="gantt-grid-hline" style={{ top: `${currentTop + MACHINE_ROW_HEIGHT - 1}px` }} />); currentTop += MACHINE_ROW_HEIGHT; }); if (groupIndex < resourceGroups.length - 1) { rows.push(<div key={`hr-group-sep-${group.resourceId}`} className="gantt-grid-hline group-separator" style={{ top: `${currentTop -1}px` }} />); currentTop += RESOURCE_GROUP_PADDING_BOTTOM; } }); return rows; })()}
                 {months.map(month => days.map(day => { const dayNum = (month - 1) * daysPerMonth + day; return isWeekend(month, day) && ( <div key={`weekend-bg-${month}-${day}`} className="gantt-grid-weekend-bg" style={{ left: `${(dayNum - 1) * dayWidth}px`, width: `${dayWidth}px` }} /> ); }))}
            </div>
            {/* Total Engagement Layer */}
            <div className="gantt-total-engagement-layer">
                 {totalEngagementBars.map(bar => { const left = (bar.travelStartDay - 1) * dayWidth; const width = bar.totalDuration * dayWidth; const barTop = bar.top + 5; const barHeight = RESOURCE_HEADER_HEIGHT - 10; const resourceColorHex = getResourceColor(bar.resourceId); const resourceColorRgb = hexToRgb(resourceColorHex); const backgroundColor = resourceColorRgb ? `rgba(${resourceColorRgb.r}, ${resourceColorRgb.g}, ${resourceColorRgb.b}, ${TOTAL_BAR_OPACITY})` : `rgba(100, 116, 139, ${TOTAL_BAR_OPACITY})`; return ( <div key={`total-${bar.resourceId}`} className="gantt-total-engagement-bar" style={{ top: `${barTop}px`, left: `${left}px`, width: `${width}px`, height: `${barHeight}px`, backgroundColor: backgroundColor }} title={`Total Engagement for ${bar.resourceName}: Day ${bar.travelStartDay} to ${bar.travelEndDay} (Includes Travel)`}> {width > dayWidth * 1.5 && ( <> <span className="gantt-travel-icon start" title="Travel Start"><PlaneTakeoff size={14} /></span> <span className="gantt-travel-icon end" title="Travel End"><PlaneLanding size={14} /></span> </> )} </div> ); })}
            </div>
            {/* Task Layer */}
            <div className="gantt-task-layer">
                 {tasksToRender.map((seg) => ( <div key={seg.id} className={`gantt-task ${seg.resource_category === 'Software' ? 'software-task' : ''}`} style={{ top: `${seg.top + 3}px`, left: `${seg.left}px`, width: `${seg.width}px`, height: `${MACHINE_ROW_HEIGHT - 6}px`, backgroundColor: getResourceColor(seg.resource_id), opacity: seg.resource_category === 'Software' ? 0.85 : 1, borderStyle: seg.resource_category === 'Software' ? 'dashed' : 'solid' }} title={`${seg.machine_name}: ${seg.segment_hours}h this block (Total ${seg.total_training_hours}h). Start: M${seg.month} D${seg.dayOfMonth} Offset: ${seg.start_hour_offset.toFixed(1)}h. Logical Duration: ${seg.duration_days} day(s).`}> {seg.width > 25 && ( <span className="gantt-task-label"> {seg.segment_hours % 1 === 0 ? seg.segment_hours : seg.segment_hours.toFixed(1)}h </span> )} </div> ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
