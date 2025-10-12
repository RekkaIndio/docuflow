"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import {
  Loader2,
  RefreshCcw,
  Plus,
  Users,
  Mail,
  Building,
  ShieldCheck,
  Flag,
  UserPlus,
  X,
  Sparkles,
} from 'lucide-react';

type OrganisationSummary = {
  id: string;
  name: string;
  ownerId: string | null;
  createdAt: string | null;
  workspaceCount: number;
  memberCount: number;
  workspaceLimit: number | null;
};

type WorkspaceSummary = {
  id: string;
  name: string;
  ownerId: string | null;
  organisationId: string;
  members: string[];
  memberCount: number;
  createdAt: string | null;
};

type MemberSummary = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type InviteSummary = {
  id: string;
  email: string | null;
  workspaceId: string | null;
  organisationId: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  consumedAt: string | null;
  role: string | null;
};

type FeatureModule = {
  name: string;
  description?: string | null;
  enabled: boolean;
  category?: string | null;
  isCore?: boolean;
};

type FeatureFlagsState = {
  modules: Record<string, FeatureModule>;
};

type OrganisationDetail = {
  organisation: {
    id: string;
    name: string;
    ownerId: string | null;
    ownerEmail: string | null;
    ownerName: string | null;
    createdAt: string | null;
    workspaceLimit: number | null;
  };
  counts: {
    workspaceCount: number;
    memberCount: number;
    inviteCount: number;
  };
  workspaces: WorkspaceSummary[];
  members: MemberSummary[];
  invites: InviteSummary[];
  featureFlags: FeatureFlagsState;
};

type ProvisionResponse = {
  organisation: {
    id: string;
    name: string;
    ownerId: string | null;
  };
  workspace: {
    id: string;
    name: string;
  };
  owner: {
    id: string;
    email: string;
    name: string | null;
  };
  passwordLink: string | null;
  userCreated: boolean;
};

type ProvisionFormState = {
  organisationName: string;
  ownerName: string;
  ownerEmail: string;
  workspaceName: string;
};

type WorkspaceFormState = {
  name: string;
  ownerId: string;
  memberIds: string;
};

type MemberRoleKey = 'member' | 'admin' | 'owner';

type MemberFormState = {
  email: string;
  name: string;
  role: MemberRoleKey;
  workspaceIds: string[];
  sendPasswordEmail: boolean;
};

type InviteFormState = {
  email: string;
  role: 'Member' | 'Admin' | 'Owner';
  workspaceId: string;
  expiresInHours: number;
};

type TabKey = 'overview' | 'workspaces' | 'members' | 'invites' | 'features';

const DEFAULT_PROVISION_FORM: ProvisionFormState = {
  organisationName: '',
  ownerName: '',
  ownerEmail: '',
  workspaceName: '',
};

const DEFAULT_WORKSPACE_FORM: WorkspaceFormState = {
  name: '',
  ownerId: '',
  memberIds: '',
};

const DEFAULT_MEMBER_FORM: MemberFormState = {
  email: '',
  name: '',
  role: 'member',
  workspaceIds: [],
  sendPasswordEmail: true,
};

const DEFAULT_INVITE_FORM: InviteFormState = {
  email: '',
  role: 'Member',
  workspaceId: 'any',
  expiresInHours: 72,
};

