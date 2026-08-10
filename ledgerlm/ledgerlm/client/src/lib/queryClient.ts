import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthUser, clearAuthUser } from "./auth";

// ── SG-41: CSRF token (Synchronizer Token Pattern) ───────────────────────────
// Stored in memory only (never localStorage). Fetched once after login via
// fetchCsrfToken() and injected into every state-changing request automatically.
let _csrfToken: string | null = null;

export async function fetchCsrfToken(): Promise<void> {
  try {
    const res = await fetch('/api/auth/csrf-token', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      _csrfToken = data.csrfToken ?? null;
    }
  } catch {
    // Non-fatal — requests will fail with 403 if token cannot be obtained
  }
}

export function clearCsrfToken(): void {
  _csrfToken = null;
}

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

  // SG-41: Inject CSRF token on all state-changing requests
  if (_csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    headers['x-csrf-token'] = _csrfToken;
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
