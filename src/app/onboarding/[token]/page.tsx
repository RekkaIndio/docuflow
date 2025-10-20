"use client";

import { use, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Building,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LogoSvg from "@/assets/docuflow-logo.svg";

const SUPPORT_EMAIL = "support@cg360.co.uk";

type ManagementContactState = {
  id: string;
  name: string;
  email: string;
  notKnown: boolean;
};

type DraftState = {
  organisationName: string;
  serviceType: string;
  locationCount: number | "";
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  country: string;
  goLiveNotes: string;
  ownerName: string;
  ownerEmail: string;
  ownerNotKnown: boolean;
  managementContacts: ManagementContactState[];
  notes: string;
};

type RouteParams = { token: string };

type StatusMeta = {
  label: string;
  badgeClass: string;
  helper: string;
  icon: ReactNode;
};

function buildDefaultManagementContacts(): ManagementContactState[] {
  return [
    { id: crypto.randomUUID(), name: "", email: "", notKnown: false },
    { id: crypto.randomUUID(), name: "", email: "", notKnown: false },
  ];
}

const defaultDraft: DraftState = {
  organisationName: "",
  serviceType: "",
  locationCount: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postcode: "",
  country: "United Kingdom",
  goLiveNotes: "",
  ownerName: "",
  ownerEmail: "",
  ownerNotKnown: false,
  managementContacts: buildDefaultManagementContacts(),
  notes: "",
};

function normaliseNumberInput(value: string): number | "" {
  if (!value.trim()) return "";
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return "";
  return parsed;
}

function BrandMark({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-2xl bg-slate-900/95 shadow-2xl ring-1 ring-white/30",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={LogoSvg}
        alt="CG360"
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        priority
      />
    </span>
  );
}

function BrandedBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-[-40%] h-[520px] bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.28),_transparent_72%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-[-10%] h-full w-[60%] bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_68%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16 sm:px-6">
        {children}
      </div>
    </div>
  );
}

