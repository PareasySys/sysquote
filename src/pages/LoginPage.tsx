
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/LoginForm';
import AuthLayout from '@/components/layout/AuthLayout';

const LoginPage = () => {
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
      <div className="bg-white shadow-lg rounded-lg border border-gray-100 p-8">
        <LoginForm />
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
