"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw } from 'lucide-react';

interface OrganisationSummary {
  id: string;
  name: string;
  ownerId: string | null;
  createdAt: string | null;
  workspaceLimit: number | null;
  workspaceCount: number;
  memberCount: number;
}

interface ProvisionResponse {
  ok: boolean;
  organisation: { id: string; name: string; ownerId: string };
  workspace: { id: string; name: string };
  owner: { id: string; email: string; name: string | null };
  passwordLink: string | null;
  userCreated: boolean;
  error?: string;
}

const initialFormState = {
  organisationName: '',
  ownerEmail: '',
  ownerName: '',
  workspaceName: '',
};

export default function PlatformAdminPage() {
  const [organisations, setOrganisations] = React.useState<OrganisationSummary[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [provisioning, setProvisioning] = React.useState<boolean>(false);
  const [form, setForm] = React.useState(initialFormState);
  const [lastProvision, setLastProvision] = React.useState<ProvisionResponse | null>(null);
  const { toast } = useToast();

  const fetchOrganisations = React.useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/organisations', { cache: 'no-store' });
      if (!resp.ok) {
        throw new Error(`Failed with status ${resp.status}`);
      }
      const data = await resp.json();
      setOrganisations(Array.isArray(data?.organisations) ? data.organisations : []);
    } catch (error: any) {
      console.error('[PlatformAdminPage] failed to load organisations', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load organisations',
        description: error?.message || 'Unexpected error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchOrganisations();
  }, [fetchOrganisations]);

  const handleChange = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleProvision = async (event: React.FormEvent) => {
    event.preventDefault();
    setProvisioning(true);
    setLastProvision(null);
    try {
      const payload = {
        organisationName: form.organisationName.trim(),
        ownerEmail: form.ownerEmail.trim(),
        ownerName: form.ownerName.trim() || undefined,
        workspaceName: form.workspaceName.trim() || undefined,
      };
      const resp = await fetch('/api/admin/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await resp.json()) as ProvisionResponse;
      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || `Failed with status ${resp.status}`);
      }
      setLastProvision(data);
      toast({
        title: 'Organisation provisioned',
        description: `Workspace ${data.workspace.name} ready for ${data.owner.email}.`,
      });
      setForm(initialFormState);
      await fetchOrganisations();
    } catch (error: any) {
      console.error('[PlatformAdminPage] provision failed', error);
      toast({
        variant: 'destructive',
        title: 'Provisioning failed',
        description: error?.message || 'Unexpected error',
      });
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platform Control Centre</h1>
          <p className="text-sm text-muted-foreground">Create organisations, seed workspaces, and hand off ready-to-use accounts.</p>
        </div>
        <Button variant="outline" onClick={fetchOrganisations} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Provision organisation</CardTitle>
            <CardDescription>Creates the organisation, a default workspace, and the owner account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleProvision}>
              <div className="grid gap-2">
                <Label htmlFor="organisationName">Organisation name</Label>
                <Input id="organisationName" value={form.organisationName} onChange={handleChange('organisationName')} required placeholder="Acme Care Group" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerName">Owner name</Label>
                <Input id="ownerName" value={form.ownerName} onChange={handleChange('ownerName')} placeholder="Samantha Riley" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerEmail">Owner email</Label>
                <Input id="ownerEmail" type="email" value={form.ownerEmail} onChange={handleChange('ownerEmail')} required placeholder="owner@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="workspaceName">Workspace name</Label>
                <Input id="workspaceName" value={form.workspaceName} onChange={handleChange('workspaceName')} placeholder="Head Office" />
              </div>
              <Button type="submit" disabled={provisioning}>
                {provisioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Provision workspace
              </Button>
            </form>

            {lastProvision && (
              <div className="mt-6 space-y-3 rounded border border-muted p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Latest provision</span>
                  <Badge variant={lastProvision.userCreated ? 'default' : 'secondary'}>
                    {lastProvision.userCreated ? 'New user created' : 'Existing user linked'}
                  </Badge>
                </div>
                <div>
                  Organisation <strong>{lastProvision.organisation.name}</strong> with owner <strong>{lastProvision.owner.email}</strong> now has workspace <strong>{lastProvision.workspace.name}</strong>.
                </div>
                {lastProvision.passwordLink && (
                  <div className="truncate">
                    Password link: <a href={lastProvision.passwordLink} className="underline" target="_blank" rel="noreferrer">{lastProvision.passwordLink}</a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organisations</CardTitle>
            <CardDescription>High-level view of provisioned tenants.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Workspaces</TableHead>
                    <TableHead className="hidden lg:table-cell">Members</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Loading organisations…
                      </TableCell>
                    </TableRow>
                  ) : organisations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No organisations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    organisations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-xs text-muted-foreground">Owner: {org.ownerId ?? '—'}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{org.workspaceCount}</TableCell>
                        <TableCell className="hidden lg:table-cell">{org.memberCount}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{org.createdAt ? new Date(org.createdAt).toLocaleString() : '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
