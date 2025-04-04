
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from "@/context/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const PrivateRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export default PrivateRoute;
