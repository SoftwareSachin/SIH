import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(import.meta.env.DEV ? { "x-dev-bypass": "true" } : {})
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle query parameters properly
    const [baseUrl, ...params] = queryKey;
    let url = baseUrl as string;
    
    // If there are parameters, build the query string
    if (params.length > 0) {
      const queryParams = new URLSearchParams();
      params.forEach(param => {
        if (param && typeof param === 'object') {
          // Handle object parameters
          Object.entries(param).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              queryParams.append(key, String(value));
            }
          });
        } else if (param !== undefined && param !== null) {
          // Handle simple parameters
          queryParams.append('param', String(param));
        }
      });
      
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
    }
    
    const headers: Record<string, string> = {
      ...(import.meta.env.DEV ? { "x-dev-bypass": "true" } : {})
    };

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
