import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileText } from "lucide-react";
interface TreeNodeProps {
  id: string | number;
  label: string;
  icon?: React.ReactNode;
  expanded?: boolean;
  selected?: boolean;
  isLeaf?: boolean;
  level?: number;
  onClick?: () => void;
  onToggle?: () => void;
  className?: string;
}
const TreeNode = ({
  label,
  icon,
  expanded = false,
  selected = false,
  isLeaf = false,
  level = 0,
  onClick,
  onToggle,
  className
}: TreeNodeProps) => {
  const indent = level * 1.5; // 1.5rem per level

  return <div className={cn("flex items-center py-1 text-sm cursor-pointer hover:bg-slate-700/40 rounded transition-colors", selected && "bg-blue-900/30 text-blue-200", className)} onClick={onClick} style={{
    paddingLeft: `${indent}rem`
  }}>
      {!isLeaf ? <span className="mr-1 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-white" onClick={e => {
      e.stopPropagation();
      onToggle?.();
    }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span> : <span className="mr-1 w-5 h-5" /> // Placeholder to maintain alignment
    }
      
      {icon && <span className="mr-1.5">{icon}</span>}
      
      <span className="truncate text-slate-50">{label}</span>
    </div>;
};
interface TreeViewProps {
  children: React.ReactNode;
  className?: string;
}
const TreeView = ({
  children,
  className
}: TreeViewProps) => {
  return <div className={cn("tree-view", className)}>
      {children}
    </div>;
};
export { TreeView, TreeNode };