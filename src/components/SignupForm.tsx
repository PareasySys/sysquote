
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";

const SignupForm = () => {
  const id = useId();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });
      
      toast.success("Account created successfully, please sign in");
      navigate("/");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="mb-2" aria-hidden="true">
        <img 
          src="/lovable-uploads/0030e030-2a27-4c19-852c-d1df796aed6b.png" 
          alt="System Logistics" 
          className="h-16 mx-auto" 
        />
      </div>
      
      <div className="flex flex-col space-y-1.5 text-center">
        <h2 className="text-lg font-semibold tracking-tight text-white">Create Account</h2>
        <p className="text-sm text-gray-400">
          Enter your details to create your account.
        </p>
      </div>

      <form className="space-y-5 w-full mt-4" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${id}-firstName`} className="text-gray-300">First Name</Label>
            <Input 
              id={`${id}-firstName`} 
              placeholder="John" 
              type="text" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`${id}-lastName`} className="text-gray-300">Last Name</Label>
            <Input 
              id={`${id}-lastName`} 
              placeholder="Doe" 
              type="text" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`${id}-email`} className="text-gray-300">Email</Label>
            <Input 
              id={`${id}-email`} 
              placeholder="email@example.com" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`${id}-password`} className="text-gray-300">Password</Label>
            <Input
              id={`${id}-password`}
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              required
            />
          </div>
        </div>
        
        <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create Account"}
        </Button>

        <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-gray-700 after:h-px after:flex-1 after:bg-gray-700">
          <span className="text-xs text-gray-400">Or</span>
        </div>

        <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700" type="button" onClick={() => navigate("/")}>
          Already have an account? Sign in
        </Button>
      </form>
    </div>
  );
};

export default SignupForm;
