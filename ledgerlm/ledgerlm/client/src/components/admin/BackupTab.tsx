import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HardDrive, RefreshCw, PlayCircle, CheckCircle2, XCircle, Database, Cpu, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface BackupRecord {
  id: string;
  filename: string;
  sizeBytes: number;
  status: 'success' | 'failed';
  triggeredBy: string;
  blobUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface SystemStatus {
  database: { sizeBytes: number; tableCount: number; status: string; provider: string };
  auditLog: { totalEvents: number };
  lastBackup: { status: string; filename: string; sizeBytes: number; createdAt: string } | null;
  python: { status: string };
  uptime: number;
}

function fmtDate(iso: string) {
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

function StatusDot({ status }: { status: string }) {
  const ok = status === 'healthy' || status === 'connected' || status === 'ok' || status === 'success';
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
  );
}

export default function BackupTab() {
  const { toast } = useToast();

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<SystemStatus>({
    queryKey: ['/api/super-admin/system-status'],
    refetchInterval: 30_000,
  });

  const { data: backups = [], isLoading: backupsLoading, refetch: refetchBackups } = useQuery<BackupRecord[]>({
    queryKey: ['/api/super-admin/backups'],
    refetchInterval: 30_000,
  });

  const triggerBackupMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/super-admin/backups/trigger', {}),
    onSuccess: () => {
      toast({ title: 'Backup started', description: 'The database backup has been queued. It will appear in the list below when complete.' });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/super-admin/backups'] });
        queryClient.invalidateQueries({ queryKey: ['/api/super-admin/system-status'] });
      }, 5000);
    },
    onError: (e: any) => toast({ title: 'Backup failed to start', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-5">
      {/* System Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">System Status</h3>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => { refetchStatus(); refetchBackups(); }}>
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
                    <StatusDot status={status?.database.status ?? ''} />
                    {status?.database.status ?? '—'}
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
                    <StatusDot status={status?.python.status ?? ''} />
                    {status?.python.status ?? '—'}
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
                    <StatusDot status={status.lastBackup.status} />
                    {status.lastBackup.status}
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

      {/* Manual Backup Trigger */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="pt-4 pb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Manual Database Backup</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Creates a full SQL dump of the database and uploads it to Azure Blob Storage.
              A nightly automated backup also runs at 02:00 UTC.
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

      {/* Backup History Table */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Backup History</h3>
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
                      <Badge variant="outline" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" /> Azure Blob
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
