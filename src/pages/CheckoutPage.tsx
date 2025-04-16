
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
import { LayoutDashboard, Settings, LogOut, UserCog, ArrowLeft, MapPin, Euro } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useTrainingRequirements } from "@/hooks/useTrainingRequirements";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import { useAreaCosts } from "@/hooks/useAreaCosts";
import { useResources } from "@/hooks/useResources";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const CheckoutPage: React.FC = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profileData } = useUserProfile(user);
  const { plans, loading: loadingPlans } = useTrainingPlans();
  const { areaCosts, loading: loadingAreaCosts } = useAreaCosts();
  const { resources } = useResources();
  
  const [quoteData, setQuoteData] = useState<{
    area_id?: number | null;
    area_name?: string;
  }>({});
  const [loadingQuote, setLoadingQuote] = useState(true);

  useEffect(() => {
    if (quoteId) {
      fetchQuoteDetails();
    }
  }, [quoteId]);

  const fetchQuoteDetails = async () => {
    try {
      setLoadingQuote(true);
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          quote_id,
          area_id,
          area_costs (
            area_id,
            area_name,
            icon_name
          )
        `)
        .eq("quote_id", quoteId)
        .single();

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

  const handleBackToPlanning = () => {
    navigate(`/quote/${quoteId}/planning`);
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
                  onClick={handleBackToPlanning}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
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
          
          {loadingPlans || loadingAreaCosts ? (
            <div className="flex justify-center p-12">
              <TextShimmerWave
                className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
                duration={1}
                spread={1}
                zDistance={1}
                scaleDistance={1.1}
                rotateYDistance={10}
              >
                Loading Training Plans
              </TextShimmerWave>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <TrainingPlanCard 
                  key={plan.plan_id} 
                  plan={plan} 
                  quoteId={quoteId || ''} 
                  areaId={quoteData.area_id || null}
                  resources={resources}
                  areaCosts={areaCosts}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

interface TrainingPlanCardProps {
  plan: {
    plan_id: number;
    name: string;
    description: string | null;
    icon_name: string | null;
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
}

const TrainingPlanCard: React.FC<TrainingPlanCardProps> = ({ plan, quoteId, areaId, resources, areaCosts }) => {
  const { scheduledTasks, loading } = useTrainingRequirements(
    quoteId, 
    plan.plan_id, 
    false,  // workOnSaturday
    false   // workOnSunday
  );
  
  // Get area cost info for the selected area
  const selectedArea = React.useMemo(() => {
    return areaCosts.find(area => area.area_id === areaId) || null;
  }, [areaCosts, areaId]);
  
  // Group tasks by resource and calculate business trip days
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
          endDates: [],
        });
      }
      
      const resource = map.get(task.resource_id);
      resource.totalHours += task.segment_hours;
      
      // Track start and end dates for each task segment
      const startDay = task.start_day;
      const endDay = task.start_day + task.duration_days - 1; // End day is inclusive
      
      resource.trainingDays.push({ start: startDay, end: endDay });
      resource.startDates.push(startDay);
      resource.endDates.push(endDay);
    });
    
    // Process the data to calculate business trip days
    return Array.from(map.values()).map(resource => {
      // Calculate training days (total hours / 8 and rounded up)
      const trainingDaysCount = Math.ceil(resource.totalHours / 8);
      
      // Find earliest start date and latest end date across all segments
      const earliestStart = Math.min(...resource.startDates);
      const latestEnd = Math.max(...resource.endDates);
      
      // For business trip, add 1 day before for travel and 1 day after
      const tripStart = earliestStart - 1;
      const tripEnd = latestEnd + 1;
      
      // Count total calendar days including weekends
      let businessTripDays = tripEnd - tripStart + 1;
      
      // Calculate training cost (hourly rate * training hours)
      const trainingCost = resource.hourlyRate * resource.totalHours;
      
      // Calculate business trip costs based on area costs
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

  // Calculate total training cost and business trip cost across all resources
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

  return (
    <Card className="bg-slate-800/80 border border-white/5 overflow-hidden h-full flex flex-col">
      <CardHeader className="bg-slate-700/50 flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-600/50 p-2 rounded-md">
            {plan.icon_name ? (
              <img
                src={`/lovable-uploads/${plan.icon_name}.png`}
                alt={plan.name}
                className="h-6 w-6"
                onError={(e) => {
                  console.error(`Failed to load icon: ${plan.icon_name}`);
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            ) : (
              <div className="h-6 w-6 bg-gray-400/20 rounded flex items-center justify-center">
                <span className="text-xs text-gray-300">{plan.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <CardTitle className="text-lg font-semibold text-gray-100">{plan.name}</CardTitle>
        </div>
        
        {selectedArea && (
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <MapPin className="h-3 w-3" />
            <span>{selectedArea.area_name}</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-4 flex-grow">
        {loading ? (
          <div className="py-4 text-center text-gray-400">
            Loading resources...
          </div>
        ) : resourceMap.length === 0 ? (
          <div className="py-4 text-center text-gray-400">
            No resources assigned to this plan
          </div>
        ) : (
          <div className="space-y-4">
            {resourceMap.map((resource) => (
              <div 
                key={resource.resourceId}
                className="bg-slate-700/30 border border-white/5 rounded-md p-3"
              >
                <div className="flex items-center gap-2 font-medium text-gray-200 mb-2">
                  {resource.resourceIcon ? (
                    <img
                      src={`/lovable-uploads/${resource.resourceIcon}.png`}
                      alt={resource.resourceName}
                      className="h-5 w-5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <div className="h-5 w-5 bg-gray-500/20 rounded flex items-center justify-center">
                      <span className="text-xs">{resource.resourceName.charAt(0)}</span>
                    </div>
                  )}
                  <span>{resource.resourceName}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-700/40 p-2 rounded border border-white/5">
                    <div className="text-gray-400 text-xs">Training Days</div>
                    <div className="text-gray-200 font-medium flex justify-between">
                      <span>{resource.trainingDaysCount}</span>
                      <span className="text-emerald-300 text-xs flex items-center">
                        <Euro className="h-3 w-3 mr-1" />
                        {resource.trainingCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-700/40 p-2 rounded border border-white/5">
                    <div className="text-gray-400 text-xs">Business Trip Days</div>
                    <div className="text-gray-200 font-medium flex justify-between">
                      <span>{resource.businessTripDays}</span>
                      <span className="text-emerald-300 text-xs flex items-center">
                        <Euro className="h-3 w-3 mr-1" />
                        {resource.tripCosts.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 mt-1 pl-1">
                  {selectedArea ? (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Accommodation & Food:</span>
                        <span>€{resource.tripCosts.accommodationFood.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Allowance:</span>
                        <span>€{resource.tripCosts.allowance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pocket Money:</span>
                        <span>€{resource.tripCosts.pocketMoney.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-yellow-500">
                      No area selected for cost calculation
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {resourceMap.length > 0 && (
        <CardFooter className="bg-slate-700/30 p-4 flex flex-col">
          <Separator className="mb-3 bg-white/10" />
          <div className="w-full text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Training Cost:</span>
              <span className="font-medium">€{totalCosts.trainingTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Business Trip Cost:</span>
              <span className="font-medium">€{totalCosts.businessTripTotal.toFixed(2)}</span>
            </div>
            <Separator className="my-2 bg-white/10" />
            <div className="flex justify-between text-emerald-300 font-medium">
              <span>Total:</span>
              <span>€{totalCosts.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default CheckoutPage;
