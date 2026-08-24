---
name: Entity P&L capacity presentation
description: Governing display and classification rules for capacity lines in the Entity P&L report.
---

The Entity P&L must show six capacity lines: End Capacity On-roll, End Capacity Outsourcing, Total End, Avg Capacity Overall, Avg Capacity Outsourcing, and Total Average. Internal capacity is on-roll and External capacity is outsourcing; `INDIRECT` Actual capacity is excluded from all six lines.

**Why:** The financial statement needs capacity composition and totals, not the prior two generic capacity rows. The user explicitly chose to exclude `INDIRECT` rather than assigning it to either workforce category.

**How to apply:** Derive averages from month-end capacity snapshots. Use Internal/Outsourcing source metadata for supplemental CF data and Internal/External resource types for Actual data. Calculate each total as the sum of the two displayed components.