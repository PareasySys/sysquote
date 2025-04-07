import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuotes } from "@/hooks/useQuotes";
import { Button } from "@/components/ui/button";
import QuoteCard from "@/components/shared/QuoteCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { 
  Sidebar, 
  SidebarBody, 
  SidebarLink,
  Logo,
  LogoIcon
} from "@/components/ui/sidebar-custom";
import { LayoutDashboard, Settings, LogOut, UserCog, Plus, FileText, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/use-user-profile";

const HomePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const { quotes, loading, error, fetchQuotes } = useQuotes();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profileData } = useUserProfile(user);

  useEffect(() => {
    if (!user) {
      navigate("/");
    } else {
      fetchQuotes();
    }
  }, [user, navigate, fetchQuotes]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleStartNewQuote = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const handleQuoteCreated = (newQuoteId: string) => {
    navigate(`/quote/${newQuoteId}/input`);
  };

  if (!user) return null;

  const sidebarLinks = [
    {
      label: "Dashboard",
      href: "/home",
      icon: (
        <LayoutDashboard className="text-gray-300 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Profile",
      href: "/profile",
      icon: (
        <UserCog className="text-gray-300 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Settings",
      href: "#",
      icon: (
        <Settings className="text-gray-300 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Sign Out",
      href: "#",
      icon: (
        <LogOut className="text-gray-300 h-5 w-5 flex-shrink-0" />
      ),
      onClick: handleSignOut
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
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

      <main className="flex-1 flex flex-col h-screen overflow-auto">
        <div className="p-6 flex-1">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard</h1>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-1" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={fetchQuotes} 
                variant="outline" 
                className="mt-2 text-blue-800"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Create New Quote Card */}
              <Card 
                className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center cursor-pointer h-[250px]"
                onClick={handleStartNewQuote}
              >
                <div className="flex flex-col items-center justify-center gap-4 h-full">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Plus className="h-8 w-8 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Create New Quote</h3>
                  <p className="text-gray-500 text-center">Start a new training quote for your client</p>
                </div>
              </Card>
              
              {/* Existing Quote Cards */}
              {quotes.map((quote) => (
                <Card 
                  key={quote.quote_id}
                  className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative h-[250px] flex flex-col"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <span className="font-medium text-lg text-gray-800">{quote.quote_name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="p-1 h-auto" 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Delete functionality would go here
                        console.log("Delete quote", quote.quote_id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    <div>
                      <p className="text-sm text-gray-500">Client</p>
                      <p className="font-medium">{quote.client_name || "No client specified"}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Area</p>
                      <p className="font-medium">Europe</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center mt-4 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created {new Date(quote.created_at).toLocaleDateString()}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">New Quote Info</h2>
            <p className="text-gray-600 mb-4">This is a placeholder for the New Quote popup component.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClosePopup}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleQuoteCreated("placeholder-id")}
                className="bg-blue-700 hover:bg-blue-800 text-white"
              >
                Create (Demo)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
