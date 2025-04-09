
import { useState, useEffect } from 'react';

export interface OrderedTab {
  id: string;
  label: string;
  order: number;
}

export const useTabOrder = (initialTabs: OrderedTab[]) => {
  const [tabs, setTabs] = useState<OrderedTab[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    // Load tab order from localStorage or use initial tabs
    const savedTabs = localStorage.getItem('settings-tab-order');
    
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        
        // Make sure all tabs from initialTabs exist in saved tabs
        // This handles the case where new tabs are added to the app
        const existingTabIds = new Set(parsed.map((tab: OrderedTab) => tab.id));
        const missingTabs = initialTabs.filter(tab => !existingTabIds.has(tab.id));
        
        if (missingTabs.length > 0) {
          // Find the highest order to append new tabs after that
          const maxOrder = Math.max(...parsed.map((tab: OrderedTab) => tab.order));
          let nextOrder = maxOrder + 1;
          
          const newTabs = [
            ...parsed,
            ...missingTabs.map(tab => ({ ...tab, order: nextOrder++ }))
          ];
          
          setTabs(newTabs.sort((a, b) => a.order - b.order));
        } else {
          setTabs(parsed.sort((a, b) => a.order - b.order));
        }
      } catch (error) {
        console.error('Error parsing saved tab order:', error);
        setTabs([...initialTabs]);
      }
    } else {
      setTabs([...initialTabs]);
    }
  }, [initialTabs]);

  const startDrag = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    
    // This is needed for Firefox
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedItemIndex === null) return;
    
    const newTabs = [...tabs];
    const draggedItem = newTabs[draggedItemIndex];
    
    // Remove the dragged item
    newTabs.splice(draggedItemIndex, 1);
    
    // Insert at the new position
    newTabs.splice(dropIndex, 0, draggedItem);
    
    // Update order numbers
    const reorderedTabs = newTabs.map((tab, index) => ({
      ...tab,
      order: index
    }));
    
    setTabs(reorderedTabs);
    setDraggedItemIndex(null);
    setIsDragging(false);
  };

  const saveTabOrder = () => {
    localStorage.setItem('settings-tab-order', JSON.stringify(tabs));
  };

  const onDragEnd = () => {
    setDraggedItemIndex(null);
    setIsDragging(false);
  };

  return {
    tabs,
    setTabs,
    isDragging,
    startDrag,
    onDragOver,
    onDrop,
    onDragEnd,
    saveTabOrder
  };
};
