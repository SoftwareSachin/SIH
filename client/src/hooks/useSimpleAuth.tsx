import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from './use-toast';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  currentRole?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchUser(token);
    } else {
      setUser(createAnonymousUser());
      setIsLoading(false);
    }
  }, []);

  const createAnonymousUser = (): User => ({
    id: 'anonymous-user',
    email: 'guest@fraatlas.gov',
    firstName: 'Guest',
    lastName: 'User',
    currentRole: 'public',
    permissions: ['view_public_maps', 'view_all_claims', 'access_ai_processing', 'access_dss_engine']
  });

  const fetchUser = async (token: string) => {
    try {
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData.id !== 'anonymous-user') {
          setUser(userData);
        } else {
          setUser(createAnonymousUser());
        }
      } else {
        localStorage.removeItem('authToken');
        setUser(createAnonymousUser());
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('authToken');
      setUser(createAnonymousUser());
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        await fetchUser(data.token);
        
        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully."
        });
        
        // Redirect to dashboard
        window.location.href = '/';
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        await fetchUser(data.token);
        
        toast({
          title: "Welcome to FRA Atlas!",
          description: "Your account has been created successfully."
        });
        
        // Redirect to dashboard
        window.location.href = '/';
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(createAnonymousUser());
    toast({
      title: "Logged out",
      description: "You have been logged out successfully."
    });
    window.location.href = '/auth';
  };

  const isAuthenticated = user?.id !== 'anonymous-user';

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}