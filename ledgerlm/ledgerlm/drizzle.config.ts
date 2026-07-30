import { defineConfig } from "drizzle-kit";
import { execSync } from "child_process";

const authMode = (process.env.DB_AUTH_MODE || "").toLowerCase();

const IMDS_URL =
  "http://169.254.169.254/metadata/identity/oauth2/token" +
  "?api-version=2019-08-01" +
  "&resource=https%3A%2F%2Fossrdbms-aad.database.windows.net";

function fetchEntraTokenSync(): string {
  try {
    const raw = execSync(
      `curl -s --max-time 10 -H "Metadata: true" "${IMDS_URL}"`,
      { encoding: "utf8" }
    );
    const parsed = JSON.parse(raw) as { access_token?: string; error?: string };
    if (!parsed.access_token) {
      throw new Error(parsed.error ?? "No access_token in IMDS response");
    }
    console.log("[drizzle] Entra token fetched — running migrations with Managed Identity.");
    return parsed.access_token;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[drizzle] Failed to fetch Entra token from Azure IMDS.\n` +
      `Ensure you are inside Azure App Service with a System-assigned Managed Identity\n` +
      `that has PostgreSQL Entra admin rights.\nDetail: ${msg}`
    );
  }
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} must be set when DB_AUTH_MODE=${authMode}`);
  return val;
}

// Resolve credentials based on auth mode — evaluated once at migration time.
const dbCredentials = (() => {
  if (authMode === "entra" || authMode === "hybrid") {
    // Azure Managed Identity: fetch short-lived JWT from IMDS, use as password.
    // Individual fields are used (not a URL) so the JWT needs no URL-encoding.
    return {
      host:     requireEnv("DB_HOST"),
      user:     requireEnv("DB_USER"),
      database: requireEnv("DB_NAME"),
      password: fetchEntraTokenSync(),
      ssl:      true,
    };
  }

  if (authMode === "postgres-azure") {
    // Azure PostgreSQL with a static username + password.
    return {
      host:     requireEnv("DB_HOST"),
      user:     requireEnv("DB_USER"),
      database: requireEnv("DB_NAME"),
      password: requireEnv("DB_PASSWORD"),
      ssl:      true,
    };
  }

  // Default: Neon cloud or local Postgres via connection URL.
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No database configured. Set DATABASE_URL for Neon/local, " +
      "or set DB_AUTH_MODE + DB_HOST + DB_USER + DB_NAME for Azure."
    );
  }
  return { url };
})();

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials,
});
