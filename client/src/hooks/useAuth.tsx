import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: (User & { currentRole?: string; permissions?: string[] }) | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  loginMutation: UseMutationResult<AuthResponse, Error, LoginData>;
  registerMutation: UseMutationResult<AuthResponse, Error, RegisterData>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  requestedRole?: string;
  state?: string;
  district?: string;
  organizationName?: string;
  justification?: string;
};

type AuthResponse = {
  message: string;
  token: string;
  user: User;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('authToken')
  );

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<(User & { currentRole?: string; permissions?: string[] }) | undefined, Error>({
    queryKey: ["/api/auth/user", token],
    enabled: true,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/auth/user', {
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData): Promise<AuthResponse> => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      return res.json();
    },
    onSuccess: (response: AuthResponse) => {
      setToken(response.token);
      localStorage.setItem('authToken', response.token);
      queryClient.clear();
      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully.",
      });
      // Force immediate redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData): Promise<AuthResponse> => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      return res.json();
    },
    onSuccess: (response: any) => {
      setToken(response.token);
      localStorage.setItem('authToken', response.token);
      queryClient.clear();
      
      toast({
        title: "Welcome to FRA Atlas!",
        description: "Your account has been created successfully.",
      });
      // Force immediate redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logout = () => {
    console.log('Logout called - clearing all auth data');
    setToken(null);
    localStorage.removeItem('authToken');
    // Also clear any other potential stored data
    localStorage.clear();
    queryClient.clear();
    console.log('After logout - token cleared, cache cleared, localStorage cleared');
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    // Force immediate redirect to auth page
    console.log('Redirecting to auth page');
    window.location.href = '/auth';
  };

  const hasRole = (role: string): boolean => {
    return user?.currentRole === role || user?.currentRole === 'admin';
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const isAuthenticated = !!user && user.id !== 'anonymous-user';
  
  // Debug logging - temporary
  console.log('AuthProvider Debug:', {
    user: user?.id,
    userEmail: user?.email,
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    token: token ? 'Present' : 'None',
    tokenLength: token?.length || 0,
    userObject: user
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isAuthenticated, // Exclude anonymous users from being considered authenticated
        loginMutation,
        registerMutation,
        logout,
        hasRole,
        hasPermission,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}