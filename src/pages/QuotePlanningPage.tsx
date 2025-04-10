
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  Sidebar, 
  SidebarBody, 
  SidebarLink,
  Logo,
  LogoIcon
} from "@/components/ui/sidebar-custom";
import { LayoutDashboard, Settings, LogOut, UserCog, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuoteTrainingHours } from "@/hooks/useQuoteTrainingHours";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useResources } from "@/hooks/useResources"; 
import { supabase } from "@/integrations/supabase/client";

// Import the timeline components
import Timeline from 'react-calendar-timeline';
// Make sure this CSS import works
import 'react-calendar-timeline/lib/Timeline.css';
import moment from 'moment';

interface WeekendSettings {
  workOnSaturday: boolean;
  workOnSunday: boolean;
}

interface TimelineGroup {
  id: number;
  title: string;
}

interface TimelineItem {
  id: string;
  group: number;
  title: string;
  start_time: number;
  end_time: number;
  canMove: boolean;
  canResize: boolean;
  canChangeGroup: boolean;
  itemProps: {
    style: {
      background: string;
      color: string;
      borderRadius: string;
      padding: string;
    }
  }
}

interface QuoteWithWeekendSettings {
  area_id?: number | null;
  client_name?: string | null;
  created_at: string;
  created_by_user_id: string;
  machine_type_ids?: number[] | null;
  quote_id: string;
  quote_name: string;
  work_on_saturday?: boolean;
  work_on_sunday?: boolean;
}

interface TrainingRequirement {
  requirement_id: number;
  machine_type_id?: number;
  software_type_id?: number;
  resource_id: number;
  training_hours: number;
  machine_types?: { name: string };
  software_types?: { name: string };
}

