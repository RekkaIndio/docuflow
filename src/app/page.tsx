"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/icons/logo";
import { useCalendly } from "@/context/calendly-context";
import { Footer } from "@/components/footer";
import {
  Sparkles,
  Play,
  ArrowRight,
  BrainCircuit,
  FileText,
  FileCheck,
  ClipboardList,
  Users,
  Shield,
  ShieldCheck,
  BarChart3,
  Cpu,
  CheckCircle2,
  Calendar,
  Layers,
  Puzzle,
  AlertTriangle,
  Timer,
  DollarSign,
  GraduationCap,
  PoundSterling,
  BookOpen,
  Bell
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Capability = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  preview: ReactNode;
};

type WorkflowStage = {
  id: string;
  title: string;
  subtitle: string;
  bullets: string[];
  icon: LucideIcon;
  accent: string;
  highlight: ReactNode;
};

type ImpactMetric = {
  id: string;
  value: string;
  label: string;
  detail: string;
};

type PainPoint = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const capabilityCards: Capability[] = [
  {
    id: "smart-docs",
    name: "Smart Document Management",
    description: "AI triages evidence, locks versions, and keeps every inspection artefact a click away.",
    icon: BrainCircuit,
    accent: "from-violet-500 via-indigo-500 to-blue-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50 px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-violet-900">Falls Policy.pdf</p>
            <p className="text-xs text-violet-600">AI tagged • 32 insights</p>
          </div>
          <Badge variant="secondary" className="bg-violet-200/70 text-violet-900">Ready</Badge>
        </div>
        <div className="grid gap-2 text-slate-700">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="text-xs font-medium uppercase text-slate-500">Workspace</span>
            <span className="text-sm font-semibold text-slate-900">Safety & Risk</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="text-xs font-medium uppercase text-slate-500">Version</span>
            <span className="text-sm font-semibold text-slate-900">v6 • locked</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "dependency",
    name: "Dependency Calculator",
    description: "Model staffing need per acuity level and surface shortages instantly.",
    icon: Cpu,
    accent: "from-sky-500 via-cyan-500 to-emerald-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
          <span className="text-sm font-semibold text-sky-900">Current ratio</span>
          <span className="text-lg font-bold text-sky-900">1:3.1</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs font-medium">
          <div className="rounded-lg bg-white px-2 py-2 text-slate-600">
            <p className="text-[11px] uppercase text-slate-400">Low</p>
            <p className="text-sm font-semibold text-slate-900">14 residents</p>
          </div>
          <div className="rounded-lg bg-white px-2 py-2 text-slate-600">
            <p className="text-[11px] uppercase text-slate-400">Medium</p>
            <p className="text-sm font-semibold text-slate-900">9 residents</p>
          </div>
          <div className="rounded-lg bg-white px-2 py-2 text-slate-600">
            <p className="text-[11px] uppercase text-slate-400">High</p>
            <p className="text-sm font-semibold text-slate-900">5 residents</p>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Night requirement</span>
            <span className="font-semibold text-slate-900">+2 staff</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "policies",
    name: "Policies & Governance",
    description: "Version control, approvals, and acknowledgements tracked without spreadsheets.",
    icon: FileText,
    accent: "from-blue-500 via-slate-500 to-slate-800",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-blue-900">Medication Management</p>
            <p className="text-xs text-blue-700">Awaiting 3 approvals</p>
          </div>
          <Badge variant="secondary" className="bg-blue-200/70 text-blue-900">Due in 3 days</Badge>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="mb-2 flex items-center justify-between">
            <span>Team sign-off</span>
            <span className="font-semibold text-slate-900">42 / 50</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "audits",
    name: "Audits & Evidence",
    description: "Live checklists, evidence capture, and instant inspection exports.",
    icon: FileCheck,
    accent: "from-emerald-500 via-green-500 to-lime-500",
    preview: (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
          <p className="text-sm font-semibold text-emerald-900">Infection Control Audit</p>
          <p className="text-xs text-emerald-700">Due Friday • Registered Manager</p>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Hand hygiene spot checks</span>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Complete</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Sterilisation log evidence</span>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">Evidence</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Corrective actions</span>
            <Badge variant="secondary" className="bg-red-100 text-red-700">2 open</Badge>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "action-plans",
    name: "Action Plans",
    description: "Assign owners, capture updates, and auto-remind the team until closed.",
    icon: ClipboardList,
    accent: "from-orange-500 via-amber-500 to-yellow-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
          <span className="text-sm font-semibold text-orange-900">Falls prevention plan</span>
          <Badge variant="secondary" className="bg-orange-200/70 text-orange-900">On track</Badge>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Install sensor mats</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Night staff refresher</span>
            <span className="rounded-full bg-orange-100 px-2 py-[2px] text-[11px] font-semibold text-orange-800">Due tomorrow</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Evidence upload</span>
            <span className="text-[11px] font-semibold text-slate-900">3 / 5 files</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "supervisions",
    name: "Supervisions",
    description: "Plan sessions, capture notes, and track supervision coverage for every colleague.",
    icon: Users,
    accent: "from-cyan-500 via-sky-500 to-blue-500",
    preview: (
      <div className="space-y-3">
        <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2">
          <p className="text-sm font-semibold text-cyan-900">Supervision schedule</p>
          <p className="text-xs text-cyan-700">This week</p>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="font-medium text-slate-700">Mia Smith</span>
            <span className="text-slate-500">Tue • 14:00</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="font-medium text-slate-700">Omar Malik</span>
            <span className="rounded-full bg-cyan-100 px-2 py-[2px] text-[11px] font-semibold text-cyan-800">Notes added</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="font-medium text-slate-700">Lily Chan</span>
            <span className="text-slate-500">Fri • 10:30</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "inspection-access",
    name: "Inspection Level Access",
    description: "Create secure inspector portals with expiries, audit trails, and curated collections.",
    icon: Shield,
    accent: "from-pink-500 via-rose-500 to-fuchsia-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-pink-100 bg-pink-50 px-3 py-2">
          <span className="text-sm font-semibold text-pink-900">Inspection portal</span>
          <Badge variant="secondary" className="bg-pink-200/70 text-pink-900">Active</Badge>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>CQC access link</span>
            <span className="font-semibold text-slate-900">Expires in 5 days</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Shared collections</span>
            <span className="font-semibold text-slate-900">Policies • Audits • Docs</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Activity log</span>
            <span className="text-[11px] font-semibold text-slate-900">14 views today</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "admin-overview",
    name: "Admin Overview",
    description: "Global command centre for organisations, permissions, and performance.",
    icon: Layers,
    accent: "from-slate-900 via-slate-700 to-slate-500",
    preview: (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white px-2 py-3">
            <p className="text-[11px] uppercase text-slate-400">Workspaces</p>
            <p className="text-lg font-bold text-slate-900">12</p>
          </div>
          <div className="rounded-lg bg-white px-2 py-3">
            <p className="text-[11px] uppercase text-slate-400">Users</p>
            <p className="text-lg font-bold text-slate-900">248</p>
          </div>
          <div className="rounded-lg bg-white px-2 py-3">
            <p className="text-[11px] uppercase text-slate-400">Active flags</p>
            <p className="text-lg font-bold text-amber-600">3</p>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Platform uptime</span>
            <span className="font-semibold text-slate-900">99.98%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-[96%] rounded-full bg-gradient-to-r from-slate-900 to-slate-600"></div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "analytics-suite",
    name: "Full Analytical Suite",
    description: "Predictive trends, variance analysis, and ready-made executive dashboards.",
    icon: BarChart3,
    accent: "from-teal-500 via-emerald-500 to-cyan-500",
    preview: (
      <div className="space-y-3">
        <div className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2">
          <p className="text-sm font-semibold text-teal-900">Operational efficiency</p>
          <p className="text-xs text-teal-700">Forecast: +8.7%</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="h-16 w-6 rounded-full bg-teal-200"></div>
          <div className="h-24 w-6 rounded-full bg-teal-300"></div>
          <div className="h-12 w-6 rounded-full bg-teal-200"></div>
          <div className="h-20 w-6 rounded-full bg-emerald-300"></div>
          <div className="h-28 w-6 rounded-full bg-teal-400"></div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Insights generated</span>
          <span className="font-semibold text-slate-900">12 this week</span>
        </div>
      </div>
    )
  },
  {
    id: "rotas",
    name: "Rotas & Scheduling",
    description: "Manage staff rotas, track shifts, and ensure optimal coverage.",
    icon: Calendar,
    accent: "from-green-500 via-lime-500 to-emerald-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50 px-3 py-2">
          <span className="text-sm font-semibold text-green-900">Weekly rota</span>
          <Badge variant="secondary" className="bg-green-200/70 text-green-900">Published</Badge>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Monday • Night shift</span>
            <span className="font-semibold text-slate-900">4 staff</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Tuesday • Day shift</span>
            <span className="font-semibold text-slate-900">6 staff</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Coverage alert</span>
            <span className="rounded-full bg-amber-100 px-2 py-[2px] text-[11px] font-semibold text-amber-800">1 short</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "lessons-rca",
    name: "Lessons Learned & RCA",
    description: "Capture incidents, perform root cause analysis, and implement preventive measures.",
    icon: BookOpen,
    accent: "from-red-500 via-orange-500 to-yellow-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-3 py-2">
          <span className="text-sm font-semibold text-red-900">Falls incident RCA</span>
          <Badge variant="secondary" className="bg-red-200/70 text-red-900">In progress</Badge>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Root cause identified</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Action plan created</span>
            <span className="rounded-full bg-orange-100 px-2 py-[2px] text-[11px] font-semibold text-orange-800">3 actions</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Lessons documented</span>
            <span className="font-semibold text-slate-900">Shared with team</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "notifications",
    name: "Sova & CQC Notifications",
    description: "Log and track notifications to Sova and CQC for compliance and auditing.",
    icon: Bell,
    accent: "from-purple-500 via-pink-500 to-rose-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50 px-3 py-2">
          <span className="text-sm font-semibold text-purple-900">Notification log</span>
          <Badge variant="secondary" className="bg-purple-200/70 text-purple-900">Up to date</Badge>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Sova notification</span>
            <span className="font-semibold text-slate-900">Sent • 2 days ago</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>CQC incident report</span>
            <span className="font-semibold text-slate-900">Filed • 1 week ago</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Follow-up required</span>
            <span className="rounded-full bg-pink-100 px-2 py-[2px] text-[11px] font-semibold text-pink-800">Due soon</span>
          </div>
        </div>
      </div>
    )
  }
];

const workflowStages: WorkflowStage[] = [
  {
    id: "capture",
    title: "Capture & Classify",
    subtitle: "Bring every policy, record, rota, and incident feed into a single operating system.",
    bullets: [
      "Drag-and-drop uploads with automatic interactivity",
      "Tag your documents, for clarity and searchability, no more uploading to seperate drives",
      "Dependency calculator with clinical context"
    ],
    icon: Cpu,
    accent: "from-blue-500 to-cyan-500",
    highlight: (
      <div className="space-y-2 text-xs text-blue-100">
        <div className="flex items-center justify-between rounded-lg border border-blue-300/40 bg-blue-500/20 px-3 py-2">
          <span>Medication Review.docx</span>
          <span className="text-[11px] font-semibold text-white">Synced ✓</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-blue-300/40 bg-blue-500/20 px-3 py-2">
          <span>Falls incident form</span>
          <span className="text-[11px] font-semibold text-white">AI summary ready</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-blue-300/40 bg-blue-500/20 px-3 py-2">
          <span>Rota import • Night shift</span>
          <span className="text-[11px] font-semibold text-white">Dependency recalculated</span>
        </div>
      </div>
    )
  },
  {
    id: "coordinate",
    title: "Coordinate & Assign",
    subtitle: "Turn findings into action plans, supervisions, and targeted communication.",
    bullets: [
      "Assign owners with due dates and escalation rules",
      "Auto-create supervision agendas from reflective notes",
      "Notify teams in-app, email, and SMS simultaneously"
    ],
    icon: ClipboardList,
    accent: "from-orange-500 to-amber-500",
    highlight: (
      <div className="space-y-2 text-xs text-orange-100">
        <div className="flex items-center justify-between rounded-lg border border-orange-300/40 bg-orange-500/20 px-3 py-2">
          <span>Falls action plan</span>
          <span className="text-[11px] font-semibold text-white">Owner: Maria</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-orange-300/40 bg-orange-500/20 px-3 py-2">
          <span>Supervision • Omar</span>
          <span className="text-[11px] font-semibold text-white">Agenda auto-built</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-orange-300/40 bg-orange-500/20 px-3 py-2">
          <span>Evidence reminder</span>
          <span className="text-[11px] font-semibold text-white">3 files pending</span>
        </div>
      </div>
    )
  },
  {
    id: "monitor",
    title: "Monitor & Coach",
    subtitle: "Dashboards keep leaders coaching, not chasing data across disconnected tools.",
    bullets: [
      "Live compliance scores by service, domain, and key question",
      "Staff supervision coverage and training matrix",
      "Action plan momentum tracked in real time"
    ],
    icon: Users,
    accent: "from-cyan-500 to-sky-500",
    highlight: (
      <div className="space-y-2 text-xs text-cyan-100">
        <div className="flex items-center justify-between rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-2">
          <span>Responsive domain</span>
          <span className="text-[11px] font-semibold text-white">92% • improving</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-2">
          <span>Supervision coverage</span>
          <span className="text-[11px] font-semibold text-white">87% complete</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-2">
          <span>Action plan velocity</span>
          <span className="text-[11px] font-semibold text-white">12 days faster</span>
        </div>
      </div>
    )
  },
  {
    id: "prove",
    title: "Evidence On Demand",
    subtitle: "Inspection-ready data in seconds with inspection level access.",
    bullets: [
      "One-click inspection bundles by key question",
      "Controlled inspector access with timers and document access",
      ""
    ],
    icon: ShieldCheck,
    accent: "from-emerald-500 to-teal-500",
    highlight: (
      <div className="space-y-2 text-xs text-emerald-100">
        <div className="flex items-center justify-between rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2">
          <span>Inspection bundle</span>
          <span className="text-[11px] font-semibold text-white">12 files attached</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2">
          <span>Access window</span>
          <span className="text-[11px] font-semibold text-white">Closes in 4 days</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2">
          <span>Audit trail</span>
          <span className="text-[11px] font-semibold text-white">14 views logged</span>
        </div>
      </div>
    )
  }
];

const impactMetrics: ImpactMetric[] = [
  {
    id: "time",
    value: "78%",
    label: "Admin time saved",
    detail: "Average reduction in manual evidence prep after eight weeks."
  },
  {
    id: "confidence",
    value: "4.9/5",
    label: "Inspection confidence",
    detail: "Leaders report feeling inspection ready every day, not just before visits."
  },
  {
    id: "analytics",
    value: "24/7",
    label: "On-demand analytics",
    detail: "Transparent, real-time insights available for every organisation."
  }
];

const competitorPainPoints: PainPoint[] = [
  {
    id: "fragmented",
    title: "Fragmented toolsets",
    description: "Compliance lives across bolt-on portals, spreadsheets, and shared drives that never stay in sync.",
    icon: Puzzle
  },
  {
    id: "outdated",
    title: "Outdated, hard to use",
    description: "Legacy interfaces bury critical actions and demand specialist ops teams to keep them running.",
    icon: AlertTriangle
  },
  {
    id: "hidden-costs",
    title: "Hidden bolt-on costs",
    description: "Every new module means another invoice—policies, analytics, inspector access, all sold separately.",
    icon: PoundSterling
  },
  {
    id: "training",
    title: "Expensive training cycles",
    description: "Vendors mandate costly classroom training and annual refreshers just to keep staff certified.",
    icon: GraduationCap
  },
  {
    id: "setup",
    title: "Long implementation",
    description: "Six-month deployments with consultancy hours before the system delivers any value.",
    icon: Timer
  }
];

export default function Page() {
  const { openCalendlyModal } = useCalendly();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="fixed inset-x-0 top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex h-16 w-full items-center justify-between px-6 sm:px-10 lg:px-16 xl:px-24">
          <Link href="#" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 shadow-lg">
              <Logo className="h-8 w-8 text-indigo-400" />
            </div>
            <span className="text-xl font-semibold tracking-tight">CG-360</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-200 md:flex">
            <Link href="#platform" className="hover:text-white transition-colors">Platform</Link>
            <Link href="#workflow" className="hover:text-white transition-colors">Workflow</Link>
            <Link href="#analytics" className="hover:text-white transition-colors">Analytics</Link>
            <Link href="#demo" className="hover:text-white transition-colors">Demo</Link>
          </nav>
          <Button
            size="sm"
            onClick={openCalendlyModal}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:from-blue-500/90 hover:to-purple-500/90"
          >
            Book a demo
          </Button>
        </div>
      </header>

      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="absolute inset-0">
            <div className="absolute -top-32 -left-24 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl"></div>
            <div className="absolute top-1/3 right-0 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl"></div>
            <div className="absolute bottom-0 left-1/4 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl"></div>
          </div>
          <div className="relative mx-auto grid w-full max-w-[1600px] gap-16 px-6 py-28 sm:px-10 lg:grid-cols-[minmax(0,620px)_minmax(0,720px)] lg:items-center xl:px-16">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4" />
                One system that replaces scattered tools with real-time clarity and control.
              </div>
              <div className="space-y-6">
                <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  Governance, compliance, and operations — all in one intelligent platform.
                </h1>
                <p className="max-w-xl text-lg text-slate-300">
                  From audits and rotas to KPIs, root cause analysis, and everything in between — streamline oversight, connect teams, and stay inspection-ready every day.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <Button
                  size="lg"
                  onClick={openCalendlyModal}
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 text-white shadow-xl transition-transform hover:scale-[1.02]"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Book your guided tour
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="border border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link href="#platform">Explore the platform</Link>
                </Button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[680px]">
              <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-purple-400/25 blur-2xl"></div>
              <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-blue-400/25 blur-3xl"></div>

              <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_45px_120px_-60px_rgba(79,70,229,0.7)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-200">Today</p>
                    <p className="text-xl font-semibold text-white">Compliance control room</p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-400/20 text-emerald-100">Live</Badge>
                </div>
                <div className="mt-6 grid gap-4">
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-200">
                      <span>Policy acknowledgements</span>
                      <span className="font-semibold text-white">42 / 50</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
                      <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <div className="flex items-center justify-between text-sm text-slate-200">
                        <span>Dependency ratio</span>
                        <span className="text-base font-semibold text-white">1:3.1</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-200">
                        <div className="rounded-lg bg-white/10 px-2 py-2 text-center">
                          <p className="text-[11px] uppercase text-slate-300">Low</p>
                          <p className="text-sm font-semibold text-white">14</p>
                        </div>
                        <div className="rounded-lg bg-white/10 px-2 py-2 text-center">
                          <p className="text-[11px] uppercase text-slate-300">Medium</p>
                          <p className="text-sm font-semibold text-white">9</p>
                        </div>
                        <div className="rounded-lg bg-white/10 px-2 py-2 text-center">
                          <p className="text-[11px] uppercase text-slate-300">High</p>
                          <p className="text-sm font-semibold text-white">5</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <div className="flex items-center justify-between text-sm text-slate-200">
                        <span>Audit readiness</span>
                        <span className="text-base font-semibold text-white">96%</span>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-slate-200">
                        <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                          <span>Infection control</span>
                          <span className="font-semibold text-emerald-200">Complete</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                          <span>Fire safety</span>
                          <span className="font-semibold text-amber-200">Evidence</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                          <span>Staff files</span>
                          <span className="font-semibold text-rose-200">2 actions</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-200">
                      <span>Inspection portal</span>
                      <span className="font-semibold text-white">Active • 5 days left</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-200">
                      <span>Views today</span>
                      <span className="font-semibold text-white">14</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-60 top-6 hidden w-48 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-xl backdrop-blur xl:block">
                <div className="flex items-center justify-between text-xs text-slate-200">
                  <span>Action plan tasks</span>
                  <span className="font-semibold text-white">7</span>
                </div>
                <div className="mt-3 space-y-2 text-[11px] text-slate-200">
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>Sensor mats</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>Night briefing</span>
                    <span className="rounded-full bg-amber-200/30 px-2 py-[2px] font-semibold text-amber-100">Due</span>
                  </div>
                </div>
              </div>

              <div className="absolute -right-60 top-1/2 -translate-y-1/2 hidden w-50 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-xl backdrop-blur xl:block">
                <div className="flex items-center justify-between text-xs text-slate-200">
                  <span>Recent notifications</span>
                  <span className="font-semibold text-white">3 unread</span>
                </div>
                <div className="mt-3 space-y-2 text-[11px] text-slate-200">
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>Sova alert</span>
                    <span className="text-amber-200">2h ago</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>CQC update</span>
                    <span className="text-emerald-200">1d ago</span>
                  </div>
                </div>
              </div>

              <div className="absolute -right-60 bottom-6 hidden w-52 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-xl backdrop-blur xl:block">
                <div className="flex items-center justify-between text-xs text-slate-200">
                  <span>Supervisions</span>
                  <span className="font-semibold text-white">3 today</span>
                </div>
                <div className="mt-3 space-y-2 text-[11px] text-slate-200">
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>Mia Smith</span>
                    <span>14:00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>Omar Malik</span>
                    <span>Notes added</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="bg-white py-24 text-slate-900">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">The CG-360 platform</Badge>
              <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                Every module on display.
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                We do not hide the product. Explore the real components you will use every day—dependency modelling, policy governance, audits, action plans, supervisions, inspection portals, admin oversight, and predictive analytics.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {capabilityCards.map((capability) => {
                const Icon = capability.icon;
                return (
                  <div
                    key={capability.id}
                    className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-lg transition-all hover:-translate-y-2 hover:shadow-2xl"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${capability.accent}`} />
                    <div className="flex items-center gap-3">
                      <div className={`rounded-2xl bg-gradient-to-br ${capability.accent} p-3 text-white shadow-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{capability.name}</h3>
                        <p className="text-sm text-slate-600">{capability.description}</p>
                      </div>
                    </div>
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      {capability.preview}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="relative overflow-hidden bg-slate-950 py-24">
          <div className="absolute inset-0">
            <div className="absolute -left-12 top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
            <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl"></div>
          </div>
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="bg-white/10 text-white">Orchestrated workflow</Badge>
              <h2 className="mt-6 text-4xl font-semibold text-white sm:text-5xl">
                From capture to inspection—one continuous flow.
              </h2>
              <p className="mt-4 text-lg text-slate-300">
                CG-360 acts as the operating system for compliance. See how data flows through dependency modelling, action plans, coaching, and inspection delivery without leaving the platform.
              </p>
            </div>

            <div className="mt-16 grid gap-10 lg:grid-cols-2">
              {workflowStages.map((stage) => {
                const Icon = stage.icon;
                return (
                  <div
                    key={stage.id}
                    className="relative flex h-full flex-col justify-between rounded-[28px] border border-white/15 bg-white/5 p-8 shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`rounded-2xl bg-gradient-to-br ${stage.accent} p-3 text-white shadow-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-white">{stage.title}</h3>
                        <p className="mt-2 text-sm text-slate-200">{stage.subtitle}</p>
                      </div>
                    </div>
                    <ul className="mt-6 space-y-3 text-sm text-slate-200">
                      {stage.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <ArrowRight className="mt-1 h-4 w-4 text-slate-300" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-4">
                      {stage.highlight}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="analytics" className="bg-slate-100 py-24 text-slate-900">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-center">
              <div className="space-y-6">
                <Badge variant="secondary" className="bg-slate-900 text-white">Operations cockpit</Badge>
                <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  Admin overview meets predictive analytics.
                </h2>
                <p className="text-lg text-slate-600">
                  Leaders see the whole organisation at a glance—licensing, staffing coverage, risk, and inspection readiness. Analysts dive deeper with the full analytical suite built into CG-360.
                </p>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
                    <span>Multi-organisation oversight with granular permissions.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
                    <span>AI-powered dashboards forecast compliance drift before it happens.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
                    <span>Share curated analytics boards with executives or inspectors in one click.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl">
                <div className="flex flex-wrap gap-4 text-left">
                  <div className="flex-1 min-w-[140px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Organisation score</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">94%</p>
                    <p className="text-xs text-emerald-600">+6.1 vs last month</p>
                  </div>
                  <div className="flex-1 min-w-[140px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Live alerts</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">5</p>
                    <p className="text-xs text-amber-600">Prioritised by impact</p>
                  </div>
                  <div className="flex-1 min-w-[140px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Automation runs</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">62</p>
                    <p className="text-xs text-slate-500">Across 9 workflows</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Live feed</p>
                    <div className="mt-3 space-y-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                        <span>Inspection portal viewed</span>
                        <span className="font-semibold text-slate-900">CQC • 09:24</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                        <span>Action plan closed</span>
                        <span className="font-semibold text-emerald-600">Falls prevention</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                        <span>Dependency alert</span>
                        <span className="font-semibold text-rose-600">Night shift +2</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Predictive compliance trend</span>
                      <span className="font-semibold text-slate-900">Next 12 weeks</span>
                    </div>
                    <div className="mt-6 h-40 w-full">
                      <svg viewBox="0 0 260 120" className="h-full w-full text-blue-500">
                        <defs>
                          <linearGradient id="trend" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M10 90 C 50 40, 90 60, 130 30 C 170 10, 210 50, 250 20 L 250 110 L 10 110 Z"
                          fill="url(#trend)"
                          stroke="#0ea5e9"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Projected inspection outcome</span>
                      <span className="font-semibold text-emerald-600">Outstanding trajectory</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-3">
              {impactMetrics.map((metric) => (
                <div key={metric.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                  <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{metric.label}</p>
                  <p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="comparison" className="relative overflow-hidden bg-slate-950 py-24 text-white">
          <div className="absolute inset-0">
            <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
            <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"></div>
          </div>
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-8 lg:flex-row lg:items-start">
            <div className="max-w-xl space-y-6">
              <Badge variant="secondary" className="bg-white/10 text-white">Why teams switch</Badge>
              <h2 className="text-4xl font-semibold sm:text-5xl">
                CG-360 replaces the fragmented tool stack everyone else still sells.
              </h2>
              <p className="text-lg text-slate-200">
                Most platforms stitch together aging bolt-ons. CG-360 is a single operating system—deploy once, govern every workflow, no surprise invoices for the modules you actually need.
              </p>
              <ul className="space-y-3 text-sm text-slate-200">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" />
                  <span>Unified data model across documents, audits, action plans, analytics, and inspector sharing.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" />
                  <span>Onboard in under four weeks—no six-month transformation projects.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" />
                  <span>All-inclusive pricing: AI document processing, dependency modelling, portals, and analytics are part of the core subscription.</span>
                </li>
              </ul>
            </div>
            <div className="flex-1">
              <div className="grid gap-4 sm:grid-cols-2">
                {competitorPainPoints.map((painPoint) => {
                  const Icon = painPoint.icon;
                  return (
                    <div
                      key={painPoint.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-indigo-500/20 p-3 text-indigo-200">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">{painPoint.title}</h3>
                      </div>
                      <p className="mt-4 text-sm text-slate-200">{painPoint.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="demo" className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 py-24 text-white">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 h-full w-full bg-blue-500/10"></div>
            <div className="absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-white/20 blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-white/20 blur-3xl"></div>
          </div>
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <Badge variant="secondary" className="bg-white/20 text-white">Ready to explore</Badge>
            <h2 className="mt-6 text-4xl font-semibold sm:text-5xl">
              Book a demo and step inside the operating system for compliance.
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              We will walk you through live dependency modelling, policies, audits, action plans, inspection access, and analytics—tailored to your organisation.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={openCalendlyModal}
                className="bg-white text-indigo-700 hover:bg-white/90"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Book your free demo
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="border border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="#platform">Browse modules again</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
