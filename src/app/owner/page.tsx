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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { ORGANISATION_TEAM_KEYS, ORGANISATION_TEAM_LABELS, defaultTeamsForRole, type OrganisationTeamKey } from '@/lib/team-roles';
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
  Activity,
  Database,
  Server,
  Clock,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Send,
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
  teamKeys: TeamKey[];
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

type OnboardingInviteDraft = {
  organisation?: {
    name: string | null;
    serviceType: string | null;
    locationCount: number | null;
    notes: string | null;
  } | null;
  ownerContact?: {
    name?: string | null;
    email?: string | null;
    notKnown?: boolean;
  } | null;
  managementContacts?: Array<{ name?: string | null; email?: string | null; notKnown?: boolean }>;
  status?: string | null;
  updatedAt?: string | null;
  notes?: string | null;
};

type OnboardingInvite = {
  token: string;
  recipientEmail: string | null;
  organisationName: string | null;
  contactName: string | null;
  status: 'pending' | 'submitted' | 'expired' | string;
  createdAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  draft: OnboardingInviteDraft | null;
};

type OnboardingInviteFormState = {
  recipientEmail: string;
  organisationName: string;
  contactName: string;
  expiresInHours: number;
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

type ProvisionedWorkspace = {
  id: string;
  name: string;
};

type SeededMemberSummary = {
  id: string | null;
  email: string;
  role: string | null;
  workspaceIds: string[];
  teamAssignments: Record<string, string[]>;
  userCreated: boolean;
  emailSent: boolean;
  error?: string | null;
};

type ProvisionResponse = {
  organisation: {
    id: string;
    name: string;
    ownerId: string | null;
  };
  workspaces: ProvisionedWorkspace[];
  workspace?: ProvisionedWorkspace | null;
  owner: {
    id: string;
    email: string;
    name: string | null;
  };
  passwordLink: string | null;
  userCreated: boolean;
  seededMembers?: SeededMemberSummary[];
};

type MemberRoleKey = 'member' | 'admin' | 'owner';

type TeamKey = OrganisationTeamKey;

type ProvisionMemberForm = {
  id: string;
  name: string;
  email: string;
  role: MemberRoleKey;
  workspaceIndices: number[];
  teamKeys: TeamKey[];
  sendInvite: boolean;
};

type ProvisionFormState = {
  organisationName: string;
  organisationSlug: string;
  ownerName: string;
  ownerEmail: string;
  workspaceCount: number;
  workspaceNames: string[];
  workspaceLimit: number | '';
  serviceType: string;
  cqcRegistrationNumber: string;
  registeredLocations: number | '';
  timezone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  country: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  members: ProvisionMemberForm[];
};

type WorkspaceFormState = {
  name: string;
  ownerId: string;
  memberIds: string;
};

type MemberFormState = {
  email: string;
  name: string;
  role: MemberRoleKey;
  workspaceIds: string[];
  teamKeys: TeamKey[];
  sendPasswordEmail: boolean;
  generateInviteLink: boolean;
};

type InviteFormState = {
  email: string;
  role: 'Member' | 'Admin' | 'Owner';
  workspaceId: string;
  expiresInHours: number;
};

type TabKey = 'overview' | 'workspaces' | 'members' | 'invites' | 'features';

type SystemHealth = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    firestore: {
      status: string;
      latency: number;
    };
    auth: {
      status: string;
      latency: number;
    };
  };
  metrics: {
    totalUsers: number;
    totalOrganisations: number;
    totalWorkspaces: number;
    totalDocuments: number;
  };
  responseTime: number;
};

type GlobalUser = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role?: string;
  status?: string;
  createdAt: string;
  lastLoginAt?: string;
  organisations?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  organisationCount?: number;
};

type UserStatistics = {
  totalUsers: number;
  newUsersLast30Days: number;
  newUsersLast7Days: number;
  activeUsersLast30Days: number;
  activeUsersLast7Days: number;
  roleDistribution: Record<string, number>;
};

const MAX_PROVISION_WORKSPACES = 10;

const TEAM_DESCRIPTIONS: Record<TeamKey, string> = {
  admin: 'Leadership, managers, and heads of service',
  staff: 'Front-line care staff and general workforce',
  inspection: 'Regulatory or external inspection read-only access',
  management: 'Registered managers and senior leadership contacts',
  nurses: 'Registered nursing staff across the service',
  carers: 'Care assistants and support workers',
  ctm: 'Care team managers overseeing rostering and compliance',
  domestic: 'Housekeeping and domestic services team',
  maintenance: 'Maintenance and facilities staff',
  kitchen: 'Catering and kitchen staff members',
  activities: 'Lifestyle and wellbeing coordinators',
};

const TEAM_OPTIONS: Array<{ key: TeamKey; label: string; description: string }> = ORGANISATION_TEAM_KEYS.map((key) => ({
  key,
  label: ORGANISATION_TEAM_LABELS[key],
  description: TEAM_DESCRIPTIONS[key],
}));

const TIMEZONE_OPTIONS = [
  { value: 'Europe/London', label: 'GMT / BST — United Kingdom' },
  { value: 'Europe/Dublin', label: 'GMT / IST — Ireland' },
  { value: 'Europe/Guernsey', label: 'GMT / BST — Channel Islands' },
  { value: 'Europe/Isle_of_Man', label: 'GMT / BST — Isle of Man' },
];

const generateProvisionMemberId = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createProvisionMember = (workspaceCount: number): ProvisionMemberForm => ({
  id: generateProvisionMemberId(),
  name: '',
  email: '',
  role: 'member',
  workspaceIndices: workspaceCount > 0 ? [0] : [],
  teamKeys: [],
  sendInvite: true,
});

const createDefaultProvisionForm = (): ProvisionFormState => ({
  organisationName: '',
  organisationSlug: '',
  ownerName: '',
  ownerEmail: '',
  workspaceCount: 1,
  workspaceNames: [''],
  workspaceLimit: '',
  serviceType: '',
  cqcRegistrationNumber: '',
  registeredLocations: '',
  timezone: 'Europe/London',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postcode: '',
  country: 'United Kingdom',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  members: [],
});

const DEFAULT_WORKSPACE_FORM: WorkspaceFormState = {
  name: '',
  ownerId: '',
  memberIds: '',
};

const createDefaultMemberForm = (role: MemberRoleKey = 'member'): MemberFormState => ({
  email: '',
  name: '',
  role,
  workspaceIds: [],
  teamKeys: defaultTeamsForRole(role),
  sendPasswordEmail: true,
  generateInviteLink: false,
});

const DEFAULT_MEMBER_FORM: MemberFormState = createDefaultMemberForm();

const DEFAULT_INVITE_FORM: InviteFormState = {
  email: '',
  role: 'Member',
  workspaceId: 'any',
  expiresInHours: 72,
};

const DEFAULT_ONBOARDING_INVITE_FORM: OnboardingInviteFormState = {
  recipientEmail: '',
  organisationName: '',
  contactName: '',
  expiresInHours: 7 * 24,
};

