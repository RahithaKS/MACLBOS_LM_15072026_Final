# LedgerLM — Boards

The **Boards** feature for LedgerLM: pick a pre-defined analysis template, point it at financial
data, and get an AI-generated dashboard (KPIs, charts, insights, red flags, tables).

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Analysis calls the LedgerLM model server configured in `.env.local`:

```
OLLAMA_BASE_URL=https://ollama.ledgerlm.ai
OLLAMA_API_KEY=...
```

## How it works

| Piece | Where | Notes |
| --- | --- | --- |
| Board templates | [lib/templates.ts](lib/templates.ts) | The 8 pre-defined analyses; each has an `analysisPrompt` |
| Sample data | [lib/sample-data.ts](lib/sample-data.ts) | 18 months of P&L / cashflow / balance sheet for a fictional company |
| Board persistence | [lib/store.ts](lib/store.ts) | localStorage (prototype); swap for an API-backed store later |
| Analysis engine | [app/api/analyze/route.ts](app/api/analyze/route.ts) | Builds the prompt, calls `POST {OLLAMA_BASE_URL}/generate`, validates the JSON reply with zod, retries once with validation feedback |
| Boards gallery | [app/boards/page.tsx](app/boards/page.tsx) | Template grid matching the product design |
| Board detail | [app/boards/[id]/page.tsx](app/boards/[id]/page.tsx) | Data source selection (samples + CSV upload via Papaparse), run analysis, render results |
| Result rendering | [components/board/ResultSections.tsx](components/board/ResultSections.tsx), [components/board/ResultCharts.tsx](components/board/ResultCharts.tsx) | KPI tiles, Recharts charts (CVD-validated palette), insights, risks, tables |

## Flow

1. **Boards page** — pick a template ("Use Template") or "Create New Board".
2. **Board detail** — select one or more data sources (bundled samples or upload a CSV), hit
   **Run analysis**.
3. The API route sends the template's pre-defined analysis prompt plus the selected data to the
   model server and validates the structured JSON reply (one automatic repair round-trip if the
   model returns malformed output).
4. The result is saved on the board and rendered as a dashboard; boards can be re-run anytime.
