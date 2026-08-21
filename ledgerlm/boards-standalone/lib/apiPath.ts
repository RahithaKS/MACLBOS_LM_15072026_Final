const EMBEDDED_BASE_PATH = "/standalone-boards";

export function isEmbeddedStandalone(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.pathname === EMBEDDED_BASE_PATH ||
      window.location.pathname.startsWith(`${EMBEDDED_BASE_PATH}/`))
  );
}

/**
 * The standalone app can run directly at the root during local development or
 * behind LedgerLM's embedded artifact path. Keep API requests in the same
 * routed application in both cases.
 */
export function standaloneApiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${isEmbeddedStandalone() ? EMBEDDED_BASE_PATH : ""}${normalizedPath}`;
}

/**
 * LedgerLM protects embedded mutating requests with its session CSRF token.
 * Direct Boards development remains self-contained and does not need this.
 */
export async function standaloneRequestHeaders(
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  if (!isEmbeddedStandalone()) return headers;

  const response = await fetch("/api/auth/csrf-token", {
    credentials: "include",
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.csrfToken) {
    throw new Error(payload?.error ?? "Could not establish a secure LedgerLM session. Please sign in again.");
  }

  return { ...headers, "x-csrf-token": payload.csrfToken as string };
}