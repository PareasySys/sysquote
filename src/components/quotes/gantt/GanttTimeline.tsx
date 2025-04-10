
import React from 'react';
import { GanttResource, GanttTask } from '@/hooks/useQuoteGanttData';

interface GanttTimelineProps {
  resources: GanttResource[];
  visibleMonths: number;
  workOnSaturday: boolean;
  workOnSunday: boolean;
}

const GanttTimeline: React.FC<GanttTimelineProps> = ({
  resources,
  visibleMonths = 12,
  workOnSaturday = false,
  workOnSunday = false
}) => {
  // Helper function to calculate the position and width of a task bar
  const getTaskBarStyle = (task: GanttTask) => {
    // Each day is 40px wide
    const dayWidth = 40;
    const left = (task.start_date - 1) * dayWidth;
    const width = task.duration * dayWidth;
    
    return {
      left: `${left}px`,
      width: `${width}px`,
      backgroundColor: task.color || '#3b82f6',
    };
  };
  
  // Helper function to check if a specific day is a weekend and should be grayed out
  const isGrayedOutDay = (day: number): boolean => {
    const dayInMonth = ((day - 1) % 30) + 1;
    
    // Check if it's a Saturday (days 6, 13, 20, 27)
    const isSaturday = (dayInMonth === 6 || dayInMonth === 13 || dayInMonth === 20 || dayInMonth === 27);
    
    // Check if it's a Sunday (days 7, 14, 21, 28)
    const isSunday = (dayInMonth === 7 || dayInMonth === 14 || dayInMonth === 21 || dayInMonth === 28);
    
    // Gray out if it's a weekend day that we don't work on
    return (isSaturday && !workOnSaturday) || (isSunday && !workOnSunday);
  };
  
  // Render background grid with weekend highlighting
  const renderGrid = () => {
    const cells = [];
    const totalDays = visibleMonths * 30;
    
    for (let day = 1; day <= totalDays; day++) {
      const isGrayedOut = isGrayedOutDay(day);
      
      cells.push(
        <div
          key={`grid-${day}`}
          className={`absolute border-r border-slate-700 h-full ${isGrayedOut ? 'bg-slate-800' : ''}`}
          style={{
            left: `${(day - 1) * 40}px`,
            width: '40px'
          }}
        ></div>
      );
    }
    
    return cells;
  };

  return (
    <div className="flex-1 overflow-x-auto">
      {resources.map(resource => (
        <React.Fragment key={resource.id}>
          {/* Resource row - empty except for expanded resources showing tasks */}
          <div 
            className="relative h-10 border-b border-slate-700"
            style={{ height: '42px' }}
          >
            {resource.isExpanded && resource.tasks.map(task => (
              <div
                key={task.id}
                className="absolute top-0 h-full flex items-center justify-center text-xs text-white rounded px-2 overflow-hidden"
                style={getTaskBarStyle(task)}
                title={`${task.text}: ${task.hoursPerDay.reduce((sum, h) => sum + h, 0)} hours`}
              >
                {task.text}
              </div>
            ))}
          </div>
          
          {/* Task rows - only visible when resource is expanded */}
          {resource.isExpanded && resource.tasks.map(task => (
            <div 
              key={task.id} 
              className="relative border-b border-slate-700"
              style={{ height: '42px' }}
            >
              {/* Task bar visualization */}
              <div
                className="absolute top-2 h-7 bg-opacity-70 rounded px-2 flex items-center"
                style={getTaskBarStyle(task)}
              >
                {/* Task hours per day visualization */}
                {task.hoursPerDay.map((hours, dayIndex) => (
                  hours > 0 && (
                    <div 
                      key={dayIndex}
                      className="h-full w-[40px] flex items-center justify-center text-xs font-medium text-white"
                      title={`Day ${task.start_date + dayIndex}: ${hours} hours`}
                    >
                      {hours}
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
      
      {/* Background grid */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {renderGrid()}
      </div>
    </div>
  );
};

export default GanttTimeline;
