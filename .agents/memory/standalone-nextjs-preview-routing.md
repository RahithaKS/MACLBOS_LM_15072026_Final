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

Raw browser API requests do not automatically inherit a Next.js base path. Standalone API callers must construct their URLs with the embedded artifact prefix.

**Why:** A root-relative request such as `/api/analyze` escapes the embedded standalone app and reaches LedgerLM's protected API, which correctly rejects it for lacking LedgerLM's CSRF token.

**How to apply:** Use the standalone API path helper for all client-side standalone API calls, including analysis and board chat, while retaining root behavior for direct standalone development.

When the standalone workspace is embedded in LedgerLM, the LedgerLM sidebar is the only navigation shown; the standalone sidebar is hidden. The direct standalone workspace retains its own sidebar.

**Why:** Two simultaneous sidebars duplicate navigation and leave too little room for Boards and Enterprise Data content.

**How to apply:** Mark LedgerLM iframe destinations as embedded and let the standalone sidebar component detect that mode. Do not alter LedgerLM's outer sidebar for this behavior.

Embedded Boards and Enterprise Data use the native LedgerLM content frame without an additional “Standalone workspace” header or iframe card.

**Why:** Nested headers, padding, borders, and scroll regions made the companion pages visibly separate from LedgerLM and wasted the main content area.

**How to apply:** Keep the iframe flush inside LedgerLM's standard content padding and enable embedded-only standalone styling. Preserve direct standalone styling and all local browser-storage behavior.

Decide embedded mode during the standalone request, not in a client-side effect.

**Why:** Client-only iframe detection renders the standalone sidebar first, then removes it after hydration, producing a visible navigation flash.

**How to apply:** Send the explicit embedded marker with iframe URLs, pass it into the server-rendered layout, and omit the standalone sidebar from the embedded HTML. Keep direct standalone routes unmarked so their sidebar renders normally.