
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  Sidebar, 
  SidebarBody, 
  SidebarLink,
  Logo,
  LogoIcon
} from "@/components/ui/sidebar-custom";
import { LayoutDashboard, Settings, LogOut, UserCog, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useId } from "react";
import { useImageUpload } from "@/hooks/use-image-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ProfileSettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const id = useId();
  
  const [formData, setFormData] = useState({
    email: user?.email || "",
    firstName: user?.user_metadata?.first_name || "",
    lastName: user?.user_metadata?.last_name || "",
    avatar: user?.user_metadata?.avatar_url || ""
  });

  // Check authentication status
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = () => {
    // This is just a placeholder for now - would connect to an update profile API
    toast({
      title: "Profile Updated",
      description: "Your profile has been updated successfully.",
    });
  };

  if (!user) return null; // Don't render anything if not authenticated

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
    <div className="flex h-screen bg-gray-900">
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
          <div className="py-4">
            <div className="text-sm text-gray-400 px-2">
              {sidebarOpen && (
                <>
                  <div>Welcome,</div>
                  <div className="font-semibold truncate">{user.email}</div>
                </>
              )}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <main className="flex-1 flex flex-col h-screen overflow-auto p-6">
        <div className="max-w-md mx-auto w-full mt-10">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <h1 className="text-xl font-bold text-white mb-2">Edit Profile</h1>
                <p className="text-gray-400 mb-8">Make changes to your profile details.</p>
                
                <ProfileAvatar 
                  defaultImage={formData.avatar || "https://github.com/shadcn.png"} 
                  editable={true}
                  className="mb-8"
                />
                
                <form className="w-full space-y-6" onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateProfile();
                }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${id}-first-name`} className="text-gray-300">First name</Label>
                      <Input
                        id={`${id}-first-name`}
                        name="firstName"
                        placeholder="Your first name"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="bg-gray-700 border-gray-600 text-gray-200"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${id}-last-name`} className="text-gray-300">Last name</Label>
                      <Input
                        id={`${id}-last-name`}
                        name="lastName"
                        placeholder="Your last name"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="bg-gray-700 border-gray-600 text-gray-200"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`${id}-email`} className="text-gray-300">Email</Label>
                    <Input
                      id={`${id}-email`}
                      name="email"
                      value={formData.email}
                      className="bg-gray-700 border-gray-600 text-gray-200"
                      readOnly
                    />
                  </div>
                  
                  <div className="flex justify-end gap-4 mt-8">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/home')}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Save changes</Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Profile Avatar component with optional edit functionality
function ProfileAvatar({ 
  defaultImage, 
  editable = false,
  className = ""
}: { 
  defaultImage?: string, 
  editable?: boolean,
  className?: string
}) {
  const { previewUrl, fileInputRef, handleThumbnailClick, handleFileChange } = useImageUpload();
  const currentImage = previewUrl || defaultImage;

  return (
    <div className={`relative ${className}`}>
      <Avatar className="w-24 h-24 border-4 border-gray-700">
        <AvatarImage src={currentImage} />
        <AvatarFallback className="bg-gray-600 text-gray-200 text-xl">
          {defaultImage ? "" : "U"}
        </AvatarFallback>
      </Avatar>
      
      {editable && (
        <>
          <button
            type="button"
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
            onClick={handleThumbnailClick}
            aria-label="Change profile picture"
          >
            <ImagePlus size={16} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            aria-label="Upload profile picture"
          />
        </>
      )}
    </div>
  );
}

export default ProfileSettingsPage;
