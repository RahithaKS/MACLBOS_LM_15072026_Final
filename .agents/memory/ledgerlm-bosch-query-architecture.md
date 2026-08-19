---
name: LedgerLM Bosch query architecture
description: Durable product and data-model understanding for Bosch financial analysis in LedgerLM.
---

LedgerLM is a multi-tenant, cube-scoped financial analysis system. A Bosch question should be treated as a verified analytics workflow, not as an open-ended LLM answer:

1. Authenticate the session and enforce company/domain membership, enterprise enablement, and selected-cube access before analysis.
2. Resolve natural language into a structured intent using Bosch aliases, known dimensions, cost categories, reporting views, periods, and semantic rules.
3. Prefer deterministic calculation and filter rules for recognized KPIs and official Bosch views; use LLM intent parsing only where deterministic matching is insufficient.
4. Compile safe, parameterized SQL against the selected cube's structured data. Actuals, planning/forecast data, and investment/CAPEX/PMO data follow distinct paths.
5. Return SQL-backed evidence and metadata to the Node orchestration layer, which ranks evidence, adds citations, and asks the configured AI provider to explain or visualize the verified result.

The database model has five conceptual layers:

- **Tenant and access layer:** users, companies, memberships, domains, domain users, enterprise settings, cube access, and user cube preferences. `cube_id` is a critical isolation boundary.
- **Document/RAG layer:** company/domain/cube-scoped enterprise documents, versioning, chunks, embeddings, and processing status. This supports document evidence but is distinct from structured financial facts.
- **Structured analytics layer:** cube-specific actual/fact rows, planning rows (budget/forecast/TBP/CF periods), and a separate investment/CAPEX/PMO fact model. Dimensions include entity, service area, project/global business, resource, time, cost category, currency, and capacity/financial measures.
- **Semantic control layer:** cube metadata, dimension and cost-category registrations, column mappings, schema versions, business terms, calculation rules, query patterns, filter rules, and known values/aliases. These tables are the database-backed contract for query interpretation and official Bosch reporting logic.
- **Operations/provenance layer:** ingestion jobs, file/blob registries and connector/scheduler configuration, query jobs, chat/query audit, and application audit logs. Results should remain traceable to source, query, calculation, time filter, and execution status.

Product-facing composition:

- **Vault** is the personal document/RAG surface, not a separate database entity. It is composed of user-owned documents, document chunks, embeddings, processing state, chat-document links, and source/citation metadata.
- **Boards** are analysis workspaces owned by a user. A board can use a template, persist layout/configuration in JSON, attach Vault documents, attach chats as threads, configure ordered data-source adapters, and retain generated cube-based reports with period, variance, prompt, raw analysis, and status.
- **Enterprise** is the governed company/domain/cube surface. Enterprise documents are company/domain/cube scoped and versioned; structured cube rows are separately stored and queried through cube access and semantic configuration.
- **Chat** is the interaction layer. Chats contain messages, can reference Vault documents and configured user data sources, and can be attached to Boards. Message metadata and query-audit records preserve citations, sources, and execution outcomes.
- **Kiosk** is a separate domain-scoped FAQ chatbot path with its own uploaded FAQ documents, parsed FAQ entries, chats, and messages; it should not be confused with the general Vault or Bosch cube query path.

The key ownership boundary is: Vault documents belong to a user, Enterprise documents belong to a company/domain/cube context, and Boards compose sources rather than owning a second copy of their contents.

Important Bosch semantics:

- Official views such as MS, SX, VM, PS, and XC are protected business filters, not suggestions for an LLM to reinterpret.
- Cost-category selection changes the meaning and available grain of the data; summary categories are appropriate for totals while detailed categories are needed for service-area or employee analysis.
- KPI formulas such as billing utilization, EBIT percentage, available capacity, price mix, pyramid mix, and internal/external mix must remain deterministic and domain-specific.
- Time handling includes month/year, fiscal periods, quarters, YTD/MTD, trends, comparisons, deltas, variance, rankings, and latest-period defaults.
- “Internal capacity”, “external mix”, and similar phrases must be protected from accidental entity/resource filters.

**Why:** Financial correctness, tenant isolation, and explainability depend on keeping numerical computation in PostgreSQL and deterministic builders while using AI mainly for interpretation and presentation.

**How to apply:** When changing query behavior, inspect access checks, semantic metadata/rules, the relevant cube data path, SQL parameterization, evidence/audit recording, and the streamed chat response together. Do not replace verified calculations with unconstrained LLM-generated numbers.