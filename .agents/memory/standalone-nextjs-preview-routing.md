---
name: Standalone Next.js preview routing
description: How companion Next.js applications remain functional behind Replit's path-based preview proxy.
---

Route a companion Next.js app through an artifact preview path instead of relying on a manually exposed secondary development port. Set its runtime base path from the artifact `BASE_PATH` value, and allow both the proxy host and the dynamic `REPLIT_DEV_DOMAIN` in `allowedDevOrigins`.

**Why:** A separately configured public development port can be unreachable in a browser even while the process is healthy inside the workspace. Next.js development-mode origin protection then blocks client chunks when the preview proxy uses the workspace domain, leaving server-rendered pages visible but controls non-interactive.

**How to apply:** For a standalone Next.js companion, use an existing same-product artifact service with a distinct preview path. Keep the base path and allowed development origins derived from environment configuration so routing survives development-domain changes.

LedgerLM presents the standalone Boards and Enterprise Data pages inside its own authenticated shell rather than opening a new tab. The standalone app remains separate; its routed pages are embedded in the LedgerLM content area.

**Why:** The approved user experience keeps LedgerLM navigation available while the standalone workspace is in use.

**How to apply:** Keep the outer LedgerLM route distinct from the standalone artifact path, then load the standalone destination in an iframe. Do not convert the standalone app into LedgerLM components unless integration is explicitly requested later.