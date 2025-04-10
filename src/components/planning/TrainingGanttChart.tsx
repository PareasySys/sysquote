import React, { useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import "./gantt.css"; // Import our custom styling

export interface TrainingTask {
  id: string;
  resourceId: number;
  resourceName: string;
  taskName: string;
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
}

const TrainingGanttChart: React.FC<TrainingGanttChartProps> = ({ tasks, loading }) => {
  const [view, setView] = useState<ViewMode>(ViewMode.Day);
  
  // Convert our tasks to Gantt-compatible format
  const ganttTasks: Task[] = tasks.map(task => ({
    id: task.id,
    name: task.taskName,
    start: new Date(task.startTime),
    end: new Date(task.endTime),
    progress: 0,
    type: 'task',
    isDisabled: true,
    project: task.resourceName,
    styles: {
      backgroundColor: task.styles?.backgroundColor || '#3b82f6',
      progressColor: task.styles?.progressColor || '#60a5fa',
      progressSelectedColor: task.styles?.progressSelectedColor || '#2563eb',
    }
  }));

  if (loading || tasks.length === 0) {
    return (
      <div className="p-4 text-center">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mb-2.5"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2 mx-auto mb-2.5"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3 mx-auto"></div>
          </div>
        ) : (
          <p className="text-gray-400">No training tasks scheduled</p>
        )}
      </div>
    );
  }

  return (
    <div className="gantt-container">
      <div className="flex justify-end mb-2">
        <div className="space-x-2">
          <button
            className={`px-2 py-1 text-xs rounded ${view === ViewMode.Day ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
            onClick={() => setView(ViewMode.Day)}
          >
            Day
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${view === ViewMode.Week ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
            onClick={() => setView(ViewMode.Week)}
          >
            Week
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${view === ViewMode.Month ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
            onClick={() => setView(ViewMode.Month)}
          >
            Month
          </button>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-md">
        <Gantt
          tasks={ganttTasks}
          viewMode={view}
          listCellWidth=""
          columnWidth={60}
          locale="en-US"
          barCornerRadius={4}
          barFill={80}
          headerHeight={50}
          rowHeight={40}
          fontSize="12px"
          todayColor="rgba(79, 70, 229, 0.1)"
          projectProgressColor="#2563eb"
        />
      </div>
    </div>
  );
};

export default TrainingGanttChart;
