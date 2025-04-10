
import React, { useMemo } from "react";
import "./GanttChart.css";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingRequirement } from "@/hooks/useTrainingRequirements";
import { Resource } from "@/hooks/useResources";

interface GanttChartProps {
  requirements: TrainingRequirement[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ 
  requirements, 
  loading, 
  error, 
  onRetry 
}) => {
  // Group requirements by resource
  const resourceGroups = useMemo(() => {
    const groups = new Map<number, TrainingRequirement[]>();
    
    requirements.forEach(req => {
      if (!groups.has(req.resource_id)) {
        groups.set(req.resource_id, []);
      }
      groups.get(req.resource_id)?.push(req);
    });
    
    // Convert to array of [resourceId, requirements[]]
    return Array.from(groups.entries()).map(([resourceId, reqs]) => ({
      resourceId,
      resourceName: reqs[0]?.resource_name || `Resource ${resourceId}`,
      requirements: reqs
    }));
  }, [requirements]);

  // Generate months (1-12)
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  // Generate days (1-30) for each month
  const days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }, []);

  // Calculate which day of the month a particular day falls on
  const getDayPosition = (day: number): { month: number, dayOfMonth: number } => {
    const month = Math.floor((day - 1) / 30) + 1; // 1-based month
    const dayOfMonth = ((day - 1) % 30) + 1; // 1-based day of month
    return { month, dayOfMonth };
  };

  if (loading) {
    return (
      <div className="gantt-loading">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading training schedule...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gantt-error">
        <p>Error: {error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (resourceGroups.length === 0) {
    return (
      <div className="gantt-empty">
        <p>No training requirements found for the selected plan.</p>
      </div>
    );
  }

  return (
    <div className="gantt-container">
      <div className="gantt-header">
        <div className="gantt-resource-column">
          <div className="gantt-resource-header">Resource</div>
        </div>
        <div className="gantt-timeline">
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
                <React.Fragment key={`month-days-${month}`}>
                  {days.map(day => (
                    <div key={`day-${month}-${day}`} className="gantt-day">
                      {day}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="gantt-content">
        <div className="gantt-resources">
          {resourceGroups.map(group => (
            <div key={`resource-${group.resourceId}`} className="gantt-resource">
              {group.resourceName}
            </div>
          ))}
        </div>
        <div className="gantt-grid">
          {resourceGroups.map(group => (
            <div key={`row-${group.resourceId}`} className="gantt-row">
              {months.map(month => (
                <React.Fragment key={`row-${group.resourceId}-month-${month}`}>
                  {days.map(day => (
                    <div key={`cell-${group.resourceId}-${month}-${day}`} className="gantt-cell"></div>
                  ))}
                </React.Fragment>
              ))}
              
              {/* Render tasks for this resource */}
              {group.requirements.map(req => {
                // Calculate position based on the custom calendar (12 months x 30 days)
                const { month, dayOfMonth } = getDayPosition(req.start_day);
                
                // Convert to pixels for positioning
                const left = ((month - 1) * 30 + (dayOfMonth - 1)) * 30; // 30px per day
                const width = req.duration_days * 30; // 30px per day
                
                return (
                  <div
                    key={`task-${req.requirement_id}`}
                    className="gantt-task"
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                      backgroundColor: getResourceColor(req.resource_id)
                    }}
                    title={`Resource: ${req.resource_name}, Hours: ${req.training_hours}, Start: Month ${month}, Day ${dayOfMonth}, Duration: ${req.duration_days} days`}
                  >
                    {req.training_hours}H
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to generate consistent colors based on resource ID
function getResourceColor(id: number): string {
  // Fixed set of colors for consistency
  const colors = [
    '#3B82F6', // Blue
    '#F97316', // Orange
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#06B6D4'  // Cyan
  ];
  
  return colors[id % colors.length];
}

export default GanttChart;
