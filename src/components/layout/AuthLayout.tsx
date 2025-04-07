
import React from 'react';

type AuthLayoutProps = {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/1b2922b0-d05a-4ef5-8cc7-f322421f80fc.png" 
            alt="System Logistics" 
            className="h-20 mx-auto mb-2" 
          />
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
