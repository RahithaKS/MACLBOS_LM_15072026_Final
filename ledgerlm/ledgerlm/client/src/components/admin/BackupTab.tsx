import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  HardDrive, RefreshCw, PlayCircle, CheckCircle2, XCircle, Database, Cpu, Clock,
  Cloud, CloudOff, Settings2, Loader2, AlertTriangle, ChevronDown, ChevronRight,
  CalendarClock, RotateCcw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// ── Types ────────────────────────────────────────────────────────────────────

interface BackupRecord {
  id: string; filename: string; sizeBytes: number; status: 'success' | 'failed';
  triggeredBy: string; blobUrl: string | null; errorMessage: string | null; createdAt: string;
}

interface SystemStatus {
  database: { sizeBytes: number; tableCount: number; status: string; provider: string };
  auditLog: { totalEvents: number };
  lastBackup: { status: string; filename: string; sizeBytes: number; createdAt: string } | null;
  python: { status: string };
  uptime: number;
}

interface SchedulerSettings {
  backupUtcHour: number;
  blobConnectionStringSet: boolean;
  blobConnectionStringMasked: string | null;
  blobContainer: string;
  updatedAt: string;
}

interface SchedulerLog {
  id: string;
  jobType: 'backup' | 'retention';
  triggeredBy: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  details: Record<string, any> | null;
  errorMessage: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function nextRunLabel(utcHour: number) {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(utcHour, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const diffMs = next.getTime() - now.getTime();
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return `in ${h}h ${m}m (${String(utcHour).padStart(2, '0')}:00 UTC)`;
}

function StatusDot({ status }: { status: string }) {
  const ok = ['healthy', 'connected', 'ok', 'success'].includes(status);
  return <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ok ? 'bg-green-500' : 'bg-red-500'}`} />;
}

function JobStatusBadge({ status }: { status: SchedulerLog['status'] }) {
  if (status === 'success') return <Badge variant="default" className="text-xs gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Success</Badge>;
  if (status === 'failed')  return <Badge variant="destructive" className="text-xs gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
  return <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-300"><Loader2 className="h-3 w-3 animate-spin" /> Running</Badge>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BackupTab() {
  const { toast } = useToast();

  // Blob config form state
  const [blobConnStr, setBlobConnStr] = useState('');
  const [blobContainer, setBlobContainer] = useState('ledgerlm-backups');
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testingBlob, setTestingBlob] = useState(false);
  const [blobExpanded, setBlobExpanded] = useState(false);

  // Scheduler form state
  const [schedulerHour, setSchedulerHour] = useState<string>('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } =
    useQuery<SystemStatus>({ queryKey: ['/api/super-admin/system-status'], refetchInterval: 30_000 });

  const { data: backups = [], isLoading: backupsLoading, refetch: refetchBackups } =
    useQuery<BackupRecord[]>({ queryKey: ['/api/super-admin/backups'], refetchInterval: 30_000 });

  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } =
    useQuery<SchedulerSettings>({
      queryKey: ['/api/super-admin/scheduler-settings'],
      onSuccess: (d) => {
        if (!schedulerHour) setSchedulerHour(String(d.backupUtcHour));
        if (!blobContainer) setBlobContainer(d.blobContainer);
      },
    });

  const { data: schedulerLogs = [], isLoading: logsLoading, refetch: refetchLogs } =
    useQuery<SchedulerLog[]>({ queryKey: ['/api/super-admin/scheduler-logs'], refetchInterval: 15_000 });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const triggerBackupMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/super-admin/backups/trigger', {}),
    onSuccess: () => {
      toast({ title: 'Backup started', description: 'Database backup queued. It will appear in the lists below when complete.' });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/super-admin/backups'] });
        queryClient.invalidateQueries({ queryKey: ['/api/super-admin/system-status'] });
        queryClient.invalidateQueries({ queryKey: ['/api/super-admin/scheduler-logs'] });
      }, 5000);
    },
    onError: (e: any) => toast({ title: 'Backup failed to start', description: e.message, variant: 'destructive' }),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (patch: { backupUtcHour?: number; blobConnectionString?: string; blobContainer?: string }) =>
      apiRequest('PATCH', '/api/super-admin/scheduler-settings', patch),
    onSuccess: () => {
      toast({ title: 'Settings saved', description: 'Scheduler and storage settings updated.' });
      refetchSettings();
      setBlobConnStr('');
      setTestResult(null);
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTestBlob = async () => {
    setTestingBlob(true);
    setTestResult(null);
    try {
      const res = await apiRequest('POST', '/api/super-admin/scheduler-settings/test-blob', {
        connectionString: blobConnStr || undefined,
        container: blobContainer,
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTestingBlob(false);
    }
  };

  const handleSaveBlob = () => {
    const patch: any = { blobContainer };
    if (blobConnStr) patch.blobConnectionString = blobConnStr;
    saveSettingsMutation.mutate(patch);
  };

  const handleSaveScheduler = () => {
    saveSettingsMutation.mutate({ backupUtcHour: Number(schedulerHour) });
  };

  const handleRefreshAll = () => {
    refetchStatus(); refetchBackups(); refetchSettings(); refetchLogs();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── System Status ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">System Status</h3>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleRefreshAll}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Database
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {statusLoading ? <div className="h-6 bg-muted rounded animate-pulse" /> : (
                <>
                  <div className="flex items-center text-sm font-semibold">
                    <StatusDot status={status?.database.status ?? ''} />{status?.database.status ?? '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{status?.database.provider}</p>
                  <p className="text-xs text-muted-foreground">{fmtBytes(status?.database.sizeBytes ?? 0)} · {status?.database.tableCount} tables</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" /> AI Processing Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {statusLoading ? <div className="h-6 bg-muted rounded animate-pulse" /> : (
                <>
                  <div className="flex items-center text-sm font-semibold">
                    <StatusDot status={status?.python.status ?? ''} />{status?.python.status ?? '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Document & query processor</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> App Uptime
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {statusLoading ? <div className="h-6 bg-muted rounded animate-pulse" /> : (
                <>
                  <p className="text-sm font-semibold">{fmtUptime(status?.uptime ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{(status?.auditLog.totalEvents ?? 0).toLocaleString()} audit events logged</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" /> Last Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {statusLoading ? <div className="h-6 bg-muted rounded animate-pulse" /> : status?.lastBackup ? (
                <>
                  <div className="flex items-center text-sm font-semibold">
                    <StatusDot status={status.lastBackup.status} />{status.lastBackup.status}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(status.lastBackup.createdAt)}</p>
                  <p className="text-xs text-muted-foreground">{fmtBytes(status.lastBackup.sizeBytes)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No backups yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Azure Blob Storage Configuration ──────────────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setBlobExpanded(!blobExpanded)}
          >
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm font-semibold">Azure Blob Storage — Backup Destination</CardTitle>
              {settings?.blobConnectionStringSet ? (
                <Badge variant="outline" className="text-xs gap-1 text-green-700 border-green-300 bg-green-50">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 text-orange-600 border-orange-300 bg-orange-50">
                  <CloudOff className="h-3 w-3" /> Not configured — backups stay local only
                </Badge>
              )}
            </div>
            {blobExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          {!blobExpanded && settings?.blobConnectionStringMasked && (
            <p className="text-xs text-muted-foreground mt-1 ml-6 font-mono">{settings.blobConnectionStringMasked}</p>
          )}
        </CardHeader>

        {blobExpanded && (
          <CardContent className="px-4 pb-4 space-y-4">
            <CardDescription className="text-xs">
              Backups are uploaded to Azure Blob Storage after the <code>pg_dump</code> completes.
              Paste your storage account's connection string below. The key is stored encrypted in the database and never exposed in full after saving.
            </CardDescription>

            {settings?.blobConnectionStringSet && (
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Connection string already saved. Enter a new one below to replace it, or leave blank to keep the existing one.</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium mb-1 block">Connection String</Label>
                <Input
                  type="password"
                  placeholder="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
                  value={blobConnStr}
                  onChange={(e) => { setBlobConnStr(e.target.value); setTestResult(null); }}
                  className="text-xs font-mono h-8"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Azure Portal → Storage Account → Security + networking → Access keys → Connection string
                </p>
              </div>

              <div>
                <Label className="text-xs font-medium mb-1 block">Container Name</Label>
                <Input
                  placeholder="ledgerlm-backups"
                  value={blobContainer}
                  onChange={(e) => setBlobContainer(e.target.value)}
                  className="text-xs h-8 w-48"
                />
                <p className="text-xs text-muted-foreground mt-1">Container will be created automatically if it doesn't exist.</p>
              </div>

              {testResult && (
                <div className={`rounded-md border px-3 py-2 text-xs flex items-center gap-2 ${testResult.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                  {testResult.ok ? 'Connection successful — container is writable.' : `Connection failed: ${testResult.error}`}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleTestBlob}
                  disabled={testingBlob}
                >
                  {testingBlob ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
                  {testingBlob ? 'Testing…' : 'Test Connection'}
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleSaveBlob}
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Save Storage Settings
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Scheduler Settings ────────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-sm font-semibold">Scheduler Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {settingsLoading ? (
            <div className="h-8 bg-muted rounded animate-pulse w-64" />
          ) : (
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-xs font-medium mb-1 block">Daily Run Time (UTC)</Label>
                <Select
                  value={schedulerHour || String(settings?.backupUtcHour ?? 2)}
                  onValueChange={setSchedulerHour}
                >
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)} className="text-xs">
                        {String(i).padStart(2, '0')}:00 UTC
                        {i === 2 ? ' (default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Next scheduled run</span>
                <span className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-violet-500" />
                  {nextRunLabel(Number(schedulerHour || settings?.backupUtcHour || 2))}
                </span>
              </div>

              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleSaveScheduler}
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings2 className="h-3.5 w-3.5" />}
                Save Schedule
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Both the database backup and retention engine run once daily at the configured time. The new time takes effect on the next server restart or the following day's cycle.
          </p>
        </CardContent>
      </Card>

      {/* ── Manual Backup Trigger ─────────────────────────────────────────── */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="pt-4 pb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Manual Database Backup</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Creates a full SQL dump of the database
              {settings?.blobConnectionStringSet ? ' and uploads it to Azure Blob Storage.' : ' (stored locally — configure Azure Blob above to enable cloud upload).'}
            </p>
          </div>
          <Button
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => triggerBackupMutation.mutate()}
            disabled={triggerBackupMutation.isPending}
          >
            <PlayCircle className="h-4 w-4" />
            {triggerBackupMutation.isPending ? 'Starting…' : 'Take Backup Now'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Scheduler Run Log ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Scheduler Run Log</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All automated and manual backup + retention runs — in-progress, completed, and failed.</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => refetchLogs()}>
            <RotateCcw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Started</TableHead>
                <TableHead className="text-xs">Job</TableHead>
                <TableHead className="text-xs">Triggered By</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Loading run log…</TableCell></TableRow>
              ) : !schedulerLogs.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No scheduler runs recorded yet. Runs will appear here after the first backup or retention job.</TableCell></TableRow>
              ) : schedulerLogs.map((log) => (
                <TableRow key={log.id} className="text-xs">
                  <TableCell className="font-mono whitespace-nowrap">{fmtDate(log.startedAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${log.jobType === 'backup' ? 'text-blue-700 border-blue-200 bg-blue-50' : 'text-orange-700 border-orange-200 bg-orange-50'}`}
                    >
                      {log.jobType === 'backup' ? <HardDrive className="h-3 w-3 mr-1" /> : <Database className="h-3 w-3 mr-1" />}
                      {log.jobType === 'backup' ? 'Backup' : 'Retention'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.triggeredBy}</TableCell>
                  <TableCell><JobStatusBadge status={log.status} /></TableCell>
                  <TableCell className="font-mono">{fmtDuration(log.durationMs)}</TableCell>
                  <TableCell className="max-w-xs">
                    {log.status === 'failed' && log.errorMessage ? (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate" title={log.errorMessage}>{log.errorMessage.slice(0, 80)}</span>
                      </span>
                    ) : log.details ? (
                      <span className="text-muted-foreground">
                        {log.jobType === 'backup'
                          ? `${fmtBytes(log.details.sizeBytes ?? 0)}${log.details.uploadedToAzure ? ' · Azure ✓' : ' · local only'}`
                          : `${log.details.totalRowsDeleted ?? 0} rows deleted across ${log.details.policiesRun ?? 0} policies`}
                      </span>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Backup History ────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Backup File History</h3>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Timestamp</TableHead>
                <TableHead className="text-xs">Filename</TableHead>
                <TableHead className="text-xs">Size</TableHead>
                <TableHead className="text-xs">Triggered By</TableHead>
                <TableHead className="text-xs">Storage</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupsLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Loading backup history…</TableCell></TableRow>
              ) : !backups.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No backups recorded yet. Click "Take Backup Now" to create the first one.</TableCell></TableRow>
              ) : backups.map((b) => (
                <TableRow key={b.id} className="text-xs">
                  <TableCell className="font-mono whitespace-nowrap">{fmtDate(b.createdAt)}</TableCell>
                  <TableCell className="font-mono">{b.filename}</TableCell>
                  <TableCell>{fmtBytes(b.sizeBytes)}</TableCell>
                  <TableCell>{b.triggeredBy}</TableCell>
                  <TableCell>
                    {b.blobUrl ? (
                      <Badge variant="outline" className="text-xs gap-1 text-green-700 border-green-300">
                        <CheckCircle2 className="h-3 w-3" /> Azure Blob
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                        Local only
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {b.status === 'success' ? (
                      <Badge variant="default" className="text-xs gap-1 bg-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs gap-1" title={b.errorMessage ?? ''}>
                        <XCircle className="h-3 w-3" /> Failed
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}
