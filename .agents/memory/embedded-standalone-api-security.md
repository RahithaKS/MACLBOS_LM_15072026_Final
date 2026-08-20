---
name: Embedded Standalone API Security
description: How an iframe-hosted standalone app calls protected LedgerLM routes.
---

Embedded standalone applications run under the same origin and can use the
LedgerLM session cookie for authorized root API calls, but every state-changing
request must first obtain `/api/auth/csrf-token` and send its value as
`x-csrf-token`.

**Why:** The LedgerLM shell uses a synchronizer-token CSRF layer in addition to
session authentication. A shared cookie alone produces a 403 and should not be
bypassed or weakened.

**How to apply:** For a standalone feature that calls a protected root API,
request the token with `credentials: "include"` immediately before its POST,
PUT, PATCH, or DELETE. Keep the server route authenticated and authorize the
specific resource there; never expose a public Enterprise Data endpoint to
avoid this requirement.