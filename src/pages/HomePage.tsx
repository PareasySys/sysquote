import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuotes } from "@/hooks/useQuotes";
import { useGeographicAreas } from "@/hooks/useGeographicAreas";
import { Button } from "@/components/ui/button";
import QuoteCard from "@/components/shared/QuoteCard";
import { Card } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sidebar, 
  SidebarBody, 
  SidebarLink,
  Logo,
  LogoIcon
} from "@/components/ui/sidebar-custom";
import { LayoutDashboard, Settings, LogOut, UserCog, Plus, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/use-user-profile";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";

const formSchema = z.object({
  quote_name: z.string().min(1, { message: "Quote name is required" }),
  client_name: z.string().optional(),
  geographic_area: z.string().min(1, { message: "Geographic area is required" }),
});

type FormValues = z.infer<typeof formSchema>;

const HomePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { quotes, loading, error, fetchQuotes } = useQuotes();
  const { areas, loading: areasLoading } = useGeographicAreas();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profileData } = useUserProfile(user);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quote_name: "",
      client_name: "",
      geographic_area: "",
    },
  });

  useEffect(() => {
    if (!user) {
      navigate("/");
    } else {
      console.log("User is authenticated, displaying quotes", quotes.length);
    }
  }, [user, navigate, quotes.length]);

  useEffect(() => {
    if (!areasLoading && areas.length > 0) {
      console.log("Geographic areas loaded:", areas);
    }
  }, [areasLoading, areas]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleOpenDialog = () => {
    form.reset();
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) return;
    
    try {
      const { data: newQuote, error } = await supabase
        .from("quotes")
        .insert({
          quote_name: data.quote_name,
          client_name: data.client_name || null,
          created_by_user_id: user.id,
          area_id: parseInt(data.geographic_area, 10)
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Quote created successfully!");
      setDialogOpen(false);
      
      console.log("Created new quote, fetching updated quotes");
      fetchQuotes(); // Refresh quotes after creating a new one
    } catch (error: any) {
      console.error("Error creating quote:", error);
      toast.error(error.message || "Failed to create quote");
    }
  };

  const handleQuoteDeleted = () => {
    // Refresh quotes when a quote is deleted
    fetchQuotes();
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
          <div className="mb-6 flex items-center">
            <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
            {loading && (
              <div className="pl-4 flex items-center">
                <TextShimmerWave
                  className="[--base-color:#a1a1aa] [--base-gradient-color:#ffffff] text-lg"
                  duration={1}
                  spread={1}
                  zDistance={1}
                  scaleDistance={1.1}
                  rotateYDistance={10}
                >
                  Loading Quotes
                </TextShimmerWave>
              </div>
            )}
          </div>
          
          {error ? (
            <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-center">
              <p className="text-red-300">{error}</p>
              <Button 
                onClick={() => {
                  console.log("Manual retry of fetchQuotes");
                  fetchQuotes();
                }} 
                variant="outline" 
                className="mt-2 text-blue-300 border-blue-800 hover:bg-blue-900/50"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card 
                className="bg-slate-800/80 p-6 rounded-lg border border-white/5 shadow-sm hover:shadow-md hover:bg-slate-700/80 transition-all cursor-pointer h-[220px] flex flex-col items-center justify-center"
                onClick={handleOpenDialog}
              >
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-700/80 flex items-center justify-center">
                    <Plus className="h-8 w-8 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-200">Create New Quote</h3>
                  <p className="text-gray-400 text-center">Start a new training quote for your client</p>
                </div>
              </Card>
              
              {quotes.length > 0 && quotes.map((quote) => (
                <QuoteCard
                  key={quote.quote_id}
                  quote_id={quote.quote_id}
                  quote_name={quote.quote_name}
                  client_name={quote.client_name}
                  area_name={quote.area_name}
                  created_at={quote.created_at}
                  onDelete={handleQuoteDeleted}
                />
              ))}
              
              {quotes.length === 0 && !loading && (
                <div className="col-span-full text-center py-10">
                  <FileText className="h-12 w-12 mx-auto text-gray-500 mb-3" />
                  <h3 className="text-lg font-medium text-gray-300 mb-1">No quotes yet</h3>
                  <p className="text-gray-400 mb-6">Create your first quote to get started</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-gray-700 text-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-100">Create New Quote</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="quote_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Quote Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter a name for this quote" 
                        {...field}
                        className="bg-slate-700 border-gray-600 text-gray-200 placeholder:text-gray-500"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Customer Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter customer name" 
                        {...field}
                        className="bg-slate-700 border-gray-600 text-gray-200 placeholder:text-gray-500"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="geographic_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Geographic Area</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-slate-700 border-gray-600 text-gray-200">
                          <SelectValue placeholder="Select an area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-700 border-gray-600 text-gray-200 z-[200]">
                        {areasLoading ? (
                          <div className="p-2 text-gray-400">Loading areas...</div>
                        ) : areas.length === 0 ? (
                          <div className="p-2 text-gray-400">No areas available</div>
                        ) : (
                          areas.map((area) => (
                            <SelectItem 
                              key={area.area_id} 
                              value={area.area_id.toString()}
                              className="text-gray-200 focus:bg-slate-600 focus:text-white hover:bg-slate-600"
                            >
                              {area.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseDialog}
                  className="border-gray-600 hover:bg-gray-700 text-gray-300"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-700 hover:bg-blue-800 text-white"
                >
                  Save Quote
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
