
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Tabs } from "@/components/ui/vercel-tabs";
import { Card } from "@/components/ui/card";
import { 
  Sidebar, 
  SidebarBody, 
  SidebarLink,
  Logo,
  LogoIcon
} from "@/components/ui/sidebar-custom";
import { LayoutDashboard, Settings, LogOut, UserCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/use-user-profile";

// Tab components
import MachineTypesTab from "@/components/settings/MachineTypesTab";
import SoftwareTypesTab from "@/components/settings/SoftwareTypesTab";
import ResourcesTab from "@/components/settings/ResourcesTab";
import TrainingPlansTab from "@/components/settings/TrainingPlansTab";

const tabs = [
  { id: "machines", label: "Machine Types" },
  { id: "software", label: "Software Types" },
  { id: "resources", label: "Resources" },
  { id: "plans", label: "Training Plans" },
  { id: "area-costs", label: "Area Costs" },
  { id: "plan-costs", label: "Plan Costs" },
];

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("machines");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profileData } = useUserProfile(user);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "machines":
        return <MachineTypesTab />;
      case "software":
        return <SoftwareTypesTab />;
      case "resources":
        return <ResourcesTab />;
      case "plans":
        return <TrainingPlansTab />;
      case "area-costs":
        return <div className="p-4">Area Costs content coming soon</div>;
      case "plan-costs":
        return <div className="p-4">Plan Costs content coming soon</div>;
      default:
        return <div className="p-4">Select a tab</div>;
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
      href: "#",
      icon: <Settings className="text-gray-300 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Sign Out",
      href: "#",
      icon: <LogOut className="text-gray-300 h-5 w-5 flex-shrink-0" />,
      onClick: handleSignOut
    },
  ];

  if (!user) {
    navigate("/");
    return null;
  }

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
                    {profileData.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="text-sm text-gray-200 font-semibold truncate max-w-[140px]">
                    {(profileData.firstName && profileData.lastName) 
                      ? `${profileData.firstName} ${profileData.lastName}`
                      : user.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-[140px]">
                    {user.email}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto">
                <Avatar className="w-8 h-8 border-2 border-gray-700">
                  <AvatarImage src={profileData.avatarUrl || ""} />
                  <AvatarFallback className="bg-gray-600 text-gray-200 text-xs">
                    {profileData.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </SidebarBody>
      </Sidebar>

      <main className="flex-1 flex flex-col h-screen overflow-auto bg-slate-950">
        <div className="p-6 flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
          </div>
          
          <Card className="bg-slate-800/80 border border-white/5">
            <div className="p-4 border-b border-slate-700/50">
              <Tabs 
                tabs={tabs} 
                onTabChange={(tabId) => setActiveTab(tabId)}
                className="mb-2"
              />
            </div>
            <div className="min-h-[400px]">
              {renderTabContent()}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
