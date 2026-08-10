import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthUser, clearAuthUser } from "./auth";

function handleSessionExpiry() {
  // Clear in-memory auth state and redirect to login.
  // Using location.replace so the expired page is removed from history.
  clearAuthUser();
  if (window.location.pathname !== '/') {
    window.location.replace('/');
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      handleSessionExpiry();
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown | undefined,
  isFormData = false,
): Promise<T> {
  const user = getAuthUser();
  const headers: HeadersInit = {};
  
  // Don't set Content-Type for FormData - browser will set it with boundary
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  
  if (user?.id) {
    headers['x-user-id'] = user.id;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? (isFormData ? data as BodyInit : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  if (res.status === 204) {
    return undefined as T;
  }
  
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const user = getAuthUser();
    const headers: HeadersInit = {};
    
    if (user?.id) {
      headers['x-user-id'] = user.id;
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
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
