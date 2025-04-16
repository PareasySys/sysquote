
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar, SidebarBody, SidebarLink, Logo, LogoIcon } from "@/components/ui/sidebar-custom";
import { LayoutDashboard, Settings, LogOut, UserCog, MapPin, Euro, ChevronDown, FileText, Briefcase, CalendarDays, Wallet, Coffee, Gift, DollarSign, BadgeCheck, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useTrainingRequirements, TrainingRequirement } from "@/hooks/useTrainingRequirements";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { useAreaCosts } from "@/hooks/useAreaCosts";
import { useResources } from "@/hooks/useResources";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useResourceIcons } from "@/hooks/useResourceIcons";
import { useTrainingIcons } from "@/hooks/useTrainingIcons";
import { generateQuotePDF, PlanCostData } from "@/utils/pdfExporter";
import { ScheduledTaskSegment } from "@/utils/types";

const CheckoutPage: React.FC = () => {
  const {
    quoteId
  } = useParams<{
    quoteId: string;
  }>();
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    profileData
  } = useUserProfile(user);
  const {
    plans,
    loading: loadingPlans
  } = useTrainingPlans();
  const {
    areaCosts,
    loading: loadingAreaCosts
  } = useAreaCosts();
  const {
    resources
  } = useResources();
  const [quoteData, setQuoteData] = useState<{
    area_id?: number | null;
    area_name?: string;
  }>({});
  const [loadingQuote, setLoadingQuote] = useState(true);
  const {
    icons: resourceIcons
  } = useResourceIcons();
  const {
    icons: trainingIcons
  } = useTrainingIcons();

  useEffect(() => {
    if (quoteId) {
      fetchQuoteDetails();
    }
  }, [quoteId]);

  const fetchQuoteDetails = async () => {
    try {
      setLoadingQuote(true);
      const {
        data,
        error
      } = await supabase.from("quotes").select(`
          quote_id,
          area_id,
          area_costs (
            area_id,
            area_name,
            icon_name
          )
        `).eq("quote_id", quoteId).single();
      if (error) throw error;
      if (data) {
        const areaName = data.area_costs?.area_name || "No Area Selected";
        setQuoteData({
          area_id: data.area_id,
          area_name: areaName
        });
      }
    } catch (err) {
      console.error("Error fetching quote details:", err);
      toast.error("Could not load quote details");
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleExport = async () => {
    try {
      // Extract plan cost data without using hooks inside this function
      const planCostData: PlanCostData[] = plans
        .map(plan => {
          // Instead of using the hook inside the map function, we need to fetch data separately
          // This is a common pattern that avoids violating the Rules of Hooks
          const planId = plan.plan_id;
          
          if (!quoteId) return null;
          
          // Instead of using the hook, manually fetch or filter scheduled tasks for this plan
          const fetchRequirementsForPlan = async () => {
            const { data, error } = await supabase
              .from('planning_details')
              .select('*, resources(name, hourly_rate, icon_name)')
              .eq('quote_id', quoteId)
              .eq('plan_id', planId);
              
            if (error) throw error;
            return data || [];
          };
          
          // We will calculate training days and costs without the hook
          const requirements = plan.requirements || [];
          if (requirements.length === 0) return null;
          
          const trainingDays = Math.ceil(
            requirements.reduce((total, req) => total + (req.training_hours || 0), 0) / 8
          );
          
          // Calculate costs based on resources
          let totalCost = 0;
          const resourceMap = new Map();
          
          requirements.forEach(req => {
            if (!req.resource_id) return;
            
            if (!resourceMap.has(req.resource_id)) {
              const resource = resources.find(r => r.resource_id === req.resource_id);
              if (!resource) return;
              
              resourceMap.set(req.resource_id, {
                hourlyRate: resource.hourly_rate || 0,
                totalHours: 0,
              });
            }
            
            const resourceData = resourceMap.get(req.resource_id);
            resourceData.totalHours += req.training_hours || 0;
          });
          
          // Calculate total costs including business trip expenses
          Array.from(resourceMap.values()).forEach(resource => {
            const trainingCost = resource.hourlyRate * resource.totalHours;
            
            const businessTripDays = Math.ceil(resource.totalHours / 8) + 2;
            
            const selectedArea = areaCosts.find(area => area.area_id === quoteData.area_id);
            const tripCosts = selectedArea ? (
              selectedArea.daily_accommodation_food_cost +
              selectedArea.daily_allowance +
              selectedArea.daily_pocket_money
            ) * businessTripDays : 0;
            
            totalCost += trainingCost + tripCosts;
          });
          
          return {
            planId: planId,
            planName: plan.name,
            trainingDays,
            totalCost
          };
        })
        .filter(Boolean) as PlanCostData[];
      
      const success = await generateQuotePDF(
        quoteId || 'unknown',
        profileData.firstName ? `${profileData.firstName} ${profileData.lastName || ''}` : user?.email,
        quoteData.area_name,
        planCostData,
        '/placeholder.svg'
      );
      
      if (success) {
        toast.success("PDF exported successfully!");
      } else {
        toast.error("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error in PDF export:", error);
      toast.error("Failed to export PDF");
    }
  };

  const sidebarLinks = [{
    label: "Dashboard",
    href: "/home",
    icon: <LayoutDashboard className="text-gray-300 h-5 w-5 flex-shrink-0" />
  }, {
    label: "Profile",
    href: "/profile",
    icon: <UserCog className="text-gray-300 h-5 w-5 flex-shrink-0" />
  }, {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="text-gray-300 h-5 w-5 flex-shrink-0" />
  }, {
    label: "Sign Out",
    href: "#",
    icon: <LogOut className="text-gray-300 h-5 w-5 flex-shrink-0" />,
    onClick: handleSignOut
  }];

  return <div className="flex h-screen bg-slate-950 text-gray-200">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="flex flex-col h-full justify-between">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="py-2">
              {sidebarOpen ? <Logo /> : <LogoIcon />}
            </div>
            <div className="mt-8 flex flex-col gap-2">
              {sidebarLinks.map((link, idx) => <SidebarLink key={idx} link={link} />)}
            </div>
          </div>
          <div className="py-4 flex items-center">
            {sidebarOpen ? <div className="flex items-center gap-3 px-2">
                <Avatar className="w-8 h-8 border-2 border-gray-700">
                  <AvatarImage src={profileData.avatarUrl || ""} />
                  <AvatarFallback className="bg-gray-600 text-gray-200 text-xs">
                    {profileData.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="text-sm text-gray-200 font-semibold truncate max-w-[140px]">
                    {profileData.firstName && profileData.lastName ? `${profileData.firstName} ${profileData.lastName}` : user?.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-[140px]">
                    {user?.email}
                  </div>
                </div>
              </div> : <div className="mx-auto">
                <Avatar className="w-8 h-8 border-2 border-gray-700">
                  <AvatarImage src={profileData.avatarUrl || ""} />
                  <AvatarFallback className="bg-gray-600 text-gray-200 text-xs">
                    {profileData.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>}
          </div>
        </SidebarBody>
      </Sidebar>

      <main className={`fixed inset-0 transition-all duration-300 bg-slate-950 overflow-auto ${sidebarOpen ? 'md:left-[300px]' : 'md:left-[60px]'}`}>
        <div className="p-6 min-h-screen">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-100">Checkout</h1>
              </div>

              <div className="flex items-center gap-2 text-gray-300">
                <MapPin className="h-4 w-4" />
                <span>
                  {loadingQuote ? "Loading area..." : quoteData.area_name || "No Area Selected"}
                </span>
              </div>
            </div>
          </div>
          
          {loadingPlans || loadingAreaCosts ? <div className="flex justify-center p-12">
              <TextShimmerWave className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg" duration={1} spread={1} zDistance={1} scaleDistance={1.1} rotateYDistance={10}>
                Loading Training Plans
              </TextShimmerWave>
            </div> : <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {plans.map(plan => <TrainingPlanCard key={plan.plan_id} plan={plan} quoteId={quoteId || ''} areaId={quoteData.area_id || null} resources={resources} areaCosts={areaCosts} resourceIcons={resourceIcons} trainingIcons={trainingIcons} />)}
              </div>
              
              <div className="mt-10 flex justify-center">
                <RainbowButton variant="light" onClick={handleExport}>
                  <FileText className="h-5 w-5 mr-2" />
                  Export PDF
                </RainbowButton>
              </div>
            </>}
        </div>
      </main>
    </div>;
};

interface TrainingPlanCardProps {
  plan: {
    plan_id: number;
    name: string;
    description: string | null;
    icon_name: string | null;
    requirements?: any[]; // Added for direct access in PDF export
  };
  quoteId: string;
  areaId: number | null;
  resources: Array<{
    resource_id: number;
    name: string;
    hourly_rate: number;
    icon_name?: string;
  }>;
  areaCosts: Array<{
    area_id: number;
    area_name: string;
    daily_accommodation_food_cost: number;
    daily_allowance: number;
    daily_pocket_money: number;
    icon_name?: string | null;
  }>;
  resourceIcons?: Array<{
    name: string;
    url: string;
    source: string;
  }>;
  trainingIcons?: Array<{
    name: string;
    url: string;
    source: string;
  }>;
}

const TrainingPlanCard: React.FC<TrainingPlanCardProps> = ({
  plan,
  quoteId,
  areaId,
  resources,
  areaCosts,
  resourceIcons,
  trainingIcons
}) => {
  const {
    scheduledTasks,
    loading
  } = useTrainingRequirements(quoteId, plan.plan_id, false, false);

  // Store requirements in the plan object for PDF export
  useEffect(() => {
    if (!loading && scheduledTasks.length > 0) {
      plan.requirements = scheduledTasks.map(task => ({
        resource_id: task.resource_id,
        training_hours: task.segment_hours,
        originalRequirementId: task.originalRequirementId
      }));
    }
  }, [scheduledTasks, loading, plan]);

  const selectedArea = React.useMemo(() => {
    return areaCosts.find(area => area.area_id === areaId) || null;
  }, [areaCosts, areaId]);
  const planIconUrl = React.useMemo(() => {
    if (!plan.icon_name || !trainingIcons) return null;
    const icon = trainingIcons.find(icon => icon.name === plan.icon_name);
    return icon?.url || null;
  }, [plan.icon_name, trainingIcons]);
  const getResourceIcon = (resourceIconName: string | undefined) => {
    if (!resourceIconName || !resourceIcons) return null;
    const icon = resourceIcons.find(icon => icon.name === resourceIconName);
    return icon?.url || null;
  };
  const resourceMap = React.useMemo(() => {
    const map = new Map();
    scheduledTasks.forEach(task => {
      if (!map.has(task.resource_id)) {
        const resource = resources.find(r => r.resource_id === task.resource_id);
        map.set(task.resource_id, {
          resourceId: task.resource_id,
          resourceName: task.resource_name,
          resourceIcon: resource?.icon_name || null,
          hourlyRate: resource?.hourly_rate || 0,
          totalHours: 0,
          trainingDays: [],
          startDates: [],
          endDates: []
        });
      }
      const resource = map.get(task.resource_id);
      resource.totalHours += task.segment_hours;
      const startDay = task.start_day;
      const endDay = task.start_day + task.duration_days - 1;
      resource.trainingDays.push({
        start: startDay,
        end: endDay
      });
      resource.startDates.push(startDay);
      resource.endDates.push(endDay);
    });
    return Array.from(map.values()).map(resource => {
      const trainingDaysCount = Math.ceil(resource.totalHours / 8);
      const earliestStart = Math.min(...resource.startDates);
      const latestEnd = Math.max(...resource.endDates);
      const tripStart = earliestStart - 1;
      const tripEnd = latestEnd + 1;
      let businessTripDays = tripEnd - tripStart + 1;
      const trainingCost = resource.hourlyRate * resource.totalHours;
      const tripCosts = {
        accommodationFood: selectedArea ? selectedArea.daily_accommodation_food_cost * businessTripDays : 0,
        allowance: selectedArea ? selectedArea.daily_allowance * businessTripDays : 0,
        pocketMoney: selectedArea ? selectedArea.daily_pocket_money * businessTripDays : 0,
        total: 0
      };
      tripCosts.total = tripCosts.accommodationFood + tripCosts.allowance + tripCosts.pocketMoney;
      return {
        ...resource,
        trainingDaysCount,
        businessTripDays,
        tripStart,
        tripEnd,
        trainingCost,
        tripCosts
      };
    });
  }, [scheduledTasks, resources, selectedArea]);
  const totalCosts = React.useMemo(() => {
    let trainingTotal = 0;
    let businessTripTotal = 0;
    resourceMap.forEach(resource => {
      trainingTotal += resource.trainingCost;
      businessTripTotal += resource.tripCosts.total;
    });
    return {
      trainingTotal,
      businessTripTotal,
      grandTotal: trainingTotal + businessTripTotal
    };
  }, [resourceMap]);

  return <Card className="bg-slate-800/80 border border-white/5 overflow-hidden h-full flex flex-col">
      <CardHeader className="bg-slate-700/50 flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-600/50 p-2 rounded-md">
            {planIconUrl ? <img src={planIconUrl} alt={plan.name} className="h-6 w-6" onError={e => {
            console.error(`Failed to load icon: ${plan.icon_name}`);
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }} /> : <Briefcase className="h-6 w-6 text-gray-300" />}
          </div>
          <CardTitle className="text-lg font-semibold text-gray-100">{plan.name}</CardTitle>
        </div>
        
        {selectedArea && <div className="flex items-center gap-2 text-xs text-gray-300">
            <MapPin className="h-3 w-3" />
            <span>{selectedArea.area_name}</span>
          </div>}
      </CardHeader>
      
      <CardContent className="pt-4 flex-grow">
        {loading ? <div className="py-4 text-center text-gray-400">
            Loading resources...
          </div> : resourceMap.length === 0 ? <div className="py-4 text-center text-gray-400">
            No resources assigned to this plan
          </div> : <div className="space-y-4">
            {resourceMap.map(resource => <div key={resource.resourceId} className="border border-white/5 rounded-md bg-transparent">
                <div className="flex items-center gap-2 font-medium text-gray-200 mb-2 pt-2 pb-2 pl-2">
                  {getResourceIcon(resource.resourceIcon) ? <img src={getResourceIcon(resource.resourceIcon)} alt={resource.resourceName} className="h-5 w-5" onError={e => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }} /> : <User className="h-5 w-5 text-gray-300" />}
                  <span>{resource.resourceName}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="bg-slate-700/40 p-2 rounded border border-white/5">
                    <div className="text-gray-400 text-xs">Training Days</div>
                    <div className="text-gray-200 font-medium flex justify-between items-center">
                      <span className="flex items-center">
                        <CalendarDays className="h-3 w-3 mr-1 text-gray-400" />
                        {resource.trainingDaysCount}
                      </span>
                      <span className="text-emerald-300 text-xs flex items-center">
                        <Euro className="h-3 w-3 mr-1" />
                        {resource.trainingCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700/40 p-2 rounded border border-white/5">
                    <div className="text-gray-400 text-xs">Business Trip Days</div>
                    <div className="text-gray-200 font-medium flex justify-between items-center">
                      <span className="flex items-center">
                        <Briefcase className="h-3 w-3 mr-1 text-gray-400" />
                        {resource.businessTripDays}
                      </span>
                      <span className="text-emerald-300 text-xs flex items-center">
                        <Euro className="h-3 w-3 mr-1" />
                        {resource.tripCosts.total.toFixed(2)}
                      </span>
                    </div>
                    
                    {selectedArea && <div className="mt-2 text-xs text-gray-400 space-y-1 border-t border-white/5 pt-2">
                        <div className="flex justify-between">
                          <span className="flex items-center">
                            <Coffee className="h-3 w-3 mr-1" />
                            Accommodation & Food:
                          </span>
                          <span>€{resource.tripCosts.accommodationFood.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Daily Allowance:
                          </span>
                          <span>€{resource.tripCosts.allowance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center">
                            <Gift className="h-3 w-3 mr-1" />
                            Pocket Money:
                          </span>
                          <span>€{resource.tripCosts.pocketMoney.toFixed(2)}</span>
                        </div>
                      </div>}
                  </div>
                </div>
              </div>)}
          </div>}
      </CardContent>
      
      {resourceMap.length > 0 && <CardFooter className="bg-slate-700/30 p-4 flex flex-col">
          <Separator className="mb-3 bg-white/10" />
          <div className="w-full text-sm">
            <div className="flex justify-between text-gray-300">
              <span className="flex items-center">
                <BadgeCheck className="h-4 w-4 mr-1" />
                Training Cost:
              </span>
              <span className="font-medium">€{totalCosts.trainingTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span className="flex items-center">
                <Briefcase className="h-4 w-4 mr-1" />
                Business Trip Cost:
              </span>
              <span className="font-medium">€{totalCosts.businessTripTotal.toFixed(2)}</span>
            </div>
            <Separator className="my-2 bg-white/10" />
            <div className="flex justify-between text-emerald-300 font-medium">
              <span className="flex items-center">
                <Wallet className="h-4 w-4 mr-1" />
                Total:
              </span>
              <span>€{totalCosts.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardFooter>}
    </Card>;
};

export default CheckoutPage;
