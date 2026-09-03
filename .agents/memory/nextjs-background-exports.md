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

Throttle ZIP progress before sending it over child-process IPC. Compression hooks may fire far more often than the UI can display; forwarding every callback can make the progress channel compete with completion.

**Why:** A real retained-template job remained alive and pollable but did not deliver completion before its safety timeout, while bounded progress updates completed the same worker path in milliseconds.

**How to apply:** Send progress only when the visible percentage changes or a short interval passes. Keep a generous outer timeout, log milestone timings, and include the last worker stage in timeout errors.

PowerPoint placeholder replacement must be bounded to a single DrawingML `<a:r>` run. Never use an unrestricted cross-run match around `<a:t>` tokens.

**Why:** A cross-run regex copied preceding slide markup once per multiline detail, inflating a small deck to tens of megabytes and leaving PowerPoint with duplicated or partially rendered narrative.

**How to apply:** Use a run-bounded match, then regression-test multiline replacements for one header, one copy of every detail line, zero unresolved tokens, and a bounded output size.