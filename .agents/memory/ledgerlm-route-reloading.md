---
name: LedgerLM Route Reloading
description: Development-server behavior when LedgerLM API routes change.
---

New Express route registrations are loaded only when the active LedgerLM workflow starts. Vite HMR can update the React client while the server still uses an older route module; requests to newly added API paths then fall through to the SPA HTML response.

**Why:** This can look like a successful HTTP response in access logs while browser JSON parsing fails, making a new API appear to be a client-side issue.

**How to apply:** After adding or changing LedgerLM Express routes, restart the workflow serving the artifact before browser or API verification. Client-only changes can use HMR normally.