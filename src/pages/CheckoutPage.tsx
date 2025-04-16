
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useTrainingRequirements } from "@/hooks/useTrainingRequirements";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";

const CheckoutPage: React.FC = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profileData } = useUserProfile(user);
  const { plans, loading: loadingPlans } = useTrainingPlans();
  
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
            </div>
          </div>
          
          {loadingPlans ? (
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
}

const TrainingPlanCard: React.FC<TrainingPlanCardProps> = ({ plan, quoteId }) => {
  const { scheduledTasks, loading } = useTrainingRequirements(
    quoteId, 
    plan.plan_id, 
    false,  // workOnSaturday
    false   // workOnSunday
  );
  
  // Group tasks by resource and calculate business trip days
  const resourceMap = React.useMemo(() => {
    const map = new Map();
    
    scheduledTasks.forEach(task => {
      if (!map.has(task.resource_id)) {
        map.set(task.resource_id, {
          resourceId: task.resource_id,
          resourceName: task.resource_name,
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
      // (assuming 1-based days where 1 = Monday, 7 = Sunday)
      let businessTripDays = 0;
      
      for (let day = tripStart; day <= tripEnd; day++) {
        businessTripDays++;
      }
      
      return {
        ...resource,
        trainingDaysCount,
        businessTripDays,
        tripStart,
        tripEnd
      };
    });
  }, [scheduledTasks]);

  return (
    <Card className="bg-slate-800/80 border border-white/5 overflow-hidden h-full">
      <CardHeader className="bg-slate-700/50 flex flex-row items-center gap-3 pb-4">
        {plan.icon_name && (
          <div className="bg-slate-600/50 p-2 rounded-md">
            <img
              src={`/lovable-uploads/${plan.icon_name}.png`}
              alt={plan.name}
              className="h-6 w-6"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
        )}
        <CardTitle className="text-lg font-semibold text-gray-100">{plan.name}</CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4">
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
                <div className="font-medium text-gray-200 mb-1">
                  {resource.resourceName}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-700/40 p-2 rounded border border-white/5">
                    <div className="text-gray-400 text-xs">Training Days</div>
                    <div className="text-gray-200 font-medium">
                      {resource.trainingDaysCount}
                    </div>
                  </div>
                  <div className="bg-slate-700/40 p-2 rounded border border-white/5">
                    <div className="text-gray-400 text-xs">Business Trip Days</div>
                    <div className="text-gray-200 font-medium">
                      {resource.businessTripDays}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckoutPage;
