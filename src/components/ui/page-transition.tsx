
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition = ({ 
  children, 
  className 
}: PageTransitionProps) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("fadeInUp");
  
  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage("fadeOut");
      setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("fadeInUp");
      }, 300); // This should match the CSS transition time
    }
  }, [location, displayLocation]);
  
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        transitionStage === "fadeInUp" ? "fadeInUp-animation" : "opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
};

export default PageTransition;
