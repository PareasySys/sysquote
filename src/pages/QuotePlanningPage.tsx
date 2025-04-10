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
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
import { useResources } from "@/hooks/useResources"; 
import { supabase } from "@/integrations/supabase/client";
import ResourceTrainingGantt from "@/components/gantt/ResourceTrainingGantt";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface WeekendSettings {
  workOnSaturday: boolean;
  workOnSunday: boolean;
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

const QuotePlanningPage: React.FC = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profileData } = useUserProfile(user);
  const { plans, loading: plansLoading } = useTrainingPlans();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [workOnWeekends, setWorkOnWeekends] = useState<WeekendSettings>({
    workOnSaturday: false,
    workOnSunday: false
  });

  const { resources } = useResources();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    
    if (plans && plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].plan_id);
    }
    
    fetchQuoteSettings();
  }, [user, quoteId, plans]);

  const fetchQuoteSettings = async () => {
    if (!quoteId) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("quotes")
        .select("work_on_saturday, work_on_sunday")
        .eq("quote_id", quoteId)
        .single();
      
      if (fetchError) throw fetchError;
      
      setWorkOnWeekends({
        workOnSaturday: data?.work_on_saturday ?? false,
        workOnSunday: data?.work_on_sunday ?? false
      });

    } catch (err: any) {
      console.error("Error fetching quote settings:", err);
      setError(err.message || "Failed to load quote settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleBackToQuote = () => {
    navigate(`/quote/${quoteId}/config`);
  };

  const updateWeekendSettings = async (key: 'workOnSaturday' | 'workOnSunday', value: boolean) => {
    if (!quoteId) return;
    
    const newSettings = { ...workOnWeekends, [key]: value };
    setWorkOnWeekends(newSettings);
    
    const dbKey = key === 'workOnSaturday' ? 'work_on_saturday' : 'work_on_sunday';
    
    try {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ [dbKey]: value })
        .eq('quote_id', quoteId);
      
      if (updateError) throw updateError;
      
      toast.success(`Weekend schedule updated`);
    } catch (err: any) {
      console.error("Error updating weekend settings:", err);
      toast.error("Failed to update weekend settings");
      
      setWorkOnWeekends(workOnWeekends);
    }
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
                onClick={fetchQuoteSettings} 
                variant="outline" 
                className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div>
              <Card className="bg-slate-800/80 border border-white/5 p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-200">Weekend Settings</h2>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="work-on-saturday" 
                        checked={workOnWeekends.workOnSaturday}
                        onCheckedChange={(checked) => updateWeekendSettings('workOnSaturday', checked)}
                      />
                      <Label htmlFor="work-on-saturday" className="text-gray-300">Work on Saturday</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="work-on-sunday" 
                        checked={workOnWeekends.workOnSunday}
                        onCheckedChange={(checked) => updateWeekendSettings('workOnSunday', checked)}
                      />
                      <Label htmlFor="work-on-sunday" className="text-gray-300">Work on Sunday</Label>
                    </div>
                  </div>
                </div>

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
                        </TabsTrigger>
                      ))
                    )}
                  </TabsList>
                  
                  {plans.map((plan) => (
                    <TabsContent key={plan.plan_id} value={plan.plan_id.toString()}>
                      <div className="mt-4">
                        <div className="mb-4">
                          <h3 className="text-xl font-semibold text-gray-200">{plan.name} Plan</h3>
                        </div>

                        <ResourceTrainingGantt
                          quoteId={quoteId}
                          planId={selectedPlanId}
                          workOnSaturday={workOnWeekends.workOnSaturday}
                          workOnSunday={workOnWeekends.workOnSunday}
                        />
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
