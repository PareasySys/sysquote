
import React from 'react';
import SignupForm from '@/components/SignupForm';
import AuthLayout from '@/components/layout/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SignupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect to home if user is already authenticated
  React.useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  return (
    <AuthLayout>
      <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700 p-8">
        <SignupForm />
      </div>
    </AuthLayout>
  );
};

export default SignupPage;
