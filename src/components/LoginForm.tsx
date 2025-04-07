
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";

interface LoginFormProps {
  onClose?: () => void;
}

const LoginForm = ({ onClose }: LoginFormProps) => {
  const id = useId();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Store the remember me preference before login
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedEmail");
      }
      
      await signIn({ email, password });
      toast.success("Login successful");
      navigate("/home");
      if (onClose) onClose();
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check for remembered credentials when component mounts
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    const shouldRemember = localStorage.getItem("rememberMe") === "true";
    
    if (shouldRemember && rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gray-700"
        aria-hidden="true"
      >
        <svg
          className="stroke-white"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <circle cx="16" cy="16" r="12" fill="none" strokeWidth="8" />
        </svg>
      </div>
      
      <div className="flex flex-col space-y-1.5 text-center">
        <h2 className="text-lg font-semibold tracking-tight text-white">Welcome to SysQuote</h2>
        <p className="text-sm text-gray-400">
          Enter your credentials to login to your account.
        </p>
      </div>

      <form className="space-y-5 w-full mt-4" onSubmit={handleSubmit}>
        <div className="space-y-4">
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
        
        <div className="flex justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox 
              id={`${id}-remember`} 
              checked={rememberMe} 
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="border-gray-500 data-[state=checked]:bg-blue-500"
            />
            <Label htmlFor={`${id}-remember`} className="font-normal text-gray-400">
              Remember me
            </Label>
          </div>
          <Link to="/forgot-password" className="text-sm text-blue-400 underline hover:no-underline">
            Forgot password?
          </Link>
        </div>
        
        <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Sign in"}
        </Button>

        <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-gray-700 after:h-px after:flex-1 after:bg-gray-700">
          <span className="text-xs text-gray-400">Or</span>
        </div>

        <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700" type="button" onClick={() => navigate("/signup")}>
          Create an account
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;
