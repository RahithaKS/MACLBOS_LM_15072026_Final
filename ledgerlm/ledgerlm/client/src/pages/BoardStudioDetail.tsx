import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Play,
  FileText,
  MessageSquare,
  BarChart3,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Table as TableIcon
} from "lucide-react";

// Types
interface BoardStudioBoard {
  id: string;
  title: string;
  description: string;
  templateId: string;
  cubeId: string;
  config: Record<string, any>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Report {
  id: string;
  boardId: string;
  trigger: string;
  status: string;
  result: any;
  createdAt: string;
}

interface Message {
  id: string;
  threadId: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Thread {
  id: string;
  boardId: string;
  reportId: string;
  name: string;
  createdAt: string;
  messages?: Message[];
}

export default function BoardStudioDetail(props: { params?: { id: string } }) {
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/board-studio/:id");
  const id = props.params?.id || routeParams?.id;
  const queryClient = useQueryClient();

  // Queries
  const { data: board, isLoading: boardLoading, error: boardError } = useQuery<BoardStudioBoard>({
    queryKey: [`/api/board-studio/boards/${id}`],
    enabled: !!id,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: [`/api/board-studio/boards/${id}/reports`],
    enabled: !!id,
    refetchInterval: (query) => {
      const hasRunning = query.state.data?.some(r => r.status === 'pending' || r.status === 'running');
      return hasRunning ? 3000 : false;
    }
  });

  const { data: threads = [], isLoading: threadsLoading } = useQuery<Thread[]>({
    queryKey: [`/api/board-studio/boards/${id}/threads`],
    enabled: !!id,
  });

  // Run Analysis Mutation
  const runMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/board-studio/boards/${id}/run`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/board-studio/boards/${id}/reports`] });
      queryClient.invalidateQueries({ queryKey: [`/api/board-studio/boards/${id}/threads`] });
    },
  });

  if (!id) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-background">
        Invalid Board ID
      </div>
    );
  }

  if (boardLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 text-muted-foreground bg-background">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading Board Workspace...</p>
      </div>
    );
  }

  if (boardError || !board) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-background">
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl flex items-start gap-4 max-w-md w-full">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">Board Not Found</h3>
            <p className="text-sm mt-1 mb-4">We could not load this board. It may have been deleted.</p>
            <Button variant="outline" onClick={() => setLocation("/board-studio")}>
              Return to Board Studio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Sort reports by newest first
  const sortedReports = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latestReport = sortedReports[0];

  const renderStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'complete':
      case 'completed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"><CheckCircle2 className="w-3.5 h-3.5"/> Completed</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"><XCircle className="w-3.5 h-3.5"/> Failed</span>;
      case 'running':
      case 'pending':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"><Loader2 className="w-3.5 h-3.5 animate-spin"/> Running</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20"><Clock className="w-3.5 h-3.5"/> {status}</span>;
    }
  };

  const renderReportContent = (report: Report) => {
    if (!['complete', 'completed'].includes(report.status.toLowerCase())) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
          {report.status === 'failed' ? (
            <>
              <XCircle className="w-8 h-8 mb-3 text-destructive/50" />
              <p>Analysis failed to complete.</p>
            </>
          ) : (
            <>
              <Loader2 className="w-8 h-8 mb-3 animate-spin text-primary/50" />
              <p>Analysis is currently running...</p>
            </>
          )}
        </div>
      );
    }

    const result = report.result || {};
    
    // Defensive rendering of KPIs
    const kpis = Array.isArray(result.kpis) ? result.kpis : [];
    const tables = Array.isArray(result.tables) ? result.tables : [];
    const textSummary = typeof result === 'string'
      ? result
      : (typeof result.executiveSummary === 'string' ? result.executiveSummary : result.summary);

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Summary */}
        {textSummary && typeof textSummary === 'string' && (
          <div className="prose prose-sm dark:prose-invert max-w-none bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground m-0">
              <FileText className="w-5 h-5 text-primary" />
              Executive Summary
            </h3>
            <p className="text-muted-foreground leading-relaxed m-0">{textSummary}</p>
          </div>
        )}

        {/* KPIs */}
        {kpis.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi: any, idx: number) => (
              <Card key={idx} className="bg-card shadow-sm border-border">
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{kpi.label || 'Metric'}</p>
                  <p className="text-2xl font-bold font-mono text-foreground mt-2">
                    {kpi.format === 'currency' && typeof kpi.value === 'number'
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(kpi.value)
                      : (kpi.value ?? '--')}
                  </p>
                  {kpi.trend && (
                    <p className={`text-xs mt-2 font-medium ${
                      kpi.trend.startsWith('+') ? 'text-green-600 dark:text-green-400' : 
                      kpi.trend.startsWith('-') ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                    }`}>
                      {kpi.trend}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tables */}
        {tables.length > 0 && (
          <div className="space-y-6">
            {tables.map((table: any, tIdx: number) => (
              <div key={tIdx} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-semibold text-foreground">{table.title || 'Data Table'}</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
                      <tr>
                        {Array.isArray(table.columns) && table.columns.map((col: string, cIdx: number) => (
                          <th key={cIdx} className="px-5 py-3">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Array.isArray(table.rows) && table.rows.map((row: any[], rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
                          {Array.isArray(row) && row.map((cell: any, cellIdx: number) => (
                            <td key={cellIdx} className="px-5 py-3 whitespace-nowrap font-mono text-foreground">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fallback for unknown JSON shapes */}
        {kpis.length === 0 && tables.length === 0 && (!textSummary || typeof textSummary !== 'string') && (
          <div className="bg-card border border-border rounded-xl p-5 overflow-auto shadow-sm">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Raw Output</h4>
            <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/board-studio")} className="mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{board.title}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-primary/10 text-primary border border-primary/20">
                Studio Workspace
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{board.description}</p>
          </div>
        </div>
        
        <Button 
          onClick={() => runMutation.mutate()} 
          disabled={runMutation.isPending || (latestReport && (latestReport.status === 'running' || latestReport.status === 'pending'))}
          className="gap-2 shadow-sm"
        >
          {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Analysis
        </Button>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Column: Analysis Canvas */}
        <div className="flex-1 overflow-auto p-6 lg:p-8 bg-muted/5">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <BarChart3 className="w-5 h-5 text-primary" />
                Latest Analysis
              </h2>
              {latestReport && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground font-mono">
                    Ran {new Date(latestReport.createdAt).toLocaleString()}
                  </span>
                  {renderStatusBadge(latestReport.status)}
                </div>
              )}
            </div>

            {!latestReport && !reportsLoading && (
              <div className="border border-dashed border-border rounded-xl p-16 text-center bg-card">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-6 h-6 text-primary ml-1" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No Analysis Run Yet</h3>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto mb-6">
                  Trigger your first run to process the data cube against this board's template rules.
                </p>
                <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
                  {runMutation.isPending ? "Starting Run..." : "Run Analysis Now"}
                </Button>
              </div>
            )}

            {reportsLoading && !latestReport && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading reports...</p>
              </div>
            )}

            {latestReport && renderReportContent(latestReport)}
          </div>
        </div>

        {/* Right Column: Context & History Sidepanel */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col shrink-0">
          
          {/* Linked Threads */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
            <div className="px-5 py-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Discussion Threads
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {threadsLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Loading threads...</div>
              ) : threads.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg bg-background/50">
                  No discussions linked to this board yet.
                </div>
              ) : (
                threads.map(thread => (
                  <div key={thread.id} className="p-3 border border-border rounded-lg hover:bg-muted/20 transition-colors bg-background">
                    <p className="font-medium text-sm text-foreground mb-1 truncate" title={thread.name}>{thread.name}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(thread.createdAt).toLocaleDateString()}
                      </span>
                      {thread.messages && thread.messages.length > 0 && (
                        <span className="text-[10px] uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium border border-primary/20">
                          {thread.messages.length} msgs
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Run History */}
          <div className="h-1/3 border-t border-border flex flex-col min-h-[250px]">
            <div className="px-5 py-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Run History
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-3">
               {sortedReports.map(report => (
                <div key={report.id} className="p-3 border border-border rounded-lg bg-background flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-mono">
                      {new Date(report.createdAt).toLocaleString()}
                    </p>
                    <div className="text-xs text-foreground flex items-center gap-1.5">
                      Trigger: <span className="font-mono text-muted-foreground">{report.trigger || 'manual'}</span>
                    </div>
                  </div>
                  {renderStatusBadge(report.status)}
                </div>
              ))}
               {sortedReports.length === 0 && !reportsLoading && (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg bg-background/50">
                  No previous runs.
                </div>
              )}
            </div>
          </div>
          
        </aside>
      </main>
    </div>
  );
}
