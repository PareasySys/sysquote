
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import React, { useState, createContext, useContext, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { APP_VERSION } from "@/utils/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Links {
  label: string;
  href: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const initialState = () => {
    const savedState = localStorage.getItem('sidebar-state');
    return savedState === 'true';
  };
  
  const [openState, setOpenState] = useState(initialState());

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  useEffect(() => {
    localStorage.setItem('sidebar-state', open.toString());
  }, [open]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<"div">) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen, animate } = useSidebar();
  
  const handleMouseEnter = () => {
    setOpen(true);
    localStorage.setItem('sidebar-state', 'true');
  };
  
  const handleMouseLeave = () => {
    setOpen(false);
    localStorage.setItem('sidebar-state', 'false');
  };
  
  return (
    <div
      className={cn(
        "h-screen px-4 py-4 hidden md:flex md:flex-col bg-gray-800 flex-shrink-0 transition-all duration-300 fixed z-50",
        open ? "w-[300px] left-0" : "w-[60px] left-0",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-gray-800 w-full fixed top-0 left-0 z-50"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-gray-200 cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        {open && (
          <div
            className={cn(
              "fixed h-full w-full inset-0 bg-gray-900 p-10 z-[100] flex flex-col justify-between",
              className
            )}
          >
            <div
              className="absolute right-10 top-10 z-50 text-gray-200 cursor-pointer"
              onClick={() => setOpen(!open)}
            >
              <X />
            </div>
            {children}
          </div>
        )}
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  
  const handleClick = (e: React.MouseEvent) => {
    if (link.onClick) {
      e.preventDefault();
      link.onClick();
    }
  };
  
  return (
    <Link
      to={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {link.icon}
      <span
        className={cn(
          "text-gray-300 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre",
          animate && !open && "hidden"
        )}
      >
        {link.label}
      </span>
    </Link>
  );
};

export const Logo = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Link
          to="#"
          className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20 cursor-pointer"
          onClick={(e) => e.preventDefault()}
        >
          <img 
            src="/lovable-uploads/4ae70efa-d7c2-4c56-b454-cee99d4017ad.png" 
            alt="SysQuote Logo" 
            className="h-7 w-7"
          />
          <span className="font-medium text-white whitespace-pre">
            SysQuote
          </span>
        </Link>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-slate-800 border border-slate-700 text-white p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-full">
            <img 
              src="https://egbpjvbrqtvxtlpqkszr.supabase.co/storage/v1/object/public/identityimages//System_Logo.png" 
              alt="System Logo" 
              className="h-16 w-auto object-contain" 
            />
          </div>
          <div className="text-center">
            <h3 className="font-medium text-gray-200">SysQuote</h3>
            <p className="text-sm text-gray-400">Version: {APP_VERSION}</p>
          </div>
          <div className="border-t border-slate-700 w-full my-2"></div>
          <div className="flex flex-col items-center text-xs text-gray-400">
            <p>Powered by:</p>
            <p className="font-medium text-gray-300">Andrea Parisi</p>
            <div className="flex items-center mt-1 space-x-1">
              <span>and</span>
              <a href="https://lovable.ai" target="_blank" rel="noopener noreferrer" className="flex items-center">
                <span className="font-medium text-blue-400">Lovable</span>
                <img 
                  src="https://lovable.ai/images/lovable-icon.svg" 
                  alt="Lovable Logo" 
                  className="h-4 w-4 ml-1" 
                />
              </a>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const LogoIcon = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Link
          to="#"
          className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20 cursor-pointer"
          onClick={(e) => e.preventDefault()}
        >
          <img 
            src="/lovable-uploads/4ae70efa-d7c2-4c56-b454-cee99d4017ad.png" 
            alt="SysQuote Logo" 
            className="h-7 w-7"
          />
        </Link>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-slate-800 border border-slate-700 text-white p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-full">
            <img 
              src="https://egbpjvbrqtvxtlpqkszr.supabase.co/storage/v1/object/public/identityimages//System_Logo.png" 
              alt="System Logo" 
              className="h-16 w-auto object-contain" 
            />
          </div>
          <div className="text-center">
            <h3 className="font-medium text-gray-200">SysQuote</h3>
            <p className="text-sm text-gray-400">Version: {APP_VERSION}</p>
          </div>
          <div className="border-t border-slate-700 w-full my-2"></div>
          <div className="flex flex-col items-center text-xs text-gray-400">
            <p>Powered by:</p>
            <p className="font-medium text-gray-300">Andrea Parisi</p>
            <div className="flex items-center mt-1 space-x-1">
              <span>and</span>
              <a href="https://lovable.ai" target="_blank" rel="noopener noreferrer" className="flex items-center">
                <span className="font-medium text-blue-400">Lovable</span>
                <img 
                  src="https://lovable.ai/images/lovable-icon.svg" 
                  alt="Lovable Logo" 
                  className="h-4 w-4 ml-1" 
                />
              </a>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
