const EMBEDDED_BASE_PATH = "/standalone-boards";

/**
 * The standalone app can run directly at the root during local development or
 * behind LedgerLM's embedded artifact path. Keep API requests in the same
 * routed application in both cases.
 */
export function standaloneApiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isEmbedded =
    typeof window !== "undefined" &&
    (window.location.pathname === EMBEDDED_BASE_PATH ||
      window.location.pathname.startsWith(`${EMBEDDED_BASE_PATH}/`));

  return `${isEmbedded ? EMBEDDED_BASE_PATH : ""}${normalizedPath}`;
}