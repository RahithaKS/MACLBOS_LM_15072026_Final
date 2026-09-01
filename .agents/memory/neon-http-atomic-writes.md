---
name: Neon HTTP atomic writes
description: How to preserve multi-table atomicity when LedgerLM runs through the Neon HTTP database driver.
---

Do not use the Drizzle transaction API for LedgerLM writes that must remain atomic across tables. Use one PostgreSQL data-modifying CTE statement instead.

**Why:** The active Neon HTTP driver rejects `db.transaction()` at runtime even though the code can compile and the production bundle can build successfully.

**How to apply:** For acceptance-plus-audit or similar coupled writes, combine inserts/updates in a single SQL statement with data-modifying CTEs and `RETURNING`. Keep retries idempotent with an appropriate unique constraint.