export default function OnboardingSnapshotPage({
  params,
}: {
  params: RouteParams | Promise<RouteParams>;
}) {
  const paramsPromise = useMemo(() => {
    const candidate = params as RouteParams | Promise<RouteParams>;
    if (typeof (candidate as Promise<RouteParams>).then === "function") {
      return candidate as Promise<RouteParams>;
    }
    return Promise.resolve(candidate as RouteParams);
  }, [params]);

  const { token } = use(paramsPromise);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<"pending" | "submitted" | "expired">("pending");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(defaultDraft);
  const [recipientEmail, setRecipientEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/onboarding/${token}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Unable to load onboarding invite");
        }

        const payload = (await response.json()) as {
          invite?: Record<string, unknown>;
          draft?: Record<string, unknown>;
        };
        if (cancelled) return;

        const invite = payload?.invite ?? {};
        const draftData = payload?.draft ?? {};

        setInviteStatus((invite.status as string) === "submitted" ? "submitted" : (invite.status as "pending" | "expired" | undefined) ?? "pending");
        setRecipientEmail((invite.recipientEmail as string) ?? null);
        setExpiresAt((invite.expiresAt as string) ?? null);
        setSubmittedAt((invite.submittedAt as string) ?? null);

        setDraft((prev) => {
          const next: DraftState = {
            ...prev,
            organisationName:
              (draftData.organisationName as string | undefined) ?? (invite.organisationName as string | undefined) ?? prev.organisationName,
            serviceType: (draftData.serviceType as string | undefined) ?? prev.serviceType,
            locationCount:
              typeof draftData.locationCount === "number"
                ? (draftData.locationCount as number)
                : prev.locationCount,
            addressLine1: (draftData.addressLine1 as string | undefined) ?? prev.addressLine1,
            addressLine2: (draftData.addressLine2 as string | undefined) ?? prev.addressLine2,
            city: (draftData.city as string | undefined) ?? prev.city,
            postcode: (draftData.postcode as string | undefined) ?? prev.postcode,
            country: (draftData.country as string | undefined) ?? prev.country,
            goLiveNotes: (draftData.goLiveNotes as string | undefined) ?? prev.goLiveNotes,
            ownerName: prev.ownerName,
            ownerEmail: prev.ownerEmail,
            ownerNotKnown: prev.ownerNotKnown,
            managementContacts: prev.managementContacts,
            notes: (draftData.notes as string | undefined) ?? prev.notes,
          };

          const ownerContact = (draftData.ownerContact ?? invite.ownerContact) as
            | { name?: string; email?: string; notKnown?: boolean }
            | undefined;

          if (ownerContact) {
            next.ownerName = ownerContact.name ?? prev.ownerName;
            next.ownerEmail = ownerContact.email ?? (invite.recipientEmail as string | undefined) ?? prev.ownerEmail;
            next.ownerNotKnown = ownerContact.notKnown ?? false;
          } else {
            next.ownerEmail = (invite.recipientEmail as string | undefined) ?? prev.ownerEmail;
            next.ownerNotKnown = false;
          }

          const managementContacts = Array.isArray(draftData.managementContacts)
            ? (draftData.managementContacts as Array<{ name?: string; email?: string; notKnown?: boolean }>).
                map((contact) => ({
                  id: crypto.randomUUID(),
                  name: contact?.name ?? "",
                  email: contact?.email ?? "",
                  notKnown: contact?.notKnown === true,
                }))
            : null;

          next.managementContacts = managementContacts?.length
            ? managementContacts
            : buildDefaultManagementContacts();

          return next;
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const managementCountFilled = useMemo(() => {
    return draft.managementContacts.filter((contact) =>
      contact.email.trim() || contact.name.trim() || contact.notKnown,
    ).length;
  }, [draft.managementContacts]);

  const completionScore = useMemo(() => {
    let sectionsCompleted = 0;
    if (draft.organisationName.trim()) sectionsCompleted += 1;
    if (draft.ownerEmail.trim() || draft.ownerNotKnown) sectionsCompleted += 1;
    if (managementCountFilled > 0) sectionsCompleted += 1;
    if (
      draft.addressLine1.trim() ||
      draft.city.trim() ||
      draft.notes.trim() ||
      draft.goLiveNotes.trim()
    ) {
      sectionsCompleted += 1;
    }
    return Math.min(100, Math.round((sectionsCompleted / 4) * 100));
  }, [
    draft.addressLine1,
    draft.city,
    draft.goLiveNotes,
    draft.notes,
    draft.organisationName,
    draft.ownerEmail,
    draft.ownerNotKnown,
    managementCountFilled,
  ]);

  const progressMessage = useMemo(() => {
    if (completionScore >= 85) {
      return "Almost there — give everything a quick review and hit submit when you’re ready.";
    }
    if (completionScore >= 55) {
      return "Great progress! Finish the contact details and any notes you want us to know about.";
    }
    return "Start with the organisation basics below. You can save as you go and return anytime.";
  }, [completionScore]);

  const formattedExpiry = useMemo(() => {
    return expiresAt ? new Date(expiresAt).toLocaleString() : null;
  }, [expiresAt]);

  const expired = useMemo(() => {
    if (inviteStatus === "submitted") return false;
    if (inviteStatus === "expired") return true;
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() < Date.now();
  }, [inviteStatus, expiresAt]);

  const statusMeta = useMemo<StatusMeta>(() => {
    if (expired) {
      return {
        label: "Link expired",
        badgeClass: "border border-amber-200 bg-amber-100/80 text-amber-800",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        helper: "Reply to the original email and we’ll refresh your onboarding link straight away.",
      };
    }
    if (inviteStatus === "submitted") {
      return {
        label: "Completed",
        badgeClass: "border border-emerald-200 bg-emerald-100/80 text-emerald-700",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        helper: "Thanks again — our onboarding team is already configuring your workspace.",
      };
    }
    return {
      label: "Awaiting details",
      badgeClass: "border border-sky-200 bg-sky-100/80 text-sky-800",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      helper: "Share the essentials below and we’ll take care of the heavy lifting.",
    };
  }, [expired, inviteStatus]);

  const handleManagementChange = (
    id: string,
    updates: Partial<Omit<ManagementContactState, "id">>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      managementContacts: prev.managementContacts.map((contact) =>
        contact.id === id
          ? {
              ...contact,
              ...updates,
            }
          : contact,
      ),
    }));
  };

  const handleAddManagementContact = () => {
    setDraft((prev) => ({
      ...prev,
      managementContacts: [
        ...prev.managementContacts,
        { id: crypto.randomUUID(), name: "", email: "", notKnown: false },
      ],
    }));
  };

  const handleRemoveManagementContact = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      managementContacts: prev.managementContacts.filter((contact) => contact.id !== id),
    }));
  };

  const persistDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/onboarding/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationName: draft.organisationName,
          serviceType: draft.serviceType,
          locationCount: draft.locationCount === "" ? null : draft.locationCount,
          addressLine1: draft.addressLine1,
          addressLine2: draft.addressLine2,
          city: draft.city,
          postcode: draft.postcode,
          country: draft.country,
          goLiveNotes: draft.goLiveNotes,
          ownerContact: {
            name: draft.ownerName,
            email: draft.ownerEmail,
            notKnown: draft.ownerNotKnown,
          },
          managementContacts: draft.managementContacts.map(({ name, email, notKnown }) => ({
            name,
            email,
            notKnown,
          })),
          notes: draft.notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to save progress");
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save progress");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const saved = await persistDraft();
    if (!saved) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to submit details");
      }

      const payload = (await response.json().catch(() => null)) as
        | { status?: string; submittedAt?: string }
        | null;

      setInviteStatus("submitted");
      setSubmittedAt(payload?.submittedAt ?? new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit details");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <BrandedBackdrop>
        <Card className="w-full max-w-md border border-white/15 bg-white/95 text-slate-900 shadow-2xl">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <BrandMark />
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your onboarding snapshot…
            </div>
          </CardContent>
        </Card>
      </BrandedBackdrop>
    );
  }

  if (expired) {
    return (
      <BrandedBackdrop>
        <Card className="w-full max-w-xl border border-white/20 bg-white/95 text-slate-900 shadow-2xl">
          <CardContent className="space-y-5 px-8 py-10 text-center sm:px-12">
            <BrandMark className="mx-auto" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              This onboarding link has expired
            </h1>
            <p className="text-sm text-slate-600">
              Reply to the original email and we’ll send a fresh link straight away.
            </p>
          </CardContent>
        </Card>
      </BrandedBackdrop>
    );
  }

  if (inviteStatus === "submitted") {
    return (
      <BrandedBackdrop>
        <Card className="w-full max-w-xl border border-emerald-200/60 bg-emerald-50/70 text-emerald-900 shadow-2xl">
          <CardContent className="space-y-5 px-8 py-10 text-center sm:px-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-emerald-50 shadow-lg">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Details received — thank you!
            </h1>
            <p className="text-sm text-emerald-900/80">
              Our onboarding team is already configuring CG360 for you. We’ll reach out if we need anything else.
            </p>
            {submittedAt && (
              <p className="text-xs text-emerald-900/70">
                Submitted {new Date(submittedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </BrandedBackdrop>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-[-42%] h-[560px] bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.28),_transparent_72%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-[-10%] h-full w-[60%] bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_68%)]" />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border border-white/10 bg-white/95 text-slate-900 shadow-2xl backdrop-blur">
          <CardContent className="space-y-6 p-8 sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <BrandMark className="shrink-0" />
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    CG360 onboarding
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    Let’s get your workspace ready
                  </h1>
                  <p className="max-w-2xl text-sm text-slate-600">
                    Share the essentials about your organisation so we can configure CG360 ahead of your go-live. It only
                    takes a few minutes, and you can save your progress at any point.
                  </p>
                </div>
              </div>
              <Badge
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm",
                  statusMeta.badgeClass,
                )}
              >
                {statusMeta.icon}
                {statusMeta.label}
              </Badge>
            </div>
            <Separator />
            <div className="flex flex-col gap-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
              <p className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-400" />
                {statusMeta.helper}
              </p>
              {formattedExpiry && (
                <p className="text-xs text-slate-500">
                  Link valid until <span className="font-medium text-slate-600">{formattedExpiry}</span>. Need more time?
                  Reply to the invite and we’ll extend it.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200/80 bg-rose-50/75 px-4 py-3 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.45fr)]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 text-slate-900 shadow-xl backdrop-blur">
              <CardHeader className="space-y-3 border-b border-slate-100/70 bg-slate-50/70 px-6 py-6">
                <Badge
                  variant="outline"
                  className="w-fit rounded-full border-slate-200/80 bg-white text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Step 1
                </Badge>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Building className="h-4 w-4" />
                  Organisation snapshot
                </div>
                <CardDescription className="text-sm text-slate-600">
                  Introduce your organisation so we can match the right templates and reporting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="organisationName">Organisation name</Label>
                    <Input
                      id="organisationName"
                      value={draft.organisationName}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, organisationName: event.target.value }))
                      }
                      placeholder="Acme Care Group"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service type</Label>
                    <Input
                      id="serviceType"
                      value={draft.serviceType}
                      onChange={(event) => setDraft((prev) => ({ ...prev, serviceType: event.target.value }))}
                      placeholder="Residential care (Elderly)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationCount">Number of locations</Label>
                    <Input
                      id="locationCount"
                      type="number"
                      min={0}
                      value={draft.locationCount === "" ? "" : String(draft.locationCount)}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          locationCount: normaliseNumberInput(event.target.value),
                        }))
                      }
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goLiveNotes">Go-live timing or key dates</Label>
                    <Input
                      id="goLiveNotes"
                      value={draft.goLiveNotes}
                      onChange={(event) => setDraft((prev) => ({ ...prev, goLiveNotes: event.target.value }))}
                      placeholder="We plan to launch in early June"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 text-slate-900 shadow-xl backdrop-blur">
              <CardHeader className="space-y-3 border-b border-slate-100/70 bg-slate-50/70 px-6 py-6">
                <Badge
                  variant="outline"
                  className="w-fit rounded-full border-slate-200/80 bg-white text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Step 2
                </Badge>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <MapPin className="h-4 w-4" />
                  Operational base
                </div>
                <CardDescription className="text-sm text-slate-600">
                  These details help us set regional defaults for scheduling, policies, and audits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="addressLine1">Primary address</Label>
                    <Input
                      id="addressLine1"
                      value={draft.addressLine1}
                      onChange={(event) => setDraft((prev) => ({ ...prev, addressLine1: event.target.value }))}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine2">Address line 2</Label>
                    <Input
                      id="addressLine2"
                      value={draft.addressLine2}
                      onChange={(event) => setDraft((prev) => ({ ...prev, addressLine2: event.target.value }))}
                      placeholder="Suite 2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={draft.city}
                      onChange={(event) => setDraft((prev) => ({ ...prev, city: event.target.value }))}
                      placeholder="Leeds"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      value={draft.postcode}
                      onChange={(event) => setDraft((prev) => ({ ...prev, postcode: event.target.value }))}
                      placeholder="LS1 1AA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={draft.country}
                      onChange={(event) => setDraft((prev) => ({ ...prev, country: event.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 text-slate-900 shadow-xl backdrop-blur">
              <CardHeader className="space-y-3 border-b border-slate-100/70 bg-slate-50/70 px-6 py-6">
                <Badge
                  variant="outline"
                  className="w-fit rounded-full border-slate-200/80 bg-white text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Step 3
                </Badge>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Users className="h-4 w-4" />
                  Key contacts
                </div>
                <CardDescription className="text-sm text-slate-600">
                  We’ll add these people to the right teams so they’re ready to lead on day one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 py-6">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                  <Label className="text-xs uppercase tracking-[0.28em] text-slate-500">
                    Organisation owner
                  </Label>
                  <p className="mt-1 text-sm text-slate-600">
                    This person gets billing access and the owner console.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ownerName">Name</Label>
                      <Input
                        id="ownerName"
                        value={draft.ownerName}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, ownerName: event.target.value }))
                        }
                        placeholder="Samantha Riley"
                        disabled={draft.ownerNotKnown}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerEmail">Email</Label>
                      <Input
                        id="ownerEmail"
                        type="email"
                        value={draft.ownerEmail}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, ownerEmail: event.target.value }))
                        }
                        placeholder={recipientEmail ?? "owner@example.com"}
                        disabled={draft.ownerNotKnown}
                      />
                    </div>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      checked={draft.ownerNotKnown}
                      onCheckedChange={(checked) =>
                        setDraft((prev) => ({ ...prev, ownerNotKnown: Boolean(checked) }))
                      }
                    />
                    We’ll confirm the owner later
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs uppercase tracking-[0.28em] text-slate-500">
                      Management team
                    </Label>
                    <p className="mt-1 text-sm text-slate-600">
                      Add the managers who will lead day to day. We recommend at least one contact.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddManagementContact}>
                    Add another manager
                  </Button>
                </div>

                <div className="space-y-4">
                  {draft.managementContacts.map((contact, index) => (
                    <div
                      key={contact.id}
                      className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-600">
                        <span>Management contact {index + 1}</span>
                        {draft.managementContacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveManagementContact(contact.id)}
                            className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={contact.name}
                            onChange={(event) =>
                              handleManagementChange(contact.id, { name: event.target.value })
                            }
                            placeholder="Jordan Blake"
                            disabled={contact.notKnown}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            value={contact.email}
                            onChange={(event) =>
                              handleManagementChange(contact.id, { email: event.target.value })
                            }
                            placeholder="manager@example.com"
                            disabled={contact.notKnown}
                          />
                        </div>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <Checkbox
                          checked={contact.notKnown}
                          onCheckedChange={(checked) =>
                            handleManagementChange(contact.id, { notKnown: Boolean(checked) })
                          }
                        />
                        We’ll confirm this manager later
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Currently {managementCountFilled} manager{managementCountFilled === 1 ? "" : "s"} captured.
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 text-slate-900 shadow-xl backdrop-blur">
              <CardHeader className="space-y-3 border-b border-slate-100/70 bg-slate-50/70 px-6 py-6">
                <Badge
                  variant="outline"
                  className="w-fit rounded-full border-slate-200/80 bg-white text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Step 4
                </Badge>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <CalendarClock className="h-4 w-4" />
                  Anything else we should know?
                </div>
                <CardDescription className="text-sm text-slate-600">
                  Optional notes for our onboarding team — integrations, priorities, or anything unique.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-6">
                <Textarea
                  value={draft.notes}
                  onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="We’ll need support with migrating existing policies."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-3xl border border-white/10 bg-white/95 text-slate-900 shadow-xl backdrop-blur">
              <CardHeader className="space-y-2 px-6 py-6">
                <CardTitle className="text-lg font-semibold">Your progress</CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  We autosave whenever you hit “Save progress”.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span className="font-medium text-slate-700">{completionScore}% complete</span>
                  <span className="text-xs text-slate-500">
                    {managementCountFilled} manager{managementCountFilled === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-[width] duration-300"
                    style={{ width: `${Math.max(8, completionScore)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">{progressMessage}</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-white/10 bg-white/95 text-slate-900 shadow-xl backdrop-blur">
              <CardHeader className="space-y-2 px-6 py-6">
                <CardTitle className="text-lg font-semibold">Need a hand?</CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  We’re happy to walk through the form together.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <Mail className="mt-1 h-4 w-4 text-slate-400" />
                  <div>
                    Prefer email?{" "}
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="font-medium text-slate-700 underline-offset-4 hover:underline"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <Phone className="mt-1 h-4 w-4 text-slate-400" />
                  <div>Need a quick call? Reply to the invite with a convenient time and we’ll ring you.</div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        <div className="mt-10 flex flex-col gap-3 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs">
            Need help now? Email{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-slate-300 underline-offset-4 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            or reply to the invite and we’ll respond within one working day.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void persistDraft();
              }}
              disabled={saving || submitting}
              className="w-full border-slate-300 text-slate-700 hover:bg-slate-100 sm:w-auto"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save progress
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={saving || submitting}
              className={cn("w-full sm:w-auto", submitting && "opacity-90")}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit details
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
