import React from "react";
import { Gantt, Task, ViewMode, TaskListHeaderProps, TaskListTableProps } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import "./gantt.css"; // Import our custom styling

export interface TrainingTask {
  id: string;
  resourceId: number;
  resourceName: string;
  taskName: string; // We'll keep this, might be useful for tooltips later
  startTime: Date;
  endTime: Date;
  styles?: {
    backgroundColor: string;
    progressColor?: string;
    progressSelectedColor?: string;
  }
}

interface TrainingGanttChartProps {
  tasks: TrainingTask[];
  loading: boolean;
  trainingHours?: number;
  planName?: string;
}

// Custom Task List Header Component
const CustomTaskListHeader: React.FC<TaskListHeaderProps> = ({ headerHeight, rowWidth }) => {
  return (
    <div
      className="gantt-chart-table_header custom-task-list-header" // Use existing and add custom class
      style={{
        height: headerHeight - 2, // Adjust for potential borders
        width: rowWidth,
      }}
    >
      <div
        className="gantt-chart-header-cell custom-task-list-header-cell" // Use existing and add custom class
        style={{
          minWidth: rowWidth, // Ensure it takes full width
          maxWidth: rowWidth,
        }}
      >
        Resources
      </div>
    </div>
  );
};

// Custom Task List Table Component
const CustomTaskListTable: React.FC<TaskListTableProps> = ({
  rowHeight,
  rowWidth,
  tasks, // These are the Gantt-compatible tasks
}) => {
  return (
    <div className="gantt-chart-table_body custom-task-list-body">
      {tasks.map(task => (
        <div
          className="gantt-chart-table_row custom-task-list-row" // Use existing and add custom class
          style={{ height: rowHeight }}
          key={task.id}
          title={task.name} // Use task.name (mapped from resourceName) as tooltip
        >
          <div
            className="gantt-chart-table-cell custom-task-list-cell" // Use existing and add custom class
            style={{
              minWidth: rowWidth,
              maxWidth: rowWidth,
            }}
          >
            {/* Display the resource name (which we map to task.name) */}
            &nbsp;{task.project} {/* Use the 'project' field which holds resourceName */}
          </div>
        </div>
      ))}
    </div>
  );
};


const TrainingGanttChart: React.FC<TrainingGanttChartProps> = ({ tasks, loading, trainingHours = 0, planName = "" }) => {
  const view = ViewMode.Day;

  // Generate demo tasks if needed
  const generateDemoTasks = (): TrainingTask[] => {
    if (!trainingHours || trainingHours <= 0) return [];
    const genericStart = new Date(2025, 0, 1);
    const resourceId = 1;
    const trainingDays = Math.ceil(trainingHours / 8);
    return [{
      id: "demo-task-1",
      resourceId: resourceId,
      resourceName: "Demo Resource",
      taskName: `${planName} Training`,
      startTime: genericStart,
      endTime: new Date(genericStart.getFullYear(), genericStart.getMonth(), genericStart.getDate() + trainingDays), // Safer date math
      styles: { backgroundColor: '#3b82f6' }
    }];
  };

  const displayTasks = tasks.length > 0 ? tasks : generateDemoTasks();

  // Convert our tasks to Gantt-compatible format
  const ganttTasks: Task[] = displayTasks.map(task => ({
    id: task.id,
    name: task.taskName, // Keep original task name here for potential future use (tooltips etc.)
    start: new Date(task.startTime),
    end: new Date(task.endTime),
    progress: 0,
    type: 'task',
    isDisabled: true,
    project: task.resourceName, // Store resourceName here, CustomTaskListTable will use it
    styles: {
      backgroundColor: task.styles?.backgroundColor || '#3b82f6',
      progressColor: task.styles?.progressColor || '#60a5fa',
      progressSelectedColor: task.styles?.progressSelectedColor || '#2563eb',
    }
  }));

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mb-2.5"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2 mx-auto mb-2.5"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (ganttTasks.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-400">No training tasks scheduled</p>
      </div>
    );
  }

  return (
    <div className="gantt-container">
      <div className="bg-slate-800 rounded-md overflow-hidden"> {/* Added overflow-hidden */}
        <Gantt
          tasks={ganttTasks}
          viewMode={view}
          // Use custom components to control the left list section
          TaskListHeader={CustomTaskListHeader}
          TaskListTable={CustomTaskListTable}
          // Adjust width for the single "Resources" column
          listCellWidth="180px" // Reduced width as we only have one column now
          columnWidth={60} // Width of individual day columns in the grid
          locale="en-US"
          barCornerRadius={4}
          barFill={80}
          headerHeight={50}
          rowHeight={45} // Slightly reduced row height for compactness
          fontSize="12px"
          todayColor="rgba(79, 70, 229, 0.15)" // Slightly more visible today color
          projectProgressColor="#2563eb" // Color for project bars (if used, less relevant now)
          // Removed properties related to default list columns (like column resize handles if any)
        />
      </div>
    </div>
  );
};

export default TrainingGanttChart;