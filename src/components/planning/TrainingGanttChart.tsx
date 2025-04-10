
import React, { useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import "./gantt.css"; // Import our custom styling
import moment from "moment";

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
  trainingHours?: number;
  planName?: string;
}

const TrainingGanttChart: React.FC<TrainingGanttChartProps> = ({ tasks, loading, trainingHours = 0, planName = "" }) => {
  const [view, setView] = useState<ViewMode>(ViewMode.Month);
  
  // Generate demo tasks if we have training hours but no tasks
  const generateDemoTasks = (): TrainingTask[] => {
    if (!trainingHours || trainingHours <= 0) return [];
    
    // Use a generic start date (month 1, day 1)
    const genericStart = new Date(2025, 0, 1); // Jan 1, 2025 as base date
    const resourceId = 1;
    
    // Calculate how many days the training would take (assuming 8 hours per day)
    const trainingDays = Math.ceil(trainingHours / 8);
    
    return [{
      id: "demo-task-1",
      resourceId: resourceId,
      resourceName: "Demo Resource",
      taskName: `${planName} Training (${trainingDays} days)`,
      startTime: genericStart,
      endTime: moment(genericStart).add(trainingDays, 'days').toDate(),
      styles: {
        backgroundColor: '#3b82f6',
      }
    }];
  };
  
  // Use actual tasks if available, otherwise generate demo tasks if we have hours
  const displayTasks = tasks.length > 0 ? tasks : generateDemoTasks();
  
  // Convert our tasks to Gantt-compatible format
  const ganttTasks: Task[] = displayTasks.map(task => {
    // Calculate duration in days
    const startMoment = moment(task.startTime);
    const endMoment = moment(task.endTime);
    const durationDays = endMoment.diff(startMoment, 'days');
    const durationHours = endMoment.diff(startMoment, 'hours');
    
    // Include days information in the task name
    const daysInfo = durationDays > 0 
      ? `(${durationDays} day${durationDays > 1 ? 's' : ''})`
      : `(${durationHours} hour${durationHours > 1 ? 's' : ''})`;
    
    return {
      id: task.id,
      name: `${task.taskName} ${daysInfo}`,
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
    };
  });

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
          listCellWidth="250px"
          columnWidth={60}
          locale="en-US"
          barCornerRadius={4}
          barFill={80}
          headerHeight={50}
          rowHeight={50}
          fontSize="12px"
          todayColor="rgba(79, 70, 229, 0.1)"
          projectProgressColor="#2563eb"
        />
      </div>
    </div>
  );
};

export default TrainingGanttChart;
