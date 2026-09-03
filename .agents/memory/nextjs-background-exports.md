---
name: Next.js background exports
description: Production-safe handling for CPU-heavy browser document exports under Next.js and Turbopack.
---

Do not assume `new Worker(new URL("./worker.ts", import.meta.url))` is production-safe merely because development and `next build` pass. Inspect the emitted worker asset or exercise it in a production-like browser; Turbopack can emit the TypeScript source as a static asset that browsers cannot execute.

**Why:** A LedgerLM export worker worked in development and passed the optimized build, but the emitted production asset remained raw TypeScript. Moving generation behind the existing authenticated, CSRF-protected proxy route avoided the unusable asset while keeping the browser responsive.

**How to apply:** For heavy Next.js browser work, verify the emitted worker bytes and dependency chunks. If worker bundling is not proven, use a background server endpoint and preserve browser-local presentation details such as locale-formatted timestamps explicitly.

Template-based PPTX exporters that reopen a presentation with JSZip must explicitly use DEFLATE when generating the output. JSZip's stored output can expand a small PowerPoint package by more than 100×, making a valid export fail later at an HTTP gateway.

**Why:** Retaining an exact presentation template produced a file over 25 MB from a template under 250 KB. The document contents were valid; uncompressed ZIP packaging made the buffered proxy response slow and vulnerable to a 502.

**How to apply:** Keep template rendering and financial logic unchanged, compress only at the package boundary, and verify both slide anatomy and output size. For live percentage reporting, separate job creation, status polling, and final download.

Starting an async export without awaiting it is not background execution when its libraries do CPU-bound synchronous work; it can still pin the Next.js event loop and prevent progress polling.

**Why:** A real template export stayed at its initial percentage while the Next server used 100% CPU. The job existed, but no status request could be served until the same process finished its ZIP work.

**How to apply:** Run exact-template package work in a child process, report progress over IPC, and use a module-relative JavaScript worker URL so Turbopack emits an executable server asset. Inspect that emitted asset after production builds.