import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, Trash2, RefreshCw, Building2, FileText, CheckCircle2, XCircle, Clock, Globe, Settings, Plug, History, Archive, Download, Network } from "lucide-react";
import { AdminConnectorsDialog } from "@/components/AdminConnectorsDialog";
import { HierarchyConfigDialog } from "@/components/HierarchyConfigDialog";
import { CubeManagement } from "@/components/CubeManagement";
import { IngestionStatusPanel } from "@/components/IngestionStatusPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAuthUser } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Domain {
  id: string;
  name: string;
  adminEmail: string;
  defaultOtp?: string | null;
  userCount?: number;
}

interface DomainInfo {
  isSuperAdmin: boolean;
  domain?: Domain;
  domains?: Domain[];
}

interface EnterpriseDocument {
  id: string;
  companyId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  source: string;
  uploadedAt: string;
  processingStatus: string;
  errorMessage?: string | null;
  chunkCount: number;
  cubeId?: string | null;
}

interface ConnectorType {
  type: string;
  displayName: string;
  description: string;
  configSchema: Array<{ key: string; label: string; type: string; required: boolean }>;
}

interface ConnectorTypesResponse {
  available: ConnectorType[];
}

interface ConfiguredConnector {
  id: string;
  domainId: string;
  connectorType: string;
  displayName: string;
  enabled: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface AutomationLog {
  id: string;
  companyId: string;
  status: string;
  triggerType: string;
  triggeredBy?: string;
  filesDownloaded: number;
  filesProcessed: number;
  filesFailed: number;
  newVersionsCreated: number;
  archivedVersions: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

interface AutomationLogsResponse {
  logs: AutomationLog[];
}

interface DocumentVersion {
  id: string;
  fileName: string;
  version: number;
  filePath: string;
  fileSize: string;
  fileType: string;
  source: string;
  isActive: boolean;
  uploadedAt: string;
  uploadedBy: string;
  previousVersionId?: string;
  metadata?: any;
  cubeId?: string | null;
}

interface DocumentVersionsResponse {
  versions: DocumentVersion[];
}

interface Cube {
  id: string;
  domainId: string;
  name: string;
  description: string | null;
  sourceType: string;
}

export default function AdminEnterprise() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [selectedCubeId, setSelectedCubeId] = useState<string>("");
  const [isConnectorsDialogOpen, setIsConnectorsDialogOpen] = useState(false);
  const [isHierarchyDialogOpen, setIsHierarchyDialogOpen] = useState(false);
  const [selectedConnectorFilter, setSelectedConnectorFilter] = useState<string>("all");
  const [selectedViewCubeId, setSelectedViewCubeId] = useState<string>("all");
  const [selectedVersionIds, setSelectedVersionIds] = useState<Set<string>>(new Set());
  const [activeIngestionJobId, setActiveIngestionJobId] = useState<string | null>(null);
  const currentUser = getAuthUser();

  const { data: domainInfo, isLoading: domainLoading } = useQuery<DomainInfo>({
    queryKey: ["/api/domain-admin/my-domain"],
    enabled: !!currentUser,
  });

  const isSuperAdmin = domainInfo?.isSuperAdmin || false;
  const activeDomainId = isSuperAdmin ? selectedDomainId : domainInfo?.domain?.id;
  const activeDomain = isSuperAdmin 
    ? domainInfo?.domains?.find(d => d.id === selectedDomainId)
    : domainInfo?.domain;

  const { data: documents, isLoading: documentsLoading } = useQuery<EnterpriseDocument[]>({
    queryKey: ["/api/domain-admin/enterprise-documents", activeDomainId],
    queryFn: async () => {
      const url = isSuperAdmin 
        ? `/api/domain-admin/enterprise-documents?domainId=${activeDomainId}`
        : `/api/domain-admin/enterprise-documents`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    },
    enabled: !!activeDomainId,
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (docs === undefined) return false;
      const hasProcessing = docs.some(doc => doc.processingStatus === 'processing');
      return hasProcessing ? 3000 : false;
    },
  });

  // Fetch available connector types
  const { data: connectorTypes } = useQuery<ConnectorTypesResponse>({
    queryKey: ["/api/domain-admin/connector-types"],
    enabled: !!activeDomainId,
  });

  // Fetch configured connectors for this domain
  const { data: configuredConnectors } = useQuery<ConfiguredConnector[]>({
    queryKey: ["/api/domain-admin/connectors", activeDomainId],
    queryFn: async () => {
      const url = isSuperAdmin 
        ? `/api/domain-admin/connectors?domainId=${activeDomainId}`
        : `/api/domain-admin/connectors`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch connectors');
      return res.json();
    },
    enabled: !!activeDomainId,
  });