function normaliseInviteUrl(token: string): string {
  if (typeof window !== 'undefined') {
    const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${origin.replace(/\/$/, '')}/accept-invite?token=${token}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://app.docuflow.ai';
  return `${base.replace(/\/$/, '')}/accept-invite?token=${token}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

const OwnerConsolePage: React.FC = () => {
  const { toast } = useToast();

  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<ProvisionFormState>(DEFAULT_PROVISION_FORM);
  const [provisioning, setProvisioning] = useState<boolean>(false);
  const [lastProvision, setLastProvision] = useState<ProvisionResponse | null>(null);

  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string | null>(null);
  const [organisationDetail, setOrganisationDetail] = useState<OrganisationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormState>(DEFAULT_WORKSPACE_FORM);
  const [workspaceCreating, setWorkspaceCreating] = useState<boolean>(false);

  const [memberForm, setMemberForm] = useState<MemberFormState>(DEFAULT_MEMBER_FORM);
  const [memberCreating, setMemberCreating] = useState<boolean>(false);
  const [memberUpdating, setMemberUpdating] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState<InviteFormState>(DEFAULT_INVITE_FORM);
  const [inviteCreating, setInviteCreating] = useState<boolean>(false);
  const [inviteDeleting, setInviteDeleting] = useState<string | null>(null);

  const [featureFlagsSaving, setFeatureFlagsSaving] = useState<string | null>(null);

  const aggregateMetrics = useMemo(() => {
    const totalOrgs = organisations.length;
    const totalWorkspaces = organisations.reduce((acc, org) => acc + (org.workspaceCount ?? 0), 0);
    const totalMembers = organisations.reduce((acc, org) => acc + (org.memberCount ?? 0), 0);
    const latest = organisations[0];
    return {
      totalOrgs,
      totalWorkspaces,
      totalMembers,
      latestOrgName: latest?.name ?? null,
      latestOrgCreatedAt: latest?.createdAt ?? null,
    };
  }, [organisations]);

  const authedFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    let hasAuthHeader = false;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
        hasAuthHeader = true;
      }
    } catch (tokenError) {
      console.warn('[owner console] failed to fetch ID token', tokenError);
    }

    if (!hasAuthHeader && typeof window !== 'undefined' && (window as any)?.__ADMIN_SECRET) {
      headers.set('x-admin-secret', (window as any).__ADMIN_SECRET as string);
      hasAuthHeader = true;
    }

    if (!hasAuthHeader) {
      console.warn('[owner console] proceeding without admin credentials');
    }

    return fetch(input, {
      ...init,
      credentials: 'include',
      headers,
    });
  }, []);

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authedFetch('/api/admin/organisations', { cache: 'no-store' });
      if (!response.ok) {
        const payload = await readJson<{ error?: string }>(response);
        throw new Error(payload.error || 'Failed to load organisations');
      }
      const payload = await readJson<{ organisations?: OrganisationSummary[] }>(response);
      setOrganisations(Array.isArray(payload.organisations) ? payload.organisations : []);
    } catch (error) {
      console.error('[owner console] failed to load organisations', error);
      toast({
        title: 'Unable to load organisations',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [authedFetch, toast]);

  const fetchOrganisationDetail = useCallback(
    async (organisationId: string) => {
      setDetailLoading(true);
      try {
        const response = await authedFetch(`/api/admin/organisations/${organisationId}`, { cache: 'no-store' });
        if (!response.ok) {
          const payload = await readJson<{ error?: string }>(response);
          throw new Error(payload.error || 'Failed to load organisation');
        }
        const payload = await readJson<OrganisationDetail>(response);
        setOrganisationDetail(payload);
        setWorkspaceForm(DEFAULT_WORKSPACE_FORM);
        setMemberForm(DEFAULT_MEMBER_FORM);
        setInviteForm(DEFAULT_INVITE_FORM);
      } catch (error) {
        console.error('[owner console] failed to load organisation detail', error);
        toast({
          title: 'Unable to load organisation',
          description: error instanceof Error ? error.message : 'Please refresh and try again.',
          variant: 'destructive',
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [authedFetch, toast]
  );

  useEffect(() => {
    fetchOrganisations();
  }, [fetchOrganisations]);

  const handleChange = (field: keyof ProvisionFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleProvision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.organisationName.trim() || !form.ownerEmail.trim()) {
      toast({
        title: 'Missing details',
        description: 'Organisation name and owner email are required.',
        variant: 'destructive',
      });
      return;
    }

    setProvisioning(true);
    try {
      const response = await authedFetch('/api/admin/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationName: form.organisationName.trim(),
          ownerName: form.ownerName.trim() || null,
          ownerEmail: form.ownerEmail.trim(),
          workspaceName: form.workspaceName.trim() || null,
          sendPasswordEmail: true,
        }),
      });

      const payload = await readJson<ProvisionResponse & { error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to provision organisation');
      }

      setLastProvision(payload);
      setForm(DEFAULT_PROVISION_FORM);
      await fetchOrganisations();
      toast({
        title: 'Organisation provisioned',
        description: `${payload.organisation.name} is ready to go.`,
      });
    } catch (error) {
      console.error('[owner console] failed to provision organisation', error);
      toast({
        title: 'Provisioning failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProvisioning(false);
    }
  };

  const handleOpenOrganisation = async (organisationId: string) => {
    setSelectedOrganisationId(organisationId);
    setActiveTab('overview');
    await fetchOrganisationDetail(organisationId);
  };

  const handleCloseOrganisation = () => {
    setSelectedOrganisationId(null);
    setOrganisationDetail(null);
    setActiveTab('overview');
    setWorkspaceForm(DEFAULT_WORKSPACE_FORM);
    setMemberForm(DEFAULT_MEMBER_FORM);
    setInviteForm(DEFAULT_INVITE_FORM);
  };

  const handleWorkspaceCreate = async () => {
    if (!selectedOrganisationId || !workspaceForm.name.trim()) {
      toast({
        title: 'Workspace name required',
        description: 'Provide a workspace name before creating it.',
        variant: 'destructive',
      });
      return;
    }

    setWorkspaceCreating(true);
    try {
      const memberIds = workspaceForm.memberIds
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      const response = await authedFetch(`/api/admin/organisations/${selectedOrganisationId}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceForm.name.trim(),
          ownerId: workspaceForm.ownerId.trim() || undefined,
          memberIds,
        }),
      });
      const payload = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create workspace');
      }

      await fetchOrganisationDetail(selectedOrganisationId);
      toast({
        title: 'Workspace created',
        description: `${workspaceForm.name.trim()} has been added.`,
      });
    } catch (error) {
      console.error('[owner console] failed to create workspace', error);
      toast({
        title: 'Unable to create workspace',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setWorkspaceCreating(false);
    }
  };

  const handleMemberWorkspaceToggle = (workspaceId: string) => {
    setMemberForm((prev) => {
      const exists = prev.workspaceIds.includes(workspaceId);
      return {
        ...prev,
        workspaceIds: exists ? prev.workspaceIds.filter((id) => id !== workspaceId) : [...prev.workspaceIds, workspaceId],
      };
    });
  };

  const handleMemberCreate = async () => {
    if (!selectedOrganisationId || !memberForm.email.trim()) {
      toast({
        title: 'Member email required',
        description: 'Please enter an email address before inviting the member.',
        variant: 'destructive',
      });
      return;
    }

    setMemberCreating(true);
    try {
      const response = await authedFetch(`/api/admin/organisations/${selectedOrganisationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: memberForm.email.trim(),
          name: memberForm.name.trim() || undefined,
          role: memberForm.role,
          workspaceIds: memberForm.workspaceIds,
          sendPasswordEmail: memberForm.sendPasswordEmail,
        }),
      });
      const payload = await readJson<{ error?: string; passwordLink?: string; member?: MemberSummary }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to invite member');
      }

      await fetchOrganisationDetail(selectedOrganisationId);
      setMemberForm(DEFAULT_MEMBER_FORM);
      toast({
        title: 'Member invited',
        description: payload.passwordLink ? 'Invite link generated and password email sent.' : 'Member invite recorded.',
      });
    } catch (error) {
      console.error('[owner console] failed to create member', error);
      toast({
        title: 'Unable to invite member',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setMemberCreating(false);
    }
  };

  const handleMemberUpdate = async (userId: string, updates: { role?: string; status?: string }) => {
    if (!selectedOrganisationId) return;

    setMemberUpdating(userId);
    try {
      const response = await authedFetch(`/api/admin/organisations/${selectedOrganisationId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
      const payload = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update member');
      }

      await fetchOrganisationDetail(selectedOrganisationId);
      toast({ title: 'Member updated' });
    } catch (error) {
      console.error('[owner console] failed to update member', error);
      toast({
        title: 'Unable to update member',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setMemberUpdating(null);
    }
  };

  const handleInviteCreate = async () => {
    if (!selectedOrganisationId || !inviteForm.email.trim()) {
      toast({
        title: 'Invite email required',
        description: 'Enter the recipient email address before generating an invite.',
        variant: 'destructive',
      });
      return;
    }

    setInviteCreating(true);
    try {
      const response = await authedFetch(`/api/admin/organisations/${selectedOrganisationId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email.trim(),
          role: inviteForm.role,
          workspaceId: inviteForm.workspaceId === 'any' ? null : inviteForm.workspaceId,
          expiresInHours: inviteForm.expiresInHours,
        }),
      });
      const payload = await readJson<{ error?: string; token?: string; inviteUrl?: string; expiresAt?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create invite');
      }

      const inviteUrl = payload.inviteUrl || (payload.token ? normaliseInviteUrl(payload.token) : null);
      await fetchOrganisationDetail(selectedOrganisationId);
      setInviteForm(DEFAULT_INVITE_FORM);
      toast({
        title: 'Invite created',
        description: inviteUrl ? `Invite link copied: ${inviteUrl}` : 'Invite token generated.',
      });
      if (inviteUrl && navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
        } catch (copyError) {
          console.warn('[owner console] failed to copy invite URL', copyError);
        }
      }
    } catch (error) {
      console.error('[owner console] failed to create invite', error);
      toast({
        title: 'Unable to create invite',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setInviteCreating(false);
    }
  };

  const handleInviteCopy = async (token: string) => {
    const inviteUrl = normaliseInviteUrl(token);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        toast({ title: 'Invite link copied', description: inviteUrl });
      } else {
        throw new Error('Clipboard not available');
      }
    } catch (error) {
      console.warn('[owner console] fallback copy for invite link', error);
      toast({
        title: 'Copy failed',
        description: inviteUrl,
      });
    }
  };

  const handleInviteDelete = async (token: string) => {
    if (!selectedOrganisationId) return;

    setInviteDeleting(token);
    try {
      const response = await authedFetch(`/api/admin/organisations/${selectedOrganisationId}/invites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const payload = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to revoke invite');
      }

      await fetchOrganisationDetail(selectedOrganisationId);
      toast({ title: 'Invite revoked' });
    } catch (error) {
      console.error('[owner console] failed to revoke invite', error);
      toast({
        title: 'Unable to revoke invite',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setInviteDeleting(null);
    }
  };

  const handleFeatureToggle = async (featureKey: string, enabled: boolean) => {
    if (!selectedOrganisationId) return;

    setFeatureFlagsSaving(featureKey);
    try {
      const response = await authedFetch(`/api/admin/organisations/${selectedOrganisationId}/feature-flags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey, enabled }),
      });
      const payload = await readJson<{ error?: string; featureFlags?: FeatureFlagsState }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update feature flag');
      }

      if (organisationDetail && payload.featureFlags) {
        setOrganisationDetail({ ...organisationDetail, featureFlags: payload.featureFlags });
      } else if (selectedOrganisationId) {
        await fetchOrganisationDetail(selectedOrganisationId);
      }
      toast({ title: enabled ? 'Feature enabled' : 'Feature disabled' });
    } catch (error) {
      console.error('[owner console] failed to toggle feature flag', error);
      toast({
        title: 'Unable to update feature',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setFeatureFlagsSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/40 to-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Owner console</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Provision and orchestrate client workspaces</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Build beautiful onboarding experiences for every tenant. Provision organisations, curate access, and toggle capability flags without leaving this console.
              </p>
            </div>
            <Button variant="secondary" onClick={fetchOrganisations} disabled={loading} className="self-start lg:self-center">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Refresh data
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none bg-muted/40">
              <CardHeader className="pb-2">
                <CardDescription>Total organisations</CardDescription>
                <CardTitle className="text-2xl font-semibold">{aggregateMetrics.totalOrgs}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-none bg-muted/40">
              <CardHeader className="pb-2">
                <CardDescription>Total workspaces</CardDescription>
                <CardTitle className="text-2xl font-semibold">{aggregateMetrics.totalWorkspaces}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-none bg-muted/40">
              <CardHeader className="pb-2">
                <CardDescription>Total members</CardDescription>
                <CardTitle className="text-2xl font-semibold">{aggregateMetrics.totalMembers}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-none bg-muted/40">
              <CardHeader className="pb-2">
                <CardDescription>Latest organisation</CardDescription>
                <CardTitle className="text-base font-semibold">
                  {aggregateMetrics.latestOrgName ? (
                    <>
                      {aggregateMetrics.latestOrgName}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {aggregateMetrics.latestOrgCreatedAt ? new Date(aggregateMetrics.latestOrgCreatedAt).toLocaleString() : 'Recently created'}
                      </span>
                    </>
                  ) : (
                    'No tenants yet'
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.35fr,1fr] xl:grid-cols-[1.2fr,1fr]">
          <Card className="overflow-hidden border border-border/70 shadow-sm">
            <CardHeader className="space-y-1 border-b bg-muted/40 px-6 py-5">
              <CardTitle className="text-xl font-semibold">Provision a new organisation</CardTitle>
              <CardDescription>Create the tenant, seed a starter workspace, and issue the owner credentials in one step.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleProvision}>
                <div className="sm:col-span-2">
                  <Label htmlFor="organisationName">Organisation name</Label>
                  <Input id="organisationName" value={form.organisationName} onChange={handleChange('organisationName')} required placeholder="Acme Care Group" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="ownerName">Owner name</Label>
                  <Input id="ownerName" value={form.ownerName} onChange={handleChange('ownerName')} placeholder="Samantha Riley" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="ownerEmail">Owner email</Label>
                  <Input id="ownerEmail" type="email" value={form.ownerEmail} onChange={handleChange('ownerEmail')} required placeholder="owner@example.com" className="mt-2" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="workspaceName">Default workspace</Label>
                  <Input id="workspaceName" value={form.workspaceName} onChange={handleChange('workspaceName')} placeholder="Head Office" className="mt-2" />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={provisioning} className="min-w-[12rem]">
                    {provisioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Provision workspace
                  </Button>
                </div>
              </form>

              {lastProvision && (
                <div className="mt-8 rounded-2xl border border-border/80 bg-muted/30 p-5 text-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest provision</p>
                      <p>
                        <span className="font-medium">{lastProvision.organisation.name}</span> for <span className="font-medium">{lastProvision.owner.email}</span> with workspace <span className="font-medium">{lastProvision.workspace.name}</span>.
                      </p>
                    </div>
                    <Badge variant={lastProvision.userCreated ? 'default' : 'secondary'} className="w-fit">
                      {lastProvision.userCreated ? 'New user created' : 'Existing user linked'}
                    </Badge>
                  </div>
                  {lastProvision.passwordLink && (
                    <div className="mt-3 truncate text-xs text-muted-foreground">
                      Password link: <a href={lastProvision.passwordLink} className="underline" target="_blank" rel="noreferrer">{lastProvision.passwordLink}</a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="border-b bg-muted/40 px-6 py-5">
              <CardTitle className="text-xl font-semibold">Recent organisations</CardTitle>
              <CardDescription>Tap any tenant row to open its workspace cockpit.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <ScrollArea className="h-[28rem]">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                    <TableRow>
                      <TableHead className="pl-6">Organisation</TableHead>
                      <TableHead className="hidden md:table-cell">Workspaces</TableHead>
                      <TableHead className="hidden lg:table-cell">Members</TableHead>
                      <TableHead className="pr-6 text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="px-6 text-center text-muted-foreground">
                          Loading organisations…
                        </TableCell>
                      </TableRow>
                    ) : organisations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                          No organisations yet. Provision your first tenant to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      organisations.map((org) => (
                        <TableRow
                          key={org.id}
                          onClick={() => handleOpenOrganisation(org.id)}
                          className={cn(
                            'cursor-pointer transition-colors hover:bg-muted/30',
                            selectedOrganisationId === org.id && 'bg-muted/50'
                          )}
                        >
                          <TableCell className="pl-6">
                            <div className="font-medium">{org.name}</div>
                            <p className="text-xs text-muted-foreground">Owner ID: {org.ownerId ?? '—'}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{org.workspaceCount}</TableCell>
                          <TableCell className="hidden lg:table-cell">{org.memberCount}</TableCell>
                          <TableCell className="pr-6 text-right text-sm text-muted-foreground">{org.createdAt ? new Date(org.createdAt).toLocaleString() : '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={!!selectedOrganisationId} onOpenChange={(open) => { if (!open) handleCloseOrganisation(); }}>
        <DialogContent className="max-w-6xl overflow-hidden border border-border/70 bg-card/95 p-0 shadow-2xl">
          <div className="border-b bg-muted/50 px-6 py-5">
            <div className="flex flex-col gap-1">
              <DialogHeader className="flex flex-row items-center justify-between gap-4 p-0">
                <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  {organisationDetail?.organisation.name || 'Organisation'}
                </DialogTitle>
              </DialogHeader>
              {organisationDetail?.organisation?.id && (
                <p className="text-xs text-muted-foreground">Organisation ID: {organisationDetail.organisation.id}</p>
              )}
            </div>
          </div>

          {detailLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading organisation…
            </div>
          ) : organisationDetail ? (
            <div className="px-6 pb-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
                <TabsList className="mb-6 grid grid-cols-5 rounded-full bg-muted/60 p-1">
                  <TabsTrigger value="overview" className="rounded-full">Overview</TabsTrigger>
                  <TabsTrigger value="workspaces" className="rounded-full">Workspaces</TabsTrigger>
                  <TabsTrigger value="members" className="rounded-full">Members</TabsTrigger>
                  <TabsTrigger value="invites" className="rounded-full">Invites</TabsTrigger>
                  <TabsTrigger value="features" className="rounded-full">Feature Flags</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Owner</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">{organisationDetail.organisation.ownerName || organisationDetail.organisation.ownerEmail || 'Unassigned'}</p>
                        <p className="text-xs text-muted-foreground">ID: {organisationDetail.organisation.ownerId ?? '—'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Workspace limit</CardTitle>
                        <Flag className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">{organisationDetail.organisation.workspaceLimit ?? 'Unlimited'}</p>
                        <p className="text-xs text-muted-foreground">Current total: {organisationDetail.counts.workspaceCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Members</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">{organisationDetail.counts.memberCount}</p>
                        <p className="text-xs text-muted-foreground">Invites pending: {organisationDetail.counts.inviteCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Created</CardTitle>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">{organisationDetail.organisation.createdAt ? new Date(organisationDetail.organisation.createdAt).toLocaleString() : 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Organisation ID: {organisationDetail.organisation.id}</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="workspaces" className="pt-1">
                  <div className="grid gap-4 lg:grid-cols-[2fr,1.2fr]">
                    <Card className="border border-border/70">
                      <CardHeader>
                        <CardTitle>Existing workspaces</CardTitle>
                        <CardDescription>Overview of provisioned workspaces and ownership.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="max-h-72 pr-2">
                          <div className="space-y-3">
                            {organisationDetail.workspaces.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No workspaces yet.</p>
                            ) : (
                              organisationDetail.workspaces.map((workspace) => (
                                <div key={workspace.id} className="rounded-2xl border border-border/70 bg-muted/30 p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{workspace.name}</p>
                                      <p className="text-xs text-muted-foreground">Workspace ID: {workspace.id}</p>
                                    </div>
                                    <Badge variant="secondary">Members {workspace.memberCount}</Badge>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">Owner ID: {workspace.ownerId ?? '—'}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card className="border border-border/70">
                      <CardHeader>
                        <CardTitle>Create workspace</CardTitle>
                        <CardDescription>Provision an additional workspace under this organisation.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="workspace-name">Workspace name</Label>
                          <Input id="workspace-name" value={workspaceForm.name} onChange={(event) => setWorkspaceForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Operations Team" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workspace-owner">Owner user ID (optional)</Label>
                          <Input id="workspace-owner" value={workspaceForm.ownerId} onChange={(event) => setWorkspaceForm((prev) => ({ ...prev, ownerId: event.target.value }))} placeholder={organisationDetail.organisation.ownerId ?? 'UID'} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workspace-members">Additional member IDs (comma separated)</Label>
                          <Input id="workspace-members" value={workspaceForm.memberIds} onChange={(event) => setWorkspaceForm((prev) => ({ ...prev, memberIds: event.target.value }))} placeholder="uid-1, uid-2" />
                        </div>
                        <Button onClick={handleWorkspaceCreate} disabled={!workspaceForm.name.trim() || workspaceCreating} className="w-full">
                          {workspaceCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                          Create workspace
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="members" className="pt-1">
                  <div className="grid gap-4 lg:grid-cols-[2.5fr,1.5fr]">
                    <Card className="border border-border/70">
                      <CardHeader>
                        <CardTitle>Organisation members</CardTitle>
                        <CardDescription>Users with access to this organisation.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="max-h-80 pr-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="hidden md:table-cell">Role</TableHead>
                                <TableHead className="hidden lg:table-cell">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {organisationDetail.members.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground">No members yet.</TableCell>
                                </TableRow>
                              ) : (
                                organisationDetail.members.map((member) => (
                                  <TableRow key={member.id}>
                                    <TableCell>
                                      <div className="font-medium">{member.name || '—'}</div>
                                      <div className="text-xs text-muted-foreground">ID: {member.id}</div>
                                    </TableCell>
                                    <TableCell>{member.email || '—'}</TableCell>
                                    <TableCell className="hidden md:table-cell align-middle">
                                      <Select
                                        value={(member.role || 'Member').toLowerCase()}
                                        onValueChange={(value) => handleMemberUpdate(member.id, { role: value })}
                                        disabled={memberUpdating === member.id}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="member">Member</SelectItem>
                                          <SelectItem value="admin">Admin</SelectItem>
                                          <SelectItem value="owner">Owner</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell align-middle">
                                      <Select
                                        value={(member.status || 'active').toLowerCase()}
                                        onValueChange={(value) => handleMemberUpdate(member.id, { status: value })}
                                        disabled={memberUpdating === member.id}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="active">Active</SelectItem>
                                          <SelectItem value="suspended">Suspended</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card className="border border-border/70">
                      <CardHeader>
                        <CardTitle>Invite member</CardTitle>
                        <CardDescription>Add or promote members within this organisation.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="member-email">Email</Label>
                          <Input id="member-email" type="email" value={memberForm.email} onChange={(event) => setMemberForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="teammate@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="member-name">Name (optional)</Label>
                          <Input id="member-name" value={memberForm.name} onChange={(event) => setMemberForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Lee Grant" />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={memberForm.role} onValueChange={(value: MemberRoleKey) => setMemberForm((prev) => ({ ...prev, role: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Workspace access</Label>
                          <ScrollArea className="max-h-32 rounded border border-border/60 p-2">
                            {organisationDetail.workspaces.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No workspaces available yet.</p>
                            ) : (
                              organisationDetail.workspaces.map((workspace) => {
                                const checked = memberForm.workspaceIds.includes(workspace.id);
                                return (
                                  <div key={workspace.id} className="flex items-center justify-between py-1">
                                    <div>
                                      <p className="text-sm font-medium">{workspace.name}</p>
                                      <p className="text-xs text-muted-foreground">{workspace.id}</p>
                                    </div>
                                    <Switch checked={checked} onCheckedChange={() => handleMemberWorkspaceToggle(workspace.id)} />
                                  </div>
                                );
                              })
                            )}
                          </ScrollArea>
                        </div>
                        <div className="flex items-center justify-between rounded border border-border/60 p-3">
                          <div>
                            <p className="text-sm font-medium">Send password email</p>
                            <p className="text-xs text-muted-foreground">If user exists, they can still reset their password.</p>
                          </div>
                          <Switch checked={memberForm.sendPasswordEmail} onCheckedChange={(checked) => setMemberForm((prev) => ({ ...prev, sendPasswordEmail: checked }))} />
                        </div>
                        <Button onClick={handleMemberCreate} disabled={!memberForm.email.trim() || memberCreating} className="w-full">
                          {memberCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                          Invite member
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="invites" className="pt-1">
                  <div className="grid gap-4 lg:grid-cols-[2.5fr,1.5fr]">
                    <Card className="border border-border/70">
                      <CardHeader>
                        <CardTitle>Pending invites</CardTitle>
                        <CardDescription>Tokens generated for onboarding new users.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="max-h-72 pr-2">
                          {organisationDetail.invites.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No active invites.</p>
                          ) : (
                            <div className="space-y-3">
                              {organisationDetail.invites.map((invite) => (
                                <div key={invite.id} className="rounded-2xl border border-border/70 bg-muted/30 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="font-medium">{invite.email || 'Unknown recipient'}</p>
                                      <p className="text-xs text-muted-foreground">Token: {invite.id}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button size="sm" variant="outline" onClick={() => handleInviteCopy(invite.id)}>
                                        <Mail className="mr-2 h-4 w-4" />Copy link
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => handleInviteDelete(invite.id)} disabled={inviteDeleting === invite.id}>
                                        {inviteDeleting === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span>Role: {invite.role ?? 'Member'}</span>
                                    <span>Workspace: {invite.workspaceId ?? 'Any'}</span>
                                    <span>Expires: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : '—'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card className="border border-border/70">
                      <CardHeader>
                        <CardTitle>Create invite</CardTitle>
                        <CardDescription>Generate one-time links for new team members.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="invite-email">Email</Label>
                          <Input id="invite-email" type="email" value={inviteForm.email} onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="guest@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={inviteForm.role} onValueChange={(value: 'Member' | 'Admin' | 'Owner') => setInviteForm((prev) => ({ ...prev, role: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Member">Member</SelectItem>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Workspace</Label>
                          <Select value={inviteForm.workspaceId} onValueChange={(value) => setInviteForm((prev) => ({ ...prev, workspaceId: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any workspace</SelectItem>
                              {organisationDetail.workspaces.map((workspace) => (
                                <SelectItem key={workspace.id} value={workspace.id}>{workspace.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="invite-expiry">Expiry (hours)</Label>
                          <Input
                            id="invite-expiry"
                            type="number"
                            min={1}
                            value={inviteForm.expiresInHours}
                            onChange={(event) => setInviteForm((prev) => ({ ...prev, expiresInHours: Number(event.target.value) || prev.expiresInHours }))}
                          />
                        </div>
                        <Button onClick={handleInviteCreate} disabled={!inviteForm.email.trim() || inviteCreating} className="w-full">
                          {inviteCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                          Create invite
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="features" className="pt-1">
                  <Card className="border border-border/70">
                    <CardHeader>
                      <CardTitle>Feature flags</CardTitle>
                      <CardDescription>Toggle product modules per-organisation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {Object.entries(organisationDetail.featureFlags.modules).map(([featureKey, module]) => (
                          <div key={featureKey} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{module.name}</p>
                                {module.description && <p className="text-xs text-muted-foreground">{module.description}</p>}
                                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{module.category || 'general'}</p>
                              </div>
                              <Switch
                                disabled={module.isCore}
                                checked={module.enabled}
                                onCheckedChange={(checked) => handleFeatureToggle(featureKey, checked)}
                              />
                            </div>
                            {module.isCore && <p className="mt-2 text-xs text-muted-foreground">Core features are always on.</p>}
                            {featureFlagsSaving === featureKey && (
                              <p className="mt-2 text-xs text-muted-foreground">Updating…</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="px-6 py-8 text-sm text-muted-foreground">Select an organisation to view details.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerConsolePage;

