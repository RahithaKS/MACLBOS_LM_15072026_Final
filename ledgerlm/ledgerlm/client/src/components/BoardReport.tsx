/**
 * BoardReport — renders a generated Smart Board analysis report.
 *
 * Shows the LLM's full markdown response with section highlighting,
 * period/mapping metadata header, and a delete button.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { type CubeBoardReport } from '@shared/schema';

interface BoardReportProps {
  report: CubeBoardReport;
  boardId: string;
}

export function BoardReport({ report, boardId }: BoardReportProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

  const mapping = report.columnMapping as any ?? {};

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/boards/${boardId}/reports/${report.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'reports'] });
      toast({ title: 'Report deleted' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete report', variant: 'destructive' }),
  });

  return (
    <Card className="overflow-hidden border-border">
      {/* Header */}
      <div className="px-5 py-4 bg-primary/5 border-b flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{report.title}</h3>
            <Badge variant="secondary" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              {report.periodLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {mapping.actuals && (
              <Badge variant="outline" className="text-xs">
                <Database className="w-3 h-3 mr-1" />
                actuals: {mapping.actuals}
              </Badge>
            )}
            {mapping.budget && (
              <Badge variant="outline" className="text-xs">budget: {mapping.budget}</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(report.createdAt).toLocaleDateString()} {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-5 py-4 space-y-4">
          {report.rawAnalysis ? (
            <div className="prose prose-sm max-w-none
              prose-headings:font-semibold prose-headings:text-foreground
              prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
              prose-p:text-sm prose-p:leading-relaxed
              prose-li:text-sm prose-strong:text-foreground
              prose-table:text-sm prose-th:bg-muted prose-th:px-3 prose-th:py-2
              prose-td:px-3 prose-td:py-1.5 prose-tr:border-b">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.rawAnalysis}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No analysis content.</p>
          )}

          {/* Collapsible resolved prompt */}
          {report.userPromptFinal && (
            <div className="border-t pt-3">
              <button
                onClick={() => setShowPrompt((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showPrompt ? 'Hide' : 'Show'} resolved prompt
              </button>
              {showPrompt && (
                <pre className="mt-2 p-3 bg-muted rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-60">
                  {report.userPromptFinal}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