  // Fetch cubes for this domain
  const { data: cubes = [] } = useQuery<Cube[]>({
    queryKey: ["/api/domain-admin/cubes", activeDomainId],
    queryFn: async () => {
      const url = isSuperAdmin 
        ? `/api/domain-admin/cubes?domainId=${activeDomainId}`
        : `/api/domain-admin/cubes`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeDomainId,
  });

  // Fetch automation logs (sync history)
  const { data: automationLogs } = useQuery<AutomationLogsResponse>({
    queryKey: ["/api/domain-admin/anaplan/logs", activeDomainId],
    queryFn: async () => {
      const url = isSuperAdmin 
        ? `/api/domain-admin/anaplan/logs?domainId=${activeDomainId}`
        : `/api/domain-admin/anaplan/logs`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
    enabled: !!activeDomainId,
  });

  // Fetch document versions
  const { data: documentVersions, isLoading: versionsLoading } = useQuery<DocumentVersionsResponse>({
    queryKey: ["/api/domain-admin/enterprise-documents/versions", activeDomainId],
    queryFn: async () => {
      const url = isSuperAdmin 
        ? `/api/domain-admin/enterprise-documents/versions?domainId=${activeDomainId}`
        : `/api/domain-admin/enterprise-documents/versions`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch versions');
      return res.json();
    },
    enabled: !!activeDomainId,
  });

  // Filter documents based on selected cube and connector
  const filteredDocuments = documents?.filter(doc => {
    // Filter by cube first
    if (selectedViewCubeId !== "all") {
      if (doc.cubeId !== selectedViewCubeId) return false;
    }
    // Then filter by connector type
    if (selectedConnectorFilter === "all") return true;
    if (selectedConnectorFilter === "manual") return doc.source === "manual";
    if (selectedConnectorFilter === "anaplan") return doc.source.startsWith("anaplan");
    if (selectedConnectorFilter === "azure_blob") return doc.source === "azure_blob";
    return true;
  });

  // Filter versions based on selected cube
  const filteredVersions = documentVersions?.versions?.filter(version => {
    if (selectedViewCubeId === "all") return true;
    return version.cubeId === selectedViewCubeId;
  });

  // Get total document count for selected cube (ignoring connector filter) for accurate delete all warning
  const totalCubeDocumentCount = documents?.filter(doc => doc.cubeId === selectedViewCubeId).length || 0;

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!activeDomainId) {
        throw new Error("No domain selected");
      }

      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      if (!selectedCubeId) {
        throw new Error("Please select a cube to upload documents to");
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      if (isSuperAdmin) {
        formData.append('domainId', activeDomainId);
      }
      
      formData.append('cubeId', selectedCubeId);

      const response = await fetch(`/api/domain-admin/enterprise-documents`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      console.log('[AdminEnterprise] Upload success, response data:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents", activeDomainId] });
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents/versions", activeDomainId] });
      setUploadingFiles([]);
      
      // Capture job_id for SQL ingestion progress tracking
      console.log('[AdminEnterprise] job_id from response:', data?.job_id);
      if (data?.job_id) {
        console.log('[AdminEnterprise] Setting activeIngestionJobId to:', data.job_id);
        setActiveIngestionJobId(data.job_id);
        toast({
          title: "Ingestion started",
          description: "Loading data into cube - you can track progress below",
        });
      } else {
        toast({
          title: "Success",
          description: "Documents uploaded successfully",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const processMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const res = await fetch(`/api/domain-admin/enterprise-documents/${documentId}/process`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
        },
      });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents", activeDomainId] });
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents/versions", activeDomainId] });
      
      if (data?.job_id) {
        setActiveIngestionJobId(data.job_id);
        toast({
          title: "Ingestion started",
          description: "Loading data into cube - you can track progress below",
        });
      } else {
        toast({
          title: "Processing started",
          description: "Document is being processed",
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      return await fetch(`/api/domain-admin/enterprise-documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id,
        },
      }).then(res => res.ok ? res.json() : Promise.reject(res.statusText));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents", activeDomainId] });
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents/versions", activeDomainId] });
      toast({
        title: "Deleted",
        description: "Document deleted successfully",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (documentIds: string[]) => {
      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const results = await Promise.all(
        documentIds.map(id =>
          fetch(`/api/domain-admin/enterprise-documents/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          }).then(res => ({ id, ok: res.ok }))
        )
      );

      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} document(s)`);
      }
      return results;
    },
    onSuccess: (_, deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents", activeDomainId] });
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents/versions", activeDomainId] });
      const count = deletedIds.length;
      setSelectedVersionIds(new Set());
      toast({
        title: "Deleted",
        description: `${count} document(s) deleted successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setUploadingFiles(files);
    }
  };

  const handleUpload = () => {
    if (uploadingFiles.length > 0 && activeDomainId) {
      uploadMutation.mutate(uploadingFiles);
    }
  };

  const handleVersionSelect = (versionId: string, checked: boolean) => {
    setSelectedVersionIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(versionId);
      } else {
        next.delete(versionId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredVersions) {
      setSelectedVersionIds(new Set(filteredVersions.map(v => v.id)));
    } else {
      setSelectedVersionIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedVersionIds.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedVersionIds));
    }
  };

