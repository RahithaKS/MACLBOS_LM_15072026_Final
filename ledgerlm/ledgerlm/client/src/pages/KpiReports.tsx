import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Calendar,
  Database,
  Building,
  Target,
  Play,
  Save,
  History,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  Clock,
  ChevronRight,
  Calculator
} from "lucide-react";

type Cube = { id: string; name: string; description: string | null };
type CubeOptions = {
  years: number[];
  entities: string[];
  forecastScenarios: string[];
  defaultForecastScenario: string;
  actualAvailable: boolean;
};
type Metric = {
  id: string;
  label: string;
  unit: string;
  actual: number | null;
  forecast: number | null;
  variance: number | null;
  variancePercent: number | null;
  actualSourceRows: number;
  forecastSourceRows: number;
  remarks: string[];
};
type ReportData = {
  periodLabel: string;
  entityLabel: string;
  forecastScenario: string;
  actualSourceLabel: string;
  forecastSourceLabel: string;
  metrics: Metric[];
  warnings: string[];
};
type SavedReport = {
  id: string;
  title: string;
  request: any;
  report: ReportData;
  createdAt: string;
};

const formatNumber = (num: number | null) => {
  if (num === null) return "-";
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const formatPercent = (num: number | null) => {
  if (num === null) return "-";
  return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num);
};

const formatMetricValue = (metric: Metric, value: number | null) =>
  metric.unit === "percent" ? formatPercent(value) : formatNumber(value);

