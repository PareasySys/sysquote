import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Tabs } from "@/components/ui/vercel-tabs";
import { Card } from "@/components/ui/card";
import { Sidebar, SidebarBody, SidebarLink, Logo, LogoIcon } from "@/components/ui/sidebar-custom";
import { LayoutDashboard, Settings, LogOut, UserCog, Edit, Save, GripVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useTabOrder } from "@/hooks/useTabOrder";

// Tab components
import MachineTypesTab from "@/components/settings/MachineTypesTab";
import SoftwareTypesTab from "@/components/settings/SoftwareTypesTab";
import ResourcesTab from "@/components/settings/ResourcesTab";
import TrainingPlansTab from "@/components/settings/TrainingPlansTab";
import AreaCostsTab from "@/components/settings/AreaCostsTab";
import TrainingOffersTab from "@/components/settings/TrainingOffersTab";
const initialTabs = [{
  id: "machines",
  label: "Machine Types",
  order: 0
}, {
  id: "software",
  label: "Software Types",
  order: 1
}, {
  id: "resources",
  label: "Resources",
  order: 2
}, {
  id: "plans",
  label: "Training Plans",
  order: 3
}, {
  id: "area-costs",
  label: "Area Costs",
  order: 4
}, {
  id: "training-offers",
  label: "Training Offers",
  order: 5
}];
const SettingsPage = () => {
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("machines");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    profileData
  } = useUserProfile(user);
  const [isEditingTabs, setIsEditingTabs] = useState(false);
  const {
    tabs,
    isDragging,
    startDrag,
    onDragOver,
    onDrop,
    saveTabOrder
  } = useTabOrder(initialTabs);
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };
  const toggleEditMode = () => {
    if (isEditingTabs) {
      saveTabOrder();
    }
    setIsEditingTabs(!isEditingTabs);
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
        return <AreaCostsTab />;
      case "training-offers":
        return <TrainingOffersTab />;
      default:
        return <div className="p-4">Select a tab</div>;
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
    href: "#",
    icon: <Settings className="text-gray-300 h-5 w-5 flex-shrink-0" />
  }, {
    label: "Sign Out",
    href: "#",
    icon: <LogOut className="text-gray-300 h-5 w-5 flex-shrink-0" />,
    onClick: handleSignOut
  }];
  if (!user) {
    navigate("/");
    return null;
  }
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
                    {profileData.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="text-sm text-gray-200 font-semibold truncate max-w-[140px]">
                    {profileData.firstName && profileData.lastName ? `${profileData.firstName} ${profileData.lastName}` : user.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-[140px]">
                    {user.email}
                  </div>
                </div>
              </div> : <div className="mx-auto">
                <Avatar className="w-8 h-8 border-2 border-gray-700">
                  <AvatarImage src={profileData.avatarUrl || ""} />
                  <AvatarFallback className="bg-gray-600 text-gray-200 text-xs">
                    {profileData.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>}
          </div>
        </SidebarBody>
      </Sidebar>

      <main className={`fixed inset-0 transition-all duration-300 bg-slate-950 overflow-auto ${sidebarOpen ? 'md:left-[300px]' : 'md:left-[60px]'}`}>
        <div className="p-6 min-h-screen">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
            <button onClick={toggleEditMode} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium">
              {isEditingTabs ? <>
                  <Save className="h-4 w-4" />
                  <span>Save Order</span>
                </> : <>
                  <Edit className="h-4 w-4" />
                  <span>Reorder Tabs</span>
                </>}
            </button>
          </div>
          
          <Card className="bg-slate-800/80 border border-white/5 h-[calc(100vh-140px)]">
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center">
                {isEditingTabs ? <div className="flex gap-2 flex-wrap">
                    {tabs.map((tab, index) => <div key={tab.id} draggable={isEditingTabs} onDragStart={e => startDrag(e, index)} onDragOver={onDragOver} onDrop={e => onDrop(e, index)} className={`flex items-center gap-1.5 px-3 py-2 rounded-md cursor-move 
                          ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white/80'} 
                          ${isDragging ? 'transition-none' : 'transition-colors'}`}>
                        <GripVertical className="h-4 w-4 text-white-400" />
                        <span>{tab.label}</span>
                      </div>)}
                  </div> : <Tabs tabs={tabs} activeTab={activeTab} onTabChange={tabId => setActiveTab(tabId)} className="mb-2" />}
              </div>
            </div>
            <div className="h-full overflow-auto">
              {renderTabContent()}
            </div>
          </Card>
        </div>
      </main>
    </div>;
};
export default SettingsPage;