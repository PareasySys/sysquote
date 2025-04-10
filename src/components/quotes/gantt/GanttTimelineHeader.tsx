
import React from 'react';

interface GanttTimelineHeaderProps {
  months: number;
  workOnSaturday: boolean;
  workOnSunday: boolean;
}

const GanttTimelineHeader: React.FC<GanttTimelineHeaderProps> = ({ 
  months = 12,
  workOnSaturday = false,
  workOnSunday = false
}) => {
  // Generate month cells
  const renderMonthCells = () => {
    const cells = [];
    
    for (let month = 1; month <= months; month++) {
      cells.push(
        <div 
          key={`month-${month}`}
          className="flex-shrink-0 border-r border-slate-700 text-center py-2 font-medium text-slate-200"
          style={{ width: `${30 * 40}px` }} // 30 days × 40px per day
        >
          Month {month}
        </div>
      );
    }
    
    return cells;
  };
  
  // Generate day cells
  const renderDayCells = () => {
    const cells = [];
    
    for (let month = 1; month <= months; month++) {
      for (let day = 1; day <= 30; day++) {
        // Check if it's a weekend
        const isWeekend = (day === 6 || day === 7 || day === 13 || day === 14 || 
                          day === 20 || day === 21 || day === 27 || day === 28);
                          
        const isSaturday = (day === 6 || day === 13 || day === 20 || day === 27);
        const isSunday = (day === 7 || day === 14 || day === 21 || day === 28);
        
        // Determine if we should gray out this day (it's a weekend and we don't work on it)
        const isGrayedOut = (isSaturday && !workOnSaturday) || (isSunday && !workOnSunday);
        
        cells.push(
          <div 
            key={`day-${month}-${day}`}
            className={`flex-shrink-0 text-center py-1 text-xs border-r border-slate-700
              ${isWeekend ? 'font-medium' : ''} 
              ${isGrayedOut ? 'bg-slate-800 text-slate-500' : 'text-slate-300'}`}
            style={{ width: '40px' }}
          >
            {day}
          </div>
        );
      }
    }
    
    return cells;
  };

  return (
    <div className="border-b border-slate-700">
      {/* Month row */}
      <div className="flex">
        {/* Resource column header */}
        <div className="flex-shrink-0 border-r border-slate-700 text-center py-2 font-medium bg-slate-800 text-slate-200" style={{ width: '240px' }}>
          Resources
        </div>
        {/* Month cells */}
        <div className="flex overflow-hidden">
          {renderMonthCells()}
        </div>
      </div>
      
      {/* Day row */}
      <div className="flex">
        {/* Resource column placeholder */}
        <div className="flex-shrink-0 border-r border-slate-700 bg-slate-800" style={{ width: '240px' }}></div>
        {/* Day cells */}
        <div className="flex overflow-x-auto">
          {renderDayCells()}
        </div>
      </div>
    </div>
  );
};

export default GanttTimelineHeader;
