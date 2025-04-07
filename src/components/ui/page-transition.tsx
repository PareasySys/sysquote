
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
  const [transitionStage, setTransitionStage] = useState("fadeOut");
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Initially hide content, then start animation after a brief delay
    setIsVisible(false);
    setTransitionStage("fadeOut");
    
    const showTimer = setTimeout(() => {
      setDisplayLocation(location);
      setTransitionStage("fadeInUp");
      setIsVisible(true);
    }, 50);
    
    return () => {
      clearTimeout(showTimer);
    };
  }, [location]);

  useEffect(() => {
    // Initial load - start with fadeOut then transition to fadeInUp
    if (transitionStage === "fadeOut") {
      setTimeout(() => {
        setTransitionStage("fadeInUp");
        setIsVisible(true);
      }, 50);
    }
  }, []);
  
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        isVisible ? (transitionStage === "fadeInUp" ? "fadeInUp-animation" : "opacity-0") : "opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
};

export default PageTransition;
