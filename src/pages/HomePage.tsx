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
    <div className="flex h-screen bg-gray-900 text-gray-200">
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
          <h1 className="text-2xl font-bold mb-6 text-gray-100">Dashboard</h1>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-sidebar p-4 rounded-lg border border-white/10 shadow-sm">
                  <Skeleton className="h-6 w-3/4 mb-2 bg-gray-700" />
                  <Skeleton className="h-4 w-1/2 mb-1 bg-gray-700" />
                  <Skeleton className="h-4 w-1/3 bg-gray-700" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
              <p className="text-red-300">{error}</p>
              <Button 
                onClick={fetchQuotes} 
                variant="outline" 
                className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50"
              >
                Try Again
              </Button>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">No quotes yet</h3>
              <p className="text-gray-400 mb-6 max-w-md">Create your first quote to get started with training quotes for your clients</p>
              <Button 
                onClick={handleStartNewQuote}
                className="bg-blue-700 hover:bg-blue-800 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Quote
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Create New Quote Card */}
              <Card 
                className="bg-sidebar p-6 rounded-lg border border-white/10 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center cursor-pointer h-[250px]"
                onClick={handleStartNewQuote}
              >
                <div className="flex flex-col items-center justify-center gap-4 h-full">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-200">Create New Quote</h3>
                  <p className="text-gray-400 text-center">Start a new training quote for your client</p>
                </div>
              </Card>
              
              {/* Existing Quote Cards */}
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.quote_id}
                  quote_id={quote.quote_id}
                  quote_name={quote.quote_name}
                  client_name={quote.client_name}
                  created_at={quote.created_at}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg border border-white/10 shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-100">New Quote Info</h2>
            <p className="text-gray-300 mb-4">This is a placeholder for the New Quote popup component.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClosePopup} className="border-gray-600 text-gray-300 hover:bg-gray-700">
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
