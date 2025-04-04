
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import RegisterForm from './RegisterForm';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
      } else if (data.user) {
        toast({
          title: "Login successful",
          description: "Welcome back to SysQuote!",
        });
        navigate('/home');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleInputChange = () => {
    if (error) setError(null);
  };

  const toggleForm = () => {
    setShowRegisterForm(!showRegisterForm);
    setError(null);
  };

  const handleRegistrationSuccess = () => {
    setShowRegisterForm(false);
    toast({
      title: "Registration successful",
      description: "You can now log in with your new account",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">SysQuote</h1>
          <p className="text-gray-600 mt-1">Cost calculation for training plans</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center">
              {showRegisterForm ? "Create Account" : "Sign In"}
            </CardTitle>
            <CardDescription className="text-center">
              {showRegisterForm 
                ? "Register to start using SysQuote" 
                : "Enter your credentials to access your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showRegisterForm ? (
              <RegisterForm 
                onSuccess={handleRegistrationSuccess}
                onToggleForm={toggleForm}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        handleInputChange();
                      }}
                      placeholder="Email address"
                      className="pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        handleInputChange();
                      }}
                      placeholder="Password"
                      className="pl-10 pr-10"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                    {error}
                  </div>
                )}
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={toggleForm}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Don't have an account? Register
                  </button>
                </div>
              </form>
            )}
          </CardContent>
          {!showRegisterForm && (
            <CardFooter className="flex justify-center">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot your password?
              </button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
