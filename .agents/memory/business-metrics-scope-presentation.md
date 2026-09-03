---
name: Business Metrics scope presentation
description: Governs how unavailable future KPI sections appear in the Business Metrics UI and PowerPoint.
---

Show only implemented, governed KPI sections in user-facing Business Metrics panels and PowerPoint exports. Do not display future metric headings, red-scope legends, Phase 2 labels, or out-of-scope explanations before their source mappings are approved.

**Why:** The user explicitly approved removing non-scope placeholders because they distract from the available analysis and can be mistaken for report content.

**How to apply:** Preserve internal status metadata needed for future implementation, but filter unavailable sections from the web result, export payload, and imported-template shapes. Restore a section only when governed values and definitions are implemented.