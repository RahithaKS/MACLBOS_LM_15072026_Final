/**
 * BoardAnalysisEditor — pre-run editor shown before generating a Smart Board report.
 *
 * Lets the user:
 *  - Pick the analysis period (year + individual months OR a quarter)
 *  - Edit the user prompt template (with {{placeholder}} hints visible)
 *  - Add extra context that gets appended to the prompt
 *  - Preview which version values each placeholder resolves to
 *  - Click "Generate Report" → POST /api/boards/:id/run-analysis
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Info } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { type Board, type CubeBoardReport } from '@shared/schema';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const QUARTERS = [
  { label: 'Q1 (Jan–Mar)', months: [1,2,3] },
  { label: 'Q2 (Apr–Jun)', months: [4,5,6] },
  { label: 'Q3 (Jul–Sep)', months: [7,8,9] },
  { label: 'Q4 (Oct–Dec)', months: [10,11,12] },
];

const DEFAULT_SYSTEM_PROMPT = `You are LedgerLM, an AI FP&A analyst specialised in Budget vs Actual variance analysis.
Never fabricate numbers — only use the data provided in the tables below.
Keep explanations concise, business-friendly, and CFO-ready.`;

const DEFAULT_USER_PROMPT = `Perform a Budget vs Actual variance analysis for the period: {{period}}.

**Summary totals:**
- Total Actual: {{total_actual}} USD
- Total Budget: {{total_budget}} USD
- Total Variance: {{total_variance}} ({{total_variance_pct}})

**Variance by dimension ({{dimensions}}):**
{{variance_table}}

**Top unfavorable variance drivers:**
{{top_unfavorable}}

**Top favorable variance drivers:**
{{top_favorable}}

Please provide:
1. **Executive summary** — what changed and by how much.
2. **Variance bridge** — Revenue → COGS → Gross Margin → Opex → EBITDA if data allows.
3. **Root-cause analysis** — why did the variance happen?
4. **Top 5 unfavorable drivers** with explanation.
5. **5 actionable recommendations** to close the gap.

Format with ### headings for each section.`;

interface BoardAnalysisEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board;
  onReportGenerated: (report: CubeBoardReport) => void;
}

export function BoardAnalysisEditor({
  open,
  onOpenChange,
  board,
  onReportGenerated,
}: BoardAnalysisEditorProps) {
  const { toast } = useToast();
  const settings = (board.settings as any) ?? {};
  const mapping = settings.columnMapping ?? {};

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
  const [periodMode, setPeriodMode] = useState<'months' | 'quarter'>('months');
  const [userPrompt, setUserPrompt] = useState(
    settings.userPromptTemplate || DEFAULT_USER_PROMPT,
  );
  const [extraContext, setExtraContext] = useState('');

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b),
    );
  };

  const selectQuarter = (months: number[]) => {
    setSelectedMonths(months);
    setPeriodMode('quarter');
  };

  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      if (!settings.cubeId) {
        throw new Error('No data cube configured for this board. Edit the board and select a cube first.');
      }
      if (selectedMonths.length === 0) {
        throw new Error('Please select at least one month.');
      }
      return apiRequest('POST', `/api/boards/${board.id}/run-analysis`, {
        year,
        months: selectedMonths,
        userPromptTemplate: userPrompt,
        extraContext: extraContext || undefined,
      }) as Promise<CubeBoardReport>;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', board.id, 'reports'] });
      toast({ title: 'Report generated', description: report.periodLabel + ' variance analysis is ready.' });
      onOpenChange(false);
      onReportGenerated(report);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Failed to generate report', variant: 'destructive' });
    },
  });

  const hasCube = !!settings.cubeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Run Variance Analysis
          </DialogTitle>
          <DialogDescription>
            Configure the period, review the prompt, add context — then generate your report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cube / mapping preview */}
          {hasCube ? (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Column Mapping</p>
              <div className="flex flex-wrap gap-2">
                {mapping.actuals && (
                  <Badge variant="secondary" className="text-xs">actuals → {mapping.actuals}</Badge>
                )}
                {mapping.budget && (
                  <Badge variant="secondary" className="text-xs">budget → {mapping.budget}</Badge>
                )}
                {mapping.forecast && (
                  <Badge variant="outline" className="text-xs">forecast → {mapping.forecast}</Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                No data cube configured. <strong>Edit the board</strong> and select a cube + column mapping first.
              </p>
            </div>
          )}

          {/* Period picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Analysis Period</Label>

            {/* Year selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-10">Year</span>
              <div className="flex gap-1">
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
                      year === y ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Quarter shortcuts */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground w-10">Quick</span>
              {QUARTERS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => selectQuarter(q.months)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    JSON.stringify(selectedMonths) === JSON.stringify(q.months)
                      ? 'bg-primary/10 border-primary text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-6 gap-1">
              {MONTH_NAMES.map((name, i) => {
                const m = i + 1;
                const selected = selectedMonths.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => { setPeriodMode('months'); toggleMonth(m); }}
                    className={`py-1.5 rounded text-xs font-medium border transition-colors ${
                      selected ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {selectedMonths.length === 0 ? 'none' : selectedMonths.map((m) => MONTH_NAMES[m - 1]).join(', ')} {year}
            </p>
          </div>

          {/* User prompt template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Analysis Prompt</Label>
              <button
                onClick={() => setUserPrompt(DEFAULT_USER_PROMPT)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset to default
              </button>
            </div>
            <Textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              placeholder="Use {{period}}, {{variance_table}}, {{total_variance}}, {{dimensions}} as placeholders..."
            />
            <div className="flex flex-wrap gap-1">
              {['{{period}}','{{variance_table}}','{{total_variance}}','{{total_variance_pct}}',
                '{{top_unfavorable}}','{{top_favorable}}','{{dimensions}}','{{actuals_column}}','{{budget_column}}'].map((ph) => (
                <code
                  key={ph}
                  className="text-xs bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10"
                  onClick={() => setUserPrompt((p: string) => p + ph)}
                >
                  {ph}
                </code>
              ))}
            </div>
          </div>

          {/* Extra context */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Extra Context <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              rows={3}
              placeholder="e.g. Focus on BGSW entity only. Ignore VKM resources. Compare with same period last year."
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={runAnalysisMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => runAnalysisMutation.mutate()}
            disabled={runAnalysisMutation.isPending || !hasCube || selectedMonths.length === 0}
            className="gap-2"
          >
            {runAnalysisMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
