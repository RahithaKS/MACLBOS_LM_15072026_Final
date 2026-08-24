---
name: Supplemental Entity P&L CF imports
description: Governing semantics for importing the wide Entity P&L CF workbook.
---

Supplemental Entity P&L workbooks with `FiscalYear`, `Month`, `Category`,
`Sub_Category`, and `CFxx` columns are not entity-specific unless an entity
field is explicitly present. Preserve the absent entity as NULL so the blank
Entity selector aggregates the data for all entities; never infer or assign an
entity such as BGSW.

Financial source values are monthly plan values but the Entity P&L comparison
logic derives MTD from cumulative YTD snapshots. Import financial scenarios as
cumulative values by year/scenario/category/sub-category. End Capacity is a
point-in-time monthly snapshot, and Average Capacity must be derived from those
snapshots rather than imported as an additional fact.

**Why:** Treating all-entity input as a specific entity corrupts entity-scoped
reports. Treating monthly plan values as snapshots makes QoQ subtract one month
from another and displays incorrect CF amounts.

**How to apply:** Keep this normalization in the dedicated supplemental-import
path, retain the exact `CFxx` value as the scenario version, and store the
supplied values in INR unless a governed currency conversion is introduced.