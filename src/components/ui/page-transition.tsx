
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
  const [transitionStage, setTransistionStage] = useState("fadeIn");
  
  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransistionStage("fadeOut");
      setTimeout(() => {
        setDisplayLocation(location);
        setTransistionStage("fadeIn");
      }, 300); // This should match the CSS transition time
    }
  }, [location, displayLocation]);
  
  return (
    <div
      className={cn(
        "transition-opacity duration-300 ease-in-out",
        transitionStage === "fadeIn" ? "opacity-100" : "opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
};

export default PageTransition;