export default function KpiReports() {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"builder" | "saved">("builder");
  
  const [selectedCubeId, setSelectedCubeId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [selectedScenario, setSelectedScenario] = useState<string>("");

  const [activeReport, setActiveReport] = useState<{
    request: any;
    data: ReportData;
  } | null>(null);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");

  const { data: cubesData, isLoading: cubesLoading } = useQuery<{ cubes: Cube[] }>({
    queryKey: ["/api/kpi-reports/cubes"],
  });

  const { data: optionsData, isLoading: optionsLoading } = useQuery<CubeOptions>({
    queryKey: ["/api/kpi-reports/cubes", selectedCubeId, "options"],
    enabled: !!selectedCubeId,
  });

  const { data: savedReportsData, isLoading: savedLoading } = useQuery<{ reports: SavedReport[] }>({
    queryKey: ["/api/kpi-reports/saved"],
  });

  const runReportMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest<{ report: ReportData }>("POST", "/api/kpi-reports/run", payload);
    },
    onSuccess: (res, variables) => {
      setActiveReport({ request: variables, data: res.report });
      setActiveTab("builder");
    },
    onError: (err) => {
      toast({ title: "Failed to run report", description: String(err), variant: "destructive" });
    }
  });

  const saveReportMutation = useMutation({
    mutationFn: async (payload: { title: string; request: any; report: any }) => {
      return apiRequest<{ report: SavedReport }>("POST", "/api/kpi-reports/saved", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-reports/saved"] });
      toast({ title: "Report saved successfully" });
      setIsSaveModalOpen(false);
      setSaveTitle("");
      setActiveTab("saved");
    },
    onError: (err) => {
      toast({ title: "Failed to save report", description: String(err), variant: "destructive" });
    }
  });

  useEffect(() => {
    if (optionsData) {
      if (optionsData.years.length > 0 && !optionsData.years.includes(selectedYear)) {
        setSelectedYear(optionsData.years[0]);
      }
      if (optionsData.entities.length > 0 && selectedEntity !== "" && !optionsData.entities.includes(selectedEntity)) {
        setSelectedEntity("");
      }
      if (optionsData.forecastScenarios.length > 0 && !optionsData.forecastScenarios.includes(selectedScenario)) {
        setSelectedScenario(optionsData.defaultForecastScenario || optionsData.forecastScenarios[0]);
      }
    }
  }, [optionsData, selectedYear, selectedEntity, selectedScenario]);

  const loadSavedReport = (report: SavedReport) => {
    setActiveReport({ request: report.request, data: report.report });
    
    const req = report.request;
    if (req.cubeId) setSelectedCubeId(req.cubeId);
    if (req.year) setSelectedYear(req.year);
    if (req.month) setSelectedMonth(req.month);
    if (req.entity !== undefined) setSelectedEntity(req.entity);
    if (req.forecastScenario) setSelectedScenario(req.forecastScenario);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <div className="px-6 lg:px-8 py-4 flex items-center justify-between gap-3 border-b bg-card flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            KPI Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Governed financial analysis and variance cockpit
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Controls */}
        <div className="w-80 flex-shrink-0 border-r bg-card/40 flex flex-col overflow-hidden">
          <div className="flex bg-muted/30 border-b shrink-0">
            <button
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'builder' ? 'bg-card border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => setActiveTab("builder")}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" /> Builder
              </div>
            </button>
            <button
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'saved' ? 'bg-card border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => setActiveTab("saved")}
            >
              <div className="flex items-center justify-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Saved
              </div>
            </button>
          </div>

          {activeTab === 'builder' ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-6 overflow-y-auto flex-1">
                {/* Data Source */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <Database className="w-3.5 h-3.5" />
                    Data Source
                  </h3>
                  {cubesLoading ? (
                    <div className="h-9 bg-muted animate-pulse rounded-md" />
                  ) : cubesData?.cubes.length === 0 ? (
                    <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                      No reporting cubes available. Check your access permissions.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Reporting Cube</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={selectedCubeId}
                        onChange={(e) => setSelectedCubeId(e.target.value)}
                      >
                        <option value="" disabled>Select a cube...</option>
                        {cubesData?.cubes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Parameters */}
                {selectedCubeId && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5" />
                      Parameters
                    </h3>

                    {optionsLoading ? (
                      <div className="space-y-4">
                        <div className="h-9 bg-muted animate-pulse rounded-md" />
                        <div className="h-9 bg-muted animate-pulse rounded-md" />
                        <div className="h-9 bg-muted animate-pulse rounded-md" />
                      </div>
                    ) : optionsData ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium flex items-center gap-1"><Calendar className="w-3 h-3"/> Year</label>
                            {optionsData.years.length > 0 ? (
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                              >
                                {optionsData.years.map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            ) : (
                              <select disabled className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm opacity-50"><option>N/A</option></select>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3"/> Month</label>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm"
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            >
                              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium flex items-center gap-1"><Building className="w-3 h-3"/> Entity</label>
                          {optionsData.entities.length > 0 ? (
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm"
                              value={selectedEntity}
                              onChange={(e) => setSelectedEntity(e.target.value)}
                            >
                              <option value="">All Entities (Consolidated)</option>
                              {optionsData.entities.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                          ) : (
                            <select disabled className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm opacity-50"><option>No entities</option></select>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium flex items-center gap-1"><Target className="w-3 h-3"/> Scenario</label>
                          {optionsData.forecastScenarios.length > 0 ? (
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm"
                              value={selectedScenario}
                              onChange={(e) => setSelectedScenario(e.target.value)}
                            >
                              {optionsData.forecastScenarios.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <select disabled className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm opacity-50"><option>No scenarios</option></select>
                          )}
                        </div>

                        {!optionsData.actualAvailable && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-500 flex items-start gap-1.5 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900 mt-2 leading-relaxed">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Actuals are not fully populated for this cube. Variances may be incomplete.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">Failed to load options</div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Bottom */}
              <div className="p-4 border-t bg-card/80 shrink-0">
                <Button
                  className="w-full font-medium"
                  disabled={!selectedCubeId || !selectedScenario || runReportMutation.isPending}
                  onClick={() => {
                    runReportMutation.mutate({
                      cubeId: selectedCubeId,
                      year: selectedYear,
                      month: selectedMonth,
                      entity: selectedEntity || undefined,
                      forecastScenario: selectedScenario
                    })
                  }}
                >
                  {runReportMutation.isPending ? "Generating..." : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {savedLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
              ) : savedReportsData?.reports.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">No saved snapshots</div>
              ) : (
                <div className="space-y-2">
                  {savedReportsData?.reports.map(report => (
                    <button
                      key={report.id}
                      className="w-full text-left p-3 rounded-md border bg-card hover:border-primary/50 transition-colors group shadow-sm"
                      onClick={() => loadSavedReport(report)}
                    >
                      <div className="font-medium text-sm text-foreground truncate">{report.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Area - Report View */}
        <div className="flex-1 overflow-auto bg-background p-6 lg:p-8">
          {activeReport ? (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Report Header */}
              <div className="bg-card border rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Building className="w-5 h-5 text-muted-foreground" />
                      {activeReport.data.entityLabel}
                    </h2>
                    <div className="text-sm font-medium text-primary mt-1">
                      {activeReport.data.periodLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsSaveModalOpen(true)} className="h-8">
                      <Save className="w-4 h-4 mr-2" />
                      Save Snapshot
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Scenario</span>
                    <span className="text-sm font-medium">{activeReport.data.forecastScenario}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Actuals Source</span>
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-muted-foreground" />
                      {activeReport.data.actualSourceLabel}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Forecast Source</span>
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-muted-foreground" />
                      {activeReport.data.forecastSourceLabel}
                    </span>
                  </div>
                </div>
              </div>

              {activeReport.data.warnings?.length > 0 && (
                <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-md border border-destructive/20 flex flex-col gap-1.5 shadow-sm">
                  {activeReport.data.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 leading-relaxed">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Metrics Table */}
              <Card className="overflow-hidden border-border shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-semibold border-b w-1/4">Metric</th>
                        <th className="px-4 py-3 font-semibold border-b text-right">Actual</th>
                        <th className="px-4 py-3 font-semibold border-b text-right">Forecast</th>
                        <th className="px-4 py-3 font-semibold border-b text-right">Variance</th>
                        <th className="px-4 py-3 font-semibold border-b text-right">Var %</th>
                        <th className="px-4 py-3 font-semibold border-b w-1/4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {activeReport.data.metrics.map(metric => {
                        const varIsPositive = metric.variance !== null && metric.variance >= 0;
                        const varColor = metric.variance === null 
                          ? 'text-muted-foreground' 
                          : varIsPositive 
                            ? 'text-emerald-600 dark:text-emerald-500' 
                            : 'text-destructive';
                        
                        return (
                          <tr key={metric.id} className="hover:bg-muted/20 transition-colors group">
                            <td className="px-4 py-3 align-top">
                              <div className="font-medium text-foreground">{metric.label}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">Unit: {metric.unit}</div>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <div className="font-mono text-foreground font-medium">{formatMetricValue(metric, metric.actual)}</div>
                              {metric.actual !== null && (
                                <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 mt-1 font-mono">
                                  <Layers className="w-2.5 h-2.5 opacity-70" /> {metric.actualSourceRows}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <div className="font-mono text-foreground font-medium">{formatMetricValue(metric, metric.forecast)}</div>
                              {metric.forecast !== null && (
                                <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 mt-1 font-mono">
                                  <Layers className="w-2.5 h-2.5 opacity-70" /> {metric.forecastSourceRows}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right align-top font-mono">
                              <div className={`font-medium ${varColor}`}>
                                {metric.variance !== null && metric.variance > 0 ? '+' : ''}{formatMetricValue(metric, metric.variance)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right align-top font-mono">
                              <div className={`font-medium ${varColor}`}>
                                {metric.variancePercent !== null && metric.variancePercent > 0 ? '+' : ''}{formatPercent(metric.variancePercent)}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-muted-foreground whitespace-normal min-w-[200px]">
                              {metric.remarks && metric.remarks.length > 0 ? (
                                <ul className="list-disc pl-3 space-y-1">
                                  {metric.remarks.map((rm, i) => <li key={i}>{rm}</li>)}
                                </ul>
                              ) : (
                                <span className="opacity-50">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : runReportMutation.isPending ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm font-medium">Compiling evidence-led report...</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center max-w-md">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Report Active</h3>
                <p className="text-sm leading-relaxed">
                  Select a reporting cube and set your parameters in the left panel to generate a governed variance report.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border/50 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b bg-muted/10">
              <h3 className="text-lg font-semibold text-foreground">Save Report Snapshot</h3>
              <p className="text-xs text-muted-foreground mt-1">Saves the parameters and the exact data output for future reference.</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium mb-2 text-foreground">Report Title</label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. Q3 EMEA Final Variances"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="px-6 py-4 bg-muted/30 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
              <Button
                disabled={!saveTitle || saveReportMutation.isPending}
                onClick={() => {
                  if (!activeReport) return;
                  saveReportMutation.mutate({
                    title: saveTitle,
                    request: activeReport.request,
                    report: activeReport.data
                  });
                }}
              >
                {saveReportMutation.isPending ? "Saving..." : "Save Snapshot"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
