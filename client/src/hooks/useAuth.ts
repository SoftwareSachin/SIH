import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/auth/user', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
        }
        throw new Error('Failed to authenticate');
      }

      return response.json();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: () => {
      localStorage.removeItem('auth_token');
      window.location.reload();
    },
  };
}
