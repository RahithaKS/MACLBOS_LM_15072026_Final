---
name: LedgerLM preview process ownership
description: Replit Preview can appear unavailable when an orphaned LedgerLM process keeps its port while the managed workflow is failed.
---

Treat the managed LedgerLM workflow state—not merely a successful localhost response—as the source of truth for Preview readiness.

**Why:** A previous LedgerLM process can remain alive on port 5000 after its workflow loses ownership. The app still answers locally, but a managed restart fails with `EADDRINUSE`, leaving Replit's Preview router attached to a failed workflow.

**How to apply:** If Preview fails while localhost:5000 answers, inspect process groups and workflow logs. Stop only the stale LedgerLM process group, preserve the separate Standalone Boards process on port 3000, then restart the exact managed LedgerLM workflow once.