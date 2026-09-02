---
name: Next.js background exports
description: Production-safe handling for CPU-heavy browser document exports under Next.js and Turbopack.
---

Do not assume `new Worker(new URL("./worker.ts", import.meta.url))` is production-safe merely because development and `next build` pass. Inspect the emitted worker asset or exercise it in a production-like browser; Turbopack can emit the TypeScript source as a static asset that browsers cannot execute.

**Why:** A LedgerLM export worker worked in development and passed the optimized build, but the emitted production asset remained raw TypeScript. Moving generation behind the existing authenticated, CSRF-protected proxy route avoided the unusable asset while keeping the browser responsive.

**How to apply:** For heavy Next.js browser work, verify the emitted worker bytes and dependency chunks. If worker bundling is not proven, use a background server endpoint and preserve browser-local presentation details such as locale-formatted timestamps explicitly.