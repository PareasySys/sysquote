
import { useAuth as useAuthContext } from "@/contexts/AuthContext";
import { signIn, signOut, signUp, resetPasswordForEmail } from "@/services/auth";

export const useAuth = () => {
  const authContext = useAuthContext();

  return {
    ...authContext,
    signIn,
    signUp,
    signOut,
    resetPasswordForEmail
  };
};

export default useAuth;
