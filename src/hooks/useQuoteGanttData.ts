
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useMachineTypes } from "./useMachineTypes";
import { useSoftwareTypes } from "./useSoftwareTypes";
import { useResources } from "./useResources";

// Define types for our data structures
export interface GanttTask {
  id: string;
  text: string;
  start_date: number; // Day number (1-30 * month)
  duration: number; // In days
  resourceId: number;
  itemId: number;
  itemType: string;
  planId: number;
  color?: string;
  hoursPerDay: number[]; // Array of hours for each day
}

export interface GanttResource {
  id: number;
  text: string;
  tasks: GanttTask[];
  isExpanded: boolean;
  hourlyRate?: number;
  totalHours?: number;
  totalDays?: number;
  icon?: string;
}

export interface PlanGanttData {
  planId: number;
  planName: string;
  resources: GanttResource[];
  totalDays: number;
}

export interface TrainingRequirementData {
  resource_id: number;
  training_hours: number;
  item_id: number;
  item_type: string;
  plan_id: number;
}

interface QuoteSettings {
  workOnSaturday: boolean;
  workOnSunday: boolean;
}

export const useQuoteGanttData = (quoteId: string | undefined, settings: QuoteSettings = { workOnSaturday: false, workOnSunday: false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ganttData, setGanttData] = useState<Record<number, PlanGanttData>>({});
  const [trainingRequirements, setTrainingRequirements] = useState<TrainingRequirementData[]>([]);
  const [planHours, setPlanHours] = useState<Record<number, number>>({});
  
  const { resources } = useResources();
  const { machines } = useMachineTypes();
  const { software } = useSoftwareTypes();

  // Fetch training requirements for the quote
  const fetchTrainingRequirements = async () => {
    if (!quoteId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch machine training requirements
      const { data: machineRequirements, error: machineError } = await supabase
        .from('machine_training_requirements')
        .select(`
          id,
          machine_type_id,
          plan_id,
          resource_id
        `);
      
      if (machineError) throw machineError;
      
      // Fetch software training requirements
      const { data: softwareRequirements, error: softwareError } = await supabase
        .from('software_training_requirements')
        .select(`
          id,
          software_type_id,
          plan_id,
          resource_id
        `);
      
      if (softwareError) throw softwareError;
      
      // Fetch quote's selected machines
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('machine_type_ids')
        .eq('quote_id', quoteId)
        .single();
        
      if (quoteError) throw quoteError;
      
      // Fetch training hours for the selected plans
      const { data: planHoursData, error: planHoursError } = await supabase
        .from('quote_training_plan_hours')
        .select('plan_id, training_hours')
        .eq('quote_id', quoteId);
        
      if (planHoursError) throw planHoursError;
      
      // Create a map of plan_id to training_hours
      const hoursByPlan: Record<number, number> = {};
      planHoursData?.forEach(item => {
        hoursByPlan[item.plan_id] = item.training_hours;
      });
      setPlanHours(hoursByPlan);

      // Filter machine requirements to only include machines selected for this quote
      const selectedMachineIds = quoteData?.machine_type_ids || [];
      
      // Convert machine requirements to our TrainingRequirementData format
      const machineRequirementsData: TrainingRequirementData[] = (machineRequirements || [])
        .filter(req => selectedMachineIds.includes(req.machine_type_id || 0))
        .map(req => ({
          resource_id: req.resource_id || 0,
          training_hours: 0, // Will be filled from training_offers
          item_id: req.machine_type_id || 0,
          item_type: 'machine',
          plan_id: req.plan_id || 0
        }));
        
      // TODO: Later we'll need to handle software selection as well
      // For now, include all software requirements (or those that are always_included)
      const softwareRequirementsData: TrainingRequirementData[] = (softwareRequirements || [])
        .filter(req => {
          // Find the software type to check if it's always included
          const sw = software.find(s => s.software_type_id === req.software_type_id);
          return sw?.always_included === true;
        })
        .map(req => ({
          resource_id: req.resource_id || 0,
          training_hours: 0, // Will be filled from training_offers or default
          item_id: req.software_type_id || 0,
          item_type: 'software',
          plan_id: req.plan_id || 0
        }));
        
      // Fetch training offers for machines
      const { data: trainingOffers, error: offersError } = await supabase
        .from('training_offers')
        .select('*');
        
      if (offersError) throw offersError;
      
      // Assign hours to machine requirements
      const finalMachineRequirements = machineRequirementsData.map(req => {
        const offer = trainingOffers?.find(o => 
          o.machine_type_id === req.item_id && o.plan_id === req.plan_id
        );
        return {
          ...req,
          training_hours: offer?.hours_required || 0
        };
      });
      
      // For now, assign a default of 2 hours to each software requirement
      const finalSoftwareRequirements = softwareRequirementsData.map(req => ({
        ...req,
        training_hours: 2 // Default hours for software training
      }));
      
      // Combine all requirements
      setTrainingRequirements([...finalMachineRequirements, ...finalSoftwareRequirements]);
      
    } catch (err: any) {
      console.error("Error fetching training requirements:", err);
      setError(err.message || "Failed to load training requirements");
      toast.error("Failed to load training data");
    } finally {
      setLoading(false);
    }
  };

  // Process the training requirements into gantt chart data
  const processGanttData = () => {
    if (trainingRequirements.length === 0) return;

    // Group requirements by plan first
    const planData: Record<number, PlanGanttData> = {};
    
    // Get unique plan IDs
    const planIds = [...new Set(trainingRequirements.map(req => req.plan_id))];
    
    // Initialize plan data structures
    planIds.forEach(planId => {
      const planName = getPlanName(planId);
      planData[planId] = {
        planId,
        planName,
        resources: [],
        totalDays: 0
      };
      
      // Group requirements by resource for this plan
      const resourceIds = [...new Set(
        trainingRequirements
          .filter(req => req.plan_id === planId)
          .map(req => req.resource_id)
      )];
      
      // Initialize resources
      resourceIds.forEach(resourceId => {
        const resource = resources.find(r => r.resource_id === resourceId);
        
        if (resource) {
          planData[planId].resources.push({
            id: resourceId,
            text: resource.name,
            tasks: [],
            isExpanded: true,
            hourlyRate: resource.hourly_rate,
            totalHours: 0,
            totalDays: 0,
            icon: resource.icon_name || 'user'
          });
        }
      });
    });

    // Apply scheduling algorithm to create task bars
    Object.keys(planData).forEach(planIdStr => {
      const planId = parseInt(planIdStr);
      const plan = planData[planId];
      
      plan.resources.forEach(resource => {
        // Get all tasks for this resource in this plan
        const resourceTasks = trainingRequirements.filter(
          req => req.resource_id === resource.id && req.plan_id === planId
        );
        
        // Schedule tasks using the algorithm
        scheduleTasks(resource, resourceTasks, settings);
        
        // Calculate total hours and days
        resource.totalHours = resource.tasks.reduce((sum, task) => {
          return sum + task.hoursPerDay.reduce((daySum, hours) => daySum + hours, 0);
        }, 0);
        
        resource.totalDays = resource.tasks.reduce((maxDay, task) => {
          return Math.max(maxDay, task.start_date + task.duration);
        }, 0);
      });
      
      // Calculate the overall total days for the plan
      plan.totalDays = plan.resources.reduce((maxDays, resource) => {
        return Math.max(maxDays, resource.totalDays || 0);
      }, 0);
    });
    
    setGanttData(planData);
  };
  
  // Scheduling algorithm
  const scheduleTasks = (resource: GanttResource, tasks: TrainingRequirementData[], settings: QuoteSettings) => {
    // Sort tasks by item_id to ensure consistent ordering
    const sortedTasks = [...tasks].sort((a, b) => a.item_id - b.item_id);
    
    let currentDay = 1;
    let hoursRemainingToday = 8; // 8 hour work day
    
    sortedTasks.forEach(task => {
      let remainingHours = task.training_hours;
      let taskStartDay = currentDay;
      let dailyHours: number[] = [];
      
      // Process each day until we've allocated all training hours
      while (remainingHours > 0) {
        // Skip weekends unless settings allow them
        if (isWeekendDay(currentDay) && !canWorkOnDay(currentDay, settings)) {
          dailyHours.push(0); // No hours on this day
          currentDay++;
          hoursRemainingToday = 8;
          continue;
        }
        
        // Determine hours to allocate today
        const hoursToday = Math.min(remainingHours, hoursRemainingToday);
        dailyHours.push(hoursToday);
        
        remainingHours -= hoursToday;
        hoursRemainingToday -= hoursToday;
        
        // If we've used up today's hours, move to the next day
        if (hoursRemainingToday === 0) {
          currentDay++;
          hoursRemainingToday = 8;
        }
      }
      
      // Create the task with the scheduled hours
      const item = task.item_type === 'machine' 
        ? machines.find(m => m.machine_type_id === task.item_id)
        : software.find(s => s.software_type_id === task.item_id);
        
      if (item) {
        // Filter out any trailing days with 0 hours
        while (dailyHours.length > 0 && dailyHours[dailyHours.length - 1] === 0) {
          dailyHours.pop();
        }
        
        const ganttTask: GanttTask = {
          id: `${task.item_type}-${task.item_id}-plan${task.plan_id}`,
          text: item.name,
          start_date: taskStartDay,
          duration: dailyHours.length,
          resourceId: resource.id,
          itemId: task.item_id,
          itemType: task.item_type,
          planId: task.plan_id,
          color: task.item_type === 'machine' ? '#3b82f6' : '#8b5cf6', // blue for machines, purple for software
          hoursPerDay: dailyHours
        };
        
        resource.tasks.push(ganttTask);
      }
    });
    
    return resource;
  };
  
  // Helper function to determine if a day is a weekend day
  const isWeekendDay = (day: number): boolean => {
    // In our 30-day month model, days 6, 7, 13, 14, 20, 21, 27, 28 are weekends
    const dayInMonth = ((day - 1) % 30) + 1;
    return dayInMonth === 6 || dayInMonth === 7 || 
           dayInMonth === 13 || dayInMonth === 14 || 
           dayInMonth === 20 || dayInMonth === 21 || 
           dayInMonth === 27 || dayInMonth === 28;
  };
  
  // Helper function to check if we can work on a specific day
  const canWorkOnDay = (day: number, settings: QuoteSettings): boolean => {
    const dayInMonth = ((day - 1) % 30) + 1;
    
    // Check if it's a Saturday (days 6, 13, 20, 27)
    if (dayInMonth === 6 || dayInMonth === 13 || dayInMonth === 20 || dayInMonth === 27) {
      return settings.workOnSaturday;
    }
    
    // Check if it's a Sunday (days 7, 14, 21, 28)
    if (dayInMonth === 7 || dayInMonth === 14 || dayInMonth === 21 || dayInMonth === 28) {
      return settings.workOnSunday;
    }
    
    // It's a weekday
    return true;
  };
  
  // Helper function to get plan name
  const getPlanName = (planId: number): string => {
    switch (planId) {
      case 1:
        return 'Standard';
      case 2:
        return 'Extended';
      case 3:
        return 'Advanced';
      case 4:
        return 'Shadowing';
      default:
        return `Plan ${planId}`;
    }
  };

  // Effect to fetch data when quoteId changes
  useEffect(() => {
    if (quoteId) {
      fetchTrainingRequirements();
    }
  }, [quoteId]);
  
  // Effect to process gantt data when requirements or settings change
  useEffect(() => {
    if (resources.length > 0 && machines.length > 0 && software.length > 0 && trainingRequirements.length > 0) {
      processGanttData();
    }
  }, [trainingRequirements, resources, machines, software, settings.workOnSaturday, settings.workOnSunday]);

  // Return the hook data
  return {
    ganttData,
    planHours,
    loading,
    error,
    refreshData: fetchTrainingRequirements
  };
};
