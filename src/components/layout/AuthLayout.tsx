
import React from 'react';

type AuthLayoutProps = {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">SysQuote</h1>
          <p className="text-gray-600 mt-1">Cost calculation for training plans</p>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