const QuotePlanningPage: React.FC = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profileData } = useUserProfile(user);
  const { plans, loading: plansLoading } = useTrainingPlans();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<TimelineGroup[]>([]);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [workOnWeekends, setWorkOnWeekends] = useState<WeekendSettings>({
    workOnSaturday: false,
    workOnSunday: false
  });

  // Get resources from our hook
  const { resources } = useResources();

  const { trainingHours, totalHours, loading: hoursLoading } = useQuoteTrainingHours(quoteId);

  // Create a planTotals object from trainingHours
  const planTotals: Record<number, number> = {};
  trainingHours.forEach(plan => {
    planTotals[plan.plan_id] = plan.training_hours;
  });

  // Set up the generic calendar - 12 months with 30 days each
  const startDate = moment().startOf('year').toDate();
  const endDate = moment().add(1, 'year').toDate();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    
    if (plans && plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].plan_id);
    }
    
    prepareResourceGroups();
    fetchQuoteSettings();
  }, [user, quoteId, plans, resources]);

  useEffect(() => {
    if (selectedPlanId) {
      fetchTrainingData(selectedPlanId);
    }
  }, [selectedPlanId, workOnWeekends]);

  const fetchQuoteSettings = async () => {
    if (!quoteId) return;
    
    try {
      // Check if there are custom columns in the quotes table
      // Since work_on_saturday and work_on_sunday might not exist yet in the schema
      // we'll use a more generic select first to check columns
      const { data, error: fetchError } = await supabase
        .from("quotes")
        .select("*")
        .eq("quote_id", quoteId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Use optional chaining and nullish coalescing to safely access properties
      // that might not exist in the database schema yet
      const quoteData = data as QuoteWithWeekendSettings;
      
      setWorkOnWeekends({
        workOnSaturday: quoteData?.work_on_saturday ?? false,
        workOnSunday: quoteData?.work_on_sunday ?? false
      });

    } catch (err: any) {
      console.error("Error fetching quote settings:", err);
      setError(err.message || "Failed to load quote settings");
    }
  };

  const prepareResourceGroups = () => {
    if (!resources || resources.length === 0) return;
    
    // Transform resources into timeline groups format
    const formattedGroups = resources.map(resource => ({
      id: resource.resource_id,
      title: resource.name // Using name instead of resource_name
    }));
    
    setGroups(formattedGroups);
  };
  
  const fetchTrainingData = async (planId: number) => {
    if (!quoteId) return;
    
    try {
      setLoading(true);
      
      // Get training requirements for the quote and plan
      // Since quote_training_requirements might not exist, we'll use a more general query
      // This would need to be adjusted to match your actual database schema
      const { data, error } = await supabase
        .from('training_requirements')
        .select(`
          requirement_id,
          item_id,
          item_type,
          plan_id,
          required_resource_id,
          training_hours
        `)
        .eq('plan_id', planId);
      
      if (error) throw error;
      
      // Convert the data to match our expected format
      const requirements = (data || []).map(req => ({
        requirement_id: req.requirement_id,
        resource_id: req.required_resource_id,
        training_hours: req.training_hours,
        machine_type_id: req.item_type === 'machine' ? req.item_id : undefined,
        software_type_id: req.item_type === 'software' ? req.item_id : undefined,
        machine_types: req.item_type === 'machine' ? { name: `Training Item ${req.item_id}` } : undefined,
        software_types: req.item_type === 'software' ? { name: `Software ${req.item_id}` } : undefined
      }));
      
      // Generate timeline items from the requirements data
      const timelineItems = generateTimelineItems(requirements);
      setItems(timelineItems);
    } catch (err: any) {
      console.error("Error fetching training data:", err);
      setError(err.message || "Failed to load training data");
    } finally {
      setLoading(false);
    }
  };

  // Generate timeline items with scheduling logic
  const generateTimelineItems = (requirements: TrainingRequirement[]): TimelineItem[] => {
    const maxHoursPerDay = 8;
    const items: TimelineItem[] = [];
    
    // Group requirements by resource
    const resourceRequirements: {[key: number]: TrainingRequirement[]} = {};
    requirements.forEach(req => {
      const resourceId = req.resource_id;
      if (!resourceRequirements[resourceId]) {
        resourceRequirements[resourceId] = [];
      }
      resourceRequirements[resourceId].push(req);
    });
    
    // For each resource, schedule their requirements
    Object.entries(resourceRequirements).forEach(([resourceId, reqs]) => {
      let currentDay = 1; // Start at day 1
      let hoursScheduledToday = 0;
      
      reqs.forEach((req, index) => {
        const taskName = req.machine_type_id 
          ? req.machine_types?.name || 'Machine Training'
          : req.software_types?.name || 'Software Training';
        
        let hoursRemaining = req.training_hours;
        
        while (hoursRemaining > 0) {
          // Skip weekends if configured to do so
          if (
            (currentDay % 7 === 6 && !workOnWeekends.workOnSaturday) || // Saturday
            (currentDay % 7 === 0 && !workOnWeekends.workOnSunday)      // Sunday
          ) {
            currentDay++;
            hoursScheduledToday = 0;
            continue;
          }
          
          // How many hours can be scheduled today
          const hoursToScheduleToday = Math.min(
            maxHoursPerDay - hoursScheduledToday,
            hoursRemaining
          );
          
          if (hoursToScheduleToday > 0) {
            // Convert days to milliseconds for the timeline
            const startTime = moment(startDate).add(currentDay - 1, 'days')
              .add(hoursScheduledToday, 'hours').valueOf();
            const endTime = moment(startDate).add(currentDay - 1, 'days')
              .add(hoursScheduledToday + hoursToScheduleToday, 'hours').valueOf();
            
            items.push({
              id: `${req.requirement_id}-${items.length}`,
              group: parseInt(resourceId),
              title: taskName,
              start_time: startTime,
              end_time: endTime,
              canMove: false,
              canResize: false,
              canChangeGroup: false,
              itemProps: {
                style: {
                  background: req.machine_type_id ? '#3b82f6' : '#10b981',
                  color: 'white',
                  borderRadius: '4px',
                  padding: '2px 4px',
                }
              }
            });
            
            hoursRemaining -= hoursToScheduleToday;
            hoursScheduledToday += hoursToScheduleToday;
            
            // Move to next day if this day is full
            if (hoursScheduledToday >= maxHoursPerDay) {
              currentDay++;
              hoursScheduledToday = 0;
            }
          }
        }
      });
    });
    
    return items;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleBackToQuote = () => {
    navigate(`/quote/${quoteId}/config`);
  };

  const sidebarLinks = [
    {
      label: "Dashboard",
      href: "/home",
      icon: <LayoutDashboard className="text-gray-300 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: <UserCog className="text-gray-300 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="text-gray-300 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Sign Out",
      href: "#",
      icon: <LogOut className="text-gray-300 h-5 w-5 flex-shrink-0" />,
      onClick: handleSignOut
    },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-gray-200">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="flex flex-col h-full justify-between">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="py-2">
              {sidebarOpen ? <Logo /> : <LogoIcon />}
            </div>
            <div className="mt-8 flex flex-col gap-2">
              {sidebarLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="py-4 flex items-center">
            {sidebarOpen ? (
              <div className="flex items-center gap-3 px-2">
                <Avatar className="w-8 h-8 border-2 border-gray-700">
                  <AvatarImage src={profileData.avatarUrl || ""} />
                  <AvatarFallback className="bg-gray-600 text-gray-200 text-xs">
                    {profileData.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="text-sm text-gray-200 font-semibold truncate max-w-[140px]">
                    {(profileData.firstName && profileData.lastName) 
                      ? `${profileData.firstName} ${profileData.lastName}`
                      : user?.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-[140px]">
                    {user?.email}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto">
                <Avatar className="w-8 h-8 border-2 border-gray-700">
                  <AvatarImage src={profileData.avatarUrl || ""} />
                  <AvatarFallback className="bg-gray-600 text-gray-200 text-xs">
                    {profileData.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </SidebarBody>
      </Sidebar>

      <main className={`fixed inset-0 transition-all duration-300 bg-slate-950 overflow-auto ${sidebarOpen ? 'md:left-[300px]' : 'md:left-[60px]'}`}>
        <div className="p-6 min-h-screen">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleBackToQuote}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <h1 className="text-2xl font-bold text-gray-100">Planning</h1>
              </div>
            </div>
          </div>
          
          {error ? (
            <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
              <p className="text-red-300">{error}</p>
              <Button 
                onClick={() => selectedPlanId && fetchTrainingData(selectedPlanId)} 
                variant="outline" 
                className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div>
              <Card className="bg-slate-800/80 border border-white/5 p-4 mb-6">
                <Tabs 
                  defaultValue={plans && plans.length > 0 ? plans[0].plan_id.toString() : ""} 
                  onValueChange={(value) => setSelectedPlanId(parseInt(value))}
                >
                  <TabsList className="bg-slate-700">
                    {plansLoading ? (
                      <div className="p-4">
                        <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]">
                          Loading Plans
                        </TextShimmerWave>
                      </div>
                    ) : (
                      plans.map((plan) => (
                        <TabsTrigger 
                          key={plan.plan_id} 
                          value={plan.plan_id.toString()}
                          className="data-[state=active]:bg-blue-600"
                        >
                          {plan.name}
                          {planTotals[plan.plan_id] && (
                            <span className="ml-2 bg-blue-700 text-white text-xs px-1.5 py-0.5 rounded-md">
                              {planTotals[plan.plan_id]}h
                            </span>
                          )}
                        </TabsTrigger>
                      ))
                    )}
                  </TabsList>
                  
                  {plans.map((plan) => (
                    <TabsContent key={plan.plan_id} value={plan.plan_id.toString()}>
                      <div className="mt-4">
                        <div className="mb-4">
                          <h3 className="text-xl font-semibold text-gray-200">{plan.name} Plan</h3>
                          <p className="text-gray-400 mt-1">
                            {planTotals[plan.plan_id] ? `${planTotals[plan.plan_id]} training hours` : 'Loading hours...'}
                          </p>
                        </div>

                        {loading ? (
                          <div className="p-4 text-center">
                            <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg">
                              Loading schedule data...
                            </TextShimmerWave>
                          </div>
                        ) : (
                          <div className="mt-4 bg-slate-900 p-2 rounded-md border border-slate-700">
                            <Timeline
                              groups={groups}
                              items={items}
                              defaultTimeStart={startDate}
                              defaultTimeEnd={endDate}
                              minZoom={60 * 60 * 24 * 7 * 1000} // min zoom is 1 week
                              maxZoom={60 * 60 * 24 * 30 * 2 * 1000} // max zoom is 2 months
                              canMove={false}
                              canResize={false}
                              stackItems
                              itemHeightRatio={0.8}
                              lineHeight={40}
                              sidebarWidth={200}
                              itemTouchSendsClick={false}
                              timeSteps={{
                                second: 1,
                                minute: 1,
                                hour: 1,
                                day: 1,
                                month: 1,
                                year: 1
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuotePlanningPage;
