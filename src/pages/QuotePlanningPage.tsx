// src/components/pages/QuotePlanningPage.tsx

import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  Logo,
  LogoIcon
} from "@/components/ui/sidebar-custom";
import { LayoutDashboard, Settings, LogOut, UserCog, ArrowLeft, CreditCard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// TextShimmerWave might not be needed here anymore if loading handled inside Gantt
// import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
// Tabs also removed from here
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrainingPlans } from "@/hooks/useTrainingPlans";
// useResources might not be needed directly here anymore
// import { useResources } from "@/hooks/useResources";
import { supabase } from "@/integrations/supabase/client";
import ResourceTrainingGantt from "@/components/gantt/ResourceTrainingGantt"; // Correct path?
// Switch and Label removed from here
// import { Switch } from "@/components/ui/switch";
// import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RainbowButton } from "@/components/ui/rainbow-button";

interface WeekendSettings {
  workOnSaturday: boolean;
  workOnSunday: boolean;
}

// QuoteWithWeekendSettings interface might not be needed if we fetch directly
// interface QuoteWithWeekendSettings { ... }

const QuotePlanningPage: React.FC = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profileData } = useUserProfile(user);
  const { plans, loading: plansLoading, error: plansError } = useTrainingPlans(); // Added error handling
  const [quoteName, setQuoteName] = useState<string>(""); // State for quote name
  const [settingsLoading, setSettingsLoading] = useState<boolean>(true); // Separate loading for settings
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [workOnWeekends, setWorkOnWeekends] = useState<WeekendSettings>({
    workOnSaturday: false,
    workOnSunday: false
  });

  // const { resources } = useResources(); // If not used elsewhere, remove

  // Fetch Quote Name and Settings on load or quoteId change
  const fetchQuoteData = useCallback(async () => {
    if (!quoteId || !user) return;

    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("quotes")
        .select("quote_name, work_on_saturday, work_on_sunday")
        .eq("quote_id", quoteId)
        .maybeSingle(); // Use maybeSingle to handle potential null

      if (fetchError) throw fetchError;

      if (data) {
        setQuoteName(data.quote_name || `Quote ${quoteId.substring(0, 6)}...`);
        setWorkOnWeekends({
          workOnSaturday: data.work_on_saturday ?? false,
          workOnSunday: data.work_on_sunday ?? false
        });
      } else {
          throw new Error("Quote not found.");
      }

    } catch (err: any) {
      console.error("Error fetching quote settings:", err);
      setSettingsError(err.message || "Failed to load quote data");
      setQuoteName(""); // Clear quote name on error
      setWorkOnWeekends({ workOnSaturday: false, workOnSunday: false }); // Reset weekends
    } finally {
      setSettingsLoading(false);
    }
  }, [quoteId, user]); // Add user dependency

  useEffect(() => {
    fetchQuoteData();
  }, [fetchQuoteData]); // Depend on the memoized fetch function

  // Set default plan when plans load
  useEffect(() => {
    if (!plansLoading && plans && plans.length > 0 && selectedPlanId === null) {
      const standardPlan = plans.find(plan => plan.name.toLowerCase() === 'standard');
      if (standardPlan) {
        setSelectedPlanId(standardPlan.plan_id);
      } else {
        setSelectedPlanId(plans[0].plan_id); // Fallback to first plan
      }
    }
  }, [plansLoading, plans, selectedPlanId]); // Added selectedPlanId to prevent resetting

  // Handle Sign Out
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Navigation Handlers
  const handleBackToQuote = () => navigate(`/quote/${quoteId}/config`);
  const handleGoToCheckout = () => navigate(`/quote/${quoteId}/checkout`);

  // Update Weekend Settings (passed down to Gantt)
  const handleWeekendChange = useCallback(async (key: 'workOnSaturday' | 'workOnSunday', value: boolean) => {
    if (!quoteId) return;

    const previousSettings = { ...workOnWeekends }; // Store previous state for rollback
    const newSettings = { ...workOnWeekends, [key]: value };
    setWorkOnWeekends(newSettings); // Optimistic UI update

    const dbKey = key === 'workOnSaturday' ? 'work_on_saturday' : 'work_on_sunday';

    try {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ [dbKey]: value })
        .eq('quote_id', quoteId);

      if (updateError) throw updateError;

      toast.success(`Weekend schedule updated`);
      // Re-fetching might happen inside ResourceTrainingGantt due to prop change triggering its own useEffects

    } catch (err: any) {
      console.error("Error updating weekend settings:", err);
      toast.error("Failed to update weekend settings");
      setWorkOnWeekends(previousSettings); // Rollback UI on error
    }
  }, [quoteId, workOnWeekends]); // Include workOnWeekends for previous state access

  // Sidebar Links Configuration
  const sidebarLinks = [
    // ... (keep existing sidebar links)
    { label: "Dashboard", href: "/home", icon: <LayoutDashboard className="text-gray-300 h-5 w-5 flex-shrink-0" /> },
    { label: "Profile", href: "/profile", icon: <UserCog className="text-gray-300 h-5 w-5 flex-shrink-0" /> },
    { label: "Settings", href: "/settings", icon: <Settings className="text-gray-300 h-5 w-5 flex-shrink-0" /> },
    { label: "Sign Out", href: "#", icon: <LogOut className="text-gray-300 h-5 w-5 flex-shrink-0" />, onClick: handleSignOut },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-gray-200">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="flex flex-col h-full justify-between">
          {/* Sidebar Top */}
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="py-2">{sidebarOpen ? <Logo /> : <LogoIcon />}</div>
            <div className="mt-8 flex flex-col gap-2">{sidebarLinks.map((link, idx) => (<SidebarLink key={idx} link={link} />))}</div>
          </div>
          {/* Sidebar Bottom */}
          <div className="py-4 flex items-center">
             {/* ... (keep existing user profile rendering) ... */}
             {sidebarOpen ? (<div className="flex items-center gap-3 px-2"><Avatar className="w-8 h-8 border-2 border-gray-700"><AvatarImage src={profileData.avatarUrl || ""} /><AvatarFallback className="bg-gray-600 text-gray-200 text-xs">{profileData.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback></Avatar><div className="flex flex-col"><div className="text-sm text-gray-200 font-semibold truncate max-w-[140px]">{(profileData.firstName && profileData.lastName) ? `${profileData.firstName} ${profileData.lastName}`: user?.email?.split('@')[0]}</div><div className="text-xs text-gray-400 truncate max-w-[140px]">{user?.email}</div></div></div>) : (<div className="mx-auto"><Avatar className="w-8 h-8 border-2 border-gray-700"><AvatarImage src={profileData.avatarUrl || ""} /><AvatarFallback className="bg-gray-600 text-gray-200 text-xs">{profileData.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback></Avatar></div>)}
          </div>
        </SidebarBody>
      </Sidebar>

      <main className={`fixed inset-0 transition-all duration-300 bg-slate-950 overflow-auto ${sidebarOpen ? 'md:left-[300px]' : 'md:left-[60px]'}`}>
        <div className="p-6 min-h-screen">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBackToQuote} className="text-gray-400 hover:text-gray-200">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {/* Show Quote Name */}
                <h1 className="text-2xl font-bold text-gray-100">
                  {settingsLoading ? "Loading..." : (settingsError ? "Error" : `${quoteName} - Planning`)}
                </h1>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {(settingsError || plansError) ? (
            <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
              <p className="text-red-300">{settingsError || plansError || "An unexpected error occurred."}</p>
              <Button onClick={fetchQuoteData} variant="outline" className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50">
                Retry Loading Data
              </Button>
            </div>
          ) : (
            // Main Content Area
            <div>
              {/* ResourceTrainingGantt takes over Tabs and Switches */}
              <ResourceTrainingGantt
                quoteId={quoteId}
                planId={selectedPlanId}
                workOnSaturday={workOnWeekends.workOnSaturday}
                workOnSunday={workOnWeekends.workOnSunday}
                plans={plans || []} // Pass empty array if plans are null/undefined
                plansLoading={plansLoading}
                onPlanChange={setSelectedPlanId} // Pass setter function
                onWeekendChange={handleWeekendChange} // Pass update handler
              />

              {/* Checkout Button */}
              <div className="flex justify-center mt-6 mb-6"> {/* Added mt-6 */}
                <RainbowButton onClick={handleGoToCheckout} className="flex items-center gap-2 text-white">
                  <CreditCard className="h-4 w-4" />
                  Checkout
                </RainbowButton>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuotePlanningPage;