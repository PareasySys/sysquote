import React from 'react';
import { GanttResource } from '@/hooks/useQuoteGanttData';
import { ChevronDown, ChevronRight, User, Laptop, FileCode } from 'lucide-react';

interface GanttResourceListProps {
  resources: GanttResource[];
  onToggleResource: (resourceId: number) => void;
}

const GanttResourceList: React.FC<GanttResourceListProps> = ({ 
  resources,
  onToggleResource
}) => {
  // Get the icon component for a resource or task
  const getIconComponent = (icon: string, itemType?: string) => {
    // Default icon based on item type
    if (itemType === 'machine') return <Laptop className="h-4 w-4 text-white" />;
    if (itemType === 'software') return <FileCode className="h-4 w-4 text-white" />;
    
    // Otherwise use the resource icon or fallback to User
    switch (icon) {
      case 'user':
      default:
        return <User className="h-4 w-4 text-white" />;
    }
  };
  
  return (
    <div className="flex-shrink-0 border-r border-slate-700" style={{ width: '240px' }}>
      {resources.map(resource => (
        <React.Fragment key={resource.id}>
          {/* Resource row */}
          <div 
            className="flex items-center px-4 py-2 border-b border-slate-700 bg-slate-800 text-slate-200 cursor-pointer"
            onClick={() => onToggleResource(resource.id)}
          >
            <button className="mr-2">
              {resource.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            
            <div className="mr-2">
              {getIconComponent(resource.icon || 'user')}
            </div>
            
            <div className="flex-1 text-sm font-medium truncate">{resource.text}</div>
            
            <div className="text-xs text-slate-400">
              {resource.totalHours} hrs
            </div>
          </div>
          
          {/* Task rows - only shown when resource is expanded */}
          {resource.isExpanded && resource.tasks.map(task => (
            <div 
              key={task.id} 
              className="flex items-center px-4 pl-10 py-2 border-b border-slate-700 bg-slate-900"
            >
              <div className="mr-2">
                {getIconComponent('', task.itemType)}
              </div>
              <div className="flex-1 text-sm text-slate-300 truncate">{task.text}</div>
              <div className="text-xs text-slate-400">
                {task.hoursPerDay.reduce((sum, hours) => sum + hours, 0)} hrs
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default GanttResourceList;
