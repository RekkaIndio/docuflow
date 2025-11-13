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
  Bell,
  X,
  Zap
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
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <FileText className="h-4 w-4 text-violet-600" />
            </div>
            <span className="text-sm font-semibold text-violet-900">Falls Policy.pdf</span>
          </div>
          <Badge variant="secondary" className="bg-violet-200/70 text-violet-900">Ready</Badge>
        </div>
        <div className="px-1 py-3">
          <div className="space-y-2 rounded-xl border border-violet-100 bg-violet-50/50 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs">
              <FileCheck className="h-4 w-4 text-violet-500" />
              <span className="flex-1 text-slate-600">NICE Guidelines Aligned</span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Pass</Badge>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs">
              <Shield className="h-4 w-4 text-violet-500" />
              <span className="flex-1 text-slate-600">CQC References Valid</span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Pass</Badge>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span className="flex-1 text-slate-600">AI Review Score</span>
              <span className="font-semibold text-slate-900">98/100</span>
            </div>
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
          <Badge variant="secondary" className="bg-sky-200/70 text-sky-900">1:3.1</Badge>
        </div>
        <div className="flex items-end justify-between gap-3 px-3 py-4">
          <div className="flex flex-col items-center gap-1">
            <div className="h-24 w-8 rounded-full bg-sky-100 flex items-end">
              <div className="w-full h-[50%] rounded-full bg-sky-400"></div>
            </div>
            <span className="text-[10px] font-medium text-slate-600">Low</span>
            <span className="text-xs font-semibold text-sky-600">14</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-24 w-8 rounded-full bg-sky-100 flex items-end">
              <div className="w-full h-[35%] rounded-full bg-sky-400"></div>
            </div>
            <span className="text-[10px] font-medium text-slate-600">Med</span>
            <span className="text-xs font-semibold text-sky-600">9</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-24 w-8 rounded-full bg-sky-100 flex items-end">
              <div className="w-full h-[20%] rounded-full bg-sky-400"></div>
            </div>
            <span className="text-[10px] font-medium text-slate-600">High</span>
            <span className="text-xs font-semibold text-sky-600">5</span>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Staff needed</span>
            <span className="font-semibold text-slate-900">+2 night shift</span>
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
          <span className="text-sm font-semibold text-blue-900">Medication Management</span>
          <Badge variant="secondary" className="whitespace-nowrap bg-blue-200/70 text-blue-900">Due in 3d</Badge>
        </div>
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative h-20 w-20">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#dbeafe"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="10"
                strokeDasharray="282.7"
                strokeDashoffset="45.2"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div>
                <div className="text-xl font-bold text-blue-600">84%</div>
                <div className="text-[10px] font-medium text-slate-500">Complete</div>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs w-full px-2">
            <div className="rounded-lg bg-blue-50 px-3 py-1.5">
              <div className="font-semibold text-blue-900">42/50</div>
              <div className="text-blue-600">Sign-offs</div>
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-1.5">
              <div className="font-semibold text-blue-900">v3.1</div>
              <div className="text-blue-600">Version</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Progress</span>
            <span className="font-semibold text-slate-900">84% complete</span>
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
          <span className="text-sm font-semibold text-emerald-900">Infection Control Audit</span>
          <Badge variant="secondary" className="whitespace-nowrap bg-emerald-200/70 text-emerald-900">Due Fri</Badge>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Hand hygiene checks</span>
            <span className="rounded-full bg-emerald-100 px-2 py-[2px] text-[11px] font-semibold text-emerald-800">Complete</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Sterilisation logs</span>
            <span className="rounded-full bg-amber-100 px-2 py-[2px] text-[11px] font-semibold text-amber-800">Evidence</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span>Corrective actions</span>
            <span className="rounded-full bg-red-100 px-2 py-[2px] text-[11px] font-semibold text-red-800">2 open</span>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Last inspection</span>
            <span className="font-semibold text-slate-900">3 months ago</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "risk-assessments",
    name: "Risk Assessments",
    description: "Structured risk assessments with scoring, mitigation actions, and tracking.",
    icon: AlertTriangle,
    accent: "from-rose-500 via-orange-400 to-amber-400",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
          <span className="text-sm font-semibold text-rose-900">Falls risk assessment</span>
          <Badge variant="secondary" className="bg-rose-200/70 text-rose-900">High risk</Badge>
        </div>
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative h-32 w-32">
            <div className="absolute inset-0 rounded-full border-8 border-rose-100"></div>
            <div className="absolute inset-0 rounded-full border-8 border-rose-400 border-l-transparent border-t-transparent transform -rotate-45"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-600">15</div>
                <div className="text-xs font-medium text-slate-500">Risk Score</div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">3 active</span>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">High risk</span>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Last updated</span>
            <span className="font-semibold text-slate-900">2 days ago</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "journal",
    name: "Personal Journal",
    description: "Private reflections users can send to managers (seen or anonymously). Mood-tagged entries with manager replies.",
    icon: BookOpen,
    accent: "from-indigo-500 via-violet-500 to-pink-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-indigo-900">Personal journal</p>
            <p className="text-xs text-indigo-700">Private reflections • send to manager (anonymously optional)</p>
          </div>
          <Badge variant="secondary" className="bg-indigo-200/70 text-indigo-900">3 entries</Badge>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="rounded-lg bg-white px-3 py-2 flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-800">� 14:00 — Feeling supported after training</p>
              <p className="text-[11px] text-slate-500">Sent — Visible to manager</p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Manager replied</Badge>
            </div>
          </div>
          <div className="rounded-lg bg-white px-3 py-2 flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-800">�😔 08:30 — Struggling with shift patterns</p>
              <p className="text-[11px] text-slate-500">Sent anonymously</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-900">No reply yet</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Send anonymously</span>
            <span className="font-semibold text-slate-900">Toggle in composer</span>
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
          <div className="p-4">
          <div className="grid grid-cols-3 gap-3 items-stretch">
            <div className="flex flex-col space-y-2">
              <div className="text-[10px] font-medium text-orange-800">TO DO</div>
              <div className="flex-1 rounded-lg border border-orange-100 bg-orange-50/50 p-2 text-xs">
                <div className="font-medium text-orange-900">Night staff refresher</div>
                <div className="mt-1 text-[10px] text-orange-700">Due tomorrow</div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="text-[10px] font-medium text-amber-800">PROGRESS</div>
              <div className="flex-1 rounded-lg border border-amber-100 bg-amber-50/50 p-2 text-xs">
                <div className="font-medium text-amber-900">Evidence upload</div>
                <div className="mt-1 text-[10px] text-amber-700">3/5 files</div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="text-[10px] font-medium text-emerald-800">DONE</div>
              <div className="flex-1 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2 text-xs">
                <div className="font-medium text-emerald-900">Sensor mats</div>
                <div className="mt-1 text-[10px] text-emerald-700">Completed</div>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-orange-50 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-orange-800">Progress</span>
              <span className="font-medium text-orange-900">60%</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-orange-100">
              <div className="h-full w-[60%] rounded-full bg-orange-400"></div>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Progress</span>
            <span className="font-semibold text-slate-900">60% complete</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "provider-overview",
    name: "Provider Overview",
    description: "High-level provider dashboards, a complete overview.",
    icon: Layers,
    accent: "from-slate-900 via-slate-700 to-slate-500",
    preview: (
      <div className="space-y-3">
        <div className="px-3 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="text-3xl font-bold text-slate-900">8</div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Sites</div>
              <div className="mt-1 text-[10px] text-emerald-600">All active</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="text-3xl font-bold text-slate-900">142</div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Staff</div>
              <div className="mt-1 text-[10px] text-emerald-600">Full strength</div>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-slate-900">92%</div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Audit Score</div>
                </div>
                <div className="h-12 w-24">
                  <svg viewBox="0 0 100 40" className="h-full w-full">
                    <path
                      d="M0 35 C 20 32, 40 30, 60 15 C 80 0, 90 25, 100 28"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2">
          <span className="text-sm font-semibold text-cyan-900">Supervision schedule</span>
          <Badge variant="secondary" className="whitespace-nowrap bg-cyan-200/70 text-cyan-900">Week 44</Badge>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-3 text-center text-[10px] font-medium text-slate-400">
            <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            <div className="rounded-lg py-2 text-slate-400">30</div>
            <div className="rounded-lg bg-cyan-100 py-2 font-semibold text-cyan-900">31</div>
            <div className="rounded-lg py-2 text-slate-400">1</div>
            <div className="rounded-lg py-2 text-slate-400">2</div>
            <div className="rounded-lg bg-cyan-100 py-2 font-semibold text-cyan-900">3</div>
            <div className="rounded-lg py-2 text-slate-400">4</div>
            <div className="rounded-lg py-2 text-slate-400">5</div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="rounded-lg bg-cyan-50 px-3 py-2 text-xs">
              <div className="flex items-center justify-between text-cyan-900">
                <span className="font-medium">Today • 14:00</span>
                <span className="text-[11px]">Mia S.</span>
              </div>
            </div>
            <div className="rounded-lg bg-cyan-50 px-3 py-2 text-xs">
              <div className="flex items-center justify-between text-cyan-900">
                <span className="font-medium">Fri • 10:30</span>
                <span className="text-[11px]">Lily C.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Coverage this week</span>
            <span className="font-semibold text-slate-900">14 sessions</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "inspection-access",
    name: "Inspection Level Access",
    description: "Create secure inspector portals with expiries, feature access, and curated collections.",
    icon: Shield,
    accent: "from-pink-500 via-rose-500 to-fuchsia-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-pink-100 bg-pink-50 px-3 py-2">
          <div className="truncate">
            <span className="text-sm font-semibold text-pink-900">Inspection portal</span>
          </div>
          <Badge variant="secondary" className="flex-shrink-0 bg-pink-200/70 text-pink-900">Active</Badge>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="truncate pr-2">Inspection time left</span>
            <span className="flex-shrink-0 font-semibold text-slate-900">5 days left</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="truncate pr-2">Inspection</span>
            <span className="flex-shrink-0 font-semibold text-slate-900">3 categories</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="truncate pr-2">Audit trail</span>
            <span className="flex-shrink-0 rounded-full bg-pink-100 px-2 py-[2px] text-[11px] font-semibold text-pink-800">14 document views</span>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Last accessed</span>
            <span className="flex-shrink-0 font-semibold text-slate-900">2 hours ago</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "neurodivergent-access",
    name: "Neurodivergent Accessibility",
    description: "Accessibility and neurodivergent-friendly modes",
    icon: Layers,
    accent: "from-indigo-500 via-cyan-500 to-teal-500",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
          <span className="text-sm font-semibold text-indigo-900">Accessibility profile</span>
          <Badge variant="secondary" className="bg-indigo-200/70 text-indigo-900">Active</Badge>
        </div>
        <div className="py-4">
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber-600">
                  <path fill="currentColor" d="M12,8c-2.21,0-4,1.79-4,4s1.79,4,4,4s4-1.79,4-4S14.21,8,12,8z M12,14c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2 S13.1,14,12,14z"/>
                  <path fill="currentColor" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.42,0-8-3.58-8-8s3.58-8,8-8s8,3.58,8,8 S16.42,20,12,20z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-amber-900">Focus mode</div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-amber-100">
                  <div className="h-full w-[80%] rounded-full bg-amber-400"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-purple-600">
                  <path fill="currentColor" d="M20,11H4c-0.55,0-1,0.45-1,1s0.45,1,1,1h16c0.55,0,1-0.45,1-1S20.55,11,20,11z M4,18h10c0.55,0,1-0.45,1-1s-0.45-1-1-1H4 c-0.55,0-1,0.45-1,1S3.45,18,4,18z M20,6H4C3.45,6,3,6.45,3,7s0.45,1,1,1h16c0.55,0,1-0.45,1-1S20.55,6,20,6z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-purple-900">High contrast</div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-purple-100">
                  <div className="h-full w-[60%] rounded-full bg-purple-400"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-600">
                  <path fill="currentColor" d="M3,9v6h4l5,5V4L7,9H3z M16.5,12c0-1.77-1.02-3.29-2.5-4.03v8.05C15.48,15.29,16.5,13.77,16.5,12z M14,3.23v2.06 c2.89,0.86,5,3.54,5,6.71s-2.11,5.85-5,6.71v2.06c4.01-0.91,7-4.49,7-8.77S18.01,4.14,14,3.23z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-emerald-900">Audio assist</div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-emerald-100">
                  <div className="h-full w-[40%] rounded-full bg-emerald-400"></div>
                </div>
              </div>
            </div>
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2">
          <span className="text-sm font-semibold text-teal-900">Analytics dashboard</span>
          <Badge variant="secondary" className="whitespace-nowrap bg-teal-200/70 text-teal-900">Live</Badge>
        </div>
        <div className="py-4 px-3">
          <div className="h-32 rounded-lg bg-gradient-to-b from-teal-50 to-white p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-600">Trend</span>
              <span className="font-semibold text-emerald-600">+8.7%</span>
            </div>
            <svg className="w-full h-20" viewBox="0 0 100 40">
              <path
                d="M0 35 C 10 32, 20 28, 30 25 C 40 22, 50 20, 60 15 C 70 10, 80 8, 100 5"
                fill="none"
                stroke="#14b8a6"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M0 35 C 10 32, 20 28, 30 25 C 40 22, 50 20, 60 15 C 70 10, 80 8, 100 5 L 100 40 L 0 40 Z"
                fill="url(#teal-gradient)"
                opacity="0.2"
              />
              <defs>
                <linearGradient id="teal-gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Last sync</span>
            <span className="font-semibold text-slate-900">5 mins ago</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "rotas",
    name: "Rotas & Scheduling",
    description: "Manage staff rotas, ensure optimal coverage connected to your dependency tool for live, acuity-based staffing insights.",
    icon: Calendar,
    accent: "from-green-500 via-lime-500 to-emerald-500",
    preview: (
      <div className="h-[280px] space-y-3 p-1">
        <div className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50 px-3 py-2">
          <span className="text-sm font-semibold text-green-900">Weekly rota</span>
          <Badge variant="secondary" className="bg-green-200/70 text-green-900">Published</Badge>
        </div>
        <div className="flex-1 p-3">
          <div className="mb-3 grid grid-cols-7 text-center text-[10px] font-medium text-slate-500">
            {['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'].map((day, index) => (
              <div key={index}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => {
              const day = i + 1;
              const isToday = day === 15;
              const isShortStaffed = day === 16;
              const isFull = day === 17;
              return (
                <div
                  key={i}
                  className={`h-8 rounded-lg flex items-center justify-center text-xs
                    ${isToday ? 'bg-green-100 text-green-900 font-medium' :
                    isShortStaffed ? 'bg-amber-100 text-amber-900 font-medium' :
                    isFull ? 'bg-emerald-100 text-emerald-900 font-medium' :
                    'bg-slate-50 text-slate-500'}`}
                >
                  <div className="relative">
                    {day}
                    {isToday && <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400"></div>}
                    {isShortStaffed && <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400"></div>}
                    {isFull && <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400"></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 px-2">
          <div className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-green-400"></div>
            <span className="text-slate-600">Today</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-amber-400"></div>
            <span className="text-slate-600">Short</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
            <span className="text-slate-600">Full</span>
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
      <div className="space-y-2 p-1">
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-3 py-2">
          <span className="text-sm font-semibold text-red-900">Falls incident RCA</span>
          <Badge variant="secondary" className="bg-red-200/70 text-red-900">In progress</Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-emerald-900">Root cause identified</div>
              <div className="text-[10px] text-emerald-700">Environmental factors documented</div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
            <ClipboardList className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-orange-900">Action plan created</div>
              <div className="flex gap-1 mt-1">
                {[1, 2].map((i) => (
                  <span key={i} className="rounded-full bg-orange-200 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                    Action {i}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <Users className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-blue-900">Team review</div>
              <div className="text-[10px] text-blue-700">Shared with team</div>
            </div>
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
      <div className="space-y-2 p-1">
        <div className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50 px-3 py-2">
          <span className="text-sm font-semibold text-purple-900">Notification log</span>
          <Badge variant="secondary" className="bg-purple-200/70 text-purple-900">Up to date</Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2">
            <Bell className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-purple-900">Sova notification sent</div>
              <div className="text-[10px] text-purple-700">2 days ago • Ref: SOV-2023-42</div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <FileCheck className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-blue-900">CQC report submitted</div>
              <div className="text-[10px] text-blue-700">1 week ago • Status: Filed</div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
            <Timer className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-amber-900">Follow-up needed</div>
              <div className="text-[10px] text-amber-700">Due in 2 days</div>
            </div>
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
      "Staff supervision and tracking coverage at a glance",
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
      "Feature flag access for speed and precision"
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
            {false && (<Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>)}
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
              <div className="flex w-full flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl sm:rounded-full border border-white/10 bg-white/10 px-4 sm:px-5 py-3 text-sm font-medium text-white">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Sparkles className="h-4 w-4 flex-shrink-0 mt-1" />
                    <div className="text-sm leading-snug text-white min-w-0">
                      <span className="block">One system that replaces scattered tools with real-time clarity and control.</span>
                    </div>
                </div>

                <div className="flex-shrink-0 mt-2 sm:mt-0">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Built for care homes</span>
                </div>
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

              <div className="relative space-y-6">
                {/* Top metric card - Major impact stat */}
                <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-indigo-500/20 p-8 shadow-[0_45px_120px_-60px_rgba(79,70,229,0.7)] backdrop-blur-xl overflow-hidden">
                  <div className="relative">
                    <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-400/30 blur-2xl"></div>
                    <div className="relative">
                      <Badge variant="secondary" className="bg-emerald-400/20 text-emerald-100 mb-4">Instant insight</Badge>
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-300">Inspection readiness</p>
                          <div className="mt-2 flex items-baseline gap-2">
                            <p className="text-5xl font-bold text-white">96%</p>
                            <span className="text-sm font-semibold text-emerald-300">↑ 14% this month</span>
                          </div>
                        </div>
                        <div className="h-24 w-32 flex items-end gap-1">
                          {[65, 72, 78, 84, 90, 96].map((value, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t-lg bg-gradient-to-t from-blue-400 to-purple-400 transition-all"
                              style={{ height: `${(value / 100) * 100}%` }}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle cards - Feature highlights with visual indicators */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Document flow */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm group hover:bg-white/10 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-blue-500/30 p-3 text-blue-200">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">Evidence managed</p>
                        <p className="text-xs text-slate-400 mt-1">Policies, audits, incident reports</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center border border-white/10">
                        <p className="text-xs text-slate-400">Synced</p>
                        <p className="text-sm font-bold text-emerald-300">42</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center border border-white/10">
                        <p className="text-xs text-slate-400">Ready</p>
                        <p className="text-sm font-bold text-blue-300">38</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center border border-white/10">
                        <p className="text-xs text-slate-400">AI indexed</p>
                        <p className="text-sm font-bold text-purple-300">40</p>
                      </div>
                    </div>
                  </div>

                  {/* Staffing/dependency */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm group hover:bg-white/10 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-cyan-500/30 p-3 text-cyan-200">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">Dependency aligned</p>
                        <p className="text-xs text-slate-400 mt-1">Staffing matches acuity needs</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div className="flex gap-2 items-end h-16">
                        <div className="flex flex-col items-center gap-1">
                          <div className="h-12 w-6 rounded-t-lg bg-gradient-to-t from-emerald-400 to-emerald-500"></div>
                          <span className="text-xs text-slate-400">Low</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="h-10 w-6 rounded-t-lg bg-gradient-to-t from-blue-400 to-blue-500"></div>
                          <span className="text-xs text-slate-400">Med</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="h-6 w-6 rounded-t-lg bg-gradient-to-t from-amber-400 to-amber-500"></div>
                          <span className="text-xs text-slate-400">High</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Ratio</p>
                        <p className="text-lg font-bold text-white">1:3.1</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom card - Action momentum */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-6 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-emerald-500/30 p-3 text-emerald-200">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Actions moving forward</p>
                        <p className="text-xs text-slate-300 mt-1">28 tasks assigned and tracked</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">Completed</p>
                      <p className="text-2xl font-bold text-emerald-300">73%</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10 border border-white/20">
                    <div className="h-full w-[73%] rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-lg shadow-emerald-400/50"></div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                      <span>In progress</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="h-3 w-3 rounded-full bg-slate-400"></div>
                      <span>Pending</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating accent card - Inspections */}
              <div className="absolute -right-48 top-20 hidden w-44 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/20 to-rose-500/10 p-4 shadow-xl shadow-pink-500/20 backdrop-blur xl:block">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-pink-300" />
                  <span className="text-xs font-semibold text-pink-200">Inspection ready</span>
                </div>
                <p className="text-sm font-bold text-white">Next review</p>
                <p className="text-xs text-slate-300 mt-1">CQC portal active • 5 days</p>
                <div className="mt-3 text-center py-2 rounded-lg bg-white/10 border border-white/10">
                  <p className="text-[10px] text-slate-400">Documents viewed</p>
                  <p className="text-lg font-bold text-pink-200">24</p>
                </div>
              </div>

              {/* Floating accent card - Team updates */}
              <div className="absolute -right-48 top-1/2 -translate-y-1/2 hidden w-44 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 p-4 shadow-xl shadow-purple-500/20 backdrop-blur xl:block">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="h-4 w-4 text-purple-300" />
                  <span className="text-xs font-semibold text-purple-200">Team alerts</span>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-white/10 border border-white/10 p-2">
                    <p className="text-[10px] text-slate-300 font-medium">Supervision due</p>
                    <p className="text-xs text-purple-200 font-semibold">Mia Smith • 2h</p>
                  </div>
                  <div className="rounded-lg bg-white/10 border border-white/10 p-2">
                    <p className="text-[10px] text-slate-300 font-medium">Evidence submitted</p>
                    <p className="text-xs text-emerald-200 font-semibold">3 new files</p>
                  </div>
                </div>
              </div>

              {/* Floating accent card - Compliance tracker */}
              <div className="absolute -right-48 bottom-20 hidden w-44 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 p-4 shadow-xl shadow-blue-500/20 backdrop-blur xl:block">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-blue-300" />
                  <span className="text-xs font-semibold text-blue-200">Compliance trend</span>
                </div>
                <div className="relative h-12 w-full mb-3">
                  <svg viewBox="0 0 100 40" className="h-full w-full">
                    <path
                      d="M5 32 Q 25 28, 45 20 T 95 10"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-[10px] text-slate-300 text-center">12-week trend</p>
                <p className="text-xs font-bold text-blue-200 text-center">+18% improvement</p>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="relative bg-gradient-to-b from-white via-slate-50 to-white py-24 text-slate-900">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 h-40 w-40 rounded-full bg-blue-100/40 blur-3xl"></div>
            <div className="absolute bottom-32 right-10 h-48 w-48 rounded-full bg-purple-100/40 blur-3xl"></div>
          </div>
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">The CG-360 platform</Badge>
              <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                Every module on display.
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                We do not hide the product. Explore the real components you will use every day—dependency modelling, policy governance, audits, action plans, supervisions, inspection portals, admin oversight, and predictive analytics.
              </p>
            </div>

            <div className="mt-20 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {capabilityCards.map((capability) => {
                const Icon = capability.icon;
                return (
                  <div
                    key={capability.id}
                    className="group relative flex h-[480px] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 shadow-xl transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:border-slate-300"
                  >
                    {/* Accent gradient background */}
                    <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${capability.accent}`} />
                    <div className={`absolute -top-32 -right-32 h-64 w-64 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20 pointer-events-none ${capability.accent.split(' ')[0] === 'from-violet-500' ? 'from-violet-400' : capability.accent.split(' ')[0] === 'from-sky-500' ? 'from-sky-400' : capability.accent.split(' ')[0] === 'from-blue-500' ? 'from-blue-400' : 'from-emerald-400'}`}></div>

                    {/* Header section */}
                    <div className="relative flex items-start gap-3 p-8 pb-4">
                      <div className={`rounded-2xl bg-gradient-to-br ${capability.accent} p-4 text-white shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{capability.name}</h3>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{capability.description}</p>
                      </div>
                    </div>

                    {/* Preview section */}
                    <div className="relative flex-1 overflow-hidden px-8">
                      <div className="h-full rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white/50 p-6 group-hover:border-slate-300/80 transition-all duration-300 overflow-y-auto">
                        <div className="h-full">
                          {capability.preview}
                        </div>
                      </div>
                    </div>

                    {/* Footer accent */}
                    <div className="relative h-1 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 mt-4"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="assistant" className="bg-gradient-to-b from-white to-slate-50 py-24 text-slate-900">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">AI Assistant</Badge>
              <h2 className="mt-6 text-4xl font-bold tracking-tight">A helpful assistant built into your workflow</h2>
              <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
                Quickly summarise policies, extract evidence, draft inspection bundles, and get actionable recommendations — without leaving CG-360.
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <div className="relative rounded-[20px] overflow-hidden border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-2 text-white">
                        <BrainCircuit className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">CG-360 Assistant</p>
                        <p className="text-xs text-slate-500">Context-aware, privacy-first summaries</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Preview</Badge>
                  </div>

                  <div className="mt-6 rounded-lg border border-white/30 bg-white p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">U</div>
                        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-800">Summarise the falls policy and list three actions for night staff.</div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">A</div>
                        <div className="rounded-2xl bg-indigo-50 p-4 text-sm text-slate-800">
                          <p className="font-medium text-indigo-800">Summary</p>
                          <p className="mt-1 text-xs text-slate-600">Clear handover notes, regular sensor checks, and targeted supervision for high-risk residents.</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-md bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">1. Update handover checklist</div>
                            <div className="rounded-md bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">2. Reposition sensor mats</div>
                            <div className="rounded-md bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">3. Schedule staff refresher</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Button size="sm" onClick={openCalendlyModal} className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white">Try demo</Button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-slate-900">What it helps with</h3>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <span>Document summarisation & highlight extraction</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <span>Auto-generated inspection bundles and evidence lists</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <span>Suggested action items with owners & due dates</span>
                    </li>
                  </ul>

                  <div className="mt-6">
                    <Button size="lg" onClick={openCalendlyModal} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white">Request an assistant walkthrough</Button>
                    <div className="mt-3 text-center text-xs text-slate-500">Or <Link href="#demo" className="underline">book a demo</Link> to see the assistant in action.</div>
                  </div>
                </div>
              </div>
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
                CG-360 acts as the operating system for compliance. Data flows seamlessly through each stage—no switching between tools, no broken handoffs.
              </p>
            </div>

            {/* Visual workflow timeline */}
            <div className="mt-24">
              <div className="relative pt-16">
                {/* Connecting line */}
                <div className="hidden lg:block absolute top-6 left-[5%] right-[5%] h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full"></div>

                {/* Cards grid */}
                <div className="grid gap-8 lg:grid-cols-4">
                  {workflowStages.map((stage, index) => {
                    const Icon = stage.icon;
                    return (
                      <div key={stage.id} className="relative pt-8">
                        {/* Number badge */}
                        <div className="absolute -top-6 left-0 right-0 mx-auto w-fit">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-950 to-slate-900 border-4 border-slate-950 text-white font-bold text-lg shadow-lg z-10">
                            {index + 1}
                          </div>
                        </div>

                        {/* Card */}
                        <div className="relative flex flex-col h-full min-h-[520px] rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm hover:border-white/25 hover:bg-gradient-to-br hover:from-white/15 hover:to-white/10 transition-all duration-300 group">
                          
                          {/* Icon */}
                          <div className={`rounded-xl bg-gradient-to-br ${stage.accent} p-3 w-fit text-white shadow-lg group-hover:shadow-xl transition-all`}>
                            <Icon className="h-5 w-5" />
                          </div>

                          {/* Title */}
                          <h3 className="mt-4 text-lg font-bold text-white">{stage.title}</h3>
                          
                          {/* Subtitle */}
                          <p className="mt-2 text-xs text-slate-300">{stage.subtitle}</p>

                          {/* Quick bullets - simplified */}
                          <div className="mt-4 space-y-2">
                            {stage.bullets.slice(0, 2).map((bullet, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0"></div>
                                <span>{bullet}</span>
                              </div>
                            ))}
                          </div>

                          {/* Highlight preview - compact */}
                          <div className="mt-6 flex-1 rounded-xl border border-white/20 bg-white/5 p-3 text-[11px] text-slate-300 overflow-y-auto">
                            {stage.highlight}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile connecting indicators */}
                <div className="lg:hidden mt-8 flex items-center justify-between px-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-white/20"></div>
                      {i < 3 && <div className="w-8 h-0.5 bg-gradient-to-r from-white/20 to-transparent"></div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Outcome summary */}
              <div className="mt-12 rounded-2xl border border-white/15 bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 p-8 backdrop-blur-sm">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-500/30 p-2 mt-1 text-emerald-200">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">No tool switching</p>
                      <p className="text-xs text-slate-300 mt-1">Complete workflows in one place</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-teal-500/30 p-2 mt-1 text-teal-200">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Real-time updates</p>
                      <p className="text-xs text-slate-300 mt-1">Data syncs instantly across stages</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-cyan-500/30 p-2 mt-1 text-cyan-200">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Inspection ready</p>
                      <p className="text-xs text-slate-300 mt-1">Export evidence with one click</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="absolute inset-0">
            <div className="absolute -top-32 -left-24 h-64 w-64 rounded-full bg-blue-500/70 blur-3xl animate-pulse"></div>
            <div className="absolute top-1/3 right-0 h-72 w-72 rounded-full bg-purple-500/70 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-0 left-1/4 h-52 w-52 rounded-full bg-cyan-500/70 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-full bg-emerald-500/70 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-0 right-1/4 h-40 w-40 rounded-full bg-pink-500/70 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute bottom-1/4 right-1/3 h-56 w-56 rounded-full bg-indigo-500/70 blur-3xl animate-pulse" style={{ animationDelay: '2.5s' }}></div>
          </div>

        <section id="analytics" className="relative py-24 text-slate-900">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
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
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span>Multi-organisation oversight with granular permissions.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span>AI-powered dashboards forecast compliance drift before it happens.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
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

        {false && (
        <section id="pricing" className="relative py-24 text-slate-900">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            {/* Header */}
            <div className="mx-auto max-w-3xl text-center mb-20">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 mb-4">Transparent pricing</Badge>
              <h2 className="text-5xl font-bold tracking-tight sm:text-6xl">
                One price. Everything included.
              </h2>
              <p className="mt-6 text-xl text-slate-600">
                No hidden fees. No surprise invoices. One flat rate per site covers every feature, every module, every workflow.
              </p>
            </div>

            {/* Main pricing card */}
            <div className="mx-auto max-w-2xl mb-16">
              <div className="relative rounded-[40px] border-2 border-blue-500/50 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-12 shadow-2xl overflow-hidden">
                {/* Decorative gradient blur */}
                <div className="absolute top-0 right-0 h-40 w-40 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 h-40 w-40 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                <div className="relative text-center">
                  <div className="inline-block mb-6">
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">Most popular</Badge>
                  </div>
                  
                  <div className="mb-8">
                    <div className="text-7xl font-black text-slate-900 tracking-tight">£350</div>
                    <div className="text-lg text-slate-600 mt-2">per month • per site</div>
                  </div>

                  <div className="flex items-center justify-center gap-4 mb-8 pb-8 border-b-2 border-slate-200">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-emerald-600">Setup cost</div>
                      <div className="text-2xl font-bold text-slate-900">£0</div>
                    </div>
                    <div className="text-slate-300">•</div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-emerald-600">Free training</div>
                      <div className="text-2xl font-bold text-slate-900">Included</div>
                    </div>
                    <div className="text-slate-300">•</div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-emerald-600">Backout clause</div>
                      <div className="text-2xl font-bold text-slate-900">14 days</div>
                    </div>
                  </div>

                  {/* Feature groups */}
                  <div className="grid gap-8 sm:grid-cols-3 mt-8 mb-10">
                    <div className="text-left">
                      <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-sm">📄</div>
                        Documents
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          Smart management
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          AI indexing
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          Version control
                        </li>
                      </ul>
                    </div>

                    <div className="text-left">
                      <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-sm">⚙️</div>
                        Operations
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          Dependency modeling
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          Rotas & scheduling
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          Action plans
                        </li>
                      </ul>
                    </div>

                    <div className="text-left">
                      <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm">📊</div>
                        Insights
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          Live analytics
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          Inspector portals
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          Compliance tracking
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* CTA buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button
                      size="lg"
                      onClick={openCalendlyModal}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg text-lg py-6 px-12"
                    >
                      Book your demo
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-slate-300 text-slate-900 hover:bg-slate-50"
                    >
                      View full feature list
                    </Button>
                  </div>
                </div>
              </div>

              {/* Trust indicators */}
              <div className="text-center mt-8 text-sm text-slate-600">
                <p>✓ 14-day backout clause</p>
              </div>
            </div>

            {/* Comparison section */}
            <div className="mt-24 pt-24 border-t-2 border-slate-200">
              <div className="text-center mb-16">
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Why teams choose CG-360</h3>
                <p className="text-lg text-slate-600">Compare the cost of competitors vs the complete CG-360 solution</p>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* The problem */}
                <div className="rounded-3xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-red-900">Typical Setup</h4>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3 pb-4 border-b border-red-200">
                      <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-red-900">Policy Management Tool</p>
                        <p className="text-sm text-red-700">£150/month</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pb-4 border-b border-red-200">
                      <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-red-900">Audit & Compliance Module</p>
                        <p className="text-sm text-red-700">£200/month</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pb-4 border-b border-red-200">
                      <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-red-900">Analytics Add-on</p>
                        <p className="text-sm text-red-700">£100/month</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pb-4 border-b border-red-200">
                      <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-red-900">Inspector Portal (Extra)</p>
                        <p className="text-sm text-red-700">£75/month</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-red-900">Implementation & Training</p>
                        <p className="text-sm text-red-700">£5,000+</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-500/20 rounded-2xl p-4 text-center border border-red-300">
                    <p className="text-sm text-red-700 mb-1">Total monthly cost</p>
                    <p className="text-4xl font-bold text-red-900">£525+</p>
                    <p className="text-xs text-red-700 mt-2">Plus setup costs, no integration, tool switching</p>
                  </div>
                </div>

                {/* The solution */}
                <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-10 relative ring-2 ring-emerald-400/50">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">Recommended</Badge>
                  </div>

                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-emerald-900">CG-360</h4>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3 pb-4 border-b border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-emerald-900">Complete platform</p>
                        <p className="text-sm text-emerald-700">All features included</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pb-4 border-b border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-emerald-900">No hidden costs</p>
                        <p className="text-sm text-emerald-700">Everything in one subscription</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pb-4 border-b border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-emerald-900">Seamless integration</p>
                        <p className="text-sm text-emerald-700">No tool switching</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pb-4 border-b border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-emerald-900">Free setup & training</p>
                        <p className="text-sm text-emerald-700">4-week onboarding included</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-emerald-900">Live support</p>
                        <p className="text-sm text-emerald-700">Dedicated support team</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-500/20 rounded-2xl p-4 text-center border border-emerald-300">
                    <p className="text-sm text-emerald-700 mb-1">Total monthly cost</p>
                    <p className="text-4xl font-bold text-emerald-900">£350</p>
                    <p className="text-xs text-emerald-700 mt-2">No setup costs, no surprises, everything integrated</p>
                  </div>
                </div>
              </div>

              {/* Savings callout */}
              <div className="mt-12 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-200 p-8 text-center">
                <p className="text-lg text-slate-900 mb-2">
                  <span className="font-bold">Save 33%+ per month</span> compared to piecing together competitors' tools
                </p>
                <p className="text-slate-600">Plus eliminate switching costs, integration complexity, and training overhead</p>
              </div>
            </div>
          </div>
        </section>
        )}
        </div>

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
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>Unified data model across documents, audits, action plans, analytics, and inspector sharing.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>Onboard in under four weeks—no six-month transformation projects.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
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
                      className={`rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur ${painPoint.id === "setup" ? "sm:col-span-2" : ""}`}
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
