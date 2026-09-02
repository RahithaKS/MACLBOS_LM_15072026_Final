---
name: KPI PPTX export layout
description: Why the KPI Metrics Board uses a fixed Business Metrics PowerPoint renderer rather than generic template anatomy.
---

The generic PowerPoint template importer captures text, table, chart, and picture regions for mapping report data, but it does not reproduce decorative shape layers such as the Business Metrics gray decision panel, country flags, and colored header/footer bands.

**Why:** Using the generic template-driven export with a visually structured KPI template places mapped values into text boxes without the slide's background composition, which makes the downloaded slide appear sparse and compressed.

**How to apply:** For a recognized four-entity KPI template, retain the original PPTX package and replace only its named text placeholders so country flags and decorative shapes remain byte-derived from the source. Keep the dedicated generated renderer as the fallback for boards saved before template-byte retention. Only use the WW/IN/VN/MX reference panel when the stored report snapshot contains all four governed scope results; label older snapshots as legacy and prompt a re-run rather than inferring missing evidence. Exact-template export requires the original PPTX, a versioned four-entity payload, and a recognized signature; otherwise preserve the legacy path.