function normaliseInviteUrl(token: string): string {
  if (typeof window !== 'undefined') {
    const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${origin.replace(/\/$/, '')}/accept-invite?token=${token}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://cg360.co.uk';
  return `${base.replace(/\/$/, '')}/accept-invite?token=${token}`;
}

function normaliseOnboardingUrl(token: string): string {
  if (typeof window !== 'undefined') {
    const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${origin.replace(/\/$/, '')}/onboarding/${token}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://cg360.co.uk';
  return `${base.replace(/\/$/, '')}/onboarding/${token}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

const OwnerConsolePage: React.FC = () => {
  const { toast } = useToast();

  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<ProvisionFormState>(() => createDefaultProvisionForm());
  const [provisioning, setProvisioning] = useState<boolean>(false);
  const [lastProvision, setLastProvision] = useState<ProvisionResponse | null>(null);

  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string | null>(null);
  const [organisationDetail, setOrganisationDetail] = useState<OrganisationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [mainTab, setMainTab] = useState<'dashboard' | 'organisations' | 'users' | 'onboarding'>('dashboard');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormState>(DEFAULT_WORKSPACE_FORM);
  const [workspaceCreating, setWorkspaceCreating] = useState<boolean>(false);

  const [memberForm, setMemberForm] = useState<MemberFormState>(() => createDefaultMemberForm());
  const [memberCreating, setMemberCreating] = useState<boolean>(false);
  const [memberUpdating, setMemberUpdating] = useState<string | null>(null);
  const [memberDeleting, setMemberDeleting] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState<InviteFormState>(DEFAULT_INVITE_FORM);
  const [inviteCreating, setInviteCreating] = useState<boolean>(false);
  const [inviteDeleting, setInviteDeleting] = useState<string | null>(null);

  const [onboardingInvites, setOnboardingInvites] = useState<OnboardingInvite[]>([]);
  const [onboardingLoading, setOnboardingLoading] = useState<boolean>(false);
  const [onboardingForm, setOnboardingForm] = useState<OnboardingInviteFormState>(DEFAULT_ONBOARDING_INVITE_FORM);
  const [onboardingCreating, setOnboardingCreating] = useState<boolean>(false);
  const [onboardingActioningToken, setOnboardingActioningToken] = useState<string | null>(null);
  const [hasLoadedOnboarding, setHasLoadedOnboarding] = useState<boolean>(false);

  const [featureFlagsSaving, setFeatureFlagsSaving] = useState<string | null>(null);

  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([]);
  const [userStatistics, setUserStatistics] = useState<UserStatistics | null>(null);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userOffset, setUserOffset] = useState<number>(0);
  const [userTotal, setUserTotal] = useState<number>(0);
  const [userUpdating, setUserUpdating] = useState<string | null>(null);

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

  const onboardingMetrics = useMemo(() => {
    const total = onboardingInvites.length;
    const pending = onboardingInvites.filter((invite) => invite.status === 'pending').length;
    const submitted = onboardingInvites.filter((invite) => invite.status === 'submitted').length;
    const expired = onboardingInvites.filter((invite) => invite.status === 'expired').length;
    const latest = onboardingInvites[0] ?? null;
    return {
      total,
      pending,
      submitted,
      expired,
      latest,
    } as const;
  }, [onboardingInvites]);

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

    // For development, use admin secret as fallback
    if (!hasAuthHeader && typeof window !== 'undefined') {
      if ((window as any).__ADMIN_SECRET) {
        headers.set('x-admin-secret', (window as any).__ADMIN_SECRET as string);
        hasAuthHeader = true;
      } else {
        // Set default admin secret for development
        (window as any).__ADMIN_SECRET = 'test';
        headers.set('x-admin-secret', 'test');
        hasAuthHeader = true;
      }
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

  // Load organisations on mount
  useEffect(() => {
    fetchOrganisations();
  }, [fetchOrganisations]);


  const fetchSystemHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const response = await authedFetch('/api/admin/health', { cache: 'no-store' });
      if (!response.ok) {
        const payload = await readJson<{ error?: string }>(response);
        throw new Error(payload.error || 'Failed to load system health');
      }
      const payload = await readJson<SystemHealth>(response);
      setSystemHealth(payload);
    } catch (error) {
      console.error('[owner console] failed to load system health', error);
      toast({
        title: 'Unable to load system health',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setHealthLoading(false);
    }
  }, [authedFetch, toast]);

  const fetchGlobalUsers = useCallback(async (search = '', offset = 0) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: offset.toString(),
        ...(search && { search }),
      });
      const response = await authedFetch(`/api/admin/users?${params}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await readJson<{ error?: string }>(response);
        throw new Error(payload.error || 'Failed to load users');
      }
      const payload = await readJson<{
        users: GlobalUser[];
        total: number;
        statistics: UserStatistics;
      }>(response);
      setGlobalUsers(payload.users);
      setUserTotal(payload.total);
      setUserStatistics(payload.statistics);
    } catch (error) {
      console.error('[owner console] failed to load global users', error);
      toast({
        title: 'Unable to load users',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUsersLoading(false);
    }
  }, [authedFetch, toast]);

  const fetchOrganisationDetail = useCallback(async (organisationId: string) => {
    setDetailLoading(true);
    try {
      const response = await authedFetch(`/api/admin/organisations/${organisationId}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await readJson<{ error?: string }>(response);
        throw new Error(payload.error || 'Failed to load organisation details');
      }
      const payload = await readJson<OrganisationDetail>(response);
      setOrganisationDetail(payload);
    } catch (error) {
      console.error('[owner console] failed to load organisation details', error);
      toast({
        title: 'Unable to load organisation details',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDetailLoading(false);
    }
  }, [authedFetch, toast]);

  const fetchOnboardingInvites = useCallback(async () => {
    setOnboardingLoading(true);
    try {
      const response = await authedFetch('/api/admin/onboarding', { cache: 'no-store' });
      if (!response.ok) {
        const payload = await readJson<{ error?: string }>(response);
        throw new Error(payload.error || 'Failed to load onboarding invites');
      }
      const payload = await readJson<{ invites?: OnboardingInvite[] }>(response);
      setOnboardingInvites(Array.isArray(payload.invites) ? payload.invites : []);
    } catch (error) {
      console.error('[owner console] failed to load onboarding invites', error);
      toast({
        title: 'Unable to load onboarding invites',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setOnboardingLoading(false);
      setHasLoadedOnboarding(true);
    }
  }, [authedFetch, toast]);

  useEffect(() => {
    if (mainTab === 'onboarding' && !hasLoadedOnboarding) {
      fetchOnboardingInvites();
    }
  }, [mainTab, hasLoadedOnboarding, fetchOnboardingInvites]);

  const handleTextFieldChange = (field: 'organisationName' | 'organisationSlug' | 'ownerName' | 'ownerEmail') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleWorkspaceCountChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    const nextCount = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), MAX_PROVISION_WORKSPACES) : 1;
    setForm((prev) => {
      const nextNames = [...prev.workspaceNames];
      const nextMembers = prev.members.map((member) => ({
        ...member,
        workspaceIndices: member.workspaceIndices.filter((index) => index < nextCount),
      }));
      if (nextCount > nextNames.length) {
        return {
          ...prev,
          workspaceCount: nextCount,
          workspaceNames: [...nextNames, ...Array(nextCount - nextNames.length).fill('')],
          members: nextMembers,
        };
      }
      return {
        ...prev,
        workspaceCount: nextCount,
        workspaceNames: nextNames.slice(0, nextCount),
        members: nextMembers,
      };
    });
  };

  const handleWorkspaceNameChange = (index: number, value: string) => {
    setForm((prev) => {
      const nextNames = [...prev.workspaceNames];
      nextNames[index] = value;
      return {
        ...prev,
        workspaceNames: nextNames,
      };
    });
  };

  const handleProvisionMemberChange = (memberId: string, updates: Partial<ProvisionMemberForm>) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.map((member) => (member.id === memberId ? { ...member, ...updates } : member)),
    }));
  };

  const handleProvisionMemberWorkspaceToggle = (memberId: string, workspaceIndex: number) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.map((member) => {
        if (member.id !== memberId) return member;
        const exists = member.workspaceIndices.includes(workspaceIndex);
        const workspaceIndices = exists
          ? member.workspaceIndices.filter((index) => index !== workspaceIndex)
          : [...member.workspaceIndices, workspaceIndex].sort((a, b) => a - b);
        return { ...member, workspaceIndices };
      }),
    }));
  };

  const handleProvisionMemberTeamToggle = (memberId: string, teamKey: TeamKey) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.map((member) => {
        if (member.id !== memberId) return member;
        const exists = member.teamKeys.includes(teamKey);
        const teamKeys = exists
          ? member.teamKeys.filter((key) => key !== teamKey)
          : [...member.teamKeys, teamKey];
        return { ...member, teamKeys };
      }),
    }));
  };

  const handleProvisionMemberInviteToggle = (memberId: string, sendInvite: boolean) => {
    handleProvisionMemberChange(memberId, { sendInvite });
  };

  const handleProvisionMemberRemove = (memberId: string) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.filter((member) => member.id !== memberId),
    }));
  };

  const handleProvisionMemberAdd = () => {
    setForm((prev) => ({
      ...prev,
      members: [...prev.members, createProvisionMember(prev.workspaceCount)],
    }));
  };

  const handleProvision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const organisationName = form.organisationName.trim();
    const ownerEmail = form.ownerEmail.trim();
    const ownerName = form.ownerName.trim();

    if (!organisationName || !ownerEmail) {
      toast({
        title: 'Missing details',
        description: 'Organisation name and owner email are required.',
        variant: 'destructive',
      });
      return;
    }

    const organisationSlug = form.organisationSlug.trim();
    const workspaceLimitValue =
      typeof form.workspaceLimit === 'number'
        ? form.workspaceLimit
        : Number.isFinite(Number.parseInt(String(form.workspaceLimit), 10))
          ? Number.parseInt(String(form.workspaceLimit), 10)
          : null;
    const serviceType = form.serviceType.trim();
    const cqcRegistrationNumber = form.cqcRegistrationNumber.trim();
    const registeredLocationsValue =
      typeof form.registeredLocations === 'number'
        ? form.registeredLocations
        : Number.isFinite(Number.parseInt(String(form.registeredLocations), 10))
          ? Number.parseInt(String(form.registeredLocations), 10)
          : null;
    const timezone = form.timezone.trim();
    const addressLine1 = form.addressLine1.trim();
    const addressLine2 = form.addressLine2.trim();
    const city = form.city.trim();
    const postcode = form.postcode.trim();
    const country = form.country.trim();
    const primaryContactName = form.primaryContactName.trim();
    const primaryContactEmail = form.primaryContactEmail.trim();
    const primaryContactPhone = form.primaryContactPhone.trim();

    const trimmedWorkspaceNames = form.workspaceNames.map((value) => value.trim()).filter(Boolean);
    const targetWorkspaceCount = Math.max(
      1,
      Math.min(form.workspaceCount || trimmedWorkspaceNames.length || 1, MAX_PROVISION_WORKSPACES)
    );
    const workspaceNames: string[] = trimmedWorkspaceNames.slice(0, targetWorkspaceCount);
    const baseName = organisationName || 'Workspace';

    while (workspaceNames.length < targetWorkspaceCount) {
      const ordinal = workspaceNames.length + 1;
      const fallbackName = ordinal === 1 ? `${baseName} Workspace` : `${baseName} Workspace ${ordinal}`;
      workspaceNames.push(fallbackName);
    }

    const workspacesPayload = workspaceNames.map((name) => ({ name }));

    const initialMembersPayload = form.members
      .map((member) => ({
        ...member,
        email: member.email.trim(),
        name: member.name.trim(),
        workspaceIndices: member.workspaceIndices.filter((index) => index >= 0 && index < targetWorkspaceCount),
      }))
      .filter((member) => member.email.length > 0)
      .map((member) => ({
        name: member.name || null,
        email: member.email,
        role: member.role,
        workspaceIndices: member.workspaceIndices,
        teamKeys: member.teamKeys,
        sendInvite: member.sendInvite,
      }));

    const requestPayload: Record<string, any> = {
      organisationName,
      ownerName: ownerName || null,
      ownerEmail,
      workspaceCount: targetWorkspaceCount,
      workspaces: workspacesPayload,
      workspaceName: workspacesPayload[0]?.name ?? null,
      sendPasswordEmail: true,
    };

    if (organisationSlug) requestPayload.organisationSlug = organisationSlug;
    if (workspaceLimitValue !== null && !Number.isNaN(workspaceLimitValue)) {
      requestPayload.workspaceLimit = workspaceLimitValue;
    }

    const serviceProfile = serviceType || cqcRegistrationNumber || (registeredLocationsValue !== null && !Number.isNaN(registeredLocationsValue))
      ? {
          serviceType: serviceType || null,
          cqcRegistrationNumber: cqcRegistrationNumber || null,
          registeredLocations:
            registeredLocationsValue !== null && !Number.isNaN(registeredLocationsValue)
              ? registeredLocationsValue
              : null,
        }
      : null;
    if (serviceProfile) {
      requestPayload.serviceProfile = serviceProfile;
    }

    if (timezone) {
      requestPayload.timezone = timezone;
    }

    const address = addressLine1 || addressLine2 || city || postcode || country
      ? {
          line1: addressLine1 || null,
          line2: addressLine2 || null,
          city: city || null,
          postcode: postcode || null,
          country: country || null,
        }
      : null;
    if (address) {
      requestPayload.address = address;
    }

    const primaryContact = primaryContactName || primaryContactEmail || primaryContactPhone
      ? {
          name: primaryContactName || null,
          email: primaryContactEmail || null,
          phone: primaryContactPhone || null,
        }
      : null;
    if (primaryContact) {
      requestPayload.primaryContact = primaryContact;
    }

    if (initialMembersPayload.length > 0) {
      requestPayload.initialMembers = initialMembersPayload;
    }

    setProvisioning(true);
    try {
      const response = await authedFetch('/api/admin/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const payload = await readJson<ProvisionResponse & { error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to provision organisation');
      }

      const normalisedWorkspaces = Array.isArray(payload.workspaces) && payload.workspaces.length > 0
        ? payload.workspaces
        : payload.workspace
          ? [payload.workspace]
          : [];

      setLastProvision({
        ...payload,
        workspaces: normalisedWorkspaces,
        workspace: payload.workspace ?? normalisedWorkspaces[0] ?? null,
      });
      setForm(createDefaultProvisionForm());
      await fetchOrganisations();
      const workspaceSummary = normalisedWorkspaces.length > 1
        ? `${normalisedWorkspaces.length} workspaces`
        : normalisedWorkspaces[0]?.name ?? 'workspace';
      const successfulSeededCount = Array.isArray(payload.seededMembers)
        ? payload.seededMembers.filter((member) => !member?.error).length
        : 0;
      const seededSummary = successfulSeededCount
        ? ` and ${successfulSeededCount} team member${successfulSeededCount === 1 ? '' : 's'}`
        : '';
      toast({
        title: 'Organisation provisioned',
        description: `${payload.organisation.name} is ready with ${workspaceSummary}${seededSummary}.`,
      });
      const failedSeededMembers = Array.isArray(payload.seededMembers)
        ? payload.seededMembers.filter((member) => member?.error)
        : [];
      if (failedSeededMembers.length > 0) {
        const failureDescription = failedSeededMembers
          .slice(0, 3)
          .map((member) => `${member.email}: ${member.error}`)
          .join(' • ');
        const remainingFailures = failedSeededMembers.length - Math.min(3, failedSeededMembers.length);
        toast({
          title: 'Some members could not be provisioned',
          description: `${failureDescription}${remainingFailures > 0 ? ` • +${remainingFailures} more` : ''}`,
          variant: 'destructive',
        });
      }
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
    setMemberForm(createDefaultMemberForm());
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

  const handleMemberTeamToggle = (teamKey: TeamKey) => {
    setMemberForm((prev) => {
      const exists = prev.teamKeys.includes(teamKey);
      return {
        ...prev,
        teamKeys: exists ? prev.teamKeys.filter((key) => key !== teamKey) : [...prev.teamKeys, teamKey],
      };
    });
  };

  const handleMemberRoleChange = (value: MemberRoleKey) => {
    setMemberForm((prev) => {
      const previousDefaults = defaultTeamsForRole(prev.role);
      const usingPreviousDefaults =
        prev.teamKeys.length === previousDefaults.length && previousDefaults.every((teamKey) => prev.teamKeys.includes(teamKey));
      const nextTeamKeys = usingPreviousDefaults ? defaultTeamsForRole(value) : prev.teamKeys;
      return {
        ...prev,
        role: value,
        teamKeys: nextTeamKeys,
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
          teamKeys: memberForm.teamKeys,
          sendPasswordEmail: memberForm.sendPasswordEmail,
          generateInviteLink: memberForm.generateInviteLink,
        }),
      });
      const payload = await readJson<{ error?: string; passwordLink?: string; inviteUrl?: string; member?: MemberSummary }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to invite member');
      }

      await fetchOrganisationDetail(selectedOrganisationId);
      setMemberForm(createDefaultMemberForm());
      const inviteUrl = payload.inviteUrl || payload.passwordLink;
      toast({
        title: 'Member invited',
        description: inviteUrl ? `Invite link generated: ${inviteUrl}` : 'Member invite recorded.',
      });
      if (inviteUrl && navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
        } catch (copyError) {
          console.warn('[owner console] failed to copy invite URL', copyError);
        }
      }
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

  const handleMemberDelete = async (userId: string) => {
    if (!selectedOrganisationId) return;

    setMemberDeleting(userId);
    try {
      const response = await authedFetch(`/api/admin/organisations/${selectedOrganisationId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const payload = await readJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to remove member');
      }

      await fetchOrganisationDetail(selectedOrganisationId);
      toast({ title: 'Member removed' });
    } catch (error) {
      console.error('[owner console] failed to remove member', error);
      toast({
        title: 'Unable to remove member',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setMemberDeleting(null);
    }
  };

  const handleMemberUpdate = async (userId: string, updates: { role?: string; status?: string }) => {
    if (!selectedOrganisationId) return;

    setMemberUpdating(userId);
    try {
      const response = await authedFetch(`/api/admin/organisations/${selectedOrganisationId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      const payload = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update member');
      }

      await fetchOrganisationDetail(selectedOrganisationId);
      toast({ title: 'Member updated successfully' });
    } catch (error) {
      console.error('[owner console] failed to update member', error);
      toast({
        title: 'Unable to update member',
        description: error instanceof Error ? error.message : 'Please try again.',
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

  const handleOnboardingInviteCreate = async () => {
    const email = onboardingForm.recipientEmail.trim();
    if (!email) {
      toast({
        title: 'Recipient email required',
        description: 'Enter an email address to send the onboarding snapshot link.',
        variant: 'destructive',
      });
      return;
    }

    const organisationName = onboardingForm.organisationName.trim();
    const contactName = onboardingForm.contactName.trim();
    const expiresInHours = Number.isFinite(onboardingForm.expiresInHours)
      ? Math.min(Math.max(Math.floor(onboardingForm.expiresInHours), 1), 30 * 24)
      : DEFAULT_ONBOARDING_INVITE_FORM.expiresInHours;

    setOnboardingCreating(true);
    try {
      const response = await authedFetch('/api/admin/onboarding/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email,
          organisationName: organisationName || undefined,
          contactName: contactName || undefined,
          expiresInHours,
        }),
      });
      const payload = await readJson<{ error?: string; invite?: { token?: string | null } }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create onboarding invite');
      }

      const inviteToken = payload.invite?.token ?? null;
      const inviteUrl = inviteToken ? normaliseOnboardingUrl(inviteToken) : null;
      await fetchOnboardingInvites();
      setOnboardingForm(DEFAULT_ONBOARDING_INVITE_FORM);
      toast({
        title: 'Onboarding invite sent',
        description: inviteUrl ? `Link copied: ${inviteUrl}` : 'Invite recorded and email queued.',
      });
      if (inviteUrl && navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
        } catch (copyError) {
          console.warn('[owner console] failed to copy onboarding invite URL', copyError);
        }
      }
    } catch (error) {
      console.error('[owner console] failed to create onboarding invite', error);
      toast({
        title: 'Unable to send onboarding invite',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setOnboardingCreating(false);
    }
  };

  const handleOnboardingInviteCopy = async (token: string) => {
    const inviteUrl = normaliseOnboardingUrl(token);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        toast({ title: 'Onboarding link copied', description: inviteUrl });
      } else {
        throw new Error('Clipboard not available');
      }
    } catch (error) {
      console.warn('[owner console] fallback copy for onboarding link', error);
      toast({
        title: 'Copy failed',
        description: inviteUrl,
      });
    }
  };

  const handleOnboardingInviteReopen = async (token: string) => {
    setOnboardingActioningToken(token);
    try {
      const response = await authedFetch(`/api/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      });
      const payload = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to reopen invite');
      }

      await fetchOnboardingInvites();
      toast({ title: 'Invite reopened', description: 'The onboarding link is live again.' });
    } catch (error) {
      console.error('[owner console] failed to reopen onboarding invite', error);
      toast({
        title: 'Unable to reopen invite',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setOnboardingActioningToken(null);
    }
  };

  const handleUserUpdate = useCallback(async (userId: string, updates: { role?: string; status?: string }) => {
    setUserUpdating(userId);
    try {
      const response = await authedFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      const payload = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update user');
      }

      await fetchGlobalUsers(userSearch, userOffset);
      toast({ title: 'User updated successfully' });
    } catch (error) {
      console.error('[owner console] failed to update user', error);
      toast({
        title: 'Unable to update user',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUserUpdating(null);
    }
  }, [authedFetch, toast, fetchGlobalUsers, userSearch, userOffset]);

  const handleFeatureToggle = async (featureKey: string, enabled: boolean) => {
    if (!selectedOrganisationId) return;

    setFeatureFlagsSaving(featureKey);
    try {
      const response = await authedFetch(`/api/admin/organisations/${selectedOrganisationId}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey, enabled }),
      });
      const payload = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update feature flag');
      }

      await fetchOrganisationDetail(selectedOrganisationId);
      toast({ title: 'Feature flag updated' });
    } catch (error) {
      console.error('[owner console] failed to update feature flag', error);
      toast({
        title: 'Unable to update feature flag',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setFeatureFlagsSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/40 to-background">
      <div className="mx-auto flex w-full max-w-none flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <header className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-md backdrop-blur">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] xl:items-start">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Owner console</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Provision and orchestrate client workspaces</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Build beautiful onboarding experiences for every tenant. Provision organisations, curate access, and toggle capability flags without leaving this console.
              </p>
            </div>
            <div className="flex items-start justify-end">
              <Button variant="secondary" onClick={fetchOrganisations} disabled={loading} className="h-11 rounded-full px-6">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Refresh data
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            <Card className="border border-border/60 bg-muted/30">
              <CardHeader className="pb-2">
                <CardDescription>Total organisations</CardDescription>
                <CardTitle className="text-2xl font-semibold">{aggregateMetrics.totalOrgs}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-border/60 bg-muted/30">
              <CardHeader className="pb-2">
                <CardDescription>Total workspaces</CardDescription>
                <CardTitle className="text-2xl font-semibold">{aggregateMetrics.totalWorkspaces}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-border/60 bg-muted/30">
              <CardHeader className="pb-2">
                <CardDescription>Total members</CardDescription>
                <CardTitle className="text-2xl font-semibold">{aggregateMetrics.totalMembers}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-border/60 bg-muted/30">
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

        <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as 'dashboard' | 'organisations' | 'users' | 'onboarding')}>
          <TabsList className="mb-8 flex w-full flex-wrap gap-2 rounded-2xl border border-border/60 bg-card/80 p-1">
            <TabsTrigger value="dashboard" className="rounded-2xl px-6 py-2">Dashboard</TabsTrigger>
            <TabsTrigger value="onboarding" className="rounded-2xl px-6 py-2">Onboarding</TabsTrigger>
            <TabsTrigger value="organisations" className="rounded-2xl px-6 py-2">Organisations</TabsTrigger>
            <TabsTrigger value="users" className="rounded-2xl px-6 py-2">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight">System Health</h2>
                    <p className="text-sm text-muted-foreground">Monitor platform services and key metrics</p>
                  </div>
                  <Button variant="outline" onClick={fetchSystemHealth} disabled={healthLoading} size="sm">
                    {healthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    Refresh
                  </Button>
                </div>

                {systemHealth && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Overall Status</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Activity className={`h-4 w-4 ${
                            systemHealth.status === 'healthy' ? 'text-green-500' :
                            systemHealth.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'
                          }`} />
                          {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Firestore</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Database className={`h-4 w-4 ${
                            systemHealth.services.firestore.status === 'healthy' ? 'text-green-500' : 'text-red-500'
                          }`} />
                          {systemHealth.services.firestore.latency}ms
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Firebase Auth</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <ShieldCheck className={`h-4 w-4 ${
                            systemHealth.services.auth.status === 'healthy' ? 'text-green-500' : 'text-red-500'
                          }`} />
                          {systemHealth.services.auth.latency}ms
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Response Time</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {systemHealth.responseTime}ms
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>
                )}

                {systemHealth && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Total Users</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          {systemHealth.metrics.totalUsers.toLocaleString()}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Organisations</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                          <Building className="h-5 w-5 text-muted-foreground" />
                          {systemHealth.metrics.totalOrganisations.toLocaleString()}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Workspaces</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                          <Server className="h-5 w-5 text-muted-foreground" />
                          {systemHealth.metrics.totalWorkspaces.toLocaleString()}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Documents</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                          <Flag className="h-5 w-5 text-muted-foreground" />
                          {systemHealth.metrics.totalDocuments.toLocaleString()}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="onboarding" className="space-y-6">
            <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Onboarding pipeline</h2>
                  <p className="text-sm text-muted-foreground">Send onboarding snapshots, capture management contacts, and monitor progress.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchOnboardingInvites} disabled={onboardingLoading}>
                  {onboardingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  Refresh list
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-none bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardDescription>Total invites</CardDescription>
                    <CardTitle className="text-2xl font-semibold">{onboardingMetrics.total}</CardTitle>
                    {onboardingMetrics.latest && (
                      <p className="text-xs font-medium text-muted-foreground">Latest sent {onboardingMetrics.latest.createdAt ? new Date(onboardingMetrics.latest.createdAt).toLocaleString() : 'just now'}</p>
                    )}
                  </CardHeader>
                </Card>
                <Card className="border-none bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardDescription>Pending responses</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                      <Clock3 className="h-5 w-5 text-amber-500" />
                      {onboardingMetrics.pending}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-none bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardDescription>Submitted snapshots</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      {onboardingMetrics.submitted}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-none bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardDescription>Expired links</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                      {onboardingMetrics.expired}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <Card className="rounded-3xl border border-border/70 bg-card/95 shadow-xl ring-1 ring-border/50">
                <CardHeader className="space-y-3 rounded-t-3xl border-b border-border/60 bg-gradient-to-r from-muted/70 via-card to-muted/40 px-6 py-6">
                  <CardTitle className="text-lg font-semibold tracking-tight">Send an onboarding snapshot</CardTitle>
                  <CardDescription>Invite a client contact to share organisation basics, managers, and go-live notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-6 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-email">Recipient email</Label>
                    <Input
                      id="onboarding-email"
                      type="email"
                      placeholder="client.owner@example.com"
                      value={onboardingForm.recipientEmail}
                      onChange={(event) => setOnboardingForm((prev) => ({ ...prev, recipientEmail: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-organisation">Organisation name</Label>
                    <Input
                      id="onboarding-organisation"
                      placeholder="Acme Care Group"
                      value={onboardingForm.organisationName}
                      onChange={(event) => setOnboardingForm((prev) => ({ ...prev, organisationName: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-contact">Primary contact name</Label>
                    <Input
                      id="onboarding-contact"
                      placeholder="Samantha Riley"
                      value={onboardingForm.contactName}
                      onChange={(event) => setOnboardingForm((prev) => ({ ...prev, contactName: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-expiry">Expiry (hours)</Label>
                    <Input
                      id="onboarding-expiry"
                      type="number"
                      min={1}
                      max={30 * 24}
                      value={onboardingForm.expiresInHours}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10);
                        setOnboardingForm((prev) => ({ ...prev, expiresInHours: Number.isNaN(parsed) ? prev.expiresInHours : parsed }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Links default to 7 days. Adjust if you need a shorter or longer window.</p>
                  </div>
                  <Button onClick={handleOnboardingInviteCreate} disabled={onboardingCreating} className="w-full">
                    {onboardingCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send invite
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll email the recipient and save a draft so you can follow along here. Invites can be reopened if a client needs more time.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-border/70 bg-card/95 shadow-xl ring-1 ring-border/50">
                <CardHeader>
                  <CardTitle>Recent onboarding invites</CardTitle>
                  <CardDescription>Newest first. Track who has responded and what they&apos;ve shared.</CardDescription>
                </CardHeader>
                <CardContent>
                  {onboardingLoading && onboardingInvites.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading invites…
                    </div>
                  ) : onboardingInvites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No onboarding invites yet. Send one to get started.</p>
                  ) : (
                    <ScrollArea className="max-h-[32rem] pr-2">
                      <div className="space-y-4">
                        {onboardingInvites.map((invite) => {
                          const status = (invite.status || 'pending').toLowerCase();
                          const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                          const statusClasses =
                            status === 'submitted'
                              ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                              : status === 'expired'
                                ? 'border-rose-200 bg-rose-100 text-rose-700'
                                : 'border-amber-200 bg-amber-100 text-amber-700';
                          const statusIcon =
                            status === 'submitted' ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === 'expired' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />;
                          const managementCount = invite.draft?.managementContacts?.length ?? 0;
                          const ownerEmail = invite.draft?.ownerContact?.email ?? invite.recipientEmail ?? '—';
                          return (
                            <div key={invite.token} className="rounded-2xl border border-border/70 bg-muted/30 p-4 shadow-sm">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {invite.organisationName || invite.draft?.organisation?.name || 'Untitled organisation'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Sent to {invite.recipientEmail || 'unknown'}{invite.contactName ? ` • Contact ${invite.contactName}` : ''}
                                  </p>
                                </div>
                                <Badge className={cn('flex items-center gap-1.5 border px-2 py-0.5 text-xs font-medium', statusClasses)}>
                                  {statusIcon}
                                  {statusLabel}
                                </Badge>
                              </div>

                              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                <span>Created: {invite.createdAt ? new Date(invite.createdAt).toLocaleString() : '—'}</span>
                                <span>Expires: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : '—'}</span>
                                <span>Owner contact: {ownerEmail}</span>
                                <span>Managers captured: {managementCount}</span>
                                {invite.submittedAt && <span>Submitted: {new Date(invite.submittedAt).toLocaleString()}</span>}
                                {invite.draft?.notes && <span>Notes: {invite.draft.notes}</span>}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleOnboardingInviteCopy(invite.token)}>
                                  <Copy className="mr-2 h-4 w-4" />Copy link
                                </Button>
                                {(status === 'submitted' || status === 'expired') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOnboardingInviteReopen(invite.token)}
                                    disabled={onboardingActioningToken === invite.token}
                                  >
                                    {onboardingActioningToken === invite.token ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                    Reopen link
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="organisations" className="space-y-10">
            <section className="grid gap-10 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)] 2xl:grid-cols-[minmax(0,1.85fr)_minmax(400px,1fr)]">
              <Card className="rounded-3xl border border-border/70 bg-card/95 shadow-xl ring-1 ring-border/50">
                <CardHeader className="space-y-6 rounded-t-3xl border-b border-border/60 bg-gradient-to-r from-muted/70 via-card to-muted/40 px-8 py-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <CardTitle className="text-2xl font-semibold tracking-tight">Provision a new organisation</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        Launch a tenant, seed the right workspaces, and invite the leadership team in one guided flow.
                        Every field below shapes the initial governance experience, so take your time — nothing is hidden in secondary modals.
                      </CardDescription>
                    </div>
                    <div className="grid h-full gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-3 shadow-sm">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                          <Sparkles className="h-3.5 w-3.5" /> Guided steps
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">Organisation identity • Owners • Workspaces • Team seeding</p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Current total</p>
                        <p className="mt-1 text-2xl font-semibold">{aggregateMetrics.totalOrgs}</p>
                        <p className="text-xs text-muted-foreground">Active organisations across the platform</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-8 py-8">
                  <form className="space-y-10" onSubmit={handleProvision}>
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Organisation essentials</p>
                          <h3 className="mt-2 text-lg font-semibold">Core identity and guardrails</h3>
                          <p className="text-sm text-muted-foreground">Give the tenant a name, optional slug, and workspace allowance. These can be revised later, but establishing them now keeps onboarding tidy.</p>
                        </div>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="sm:col-span-2 xl:col-span-3 space-y-2">
                          <Label htmlFor="organisationName">Organisation name</Label>
                          <Input
                            id="organisationName"
                            value={form.organisationName}
                            onChange={handleTextFieldChange('organisationName')}
                            required
                            placeholder="Acme Care Group"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="organisationSlug">Organisation slug (optional)</Label>
                          <Input
                            id="organisationSlug"
                            value={form.organisationSlug}
                            onChange={handleTextFieldChange('organisationSlug')}
                            placeholder="acme-care"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workspaceLimit">Workspace limit</Label>
                          <Input
                            id="workspaceLimit"
                            type="number"
                            min={1}
                            value={form.workspaceLimit === '' ? '' : String(form.workspaceLimit)}
                            onChange={(event) => {
                              const { value } = event.target;
                              setForm((prev) => ({
                                ...prev,
                                workspaceLimit:
                                  value === ''
                                    ? ''
                                    : Number.isNaN(Number.parseInt(value, 10))
                                      ? prev.workspaceLimit
                                      : Math.max(1, Number.parseInt(value, 10)),
                              }));
                            }}
                            placeholder="Unlimited"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Timezone</Label>
                          <Select value={form.timezone} onValueChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIMEZONE_OPTIONS.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 border-t border-dashed border-border/60 pt-8">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Owner account</p>
                          <h3 className="mt-2 text-lg font-semibold">Primary contact and workspace cadence</h3>
                          <p className="text-sm text-muted-foreground">The owner receives the welcome email and password link. Choose how many workspaces they step into on day one.</p>
                        </div>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="ownerName">Owner name</Label>
                          <Input
                            id="ownerName"
                            value={form.ownerName}
                            onChange={handleTextFieldChange('ownerName')}
                            placeholder="Samantha Riley"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ownerEmail">Owner email</Label>
                          <Input
                            id="ownerEmail"
                            type="email"
                            value={form.ownerEmail}
                            onChange={handleTextFieldChange('ownerEmail')}
                            required
                            placeholder="owner@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workspaceCount">Workspaces to create</Label>
                          <Input
                            id="workspaceCount"
                            type="number"
                            min={1}
                            max={MAX_PROVISION_WORKSPACES}
                            step={1}
                            value={String(form.workspaceCount)}
                            onChange={(event) => handleWorkspaceCountChange(event.target.value)}
                            placeholder="Number of workspaces"
                            aria-label="Number of workspaces to create"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 border-t border-dashed border-border/60 pt-8">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Workspace naming</p>
                          <h3 className="mt-2 text-lg font-semibold">Label the environments</h3>
                          <p className="text-sm text-muted-foreground">Head Office, Residential Homes, Regional hubs — use language the client recognises. We’ll scaffold folders and teams around these labels.</p>
                        </div>
                        <Badge variant="outline" className="w-fit rounded-full bg-muted/40 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {form.workspaceNames.length} entries
                        </Badge>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {form.workspaceNames.map((name, index) => {
                          const inputId = `workspace-name-${index}`;
                          return (
                            <div key={inputId} className="space-y-2 rounded-2xl border border-border/50 bg-background/70 p-4 shadow-sm">
                              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                <span>Workspace {index + 1}</span>
                                {index === 0 ? <span className="uppercase tracking-wide">Primary</span> : null}
                              </div>
                              <Input
                                id={inputId}
                                value={name}
                                onChange={(event) => handleWorkspaceNameChange(index, event.target.value)}
                                placeholder={index === 0 ? 'Head Office' : `Team ${index + 1}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-6 border-t border-dashed border-border/60 pt-8">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Service profile</p>
                          <h3 className="mt-2 text-lg font-semibold">Tailor compliance & capacity</h3>
                          <p className="text-sm text-muted-foreground">Optional but powerful — this metadata feeds AI flows, compulsory documents, and regulatory framing.</p>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="serviceType">Service type</Label>
                          <Input
                            id="serviceType"
                            value={form.serviceType}
                            onChange={(event) => setForm((prev) => ({ ...prev, serviceType: event.target.value }))}
                            placeholder="Residential care (Elderly)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cqcRegistrationNumber">CQC registration number</Label>
                          <Input
                            id="cqcRegistrationNumber"
                            value={form.cqcRegistrationNumber}
                            onChange={(event) => setForm((prev) => ({ ...prev, cqcRegistrationNumber: event.target.value }))}
                            placeholder="1-123456789"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="registeredLocations">Registered locations</Label>
                          <Input
                            id="registeredLocations"
                            type="number"
                            min={0}
                            value={form.registeredLocations === '' ? '' : String(form.registeredLocations)}
                            onChange={(event) => {
                              const { value } = event.target;
                              setForm((prev) => ({
                                ...prev,
                                registeredLocations:
                                  value === ''
                                    ? ''
                                    : Number.isNaN(Number.parseInt(value, 10))
                                      ? prev.registeredLocations
                                      : Math.max(0, Number.parseInt(value, 10)),
                              }));
                            }}
                            placeholder="e.g. 5"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 border-t border-dashed border-border/60 pt-8">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Operational context</p>
                          <h3 className="mt-2 text-lg font-semibold">Where the service lives</h3>
                          <p className="text-sm text-muted-foreground">Timezone and address power scheduling, rotas, and policy headers. Accuracy here keeps downstream records consistent.</p>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="addressLine1">Address line 1</Label>
                          <Input
                            id="addressLine1"
                            value={form.addressLine1}
                            onChange={(event) => setForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
                            placeholder="123 Main Street"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
                          <Input
                            id="addressLine2"
                            value={form.addressLine2}
                            onChange={(event) => setForm((prev) => ({ ...prev, addressLine2: event.target.value }))}
                            placeholder="Suite 2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={form.city}
                            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                            placeholder="Leeds"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postcode">Postcode</Label>
                          <Input
                            id="postcode"
                            value={form.postcode}
                            onChange={(event) => setForm((prev) => ({ ...prev, postcode: event.target.value }))}
                            placeholder="LS1 1AA"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            value={form.country}
                            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                            placeholder="United Kingdom"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 border-t border-dashed border-border/60 pt-8">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Primary contact</p>
                          <h3 className="mt-2 text-lg font-semibold">Who handles billing and onboarding</h3>
                          <p className="text-sm text-muted-foreground">This information surfaces in invoices, onboarding emails, and audit trails.</p>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="primaryContactName">Contact name</Label>
                          <Input
                            id="primaryContactName"
                            value={form.primaryContactName}
                            onChange={(event) => setForm((prev) => ({ ...prev, primaryContactName: event.target.value }))}
                            placeholder="Finance Team"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="primaryContactEmail">Contact email</Label>
                          <Input
                            id="primaryContactEmail"
                            type="email"
                            value={form.primaryContactEmail}
                            onChange={(event) => setForm((prev) => ({ ...prev, primaryContactEmail: event.target.value }))}
                            placeholder="finance@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="primaryContactPhone">Contact phone</Label>
                          <Input
                            id="primaryContactPhone"
                            type="tel"
                            value={form.primaryContactPhone}
                            onChange={(event) => setForm((prev) => ({ ...prev, primaryContactPhone: event.target.value }))}
                            placeholder="+44 20 1234 5678"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 border-t border-dashed border-border/60 pt-8">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Seed the team</p>
                          <h3 className="mt-2 text-lg font-semibold">Invite colleagues into the right teams</h3>
                          <p className="text-sm text-muted-foreground">Create accounts, allocate workspace access, and drop them into default teams. We’ll email password links automatically unless you toggle it off.</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleProvisionMemberAdd} className="rounded-full">
                          <Plus className="mr-2 h-4 w-4" /> Add team member
                        </Button>
                      </div>
                      {form.members.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-8 text-sm text-muted-foreground">
                          No team members added yet. Use “Add team member” to pre-seed managers, nurses, or compliance leads.
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {form.members.map((member, index) => (
                            <div key={member.id} className="space-y-5 rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold">Team member {index + 1}</p>
                                  <p className="text-xs text-muted-foreground">Assign workspaces, staffing teams, and invite preferences.</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleProvisionMemberRemove(member.id)}
                                  aria-label="Remove team member"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                  <Label>Name</Label>
                                  <Input
                                    value={member.name}
                                    onChange={(event) => handleProvisionMemberChange(member.id, { name: event.target.value })}
                                    placeholder="Jordan Blake"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Email</Label>
                                  <Input
                                    type="email"
                                    value={member.email}
                                    onChange={(event) => handleProvisionMemberChange(member.id, { email: event.target.value })}
                                    placeholder="colleague@example.com"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Role</Label>
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) => handleProvisionMemberChange(member.id, { role: value as MemberRoleKey })}
                                  >
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
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Workspace access</Label>
                                <div className="flex flex-wrap gap-3">
                                  {form.workspaceNames.map((name, workspaceIndex) => {
                                    const workspaceLabel = name || `Workspace ${workspaceIndex + 1}`;
                                    const checked = member.workspaceIndices.includes(workspaceIndex);
                                    return (
                                      <label
                                        key={`${member.id}-workspace-${workspaceIndex}`}
                                        className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={() => handleProvisionMemberWorkspaceToggle(member.id, workspaceIndex)}
                                        />
                                        <span>{workspaceLabel}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Team placement</Label>
                                <div className="flex flex-wrap gap-3">
                                  {TEAM_OPTIONS.map((team) => {
                                    const checked = member.teamKeys.includes(team.key);
                                    return (
                                      <label
                                        key={`${member.id}-team-${team.key}`}
                                        className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
                                      >
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => handleProvisionMemberTeamToggle(member.id, team.key)}
                                          />
                                          {team.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{team.description}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-medium">Send invite email</p>
                                  <p className="text-xs text-muted-foreground">Toggle off to create the account silently and share the password later.</p>
                                </div>
                                <Switch
                                  checked={member.sendInvite}
                                  onCheckedChange={(checked) => handleProvisionMemberInviteToggle(member.id, Boolean(checked))}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4 border-t border-dashed border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-end">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        <span>We’ll sync owner custom claims, create default teams, and email password links automatically.</span>
                      </div>
                      <Button type="submit" disabled={provisioning} className="min-w-[14rem] rounded-full">
                        {provisioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Provision organisation
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-6 xl:sticky xl:top-28">
                <Card className="rounded-3xl border border-border/70 bg-card/95 shadow-lg">
                  <CardHeader className="space-y-3 border-b border-border/60 px-6 py-6">
                    <CardTitle className="text-lg font-semibold">Rollout playbook</CardTitle>
                    <CardDescription className="text-sm">Quick reminders before you hit “Provision”.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-6 py-6 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <p>Double-check the owner email — we’ll validate and send a password reset immediately after provisioning.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <p>Workspace names become the folder roots for documents, evidence, and action plans.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <p>Service profile metadata tunes audit checklists, so capture it when you can.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-border/70 bg-card/95 shadow-lg">
                  <CardHeader className="space-y-2 border-b border-border/60 px-6 py-6">
                    <CardTitle className="text-lg font-semibold">Latest provision</CardTitle>
                    <CardDescription className="text-sm">The most recent tenant rollout in a snapshot.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-6 py-6 text-sm">
                    {lastProvision ? (
                      <div className="space-y-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-base font-semibold">{lastProvision.organisation.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Owner {lastProvision.owner.email} •{' '}
                              {lastProvision.workspaces.length > 1
                                ? `${lastProvision.workspaces.length} workspaces`
                                : lastProvision.workspaces[0]?.name ?? lastProvision.workspace?.name ?? '1 workspace'}
                            </p>
                          </div>
                          <Badge variant={lastProvision.userCreated ? 'default' : 'secondary'} className="w-fit rounded-full">
                            {lastProvision.userCreated ? 'New user created' : 'Existing user linked'}
                          </Badge>
                        </div>
                        {lastProvision.workspaces.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {lastProvision.workspaces.map((workspace) => (
                              <Badge key={workspace.id} variant="outline" className="rounded-full text-xs">
                                {workspace.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {Array.isArray(lastProvision.seededMembers) && lastProvision.seededMembers.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seeded team members</p>
                            <div className="space-y-1">
                              {lastProvision.seededMembers.slice(0, 4).map((member) => (
                                <div key={`${member.email}-${member.id ?? 'seeded'}`} className="flex items-center justify-between text-xs">
                                  <span className="truncate pr-3">{member.email}</span>
                                  <span className={member.error ? 'text-destructive' : 'text-muted-foreground'}>
                                    {member.error ? 'Failed' : member.emailSent ? 'Invite sent' : 'Created'}
                                  </span>
                                </div>
                              ))}
                              {lastProvision.seededMembers.length > 4 && (
                                <p className="text-xs text-muted-foreground">+{lastProvision.seededMembers.length - 4} more</p>
                              )}
                            </div>
                          </div>
                        )}
                        {lastProvision.passwordLink && (
                          <div className="truncate text-xs text-muted-foreground">
                            Password link: <a href={lastProvision.passwordLink} className="underline" target="_blank" rel="noreferrer">{lastProvision.passwordLink}</a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                        Provision a tenant to see a live summary here.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-border/70 bg-card/95 shadow-lg">
                  <CardHeader className="space-y-2 border-b border-border/60 px-6 py-6">
                    <CardTitle className="text-lg font-semibold">Recent organisations</CardTitle>
                    <CardDescription className="text-sm">Tap any tenant row to jump straight into its cockpit.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 py-0">
                    <ScrollArea className="h-[32rem]">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
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
                              <TableCell colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
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
                                  selectedOrganisationId === org.id && 'bg-muted/40'
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
              </div>
            </section>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight">Global User Management</h2>
                    <p className="text-sm text-muted-foreground">Search, view, and manage all users across organisations</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-64"
                    />
                    <Button variant="outline" onClick={() => fetchGlobalUsers(userSearch, 0)} disabled={usersLoading}>
                      {usersLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                      Search
                    </Button>
                  </div>
                </div>

                {userStatistics && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Total Users</CardDescription>
                        <CardTitle className="text-2xl font-semibold">{userStatistics.totalUsers.toLocaleString()}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>New (30 days)</CardDescription>
                        <CardTitle className="text-2xl font-semibold">{userStatistics.newUsersLast30Days.toLocaleString()}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Active (30 days)</CardDescription>
                        <CardTitle className="text-2xl font-semibold">{userStatistics.activeUsersLast30Days.toLocaleString()}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardDescription>Role Distribution</CardDescription>
                        <CardTitle className="text-sm font-semibold">
                          {Object.entries(userStatistics.roleDistribution).map(([role, count]) => (
                            <div key={role} className="flex justify-between">
                              <span className="capitalize">{role}:</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>
                )}

                <Card className="border border-border/70">
                  <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>Manage user accounts and permissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Organisations</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersLoading ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                Loading users...
                              </TableCell>
                            </TableRow>
                          ) : globalUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No users found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            globalUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {user.avatarUrl && (
                                      <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                                    )}
                                    <div>
                                      <p className="font-medium">{user.name || 'Unnamed'}</p>
                                      <p className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{user.email || '—'}</TableCell>
                                <TableCell>
                                  <Select
                                    value={user.role || 'user'}
                                    onValueChange={(value) => handleUserUpdate(user.id, { role: value })}
                                    disabled={userUpdating === user.id}
                                  >
                                    <SelectTrigger className="h-8 w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="owner">Owner</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={user.status || 'active'}
                                    onValueChange={(value) => handleUserUpdate(user.id, { status: value })}
                                    disabled={userUpdating === user.id}
                                  >
                                    <SelectTrigger className="h-8 w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {user.organisations?.slice(0, 2).map((org) => (
                                      <Badge key={org.id} variant="secondary" className="text-xs">
                                        {org.name}
                                      </Badge>
                                    ))}
                                    {user.organisationCount && user.organisationCount > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{user.organisationCount - 2}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" disabled={userUpdating === user.id}>
                                    {userUpdating === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    {userTotal > 50 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Showing {globalUsers.length} of {userTotal} users
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserOffset(Math.max(0, userOffset - 50));
                              fetchGlobalUsers(userSearch, Math.max(0, userOffset - 50));
                            }}
                            disabled={userOffset === 0}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserOffset(userOffset + 50);
                              fetchGlobalUsers(userSearch, userOffset + 50);
                            }}
                            disabled={userOffset + 50 >= userTotal}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>
          </TabsContent>
        </Tabs>

      <Dialog open={!!selectedOrganisationId} onOpenChange={(open) => { if (!open) handleCloseOrganisation(); }}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden border border-border/70 bg-card/95 p-0 shadow-2xl">
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
            <div className="flex max-h-[calc(90vh-6rem)] flex-col">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="flex flex-1 flex-col">
                <div className="px-6 pb-4 pt-2">
                  <TabsList className="grid grid-cols-5 rounded-full bg-muted/60 p-1">
                    <TabsTrigger value="overview" className="rounded-full">Overview</TabsTrigger>
                    <TabsTrigger value="workspaces" className="rounded-full">Workspaces</TabsTrigger>
                    <TabsTrigger value="members" className="rounded-full">Members</TabsTrigger>
                    <TabsTrigger value="invites" className="rounded-full">Invites</TabsTrigger>
                    <TabsTrigger value="features" className="rounded-full">Feature Flags</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
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
                        <ScrollArea className="max-h-[50vh] pr-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="hidden md:table-cell">Role</TableHead>
                                <TableHead className="hidden xl:table-cell">Teams</TableHead>
                                <TableHead className="hidden lg:table-cell">Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {organisationDetail.members.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground">No members yet.</TableCell>
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
                                    <TableCell className="hidden xl:table-cell align-middle">
                                      {member.teamKeys.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {member.teamKeys.map((teamKey) => (
                                            <Badge key={teamKey} variant="outline">
                                              {ORGANISATION_TEAM_LABELS[teamKey]}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
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
                                    <TableCell>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleMemberDelete(member.id)}
                                        disabled={memberDeleting === member.id}
                                      >
                                        {memberDeleting === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                      </Button>
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
                          <Select value={memberForm.role} onValueChange={(value: MemberRoleKey) => handleMemberRoleChange(value)}>
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
                        <div className="space-y-2">
                          <Label>Team access</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start">
                                {memberForm.teamKeys.length > 0
                                  ? memberForm.teamKeys.map((key) => ORGANISATION_TEAM_LABELS[key]).join(', ')
                                  : 'Select teams'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-2">
                              <div className="space-y-2">
                                {ORGANISATION_TEAM_KEYS.map((teamKey) => (
                                  <div key={teamKey} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={teamKey}
                                      checked={memberForm.teamKeys.includes(teamKey)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setMemberForm((prev) => ({ ...prev, teamKeys: [...prev.teamKeys, teamKey] }));
                                        } else {
                                          setMemberForm((prev) => ({ ...prev, teamKeys: prev.teamKeys.filter((key) => key !== teamKey) }));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={teamKey}>{ORGANISATION_TEAM_LABELS[teamKey]}</Label>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex items-center justify-between rounded border border-border/60 p-3">
                          <div>
                            <p className="text-sm font-medium">Send password email</p>
                            <p className="text-xs text-muted-foreground">If user exists, they can still reset their password.</p>
                          </div>
                          <Switch checked={memberForm.sendPasswordEmail} onCheckedChange={(checked) => setMemberForm((prev) => ({ ...prev, sendPasswordEmail: checked }))} disabled={memberForm.generateInviteLink} />
                        </div>
                        <div className="flex items-center justify-between rounded border border-border/60 p-3">
                          <div>
                            <p className="text-sm font-medium">Generate invite link instead</p>
                            <p className="text-xs text-muted-foreground">Provide a direct link to share without sending email. User will be taken straight to set password.</p>
                          </div>
                          <Switch checked={memberForm.generateInviteLink} onCheckedChange={(checked) => setMemberForm((prev) => ({ ...prev, generateInviteLink: checked, sendPasswordEmail: checked ? false : prev.sendPasswordEmail }))} />
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
                </div>
              </Tabs>
            </div>
          ) : (
            <div className="px-6 py-8 text-sm text-muted-foreground">Select an organisation to view details.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
};

export default OwnerConsolePage;

