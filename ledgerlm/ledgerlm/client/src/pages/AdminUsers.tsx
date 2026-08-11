import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuthUser } from '@/lib/auth';
import {
  UserPlus, Globe, Shield, Users, ShieldCheck,
  Search, MoreHorizontal, Edit, Trash2, Key,
  AlertTriangle, X, ShieldAlert, UserCog,
} from 'lucide-react';
import SsoAuditDomainAdmin from '@/components/admin/SsoAuditDomainAdmin';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DomainInfo {
  isSuperAdmin: boolean;
  domain?: {
    id: string;
    name: string;
    adminEmail: string;
    defaultOtp: string | null;
    userCount: number;
    userQuota?: number | null;
  };
  domains?: Array<{
    id: string;
    name: string;
    adminEmail: string;
    defaultOtp: string | null;
    userQuota?: number | null;
  }>;
}

interface DomainUser {
  id: string;
  domainId: string;
  email: string;
  role: string;
  hardcodedOtp: string | null;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(email: string) {
  return email.substring(0, 2).toUpperCase();
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function getRoleBadge(role: string) {
  if (role === 'admin') {
    return (
      <Badge className="bg-purple-500/10 text-purple-700 border-purple-400/30 font-medium gap-1">
        <ShieldAlert className="h-3 w-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground gap-1 font-normal">
      <UserCog className="h-3 w-3" />
      Standard
    </Badge>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  // ── Existing state (unchanged) ──────────────────────────────────────────
  const [isAddDialogOpen, setIsAddDialogOpen]     = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen]   = useState(false);
  const [selectedUser, setSelectedUser]           = useState<DomainUser | null>(null);
  const [selectedDomainId, setSelectedDomainId]   = useState<string>('');
  const [newUser, setNewUser]                     = useState({ email: '', role: 'standard', hardcodedOtp: '' });
  const [editUser, setEditUser]                   = useState({ role: 'standard', hardcodedOtp: '' });

  // ── New UI state ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]             = useState('');
  const [quotaBannerDismissed, setQuotaBannerDismissed] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<DomainUser | null>(null);

  const { toast }       = useToast();
  const currentUser     = useAuthUser();
  const isSuperAdmin    = currentUser?.username?.toLowerCase() === 'customer@ledgerlm.ai';

  // ── Queries (unchanged) ─────────────────────────────────────────────────
  const { data: domainInfo, isLoading: domainLoading } = useQuery<DomainInfo>({
    queryKey: ['/api/domain-admin/my-domain'],
  });

  const currentDomainId = isSuperAdmin ? selectedDomainId : domainInfo?.domain?.id || '';
  const currentDomain   = isSuperAdmin
    ? domainInfo?.domains?.find(d => d.id === selectedDomainId)
    : domainInfo?.domain;

  const { data: users = [], isLoading: usersLoading } = useQuery<DomainUser[]>({
    queryKey: ['/api/domain-admin/users', currentDomainId],
    queryFn: async () => {
      const url = isSuperAdmin
        ? `/api/domain-admin/users?domainId=${currentDomainId}`
        : '/api/domain-admin/users';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: !!currentDomainId,
  });

  // ── Mutations (unchanged) ───────────────────────────────────────────────
  const addUserMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      return apiRequest('POST', '/api/domain-admin/users', {
        email: data.email,
        role: data.role,
        hardcodedOtp: data.hardcodedOtp || null,
        domainId: isSuperAdmin ? selectedDomainId : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domain-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/domain-admin/my-domain'] });
      setIsAddDialogOpen(false);
      setNewUser({ email: '', role: 'standard', hardcodedOtp: '' });
      toast({ title: 'User added successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add user', description: error.message || 'Please try again', variant: 'destructive' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editUser }) => {
      return apiRequest('PUT', `/api/domain-admin/users/${id}`, {
        role: data.role,
        hardcodedOtp: data.hardcodedOtp || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domain-admin/users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast({ title: 'User updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update user', description: error.message || 'Please try again', variant: 'destructive' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/domain-admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domain-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/domain-admin/my-domain'] });
      toast({ title: 'User removed successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to remove user', description: error.message || 'Please try again', variant: 'destructive' });
    },
  });

  // ── Handlers (unchanged logic) ──────────────────────────────────────────
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.email) addUserMutation.mutate(newUser);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) updateUserMutation.mutate({ id: selectedUser.id, data: editUser });
  };

  const openEditDialog = (user: DomainUser) => {
    setSelectedUser(user);
    setEditUser({ role: user.role, hardcodedOtp: user.hardcodedOtp || '' });
    setIsEditDialogOpen(true);
  };

  // ── Derived values ──────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === 'admin').length;

  const userCount  = domainInfo?.domain?.userCount ?? users.length;
  const userQuota  = domainInfo?.domain?.userQuota ?? null;
  const quotaPct   = userQuota ? Math.min(100, Math.round((userCount / userQuota) * 100)) : null;
  const quotaNear  = quotaPct !== null && quotaPct >= 90;

  // ── Loading / access denied ─────────────────────────────────────────────
  if (domainLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-primary/10">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading domain…</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin && !domainInfo?.domain) {
    return (
      <div className="h-full flex items-center justify-center bg-primary/10">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You are not a domain administrator. Contact your administrator to get access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden bg-primary/10">
        <div className="flex-1 overflow-auto p-6">
          <div className="h-full bg-white rounded-2xl overflow-auto flex flex-col">

            {/* ── Page header ─────────────────────────────────────────── */}
            <div className="px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3 bg-primary/40 flex-shrink-0">
              <div>
                <h1 className="text-xl font-semibold text-foreground" data-testid="text-page-title">
                  User Management
                </h1>
                <p className="text-sm text-muted-foreground" data-testid="text-page-description">
                  {isSuperAdmin
                    ? 'Select a domain and manage its users'
                    : `Manage users in ${domainInfo?.domain?.name}`}
                </p>
              </div>

              {currentDomainId && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-invite-user">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite New User</DialogTitle>
                      <DialogDescription>Add a user to {currentDomain?.name}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="user-email">Email Address</Label>
                        <Input
                          id="user-email"
                          type="email"
                          placeholder={`user@${currentDomain?.name || 'domain.com'}`}
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          required
                          data-testid="input-invite-email"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email must match the domain: @{currentDomain?.name}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-role">Role</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                        >
                          <SelectTrigger data-testid="select-user-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard User</SelectItem>
                            <SelectItem value="admin">Domain Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {newUser.role === 'admin'
                            ? 'Can manage users and domain settings.'
                            : 'Can access Vault, Boards and Agentic Workflow.'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-otp">Hardcoded OTP <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input
                          id="user-otp"
                          placeholder="6-digit code"
                          value={newUser.hardcodedOtp}
                          onChange={(e) => setNewUser({ ...newUser, hardcodedOtp: e.target.value })}
                          maxLength={10}
                          data-testid="input-user-otp"
                        />
                        <p className="text-xs text-muted-foreground">
                          If set, this user will use this code instead of email OTP
                        </p>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={addUserMutation.isPending}
                        data-testid="button-send-invitation"
                      >
                        {addUserMutation.isPending ? 'Adding…' : 'Add User'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* ── Tabs ────────────────────────────────────────────────── */}
            <Tabs defaultValue="users" className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="px-6 lg:px-8 pt-3 border-b flex-shrink-0">
                <TabsList className="h-9 mb-0">
                  <TabsTrigger value="users" className="text-xs gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Users
                  </TabsTrigger>
                  <TabsTrigger value="sso-audit" className="text-xs gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> SSO Audit
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── Users tab ─────────────────────────────────────────── */}
              <TabsContent value="users" className="flex-1 overflow-y-auto m-0 px-6 lg:px-8 py-6">
                <div className="space-y-5">

                  {/* Super-admin domain picker */}
                  {isSuperAdmin && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Globe className="h-4 w-4" />
                          Select Domain
                        </CardTitle>
                        <CardDescription>Choose a domain to manage its users</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                          <SelectTrigger className="w-full" data-testid="select-domain">
                            <SelectValue placeholder="Select a domain to manage" />
                          </SelectTrigger>
                          <SelectContent>
                            {domainInfo?.domains?.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name} — {d.adminEmail}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {domainInfo?.domains?.length === 0 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            No domains created yet. Go to Domain Management to create one.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* ── ENHANCEMENT 1: Domain stat tiles ──────────────── */}
                  {!isSuperAdmin && domainInfo?.domain && (
                    <>
                      {/* Quota warning banner — ENHANCEMENT 5 */}
                      {quotaNear && !quotaBannerDismissed && (
                        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                          <span className="flex-1">
                            <strong>Seat limit approaching</strong> — you're using <strong>{userCount} of {userQuota}</strong> seats ({quotaPct}%). Contact support to increase your quota.
                          </span>
                          <button
                            onClick={() => setQuotaBannerDismissed(true)}
                            className="text-amber-500 hover:text-amber-700 transition-colors"
                            aria-label="Dismiss"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Tile 1: Users / Quota */}
                        <Card className="border-0 bg-muted/40">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Seats Used</p>
                                <p className="text-2xl font-bold" data-testid="text-user-count">
                                  {userCount}
                                  {userQuota && (
                                    <span className="text-base font-normal text-muted-foreground"> / {userQuota}</span>
                                  )}
                                </p>
                              </div>
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                            {userQuota && (
                              <div>
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>Quota usage</span>
                                  <span className={quotaNear ? 'text-destructive font-medium' : ''}>{quotaPct}%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      quotaNear ? 'bg-destructive' : quotaPct! >= 70 ? 'bg-amber-500' : 'bg-primary'
                                    }`}
                                    style={{ width: `${quotaPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Tile 2: Admins */}
                        <Card className="border-0 bg-muted/40">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Domain Admins</p>
                                <p className="text-2xl font-bold">{adminCount}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {adminCount === 1 ? '1 admin account' : `${adminCount} admin accounts`}
                                </p>
                              </div>
                              <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                                <Shield className="h-4 w-4 text-purple-600" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Tile 3: Auth method */}
                        <Card className="border-0 bg-muted/40">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Default Auth</p>
                                <p className="text-lg font-semibold mt-1" data-testid="text-default-otp">
                                  {domainInfo.domain.defaultOtp || 'Email OTP'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Domain: <span className="font-medium" data-testid="text-domain-name">{domainInfo.domain.name}</span>
                                </p>
                              </div>
                              <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Key className="h-4 w-4 text-green-600" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* ── ENHANCEMENT 2 + 3: Users table with search ────── */}
                  {currentDomainId && (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <CardTitle className="text-base">Domain Users</CardTitle>
                            <CardDescription>Users registered in {currentDomain?.name || 'this domain'}</CardDescription>
                          </div>
                          {/* ENHANCEMENT 3: Search bar */}
                          {users.length > 0 && (
                            <div className="relative w-64">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Search by email…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-8 text-sm"
                                data-testid="input-search-users"
                              />
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        {usersLoading ? (
                          <div className="flex flex-col items-center gap-2 py-12">
                            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading users…</p>
                          </div>
                        ) : users.length === 0 ? (
                          <div className="flex flex-col items-center gap-3 py-14 text-center px-6">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">No users yet</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Click <strong>Invite User</strong> to add someone to this domain.
                              </p>
                            </div>
                          </div>
                        ) : filteredUsers.length === 0 ? (
                          <div className="py-10 text-center text-sm text-muted-foreground">
                            No users match "<span className="font-medium">{searchQuery}</span>"
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6">User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>OTP</TableHead>
                                <TableHead>Added</TableHead>
                                <TableHead className="w-12 pr-4" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredUsers.map((user) => (
                                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                                  {/* ENHANCEMENT 2a: Avatar + email */}
                                  <TableCell className="pl-6">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                          {getInitials(user.email)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{user.email.split('@')[0]}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                      </div>
                                    </div>
                                  </TableCell>

                                  {/* ENHANCEMENT 2b: Coloured role badge */}
                                  <TableCell>{getRoleBadge(user.role)}</TableCell>

                                  {/* ENHANCEMENT 2c: OTP display */}
                                  <TableCell>
                                    {user.hardcodedOtp ? (
                                      <Badge variant="outline" className="font-mono gap-1 text-xs">
                                        <Key className="h-3 w-3" />
                                        {user.hardcodedOtp}
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Email OTP</span>
                                    )}
                                  </TableCell>

                                  {/* ENHANCEMENT 2d: Relative time with tooltip */}
                                  <TableCell>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-xs text-muted-foreground cursor-default">
                                          {relativeTime(user.createdAt)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                                          year: 'numeric', month: 'long', day: 'numeric',
                                        })}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TableCell>

                                  {/* ENHANCEMENT 2e: ⋯ dropdown instead of bare icon buttons */}
                                  <TableCell className="pr-4">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                          data-testid={`button-menu-user-${user.id}`}
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                          <span className="sr-only">User actions</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-44">
                                        <DropdownMenuItem
                                          onClick={() => openEditDialog(user)}
                                          data-testid={`button-edit-user-${user.id}`}
                                        >
                                          <Edit className="h-3.5 w-3.5 mr-2" />
                                          Edit Role / OTP
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => setDeleteConfirmUser(user)}
                                          data-testid={`button-delete-user-${user.id}`}
                                        >
                                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                                          Remove User
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {!currentDomainId && isSuperAdmin && (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground text-sm">
                        Select a domain above to manage its users
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* ── SSO Audit tab (unchanged) ──────────────────────────── */}
              <TabsContent value="sso-audit" className="flex-1 overflow-y-auto m-0 px-6 lg:px-8 py-6">
                {isSuperAdmin && !currentDomainId ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      Switch to the <strong>Users</strong> tab and select a domain first, then come back here to see its SSO audit log.
                    </CardContent>
                  </Card>
                ) : (
                  <SsoAuditDomainAdmin
                    domainId={currentDomainId}
                    domainName={currentDomain?.name}
                    isSuperAdmin={isSuperAdmin}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ── Edit user dialog (unchanged logic) ────────────────────────── */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>{selectedUser?.email}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => setEditUser({ ...editUser, role: value })}
                >
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard User</SelectItem>
                    <SelectItem value="admin">Domain Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-otp">Hardcoded OTP <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="edit-otp"
                  placeholder="6-digit code"
                  value={editUser.hardcodedOtp}
                  onChange={(e) => setEditUser({ ...editUser, hardcodedOtp: e.target.value })}
                  maxLength={10}
                  data-testid="input-edit-otp"
                />
                <p className="text-xs text-muted-foreground">Leave empty to use email-based OTP</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending} data-testid="button-submit-edit-user">
                  {updateUserMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── ENHANCEMENT 4: Proper delete confirmation dialog ──────────── */}
        <AlertDialog
          open={!!deleteConfirmUser}
          onOpenChange={(open) => { if (!open) setDeleteConfirmUser(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove user?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{deleteConfirmUser?.email}</strong> will lose access to{' '}
                <strong>{currentDomain?.name}</strong> immediately. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteConfirmUser) {
                    deleteUserMutation.mutate(deleteConfirmUser.id);
                    setDeleteConfirmUser(null);
                  }
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