  const deleteAllCubeDocsMutation = useMutation({
    mutationFn: async (cubeId: string) => {
      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`/api/domain-admin/cubes/${cubeId}/documents`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents", activeDomainId] });
      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents/versions", activeDomainId] });
      toast({
        title: "Deleted",
        description: `${data.deletedCount} document(s) deleted successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (version: DocumentVersion) => {
    try {
      const response = await fetch(`/api/domain-admin/enterprise-documents/${version.id}/download`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download file",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Processed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'manual':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Manual Upload</Badge>;
      case 'anaplan_auto':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Anaplan Auto</Badge>;
      case 'anaplan_manual':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Anaplan Manual</Badge>;
      default:
        return <Badge variant="secondary">{source}</Badge>;
    }
  };

  if (domainLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-primary/10">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!domainInfo || (!isSuperAdmin && !domainInfo.domain)) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-primary/10">
        <div className="flex-1 overflow-auto p-6">
          <div className="h-full bg-white rounded-2xl overflow-auto flex flex-col">
            <div className="px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3 bg-primary/40 flex-shrink-0">
              <h1 className="text-xl font-semibold text-foreground">Enterprise Data</h1>
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-destructive opacity-50" />
                  <p className="text-lg font-medium text-foreground mb-2">No Domain Access</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    You need to be a domain admin to manage enterprise documents.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tab definitions
  const tabs = [
    { id: "upload",      label: "Upload",      icon: Upload    },
    { id: "documents",   label: "Documents",   icon: FileText  },
    { id: "connectors",  label: "Connectors",  icon: Plug      },
    { id: "history",     label: "History",     icon: History   },
    { id: "data-cubes",  label: "Data Cubes",  icon: Building2 },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-primary/10">
      <div className="flex-1 overflow-auto p-6">
        <div className="h-full bg-white rounded-2xl overflow-auto flex flex-col">

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3 bg-primary/40 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-foreground" />
              <h1 className="text-xl font-semibold text-foreground">Enterprise Data</h1>
              {activeDomain && (
                <Badge variant="outline" className="bg-white/50">
                  {activeDomain.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeDomainId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/80"
                  onClick={() => setIsHierarchyDialogOpen(true)}
                  data-testid="button-open-hierarchies"
                >
                  <Network className="w-4 h-4 mr-2" />
                  Hierarchies
                </Button>
              )}
              {isSuperAdmin && domainInfo.domains && domainInfo.domains.length > 0 && (
                <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                  <SelectTrigger className="w-[200px] bg-white" data-testid="select-domain">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domainInfo.domains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id} data-testid={`select-domain-${domain.id}`}>
                        {domain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* ── Tab bar ────────────────────────────────────────────── */}
          {activeDomainId && (
            <div className="border-b border-border flex-shrink-0 px-6 lg:px-8">
              <nav className="flex gap-0 -mb-px" aria-label="Enterprise Data sections">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${activeTab === id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* ── Content ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6">

            {/* No domain selected */}
            {!activeDomainId && (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-10 h-10 text-muted-foreground opacity-60" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">Select a Domain</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a domain from the dropdown above to manage its enterprise documents.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── UPLOAD TAB ──────────────────────────────────────── */}
            {activeDomainId && activeTab === "upload" && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Upload Documents</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Upload financial documents for {activeDomain?.name}. They'll be processed and made available for AI analysis.
                  </p>
                </div>

                {/* Target Cube */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Target Cube</Label>
                  <p className="text-xs text-muted-foreground">
                    Documents are stored in the selected cube and only accessible to users with cube access.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-1">
                    <div className="w-full sm:w-64">
                      <Select value={selectedCubeId} onValueChange={setSelectedCubeId}>
                        <SelectTrigger data-testid="select-upload-cube">
                          <SelectValue placeholder="Choose a cube..." />
                        </SelectTrigger>
                        <SelectContent>
                          {cubes.length === 0 ? (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                              No cubes available. Create one in Data Cubes.
                            </div>
                          ) : (
                            cubes.map(cube => (
                              <SelectItem key={cube.id} value={cube.id}>{cube.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      onClick={() => setActiveTab("data-cubes")}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Go to Data Cubes <span aria-hidden>›</span>
                    </button>
                  </div>
                </div>

                {/* Hidden file input — same id, same handler */}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="enterprise-file-upload"
                  data-testid="input-file-upload"
                  disabled={!selectedCubeId}
                />

                {/* Drop zone */}
                <label
                  htmlFor="enterprise-file-upload"
                  className={`flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed py-14 px-6 text-center transition-colors
                    ${selectedCubeId
                      ? "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                      : "border-border/50 opacity-50 cursor-not-allowed"
                    }`}
                >
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Select files to upload</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      PDF, Word, Excel, CSV, TXT — up to 500 MB per file
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-md border border-border bg-white shadow-sm
                    ${selectedCubeId ? "text-foreground hover:bg-muted/40" : "text-muted-foreground"}`}>
                    <FileText className="w-4 h-4" />
                    Browse Files
                  </span>
                </label>

                {/* Selected files list */}
                {uploadingFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {uploadingFiles.length} file{uploadingFiles.length !== 1 ? "s" : ""} ready to upload
                    </p>
                    {uploadingFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2.5 bg-muted/40 rounded-lg border border-border/50">
                        <FileText className="w-4 h-4 text-primary/70 flex-shrink-0" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-muted-foreground text-xs flex-shrink-0">{formatFileSize(file.size)}</span>
                      </div>
                    ))}
                    <Button
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending || !selectedCubeId}
                      data-testid="button-upload"
                      className="w-full mt-1"
                    >
                      {uploadMutation.isPending ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" />Upload {uploadingFiles.length} file{uploadingFiles.length !== 1 ? "s" : ""}</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Ingestion progress */}
                {activeIngestionJobId && (
                  <IngestionStatusPanel
                    jobId={activeIngestionJobId}
                    onComplete={() => {
                      setActiveIngestionJobId(null);
                      queryClient.invalidateQueries({ queryKey: ["/api/domain-admin/enterprise-documents", activeDomainId] });
                    }}
                  />
                )}
              </div>
            )}

            {/* ── DOCUMENTS TAB ────────────────────────────────────── */}
            {activeDomainId && activeTab === "documents" && (
              <Card className="transition-shadow duration-200 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Cube Documents
                      </CardTitle>
                      <CardDescription>
                        {selectedViewCubeId === "all"
                          ? `All documents across cubes in ${activeDomain?.name}`
                          : `Documents in ${cubes.find(c => c.id === selectedViewCubeId)?.name || "selected cube"}`}
                        {filteredDocuments && filteredDocuments.length > 0 && (
                          <span className="ml-2 text-foreground font-medium">
                            ({filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""})
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={selectedViewCubeId} onValueChange={setSelectedViewCubeId}>
                        <SelectTrigger className="w-[200px]" data-testid="select-view-cube">
                          <SelectValue placeholder="Select a cube" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="select-view-cube-all">All Cubes</SelectItem>
                          {cubes.map((cube) => (
                            <SelectItem key={cube.id} value={cube.id} data-testid={`select-view-cube-${cube.id}`}>
                              {cube.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedViewCubeId !== "all" && totalCubeDocumentCount > 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              disabled={deleteAllCubeDocsMutation.isPending}
                              data-testid="button-delete-all-cube-docs"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete All ({totalCubeDocumentCount})
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete all documents in this cube?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete all {totalCubeDocumentCount} document(s) in
                                "{cubes.find(c => c.id === selectedViewCubeId)?.name}". This includes all versions,
                                chunks, and embeddings from all sources. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete-all">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAllCubeDocsMutation.mutate(selectedViewCubeId)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid="button-confirm-delete-all"
                              >
                                Delete All Documents
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {documentsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !filteredDocuments || filteredDocuments.length === 0 ? (
                    <div className="text-center py-14">
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="font-medium text-foreground mb-1">
                        {selectedViewCubeId === "all" ? "No documents uploaded yet" : `No documents in ${cubes.find(c => c.id === selectedViewCubeId)?.name || "this cube"}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedViewCubeId === "all"
                          ? "Switch to the Upload tab to add documents"
                          : "Upload documents to this cube from the Upload tab"}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((doc) => (
                          <TableRow
                            key={doc.id}
                            data-testid={`row-document-${doc.id}`}
                            className={
                              doc.processingStatus === "failed"
                                ? "border-l-2 border-l-destructive/50"
                                : doc.processingStatus === "completed"
                                ? "border-l-2 border-l-green-400/50"
                                : doc.processingStatus === "processing"
                                ? "border-l-2 border-l-blue-400/50"
                                : "border-l-2 border-l-amber-400/50"
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                {doc.fileName}
                              </div>
                            </TableCell>
                            <TableCell>{getSourceBadge(doc.source)}</TableCell>
                            <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getStatusBadge(doc.processingStatus)}
                                {doc.processingStatus === "completed" && doc.chunkCount > 0 && (
                                  <span className="text-xs text-muted-foreground">{doc.chunkCount} chunks</span>
                                )}
                                {doc.errorMessage && (
                                  <span className="text-xs text-destructive">{doc.errorMessage}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {doc.processingStatus === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => processMutation.mutate(doc.id)}
                                    disabled={processMutation.isPending}
                                    data-testid={`button-process-${doc.id}`}
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteMutation.mutate(doc.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-${doc.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── CONNECTORS TAB ───────────────────────────────────── */}
            {activeDomainId && activeTab === "connectors" && (
              <Card className="transition-shadow duration-200 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Plug className="w-5 h-5" />
                        Data Source Connectors
                      </CardTitle>
                      <CardDescription>
                        Select a connector to view synced data and configure settings for {activeDomain?.name}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsConnectorsDialogOpen(true)}
                      data-testid="button-configure-connectors"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Connectors
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">View Data From:</label>
                      <Select value={selectedConnectorFilter} onValueChange={setSelectedConnectorFilter}>
                        <SelectTrigger className="w-[250px]" data-testid="select-connector-filter">
                          <SelectValue placeholder="Select a connector" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="select-connector-all">All Sources</SelectItem>
                          <SelectItem value="manual" data-testid="select-connector-manual">Manual Uploads</SelectItem>
                          {connectorTypes?.available.map((ct) => (
                            <SelectItem key={ct.type} value={ct.type} data-testid={`select-connector-${ct.type}`}>
                              {ct.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Connector pill-cards */}
                    {configuredConnectors && configuredConnectors.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {configuredConnectors.map((connector) => (
                          <div
                            key={connector.id}
                            data-testid={`badge-connector-${connector.connectorType}`}
                            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-sm font-medium shadow-sm transition-shadow hover:shadow-md
                              ${connector.enabled
                                ? "bg-green-50 border-green-200 text-green-800"
                                : "bg-muted/40 border-border text-muted-foreground"
                              }`}
                          >
                            <span className="relative flex h-2 w-2">
                              {connector.enabled && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${connector.enabled ? "bg-green-500" : "bg-slate-400"}`} />
                            </span>
                            {connector.displayName}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                          <Plug className="w-7 h-7 text-slate-400" />
                        </div>
                        <p className="font-medium text-foreground mb-1">No connectors configured</p>
                        <p className="text-sm text-muted-foreground">Click <strong>Manage Connectors</strong> to add a data source.</p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground border-t pt-4">
                      Data sources configured here will appear in user's Data Sources panel with the display names you set.
                      Users can toggle sources ON/OFF but cannot see or modify the connection credentials.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── HISTORY TAB ──────────────────────────────────────── */}
            {activeDomainId && activeTab === "history" && (
              <Card className="transition-shadow duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    History & Versions
                  </CardTitle>
                  <CardDescription>
                    Sync runs and document version history for {activeDomain?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="automation" className="w-full">
                    <TabsList className="mb-4" data-testid="tabs-history">
                      <TabsTrigger value="automation" data-testid="tab-automation">
                        <Clock className="w-4 h-4 mr-2" />
                        Automation History
                      </TabsTrigger>
                      <TabsTrigger value="versions" data-testid="tab-versions">
                        <Archive className="w-4 h-4 mr-2" />
                        File Versions
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="automation">
                      {!automationLogs?.logs || automationLogs.logs.length === 0 ? (
                        <div className="text-center py-10">
                          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                            <Clock className="w-7 h-7 text-purple-400" />
                          </div>
                          <p className="font-medium text-foreground mb-1">No automation runs yet</p>
                          <p className="text-sm text-muted-foreground">Configure and enable a connector to see sync history</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Connector</TableHead>
                              <TableHead>Run Time</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Files</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Trigger</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {automationLogs.logs.map((log) => (
                              <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                                <TableCell>
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                    Anaplan
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{new Date(log.startedAt).toLocaleString()}</TableCell>
                                <TableCell>
                                  {log.status === "success" ? (
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />Success
                                    </Badge>
                                  ) : log.status === "partial_success" ? (
                                    <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                      <Clock className="w-3 h-3 mr-1" />Partial
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      <XCircle className="w-3 h-3 mr-1" />Failed
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <span className="text-green-600">{log.filesProcessed}</span>
                                    {log.filesFailed > 0 && (
                                      <span className="text-destructive ml-1">/{log.filesFailed} failed</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {log.completedAt
                                    ? `${Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s`
                                    : "Running..."}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    {log.triggerType === "scheduled" ? "Scheduled" : "Manual"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    <TabsContent value="versions">
                      {versionsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : !filteredVersions || filteredVersions.length === 0 ? (
                        <div className="text-center py-10">
                          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                            <Archive className="w-7 h-7 text-purple-400" />
                          </div>
                          <p className="font-medium text-foreground mb-1">
                            {selectedViewCubeId === "all" ? "No document versions yet" : `No versions in ${cubes.find(c => c.id === selectedViewCubeId)?.name || "this cube"}`}
                          </p>
                          <p className="text-sm text-muted-foreground">Sync data from connectors to see version history</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedVersionIds.size > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              <span className="text-sm font-medium">{selectedVersionIds.size} selected</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleBulkDelete}
                                disabled={bulkDeleteMutation.isPending}
                                data-testid="button-bulk-delete"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete Selected
                              </Button>
                            </div>
                          )}
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">
                                  <Checkbox
                                    checked={filteredVersions.length > 0 && selectedVersionIds.size === filteredVersions.length}
                                    onCheckedChange={handleSelectAll}
                                    data-testid="checkbox-select-all"
                                  />
                                </TableHead>
                                <TableHead>File Name</TableHead>
                                <TableHead>Version</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Uploaded By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredVersions.map((version) => (
                                <TableRow key={version.id} data-testid={`row-version-${version.id}`}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedVersionIds.has(version.id)}
                                      onCheckedChange={(checked) => handleVersionSelect(version.id, !!checked)}
                                      data-testid={`checkbox-version-${version.id}`}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-muted-foreground" />
                                      <span className="truncate max-w-[200px]" title={version.fileName}>{version.fileName}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell><Badge variant="outline">v{version.version}</Badge></TableCell>
                                  <TableCell>{getSourceBadge(version.source)}</TableCell>
                                  <TableCell>
                                    {version.isActive ? (
                                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />Active
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">
                                        <Archive className="w-3 h-3 mr-1" />Archived
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">{formatFileSize(parseInt(version.fileSize))}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{version.uploadedBy}</TableCell>
                                  <TableCell className="text-sm">{new Date(version.uploadedAt).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDownload(version)}
                                        title="Download file"
                                        data-testid={`button-download-${version.id}`}
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => deleteMutation.mutate(version.id)}
                                        disabled={deleteMutation.isPending}
                                        title="Delete version"
                                        data-testid={`button-delete-version-${version.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* ── DATA CUBES TAB ───────────────────────────────────── */}
            {activeDomainId && activeTab === "data-cubes" && (
              <CubeManagement
                domainId={activeDomainId}
                domainName={activeDomain?.name}
                isSuperAdmin={isSuperAdmin}
              />
            )}

          </div>
        </div>
      </div>

      {/* Dialogs — unchanged */}
      {activeDomainId && (
        <AdminConnectorsDialog
          isOpen={isConnectorsDialogOpen}
          onClose={() => setIsConnectorsDialogOpen(false)}
          domainId={activeDomainId}
          domainName={activeDomain?.name}
          isSuperAdmin={isSuperAdmin}
        />
      )}
      {activeDomainId && (
        <HierarchyConfigDialog
          open={isHierarchyDialogOpen}
          onOpenChange={setIsHierarchyDialogOpen}
          domainId={activeDomainId}
          domainName={activeDomain?.name || "Domain"}
        />
      )}
    </div>
  );
}
