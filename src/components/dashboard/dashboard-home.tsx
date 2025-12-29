"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, FileSpreadsheet, FileIcon, FileX2, Briefcase, Clock, User, TrendingUp, TrendingDown, Minus, Calendar, CalendarCheck2, BarChart3, Edit3, FileCheck, CheckCircle, AlertCircle, ClipboardList, ClipboardCheck, ChevronRight, Shield, Heart, Tag, NotebookPen } from "lucide-react";
import type { Workspace, Document, Folder as FolderType } from "@/lib/types";
import type { ReactNode } from "react";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { UploadButton } from "./upload-button";
import { NewFolderDialog } from "./new-folder-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, startOfWeek, addDays } from "date-fns";
import { db } from "@/lib/firebase";
import { workspaceDocPath, workspaceCollectionPath, workspaceBasePath } from '@/lib/paths';
import { getWorkspaceCollectionRef, getWorkspaceDocRef, getMonthlyAuditCompletionStatus } from '@/lib/firestore';
import { AUDIT_TYPES, AUDIT_DISPLAY_NAMES, AuditType } from '@/lib/audit-types';
import { collection, doc, onSnapshot, query as fsQuery, where, orderBy, limit, getDocs, getDoc, setDoc } from "firebase/firestore";
import OccupancyPie from '@/components/admin/occupancy-pie';
import OverviewCards from './overview-cards';
// consolidated imports above
import { Sun, Moon } from "lucide-react";
import DailyCheckinModal from './daily-checkin-modal';
import { StaffingTeamsModal } from './StaffingTeamsModal';
import { StaffingTrendsModal } from './StaffingTrendsModal';
import { OccupancyTrendsModal } from './OccupancyTrendsModal';
import { AuditDetailModal } from './AuditDetailModal';
import { ComplianceOverviewModal } from './ComplianceOverviewModal';
import { openDocument } from '@/lib/document-utils';
import AuditDonut from './audit-donut';
import { StaffingOverviewCard } from './staffing-overview-card';
import { useRouter } from 'next/navigation';

// Component to display trend indicators
// Local styles for the pulsing pending state. Using a box-shadow animation on
// the Card itself avoids clipping issues from `overflow: hidden` and keeps the
// glow visible while preserving the card's content layering.
const PendingPulseStyles = () => (
    <style jsx>{`
        .pulse-pending {
            position: relative;
            /* Red glow for pending daily check-in (user dashboard only) */
            box-shadow: 0 0 24px 6px rgba(239, 68, 68, 0.28), 0 0 48px 12px rgba(239, 68, 68, 0.18);
            animation: pulse-red 2s infinite ease-in-out;
            border: 2px solid rgba(239, 68, 68, 0.6) !important;
        }

        .pulse-occupancy {
            position: relative;
            /* Purple glow for occupancy attention */
            box-shadow: 0 0 20px 4px rgba(168, 85, 247, 0.4), 0 0 40px 8px rgba(168, 85, 247, 0.2);
            animation: pulse-purple 2s infinite ease-in-out;
            border: 2px solid rgba(168, 85, 247, 0.6) !important;
        }

        .pulse-staffing {
            position: relative;
            /* Blue glow for staffing attention */
            box-shadow: 0 0 20px 4px rgba(59, 130, 246, 0.4), 0 0 40px 8px rgba(59, 130, 246, 0.2);
            animation: pulse-blue 2s infinite ease-in-out;
            border: 2px solid rgba(59, 130, 246, 0.6) !important;
        }

        /* Enhanced pulsing animation with red glow for pending daily check-in */
        @keyframes pulse-red {
            0% {
                transform: scale(1);
                box-shadow: 0 0 24px 6px rgba(239, 68, 68, 0.28), 0 0 48px 12px rgba(239, 68, 68, 0.18);
                border-color: rgba(239, 68, 68, 0.6);
            }
            50% {
                transform: scale(1.02);
                box-shadow: 0 0 36px 12px rgba(239, 68, 68, 0.46), 0 0 72px 22px rgba(239, 68, 68, 0.22);
                border-color: rgba(239, 68, 68, 0.85);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 0 24px 6px rgba(239, 68, 68, 0.28), 0 0 48px 12px rgba(239, 68, 68, 0.18);
                border-color: rgba(239, 68, 68, 0.6);
            }
        }

        /* Purple glow animation for occupancy */
        @keyframes pulse-purple {
            0% {
                transform: scale(1);
                box-shadow: 0 0 20px 4px rgba(168, 85, 247, 0.4), 0 0 40px 8px rgba(168, 85, 247, 0.2);
                border-color: rgba(168, 85, 247, 0.6);
            }
            50% {
                transform: scale(1.02);
                box-shadow: 0 0 30px 8px rgba(168, 85, 247, 0.6), 0 0 60px 15px rgba(168, 85, 247, 0.3);
                border-color: rgba(168, 85, 247, 0.8);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 0 20px 4px rgba(168, 85, 247, 0.4), 0 0 40px 8px rgba(168, 85, 247, 0.2);
                border-color: rgba(168, 85, 247, 0.6);
            }
        }

        /* Blue glow animation for staffing */
        @keyframes pulse-blue {
            0% {
                transform: scale(1);
                box-shadow: 0 0 20px 4px rgba(59, 130, 246, 0.4), 0 0 40px 8px rgba(59, 130, 246, 0.2);
                border-color: rgba(59, 130, 246, 0.6);
            }
            50% {
                transform: scale(1.02);
                box-shadow: 0 0 30px 8px rgba(59, 130, 246, 0.6), 0 0 60px 15px rgba(59, 130, 246, 0.3);
                border-color: rgba(59, 130, 246, 0.8);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 0 20px 4px rgba(59, 130, 246, 0.4), 0 0 40px 8px rgba(59, 130, 246, 0.2);
                border-color: rgba(59, 130, 246, 0.6);
            }
        }
    `}</style>
);

type AuditScoreEntry = {
    scorePercent: number | null;
    yesCount: number | null;
    totalCount: number | null;
};

const MANAGER_ROLE_KEYS = ['manager', 'clinical lead', 'deputy', 'operations manager', 'admin', 'owner', 'head office', 'head-office'];
const HEAD_OFFICE_ROLE_KEYS = ['admin', 'owner', 'head office', 'head-office'];

type AuditScoreMap = Record<AuditType, AuditScoreEntry>;

const createEmptyAuditScoreMap = (): AuditScoreMap => (
    Object.fromEntries(
        AUDIT_TYPES.map((type) => [type, { scorePercent: null, yesCount: null, totalCount: null }])
    ) as AuditScoreMap
);

const createEmptyAuditStatusMap = (): Record<AuditType, boolean> => (
    Object.fromEntries(
        AUDIT_TYPES.map((type) => [type, false])
    ) as Record<AuditType, boolean>
);

type ActionableItems = {
    untaggedDocs: Document[];
    untaggedCount: number;
    recentDocs: Document[];
    docsThisWeekCount: number;
};

type FocusItem = {
    id: string;
    title: string;
    description: string;
    icon: ReactNode;
    iconWrapperClass: string;
    badge?: { label: string; variant?: "default" | "secondary" | "outline" | "destructive" };
    meta?: string;
    onClick?: () => void;
};

type OverallStats = {
    totalYesCount: number;
    totalQuestions: number;
    overallPercentage: number | null;
    auditsCompleted: number;
    totalAudits: number;
};


const getFileIcon = (fileType: Document["fileType"]) => {
    switch (fileType) {
        case "pdf":
            return <FileText className="w-5 h-5 text-red-500" />;
        case "csv":
            return <FileSpreadsheet className="w-5 h-5 text-green-700" />;
        case "xlsx":
            return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
        case "txt":
            return <FileIcon className="w-5 h-5 text-gray-500" />;
        default:
            return <FileX2 className="w-5 h-5 text-gray-400" />;
    }
};

const DashboardHero = ({
    workspace,
    headerLogo,
    overallStats,
    actionableItems,
    workspaceId,
    onDocumentAdd,
    onFolderAdd,
    onComplianceOverviewClick,
    onStatsClick,
    isTodayCompleted,
    onDailyEntryUpdate,
    dailyEntry,
    orgId,
    onOccupancyTrendsClick,
    onStaffingTeamsClick,
    onStaffingTrendsClick,
    isDailyCheckinOpen,
    onDailyModalChange,
    showJournalAlert,
    openJournalCount,
    onJournalClick,
    healthScore,
}: {
    workspace?: Workspace | null;
    headerLogo: string | null;
    overallStats: OverallStats;
    actionableItems: ActionableItems;
    workspaceId?: string;
    onDocumentAdd: (document: Document) => void;
    onFolderAdd: (folder: FolderType) => void;
    onComplianceOverviewClick?: () => void;
    onStatsClick?: () => void;
    isTodayCompleted: boolean;
    onDailyEntryUpdate?: (entry: any) => void;
    dailyEntry?: any;
    orgId?: string | null;
    onOccupancyTrendsClick?: () => void;
    onStaffingTeamsClick?: () => void;
    onStaffingTrendsClick?: () => void;
    isDailyCheckinOpen?: boolean;
    onDailyModalChange?: (open: boolean) => void;
    showJournalAlert?: boolean;
    openJournalCount?: number;
    onJournalClick?: () => void;
    healthScore?: { overallScore: number; components: Record<string, number> };
}) => {
    const metrics = [
        {
            label: "Compliance",
            value: overallStats.overallPercentage !== null ? `${overallStats.overallPercentage}%` : "—",
            helper: overallStats.totalAudits > 0
                ? `${overallStats.auditsCompleted}/${overallStats.totalAudits} audits complete`
                : "No audits recorded yet",
            Icon: Shield,
        },
        {
            label: "Daily check-in",
            value: isTodayCompleted ? "Complete" : "Pending",
            helper: isTodayCompleted ? "Logged for today" : "Awaiting today's update",
            Icon: Calendar,
        },
        {
            label: "Documents this week",
            value: actionableItems.docsThisWeekCount.toString(),
            helper: actionableItems.untaggedCount > 0
                ? `${actionableItems.untaggedCount} need tagging`
                : "All documents tagged",
            Icon: FileText,
        },
    ];

    const metricsGridClasses = `mt-4 grid grid-cols-1 gap-4 ${showJournalAlert ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`;

    const pendingJournalLabel = (() => {
        if (!openJournalCount || openJournalCount <= 0) return 'Awaiting review';
        if (openJournalCount === 1) return '1 entry awaiting';
        return `${openJournalCount} entries awaiting`;
    })();

    return (
        <section className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-border/50 bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-60">
                <div className="absolute -top-24 -right-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl animate-pulse" />
                <div className="absolute bottom-[-6rem] left-[-4rem] h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
            </div>

            <div className="relative z-10 grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)] lg:p-8 items-center">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-4">
                        <Avatar className="h-10 w-10 border border-white/20 bg-white/10">
                            <AvatarImage src={headerLogo ?? undefined} alt={workspace?.name ?? "Workspace"} />
                            <AvatarFallback>
                                <Users className="h-7 w-7 text-white/80" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Workspace Overview</p>
                            <h1 className="text-xl font-semibold sm:text-2xl">
                                {workspace?.name ?? "Your workspace"}
                            </h1>
                            <p className="max-w-2xl text-xs text-white/70">
                                Stay ahead of compliance, staffing, and resident care with a single, curated view of today's priorities and long-term performance.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">


                    </div>

                    {/* Quick Metrics Cards */}
                    <div className={metricsGridClasses}>
                        {/* Occupancy Card */}
                        <MiniOccupancyCard
                            workspaceId={workspaceId}
                            orgId={orgId}
                            dailyEntry={dailyEntry}
                            onTrendsClick={onOccupancyTrendsClick}
                        />

                        {/* Daily Check-in Card */}
                        <DailyCheckinModal
                            workspaceId={workspaceId || ""}
                            onEntryUpdate={onDailyEntryUpdate}
                            open={isDailyCheckinOpen}
                            onOpenChange={onDailyModalChange}
                            trigger={
                                <div
                                    className={`group relative rounded-2xl border p-2 backdrop-blur-md transition-all duration-300 cursor-pointer min-h-[68px] flex flex-col justify-between ${!isTodayCompleted
                                        ? "bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-400/50 shadow-[0_0_20px_4px_rgba(239,68,68,0.2),0_0_40px_8px_rgba(239,68,68,0.12)] animate-pulse-slow hover:shadow-[0_0_28px_8px_rgba(239,68,68,0.3),0_0_56px_16px_rgba(239,68,68,0.18)]"
                                        : "bg-gradient-to-br from-white/20 to-white/5 border-white/20 shadow-lg hover:shadow-xl hover:from-white/25 hover:to-white/10"
                                        }`}
                                    style={!isTodayCompleted ? {
                                        boxShadow: '0 0 20px 4px rgba(239, 68, 68, 0.2), 0 0 40px 8px rgba(239, 68, 68, 0.12)',
                                    } : undefined}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`rounded-xl p-2 ${!isTodayCompleted ? 'bg-red-500/30 text-red-50' : 'bg-blue-500/20 text-blue-100'}`}>
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-2">
                                                Daily check-in
                                                {!isTodayCompleted && (
                                                    <span className="inline-flex h-2 w-2 rounded-full bg-red-400 animate-pulse-slow" />
                                                )}
                                            </div>
                                            <div className="text-base font-bold text-white">
                                                {isTodayCompleted ? "Complete" : "Pending"}
                                            </div>
                                            <div className="text-[11px] text-white/60">
                                                {isTodayCompleted ? "Logged for today" : "Awaiting today's update"}
                                            </div>
                                        </div>
                                        {!isTodayCompleted && (
                                            <AlertCircle className="h-5 w-5 text-red-300" />
                                        )}
                                        {isTodayCompleted && (
                                            <CheckCircle className="h-5 w-5 text-emerald-300" />
                                        )}
                                    </div>
                                </div>
                            }
                        />

                        {showJournalAlert ? (
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={onJournalClick}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onJournalClick?.();
                                    }
                                }}
                                className="group relative flex min-h-[84px] cursor-pointer flex-col justify-between rounded-2xl border border-amber-400/60 bg-gradient-to-br from-amber-500/25 via-amber-500/15 to-amber-500/5 p-3 backdrop-blur-md shadow-[0_0_18px_rgba(251,191,36,0.28)] transition-all duration-300 hover:shadow-[0_0_26px_rgba(251,191,36,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-amber-500/30 p-2 text-amber-50">
                                        <NotebookPen className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                                            Journal alerts
                                            <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
                                                {pendingJournalLabel}
                                            </span>
                                        </div>
                                        <div className="text-lg font-bold text-white">
                                            {openJournalCount ?? 0}
                                        </div>
                                        <div className="text-xs text-white/70">
                                            {openJournalCount === 1
                                                ? 'Entry awaiting your response'
                                                : 'Entries awaiting your response'}
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-white/70 transition-transform group-hover:translate-x-1" />
                                </div>
                                <p className="mt-4 text-xs text-white/65">
                                    Open reflective journal submissions are waiting for leadership follow-up.
                                </p>
                            </div>
                        ) : null}

                        {/* Staffing Card removed from header - show details in the main StaffingOverviewCard instead */}
                    </div>
                </div>

                <div className="self-end flex flex-col gap-2 rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-6 backdrop-blur-md shadow-lg min-h-[140px]">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold uppercase tracking-wider text-white">Health snapshot</span>
                            <Badge className={`${isTodayCompleted ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-100" : "bg-red-500/30 border-red-400/50 text-red-100"} border backdrop-blur-sm shadow-md`}>
                                {isTodayCompleted ? "✓ Complete" : "⚠ Pending"}
                            </Badge>
                        </div>
                        <p className="text-[11px] text-white/75 leading-relaxed">
                            A comprehensive view of overall compliance readiness across all operational areas.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 flex-nowrap w-full">
                        <div className="flex items-center gap-3">
                            <AuditDonut completed={healthScore?.overallScore || 0} total={100} size={92} strokeWidth={12} compact />
                            <div className="space-y-0 text-[10px] text-white/75">
                                {healthScore && (
                                    <div className="flex items-center gap-2">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px]">
                                            <span className="font-semibold">Audits</span>
                                            <span>{healthScore.components.audits}%</span>
                                        </div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px]">
                                            <span className="font-semibold">Rotas</span>
                                            <span>{healthScore.components.rotas}%</span>
                                        </div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px]">
                                            <span className="font-semibold">Dependency</span>
                                            <span>{healthScore.components.dependency}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {onComplianceOverviewClick && (
                            <div className="ml-auto mt-0 flex gap-2 items-center h-12">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:border-white/60 backdrop-blur-sm shadow-md transition-all px-2 py-1 text-[11px]"
                                    onClick={onComplianceOverviewClick}
                                >
                                    View compliance overview
                                </Button>
                                {onStatsClick && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:border-white/60 backdrop-blur-sm shadow-md transition-all px-2 py-1 text-[11px]"
                                        onClick={onStatsClick}
                                    >
                                        View stats
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>


                </div>
            </div>
        </section>
    );
};

// Mini version of Occupancy Card for hero header
function MiniOccupancyCard({ workspaceId, orgId, dailyEntry, onTrendsClick }: { workspaceId?: string, orgId?: string | null, dailyEntry?: any, onTrendsClick?: () => void }) {
    const [totalBeds, setTotalBeds] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!workspaceId) return;
        setLoading(true);

        let unsubSettings: (() => void) | null = null;
        try {
            const settingsCol = workspaceCollectionPath(workspaceId, 'settings', orgId || null);
            const settingsColRef = collection(db, settingsCol);
            const ref = doc(settingsColRef, 'occupancy');
            unsubSettings = onSnapshot(ref, (snap) => {
                if (snap.exists()) {
                    const data = snap.data() as { totalBeds: number };
                    setTotalBeds(typeof data.totalBeds === 'number' ? data.totalBeds : null);
                }
                setLoading(false);
            }, (err) => {
                console.error('workspace settings occupancy listener error', err);
                setLoading(false);
            });
        } catch (e) {
            console.error('Failed to attach workspace settings listener', e);
            setLoading(false);
        }

        return () => {
            if (unsubSettings) unsubSettings();
        };
    }, [workspaceId, orgId]);

    // Calculate occupancy percentage from daily entry and total beds
    let percent = 0;
    let displayOccupied: number | null = null;
    let displayTotal: number | null = totalBeds;

    // Get occupancy from daily entry (this is the source of truth for occupied beds)
    if (dailyEntry && dailyEntry.occupancy !== undefined && dailyEntry.occupancy !== null && totalBeds && totalBeds > 0) {
        const v = String(dailyEntry.occupancy).trim();
        if (v.includes('/')) {
            // If daily entry has "occupied/total" format, use the occupied part
            const parts = v.split('/').map(p => p.trim());
            const occ = parseFloat(parts[0]) || 0;
            displayOccupied = Math.round(occ);
            percent = Math.round((occ / totalBeds) * 100);
        } else {
            // If daily entry has just a number, treat it as occupied beds
            const n = parseFloat(v);
            if (!isNaN(n)) {
                displayOccupied = Math.round(n);
                percent = Math.round((n / totalBeds) * 100);
            }
        }
    }

    // Determine if this should glow (low occupancy or missing data)
    const needsAttention = percent < 70 || (displayTotal === null || displayOccupied === null);

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/5 p-2 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl hover:from-white/25 hover:to-white/10 min-h-[68px] flex flex-col justify-between cursor-pointer ${needsAttention ? "pulse-occupancy" : ""
                }`}
            onClick={onTrendsClick}
        >
            <div className="flex items-center gap-4">
                <div className="rounded-xl p-2 bg-purple-500/20 text-purple-100">
                    <Briefcase className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                        Occupancy
                    </div>
                    <div className="text-lg font-bold text-white">
                        {loading
                            ? 'Loading...'
                            : displayTotal !== null
                                ? `${displayOccupied !== null ? displayOccupied : '—'}/${displayTotal}`
                                : '—'}
                    </div>
                    <div className="text-xs text-white/60">
                        {loading
                            ? 'Fetching occupancy settings'
                            : displayTotal === null
                                ? "Set total beds in Settings"
                                : displayOccupied === null
                                    ? "Log occupied beds in the daily check-in"
                                    : `${percent}% occupied`}
                    </div>
                </div>
                {percent >= 80 && (
                    <CheckCircle className="h-5 w-5 text-emerald-300" />
                )}
                {percent < 70 && percent > 0 && (
                    <AlertCircle className="h-5 w-5 text-red-300" />
                )}
            </div>
        </div>
    );
}

// Mini version of Staffing Card for hero header
function MiniStaffingCard({ workspaceId, orgId, dailyEntry, onTeamsClick, onTrendsClick }: { workspaceId?: string, orgId?: string | null, dailyEntry?: any, onTeamsClick?: () => void, onTrendsClick?: () => void }) {
    const [staffingData, setStaffingData] = useState<{ day: number | null; night: number | null; recordedAt?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!workspaceId) return;
        setLoading(true);
        try {
            const colRef = collection(db, workspaceCollectionPath(workspaceId, 'daily-checkins', orgId || null));
            const q = fsQuery(colRef, orderBy('createdAt', 'desc'), limit(1));
            const unsub = onSnapshot(q, (snap) => {
                if (!snap.empty) {
                    const latestDoc = snap.docs[0];
                    const data = latestDoc.data();
                    const dayRaw = data.staffingDay ?? data.staffing?.day;
                    const nightRaw = data.staffingNight ?? data.staffing?.night;
                    const parseCount = (value: unknown): number | null => {
                        const n = Number(value);
                        return Number.isFinite(n) && n >= 0 ? n : null;
                    };
                    setStaffingData({
                        day: parseCount(dayRaw),
                        night: parseCount(nightRaw),
                        recordedAt: typeof data.recordedAt === 'string' ? data.recordedAt : undefined,
                    });
                } else {
                    setStaffingData(null);
                }
                setLoading(false);
            }, (err) => {
                console.error('Failed to listen to daily checkins for staffing', err);
                setLoading(false);
            });
            return () => unsub();
        } catch (e) {
            console.error('Failed to set up daily checkins listener', e);
            setLoading(false);
        }
    }, [workspaceId, orgId]);

    const parseFromDailyEntry = (key: 'staffingDay' | 'staffingNight', fallback?: number | null) => {
        if (!dailyEntry) return fallback ?? null;
        const direct = dailyEntry[key];
        if (direct !== undefined && direct !== null) {
            const n = Number(direct);
            return Number.isFinite(n) && n >= 0 ? n : fallback ?? null;
        }
        const nested = dailyEntry.staffing?.[key === 'staffingDay' ? 'day' : 'night'];
        if (nested !== undefined && nested !== null) {
            const n = Number(nested);
            return Number.isFinite(n) && n >= 0 ? n : fallback ?? null;
        }
        return fallback ?? null;
    };

    const dayCount = parseFromDailyEntry('staffingDay', staffingData?.day ?? null);
    const nightCount = parseFromDailyEntry('staffingNight', staffingData?.night ?? null);
    const hasStaffingData = dayCount !== null || nightCount !== null;

    const totalStaff = hasStaffingData ? (dayCount ?? 0) + (nightCount ?? 0) : 0;
    const STAFF_TARGET = 20;
    const percent = STAFF_TARGET > 0 && hasStaffingData ? Math.min(100, Math.round((totalStaff / STAFF_TARGET) * 100)) : 0;

    // Determine if this should glow (low staffing or missing data)
    const needsAttention = !hasStaffingData || totalStaff === 0 || percent < 80;

    const formatCount = (value: number | null) => (value === null ? '—' : String(value));
    const subtitle = hasStaffingData
        ? `Day: ${formatCount(dayCount)} | Night: ${formatCount(nightCount)}`
        : 'Complete the daily check-in to log staffing levels';

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/5 p-2 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl hover:from-white/25 hover:to-white/10 min-h-[68px] flex flex-col justify-between cursor-pointer ${needsAttention ? "pulse-staffing" : ""
                }`}
            onClick={onTrendsClick}
        >
            <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 bg-blue-500/20 text-blue-100">
                    <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                        Staffing
                    </div>
                    <div className="text-xl font-bold text-white">
                        {loading ? 'Loading...' : hasStaffingData ? totalStaff : '—'}
                    </div>
                    <div className="text-xs text-white/60">
                        {loading ? 'Fetching latest staffing check-in' : subtitle}
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    {onTeamsClick && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="relative z-30 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 pointer-events-auto p-2"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onTeamsClick();
                            }}
                        >
                            <Users className="w-4 h-4" />
                        </Button>
                    )}
                </div>
                {hasStaffingData && totalStaff >= STAFF_TARGET && (
                    <CheckCircle className="h-5 w-5 text-emerald-300" />
                )}
                {hasStaffingData && totalStaff > 0 && totalStaff < STAFF_TARGET && (
                    <AlertCircle className="h-5 w-5 text-red-300" />
                )}
            </div>
        </div>
    );
}

type ExecutiveSummaryProps = {
    documents: Document[];
    onSelect: (doc: Document) => void;
    workspaceId?: string;
    orgId?: string | null;
    overallStats: OverallStats;
    getGradientColors: (score: number | null) => { start: string; end: string };
    trends: Record<string, { direction: "up" | "down" | "stable"; change: number }>;
    dailyEntry?: any;
    onDailyEntryUpdate: (entry: any) => void;
    carePlanScore: number | null;
    hsScore: number | null;
    maintenanceScore: number | null;
    restrictiveScore: number | null;
    fireScore: number | null;
    infectionScore: number | null;
    mealtimeScore: number | null;
    nightScore: number | null;
    staffFileScore: number | null;
    kitchenScore: number | null;
    handleAuditCardClick: (auditType: AuditType) => void;
    onStaffingTeamsClick: () => void;
    onStaffingTrendsClick: () => void;
    onOccupancyTrendsClick: () => void;
    onComplianceOverviewClick: () => void;
    navigateToAuditForm: (auditKey: string) => void;
    isTodayCompleted: boolean;
    actionableItems: ActionableItems;
    focusItems: FocusItem[];
};

const PriorityPanel = ({ items, className }: { items: FocusItem[]; className?: string }) => {
    const tasksRemaining = items.length;

    return (
        <Card className={`group relative flex h-full flex-col overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-white shadow-xl transition-all duration-300 hover:shadow-2xl ${className ?? ""}`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
            <CardHeader className="pb-4 pt-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                            <ClipboardList className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-base font-semibold text-slate-900">Focus Queue</CardTitle>
                    </div>
                    <Badge variant={tasksRemaining > 0 ? "destructive" : "secondary"} className="rounded-full">
                        {tasksRemaining > 0 ? `${tasksRemaining} to action` : "All caught up"}
                    </Badge>
                </div>
                <CardDescription className="text-sm text-slate-500">
                    Quick wins and outstanding actions to keep the workspace inspection-ready.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-4 overflow-hidden">
                {tasksRemaining > 0 ? (
                    <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {items.map((item) => {
                            const isClickable = typeof item.onClick === "function";
                            const sharedClasses = "w-full flex items-start gap-3 rounded-xl border border-slate-200/60 bg-gradient-to-r from-white to-slate-50 px-4 py-3";
                            const interactiveClasses = isClickable
                                ? " text-left transition-all hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                : "";

                            const content = (
                                <div className="flex items-start gap-3 w-full">
                                    <div className={`flex-shrink-0 rounded-xl border ${item.iconWrapperClass} p-2.5`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                                                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{item.description}</p>
                                            </div>
                                            {item.badge && (
                                                <Badge variant={item.badge.variant ?? "outline"} className="rounded-full whitespace-nowrap">
                                                    {item.badge.label}
                                                </Badge>
                                            )}
                                        </div>
                                        {item.meta && (
                                            <p className="text-xs text-slate-400">{item.meta}</p>
                                        )}
                                    </div>
                                    {isClickable && (
                                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    )}
                                </div>
                            );

                            return isClickable ? (
                                <button
                                    type="button"
                                    key={item.id}
                                    onClick={item.onClick}
                                    className={sharedClasses + interactiveClasses}
                                >
                                    {content}
                                </button>
                            ) : (
                                <div key={item.id} className={sharedClasses}>
                                    {content}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                        Nothing urgent right now. Keep capturing daily check-ins, completing audits, and tagging new uploads to stay inspection-ready.
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

function ExecutiveSummary({
    documents,
    onSelect,
    workspaceId,
    orgId,
    overallStats,
    getGradientColors,
    trends,
    dailyEntry,
    onDailyEntryUpdate,
    carePlanScore,
    hsScore,
    maintenanceScore,
    restrictiveScore,
    fireScore,
    infectionScore,
    mealtimeScore,
    nightScore,
    staffFileScore,
    kitchenScore,
    handleAuditCardClick,
    onStaffingTeamsClick,
    onStaffingTrendsClick,
    onOccupancyTrendsClick,
    onComplianceOverviewClick,
    navigateToAuditForm,
    isTodayCompleted,
    actionableItems,
    focusItems,
}: ExecutiveSummaryProps) {
    return (
        <section className="space-y-8">
            <PendingPulseStyles />
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Executive summary</h2>
                    <p className="max-w-2xl text-sm text-slate-600">
                        A high-level overview of health, audits, and outstanding actions tailored for leadership and inspection readiness.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                        <BarChart3 className="h-4 w-4 text-slate-500" />
                        <span>
                            {overallStats.auditsCompleted}/{overallStats.totalAudits} audits complete
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                        <Shield className="h-4 w-4 text-emerald-500" />
                        <span>
                            {overallStats.overallPercentage !== null ? `${overallStats.overallPercentage}% compliance` : "No compliance data"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid gap-x-6 gap-y-4 2xl:auto-rows-fr 2xl:grid-cols-5">
                <div className="2xl:col-span-3">
                    <StaffingOverviewCard
                        workspaceId={workspaceId}
                        orgId={orgId}
                        dailyEntry={dailyEntry}
                        onNavigateToRotas={() => {
                            if (typeof window !== "undefined") {
                                window.dispatchEvent(new CustomEvent("navigate-to-rotas"));
                            }
                        }}
                        className="h-full min-h-[360px]"
                    />
                </div>

                <div className="2xl:col-span-2">
                    <PriorityPanel items={focusItems} className="h-full min-h-[360px]" />
                </div>

                <div className="2xl:col-span-3">
                    <ActionPlansCard
                        workspaceId={workspaceId}
                        orgId={orgId}
                        documents={documents}
                        onSelect={onSelect}
                        className="h-full"
                    />
                </div>

                <div className="2xl:col-span-2">
                    <ResidentCareCard workspaceId={workspaceId} orgId={orgId} className="h-full" />
                </div>
            </div>
        </section>
    );
}

type OccupancyData = { totalBeds: number; occupiedBeds: number };

function OccupancyCard({ workspaceId, orgId, dailyEntry, onTrendsClick }: { workspaceId?: string, orgId?: string | null, dailyEntry?: any, onTrendsClick?: () => void }) {
    const [totalBeds, setTotalBeds] = useState<number | null>(null);
    const [occupiedBeds, setOccupiedBeds] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [careHomePercent, setCareHomePercent] = useState<number | null>(null);
    const [editing, setEditing] = useState(false);
    const [totalBedsInput, setTotalBedsInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!workspaceId) return;
        setLoading(true);

        // Try dev HTTP API for care-homes first (in dev this is an in-memory store)
        (async () => {
            try {
                const resp = await fetch(`/api/care-homes/${workspaceId}`);
                if (resp.ok) {
                    const json = await resp.json();
                    // API returns an object with occupancy in 0..1
                    if (json && typeof json.occupancy === 'number') {
                        setCareHomePercent(json.occupancy);
                    }
                } else if (resp.status === 404) {
                    // API endpoint doesn't exist, silently continue to workspace settings fallback
                } else {
                    console.warn('Care-homes API returned unexpected status:', resp.status);
                }
            } catch (e) {
                // Network error or other fetch failure, ignore - fallback to workspace settings
            }
        })();

        // For org-scoped workspaces, only use workspace settings (care-homes collection is for separate care home entities)
        // Skip care-homes Firestore listener for workspaces

        // Always listen to workspace settings occupancy as a fallback (organisation-aware)
        let unsubSettings: (() => void) | null = null;
        try {
            const settingsCol = workspaceCollectionPath(workspaceId, 'settings', orgId || null);
            const settingsColRef = collection(db, settingsCol);
            const ref = doc(settingsColRef, 'occupancy');
            unsubSettings = onSnapshot(ref, (snap) => {
                if (snap.exists()) {
                    const data = snap.data() as OccupancyData;
                    setTotalBeds(typeof data.totalBeds === 'number' ? data.totalBeds : null);
                    setOccupiedBeds(typeof data.occupiedBeds === 'number' ? data.occupiedBeds : null);
                }
                setLoading(false);
            }, (err) => {
                console.error('workspace settings occupancy listener error', err);
                setLoading(false);
            });
        } catch (e) {
            console.error('Failed to attach workspace settings listener', e);
            setLoading(false);
        }

        return () => {
            if (unsubSettings) unsubSettings();
        };
    }, [workspaceId]);

    // Occupancy on the card is read-only; values are sourced from the daily check-in or workspace settings.

    // Compute percent primarily from dailyEntry if available, supporting 'occ/total' or numeric percent.
    let percent = 0;
    let displayOccupied: number | null = null;
    let displayTotal: number | null = null;

    if (dailyEntry && dailyEntry.occupancy !== undefined && dailyEntry.occupancy !== null) {
        const v = String(dailyEntry.occupancy).trim();
        if (v.includes('/')) {
            const parts = v.split('/').map(p => p.trim());
            const occ = parseFloat(parts[0]) || 0;
            const tot = parseFloat(parts[1]) || 0;
            if (tot > 0) {
                percent = Math.round((occ / tot) * 100);
                displayOccupied = Math.round(occ);
                displayTotal = Math.round(tot);
            }
        } else {
            const n = parseFloat(v);
            if (!isNaN(n)) {
                // If totalBeds is available (from settings or care-home), treat v as occupied count
                const knownTotal = (typeof totalBeds === 'number' && totalBeds > 0) ? totalBeds : null;
                if (knownTotal) {
                    displayOccupied = Math.round(n);
                    displayTotal = Math.round(knownTotal);
                    percent = Math.round((n / knownTotal) * 100);
                } else {
                    // No total available — if 0 < n <= 1 treat as fraction, else treat as percent
                    if (n > 0 && n <= 1) {
                        percent = Math.round(n * 100);
                    } else {
                        percent = Math.round(n);
                    }
                }
            }
        }
    }

    // fallback to careHomePercent or computed from stored beds
    if ((!percent || percent === 0) && typeof careHomePercent === 'number') {
        percent = Math.round(careHomePercent * 100);
    }
    if ((!displayOccupied || displayOccupied === null) && typeof occupiedBeds === 'number' && typeof totalBeds === 'number' && totalBeds > 0) {
        displayOccupied = Math.round(occupiedBeds);
        displayTotal = Math.round(totalBeds);
        if (!percent || percent === 0) {
            percent = Math.round((occupiedBeds / totalBeds) * 100);
        }
    }

    const radius = 48;
    const stroke = 12;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    // Choose gradient colors based on percent (green/amber/red)
    let gradientColors = { start: '#34d399', end: '#059669' };
    if (percent < 80 && percent >= 20) gradientColors = { start: '#fbbf24', end: '#d97706' };
    else if (percent < 20) gradientColors = { start: '#f87171', end: '#dc2626' };

    // Initialize editing input when totalBeds changes
    useEffect(() => {
        if (totalBeds !== null) {
            setTotalBedsInput(totalBeds.toString());
        }
    }, [totalBeds]);

    const handleSaveTotalBeds = async () => {
        setError(null);
        if (!workspaceId) return;
        const beds = parseInt(totalBedsInput || '0', 10);
        if (isNaN(beds) || beds < 0) {
            setError('Please enter a valid non-negative number');
            return;
        }
        setSaving(true);
        try {
            // Save to workspace settings (organisation-aware)
            const settingsCol = workspaceCollectionPath(workspaceId, 'settings', orgId || null);
            const settingsColRef = collection(db, settingsCol);
            const settingsRef = doc(settingsColRef, 'occupancy');
            await setDoc(settingsRef, {
                totalBeds: beds,
                occupiedBeds: occupiedBeds || 0,
                updatedAt: new Date()
            }, { merge: true });
            setEditing(false);
        } catch (e) {
            setError('Failed to save total beds');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-500 hover:shadow-2xl text-white transition-all duration-300 cursor-pointer min-h-[220px] flex flex-col" onClick={onTrendsClick}>
            {/* Animated background effects */}
            <div className="pointer-events-none absolute inset-0 opacity-20">
                <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/30 blur-3xl" />
                <div className="absolute bottom-[-3rem] left-[-2rem] h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
            </div>
            <CardHeader className="pb-4 relative z-20">
                <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
                        <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-indigo-200 font-medium bg-white/10 px-3 py-1 rounded-full border border-white/20">
                            {typeof totalBeds === 'number' && totalBeds >= 0 ? `${totalBeds} beds` : '— beds'}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="relative z-30 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 pointer-events-auto"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditing(prev => !prev);
                            }}
                            disabled={saving || loading}
                        >
                            <Edit3 className="w-4 h-4 mr-1" /> {editing ? 'Cancel' : 'Edit'}
                        </Button>
                    </div>
                </div>
                <CardTitle className="text-lg font-bold text-white mb-2">Occupancy</CardTitle>
                <CardDescription className="text-indigo-100">Track current occupancy levels</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 flex-1">
                <div className="flex items-center gap-4 min-h-[80px]">
                    <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
                        <OccupancyPie percent={percent} size={64} strokeWidth={6} gradientColors={gradientColors} centerFontSize={14} centerClassName="font-bold text-white" centerFill="transparent" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="text-center p-2 bg-white/10 rounded-lg border border-white/20">
                                <div className="text-lg font-bold text-white">{displayOccupied !== null ? displayOccupied : '—'}</div>
                                <div className="text-xs text-indigo-200 font-medium">Occupied</div>
                            </div>
                            <div className="text-center p-2 bg-white/10 rounded-lg border border-white/20">
                                {editing ? (
                                    <input
                                        type="number"
                                        className="w-12 border border-white/30 rounded px-1 py-0.5 text-center text-sm font-bold text-white bg-white/10 placeholder-white/50"
                                        value={totalBedsInput}
                                        onChange={e => setTotalBedsInput(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)).toString())}
                                        min={0}
                                        disabled={saving}
                                        placeholder="0"
                                        // Prevent clicks/arrow interactions from bubbling to parent Card which opens modals
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                        onFocus={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onWheel={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <div className="text-lg font-bold text-white">{displayTotal !== null ? displayTotal : (totalBeds !== null ? totalBeds : '—')}</div>
                                )}
                                <div className="text-xs text-indigo-200 font-medium">Total</div>
                            </div>
                        </div>
                        {error && <div className="text-xs text-red-300 text-center font-medium">{error}</div>}
                        {editing ? (
                            <div className="flex justify-center mt-2">
                                <Button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSaveTotalBeds();
                                    }}
                                    disabled={saving || loading}
                                    size="sm"
                                    className="relative z-30 pointer-events-auto bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 transition-colors duration-200"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        ) : (
                            <div className="text-xs text-indigo-200 text-center">
                                {loading ? 'Loading…' : 'Real-time occupancy data'}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


// Use shared OccupancyPie for staffing visual

function ActionPlansCard({ workspaceId, orgId, documents, onSelect, className }: {
    workspaceId?: string,
    orgId?: string | null,
    documents: Document[],
    onSelect: (item: Document) => void,
    className?: string,
}) {
    const [actionPlans, setActionPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Find action plans folders from documents
    const actionPlansFolders = useMemo(() => {
        return documents.filter(doc =>
            doc.name && (
                doc.name.toLowerCase().includes('action plan') ||
                doc.name.toLowerCase().includes('action-plan') ||
                doc.tags?.some(tag => tag.toLowerCase().includes('action'))
            )
        ).slice(0, 3); // Show max 3 recent action plan documents
    }, [documents]);

    useEffect(() => {
        if (!workspaceId) return;
        setLoading(true);

        // Listen to workspace-scoped audits collection to find action plans
        try {
            const auditsCol = workspaceCollectionPath(workspaceId, 'audits', orgId || null);
            const auditsRef = collection(db, auditsCol);
            // Simplified query to avoid composite index requirement
            const q = fsQuery(auditsRef,
                where('createActionPlan', '==', true),
                orderBy('createdAt', 'desc'),
                limit(50) // Get more docs to filter client-side
            );

            const unsub = onSnapshot(q, (snap) => {
                // Filter for action plans client-side and limit to 5
                const plans = snap.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
                    }))
                    .slice(0, 5);
                setActionPlans(plans);
                setLoading(false);
            }, (err) => {
                console.error('Failed to listen to workspace audits for action plans', err);
                setLoading(false);
                setActionPlans([]);
            });

            return () => unsub();
        } catch (e) {
            console.error('Failed to set up workspace audits listener for action plans', e);
            setLoading(false);
            setActionPlans([]);
        }
    }, [workspaceId]);

    const totalActionPlans = actionPlans.length + actionPlansFolders.length;

    const auditsCount = actionPlans.length;
    const docsCount = actionPlansFolders.length;
    return (
        <Card className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-emerald-50 to-white shadow-xl transition-all duration-300 hover:shadow-2xl ${className ?? ""}`}>
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 shadow-md" />
            <CardHeader className="pb-4 pt-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                            <ClipboardList className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-base font-semibold text-slate-900">Action Plans</CardTitle>
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs">
                            <strong className="text-slate-700">{totalActionPlans}</strong>
                            <span className="text-slate-500">items</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs">
                            <span className="text-slate-500">Audits</span>
                            <strong className="text-slate-700">{auditsCount}</strong>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs">
                            <span className="text-slate-500">Docs</span>
                            <strong className="text-slate-700">{docsCount}</strong>
                        </div>
                    </div>
                </div>
                <CardDescription className="text-sm text-slate-500">
                    Active plans and recent documents
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-3 pt-4">
                {loading ? (
                    <div className="text-sm text-slate-500">Loading...</div>
                ) : totalActionPlans > 0 ? (
                    <div className="space-y-3">
                        {/* Show recent action plan audits */}
                        {actionPlans.slice(0, 3).map(plan => (
                            <div key={plan.id} className="flex items-center justify-between rounded-xl border border-emerald-100/60 bg-white/40 p-3 transition-colors duration-200 hover:bg-emerald-50/70">
                                <div className="flex min-w-0 items-center gap-3">
                                    <FileCheck className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-slate-700">
                                            {plan.auditType ? `${plan.auditType.replace(/-/g, ' ')} audit` : 'Audit action plan'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {plan.title ?? plan.summary ?? ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-xs text-slate-500">{plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'Recent'}</div>
                                    <Badge variant="secondary" className="rounded-full bg-emerald-100 text-xs text-emerald-700">
                                        Audit
                                    </Badge>
                                </div>
                            </div>
                        ))}

                        {/* Show action plan documents */}
                        {actionPlansFolders.slice(0, 3).map(doc => (
                            <div key={doc.id} className="flex items-center justify-between rounded-xl border border-emerald-100/60 bg-white/40 p-3 transition-colors duration-200 hover:bg-emerald-50/70" onClick={() => onSelect(doc)}>
                                <div className="flex min-w-0 items-center gap-3">
                                    {getFileIcon(doc.fileType)}
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-slate-700">{doc.name}</div>
                                        {doc.tags && doc.tags.length > 0 && (
                                            <div className="mt-1 flex items-center gap-2">
                                                {doc.tags.slice(0, 2).map((t: string, i: number) => (
                                                    <span key={i} className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] text-slate-700">{t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-xs text-slate-500">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}</div>
                                    <Badge variant="outline" className="border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700">
                                        {doc.fileType?.toUpperCase()}
                                    </Badge>
                                </div>
                            </div>
                        ))}

                        {totalActionPlans > 3 && (
                            <div className="pt-2 text-center text-xs font-medium text-slate-500">
                                +{totalActionPlans - 3} more action plans
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-green-200 bg-green-50/40 py-6 text-center">
                        <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                        <p className="text-sm font-medium text-slate-600">No active action plans</p>
                        <p className="mt-1 text-xs text-slate-500">Complete an audit to create action plans</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ResidentCareCard({ workspaceId, orgId, className }: { workspaceId?: string, orgId?: string | null, className?: string }) {
    const [loading, setLoading] = useState(true);
    const [residents, setResidents] = useState<any[]>([]);
    const [bandCounts, setBandCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    const [staffBreakdown, setStaffBreakdown] = useState<any>({ Day: { ctms: 0, carers: 0, total: 0 }, Night: { ctms: 0, carers: 0, total: 0 } });

    // Lightweight NDPS helpers (same logic as dependency calculator page)
    function calculateNDPSScore(resident: any) {
        const NPDS_FIELDS = [
            'bcn_mobility', 'bcn_transfers', 'bcn_washing', 'bcn_dressing', 'bcn_toileting', 'bcn_continence', 'bcn_feeding', 'bcn_turning', 'bcn_getting_up', 'bcn_bed_mobility', 'bcn_walking', 'bcn_stairs',
            'snn_breathing', 'snn_drugs', 'snn_skin_care', 'snn_treatment', 'snn_observation',
            'therapy_communication', 'therapy_cognitive', 'therapy_behaviour'
        ];
        let bcn = 0, snn = 0, therapy = 0;
        const bcnKeys = ['bcn_mobility', 'bcn_transfers', 'bcn_washing', 'bcn_dressing', 'bcn_toileting', 'bcn_continence', 'bcn_feeding', 'bcn_turning', 'bcn_getting_up', 'bcn_bed_mobility', 'bcn_walking', 'bcn_stairs'];
        const snnKeys = ['snn_breathing', 'snn_drugs', 'snn_skin_care', 'snn_treatment', 'snn_observation'];
        const therapyKeys = ['therapy_communication', 'therapy_cognitive', 'therapy_behaviour'];
        for (const field of NPDS_FIELDS) {
            const level = resident[field] || '';
            let score = 0;
            switch (level) {
                case 'Low': score = 1; break;
                case 'Medium': score = 2; break;
                case 'High': score = 3; break;
                default: score = 0;
            }
            if (bcnKeys.includes(field)) bcn += score;
            else if (snnKeys.includes(field)) snn += score;
            else therapy += score;
        }
        bcn = Math.min(bcn, 65); snn = Math.min(snn, 25); therapy = Math.min(therapy, 10);
        return bcn + snn + therapy;
    }

    function getNDPSBand(score: number) {
        if (score <= 5) return { band: 1, name: 'Independent' };
        if (score <= 10) return { band: 2, name: 'Low Dependency' };
        if (score <= 15) return { band: 3, name: 'Medium Dependency' };
        if (score <= 20) return { band: 4, name: 'High Dependency' };
        return { band: 5, name: 'Very High Dependency' };
    }

    function calculateNDPSStaffing(ress: any[]) {
        const NDPS_STAFFING_RATIOS_DAY: Record<number, number> = { 1: 1 / 8, 2: 1 / 5, 3: 1 / 3, 4: 1 / 2, 5: 1 / 1.5 };
        const NDPS_STAFFING_RATIOS_NIGHT: Record<number, number> = { 1: 1 / 15, 2: 1 / 10, 3: 1 / 6, 4: 1 / 4, 5: 1 / 2.5 };
        const bandCountsLocal: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ress.forEach(r => { const band = getNDPSBand(calculateNDPSScore(r)).band; bandCountsLocal[band] = (bandCountsLocal[band] || 0) + 1; });
        let day = 0, night = 0;
        for (const b of [1, 2, 3, 4, 5]) {
            const cnt = bandCountsLocal[b] || 0;
            const dayRatio = NDPS_STAFFING_RATIOS_DAY[b] || 0;
            const nightRatio = NDPS_STAFFING_RATIOS_NIGHT[b] || 0;
            day += cnt * dayRatio;
            night += cnt * nightRatio;
        }
        return { Day: Math.ceil(day), Night: Math.ceil(night) };
    }

    function calculateStaffBreakdown(ress: any[]) {
        const totalStaffing = calculateNDPSStaffing(ress);
        // For care homes, only CTMs and carers are relevant
        const dayCTMs = 1, nightCTMs = 1;
        const dayCarers = Math.max(0, totalStaffing.Day - dayCTMs);
        const nightCarers = Math.max(0, totalStaffing.Night - nightCTMs);
        return {
            Day: { ctms: dayCTMs, carers: dayCarers, total: dayCTMs + dayCarers },
            Night: { ctms: nightCTMs, carers: nightCarers, total: nightCTMs + nightCarers }
        };
    }

    useEffect(() => {
        if (!workspaceId) return;
        setLoading(true);
        const ref = workspaceId ? getWorkspaceDocRef(workspaceId, 'dependency_calculator', 'default', orgId || null) : null;
        if (!ref) { setResidents([]); setLoading(false); return; }
        const unsub = onSnapshot(ref, (snap: any) => {
            if (snap.exists()) {
                const data = snap.data();
                const res = Array.isArray(data.residents) ? data.residents : [];
                setResidents(res);
                // calc bands
                const bc: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                res.forEach((r: any) => {
                    const score = calculateNDPSScore(r);
                    const b = getNDPSBand(score).band;
                    bc[b] = (bc[b] || 0) + 1;
                });
                setBandCounts(bc);
                setStaffBreakdown(calculateStaffBreakdown(res));
            } else {
                setResidents([]);
                setBandCounts({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
                setStaffBreakdown({ Day: { ctms: 0, carers: 0, total: 0 }, Night: { ctms: 0, carers: 0, total: 0 } });
            }
            setLoading(false);
        }, (err) => {
            console.warn('Failed to listen to dependency_calculator', err);
            setLoading(false);
        });
        return () => unsub();
    }, [workspaceId, orgId]);

    // Calculate band distribution percentages for visual bars
    const totalResidents = residents.length;
    const bandPercentages = [1, 2, 3, 4, 5].map(b => totalResidents > 0 ? Math.round((bandCounts[b] / totalResidents) * 100) : 0);

    // Band color scheme (gradient from low to high dependency)
    const bandColors = [
        { bg: 'bg-emerald-400', border: 'border-emerald-300', text: 'text-emerald-100' },
        { bg: 'bg-green-400', border: 'border-green-300', text: 'text-green-100' },
        { bg: 'bg-yellow-400', border: 'border-yellow-300', text: 'text-yellow-100' },
        { bg: 'bg-orange-400', border: 'border-orange-300', text: 'text-orange-100' },
        { bg: 'bg-red-400', border: 'border-red-300', text: 'text-red-100' },
    ];

    const bandLabels = ['Independent', 'Low', 'Medium', 'High', 'Very High'];

    return (
        <Card className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-emerald-50/70 to-white shadow-lg transition-all duration-300 hover:shadow-xl ${className ?? ""}`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-lime-400" />

            <CardHeader className="relative z-10 pb-4 pt-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-600">
                            <Heart className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold text-slate-900">Dependency Overview</CardTitle>
                            <CardDescription className="text-sm text-slate-500">
                                Resident care levels and staffing insights
                            </CardDescription>
                        </div>
                    </div>
                    <Badge className="rounded-full border border-teal-200 bg-white/80 text-teal-700 shadow-sm">
                        {residents.length} residents
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="relative z-10 flex flex-1 flex-col space-y-5 pb-6">
                {/* Visual Dependency Distribution */}
                <div className="rounded-2xl border border-teal-100 bg-white/90 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <BarChart3 className="h-4 w-4 text-teal-500" />
                            Dependency distribution
                        </h3>
                        <span className="rounded-full border border-teal-100 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">
                            NPDS bands
                        </span>
                    </div>

                    {/* Horizontal stacked bar */}
                    <div className="mb-4 flex h-8 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                        {[1, 2, 3, 4, 5].map(b => {
                            const width = bandPercentages[b - 1];
                            return width > 0 ? (
                                <div
                                    key={b}
                                    className={`${bandColors[b - 1].bg} flex items-center justify-center text-white transition-all duration-300 hover:opacity-90`}
                                    style={{ width: `${width}%` }}
                                >
                                    {width > 12 && (
                                        <span className="text-[11px] font-semibold">
                                            {bandCounts[b]}
                                        </span>
                                    )}
                                </div>
                            ) : null;
                        })}
                    </div>

                    {/* Band legend with counts */}
                    <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map(b => (
                            <div key={b} className="text-center">
                                <div className={`mb-1.5 h-2 rounded-full ${bandColors[b - 1].bg}`} />
                                <div className="text-xs font-semibold text-slate-700">
                                    {bandCounts[b] ?? 0}
                                </div>
                                <div className="text-[10px] text-slate-500 leading-tight">
                                    {bandLabels[b - 1]}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Staffing Requirements Grid */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Day Shift */}
                    <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-amber-500">
                                <Sun className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-800">Day shift</div>
                                <div className="text-xs text-slate-500">Required staff</div>
                            </div>
                        </div>
                        <div className="space-y-2 text-slate-700">
                            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                                <span>CTMs</span>
                                <span className="text-lg font-semibold text-slate-900">
                                    {staffBreakdown.Day?.ctms ?? 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                                <span>Carers</span>
                                <span className="text-lg font-semibold text-slate-900">
                                    {staffBreakdown.Day?.carers ?? 0}
                                </span>
                            </div>
                            <div className="mt-3 border-t border-amber-100 pt-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                    <span>Total</span>
                                    <span className="text-2xl font-bold text-slate-900">
                                        {staffBreakdown.Day?.total ?? 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Night Shift */}
                    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2 text-indigo-500">
                                <Moon className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-800">Night shift</div>
                                <div className="text-xs text-slate-500">Required staff</div>
                            </div>
                        </div>
                        <div className="space-y-2 text-slate-700">
                            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                                <span>CTMs</span>
                                <span className="text-lg font-semibold text-slate-900">
                                    {staffBreakdown.Night?.ctms ?? 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                                <span>Carers</span>
                                <span className="text-lg font-semibold text-slate-900">
                                    {staffBreakdown.Night?.carers ?? 0}
                                </span>
                            </div>
                            <div className="mt-3 border-t border-indigo-100 pt-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                    <span>Total</span>
                                    <span className="text-2xl font-bold text-slate-900">
                                        {staffBreakdown.Night?.total ?? 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-teal-100 bg-white/90 p-3 text-center shadow-sm">
                        <div className="text-2xl font-semibold text-slate-900">
                            {(staffBreakdown.Day?.total || 0) + (staffBreakdown.Night?.total || 0)}
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3 text-teal-500" />
                            Total staff
                        </div>
                    </div>
                    <div className="rounded-xl border border-teal-100 bg-white/90 p-3 text-center shadow-sm">
                        <div className="text-2xl font-semibold text-slate-900">
                            {residents.length > 0 ? `${Math.round((residents.length / Math.max(1, calculateNDPSStaffing(residents).Day)) * 10) / 10}:1` : "—"}
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500">
                            <Users className="h-3 w-3 text-teal-500" />
                            Day ratio
                        </div>
                    </div>
                    <div className="rounded-xl border border-teal-100 bg-white/90 p-3 text-center shadow-sm">
                        <div className="text-2xl font-semibold text-slate-900">
                            {residents.length > 0 ? `${Math.round((residents.length / Math.max(1, calculateNDPSStaffing(residents).Night)) * 10) / 10}:1` : "—"}
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500">
                            <Users className="h-3 w-3 text-teal-500" />
                            Night ratio
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}



function getAllItems(items: (Document | FolderType)[]): { documents: Document[], folders: FolderType[] } {
    let documents: Document[] = [];
    let folders: FolderType[] = [];

    for (const item of items) {
        if (item.type === 'document') {
            documents.push(item);
        } else if (item.type === 'folder') {
            folders.push(item);
            const subItems = getAllItems(item.items);
            documents = documents.concat(subItems.documents);
            folders = folders.concat(subItems.folders);
        }
    }
    return { documents, folders };
}

interface DashboardHomeProps {
    workspace?: Workspace | null;
    onSelect: (item: Document | FolderType) => void;
    onDocumentAdd: (document: Document) => void;
    onFolderAdd: (folder: FolderType) => void;
}

export function DashboardHome({ workspace, onSelect, onDocumentAdd, onFolderAdd }: DashboardHomeProps) {
    // Allow rendering the dashboard even when `workspace` is temporarily null.
    // Use safe fallbacks for folders/ids so children render and subscribe when the
    // workspace becomes available.
    const isMobile = useIsMobile();
    const { user } = useAuth();
    const organisationId = (workspace as any)?.organisationId ?? (user as any)?.organisationId ?? null;
    const workspaceId = workspace?.id ?? null;
    const { isEnabled } = useFeatureFlags(organisationId, workspaceId);
    const journalFeatureEnabled = isEnabled('journal');
    const roleRaw = (user as any)?.role ?? '';
    const role = typeof roleRaw === 'string' ? roleRaw.trim().toLowerCase() : '';
    const isAdminUser = Boolean((user as any)?.isAdmin);
    const isManagerRole = MANAGER_ROLE_KEYS.includes(role) || isAdminUser;
    const isHeadOfficeRole = HEAD_OFFICE_ROLE_KEYS.includes(role) || isAdminUser;
    const shouldShowJournalCard = journalFeatureEnabled && (isManagerRole || isHeadOfficeRole);
    const [openJournalCount, setOpenJournalCount] = useState<number>(0);
    const navigateToJournal = useCallback(() => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("dashboard:navigate", { detail: { view: "journal" } }));
    }, []);
    const showJournalAlertCard = shouldShowJournalCard && openJournalCount > 0;
    const router = useRouter();

    // Header logo (follows same logic as TopNav: prefer user's profilePicture, then uploadedLogo, with workspace fallback)
    const [headerLogo, setHeaderLogo] = useState<string | null>(null);
    // Keep separate states for org-scoped user logo, top-level user logo, and a workspace-provided logo
    const [orgUserLogo, setOrgUserLogo] = useState<string | null>(null);
    const [topUserLogo, setTopUserLogo] = useState<string | null>(null);
    const [workspaceLogo, setWorkspaceLogo] = useState<string | null>(null);

    // Merge priority: orgUserLogo > topUserLogo > workspaceLogo > workspace.profilePicture > workspace.settings.uploadedLogo
    useEffect(() => {
        const merged = orgUserLogo ?? topUserLogo ?? workspaceLogo ?? workspace?.profilePicture ?? workspace?.settings?.uploadedLogo ?? null;
        setHeaderLogo(merged);
    }, [orgUserLogo, topUserLogo, workspaceLogo, workspace?.profilePicture, workspace?.settings?.uploadedLogo]);

    useEffect(() => {
        if (!workspace?.id || !shouldShowJournalCard) {
            setOpenJournalCount(0);
            return;
        }

        const ref = getWorkspaceCollectionRef(workspace.id, 'journal-entries', organisationId);
        if (!ref) {
            setOpenJournalCount(0);
            return;
        }

        const q = fsQuery(ref, where('status', '==', 'open'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let pending = 0;
            snapshot.forEach((docSnap) => {
                const data = docSnap.data() as Record<string, unknown>;
                const response = data?.response as Record<string, unknown> | undefined;
                const responseText = typeof response?.text === 'string' ? response.text.trim() : '';
                if (!responseText) {
                    pending += 1;
                }
            });
            setOpenJournalCount(pending);
        }, (error) => {
            console.warn('[dashboard] failed to watch journal entries', error);
            setOpenJournalCount(0);
        });

        return () => unsubscribe();
    }, [workspace?.id, organisationId, shouldShowJournalCard]);

    const { documents, folders } = useMemo(() => getAllItems(workspace?.folders || []), [workspace?.folders]);

    const actionableItems = useMemo((): ActionableItems => {
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const parseDate = (value: string) => {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        };

        const untagged = documents.filter((doc) => !doc.tags || doc.tags.length === 0);
        const recent = documents.filter((doc) => {
            const createdAt = parseDate(doc.createdAt);
            return createdAt ? createdAt >= threeDaysAgo : false;
        });

        const docsThisWeekCount = documents.reduce((count, doc) => {
            const createdAt = parseDate(doc.createdAt);
            return createdAt && createdAt >= sevenDaysAgo ? count + 1 : count;
        }, 0);

        return {
            untaggedDocs: untagged.slice(0, 3),
            untaggedCount: untagged.length,
            recentDocs: recent.slice(0, 3),
            docsThisWeekCount,
        };
    }, [documents]);


    const recentDocuments = useMemo(() => {
        return [...documents] // Create a shallow copy before sorting
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [documents]);

    const quickAccessFolders = useMemo(() => {
        // In a real app, this would be based on usage. For now, just show top-level folders.
        const f = workspace?.folders || [];
        return f.filter((item: any) => item.type === 'folder').slice(0, 4) as FolderType[];
    }, [workspace?.folders])

    // Quick read of latest audit scores from workspace settings for the header quick card
    const [auditScoreMap, setAuditScoreMap] = useState<AuditScoreMap>(() => createEmptyAuditScoreMap());
    const [monthlyAuditStatus, setMonthlyAuditStatus] = useState<Record<AuditType, boolean>>(() => createEmptyAuditStatusMap());
    const [monthlyStatusLoaded, setMonthlyStatusLoaded] = useState(false);

    const [carePlanScore, setCarePlanScore] = useState<number | null>(null);
    const [carePlanUpdatedAt, setCarePlanUpdatedAt] = useState<number | null>(null);
    const [hsScore, setHsScore] = useState<number | null>(null);
    const [hsUpdatedAt, setHsUpdatedAt] = useState<number | null>(null);

    // Add all audit scores state for overall calculation
    const [carePlanYesCount, setCarePlanYesCount] = useState<number | null>(null);
    const [carePlanTotalCount, setCarePlanTotalCount] = useState<number | null>(null);
    const [hsYesCount, setHsYesCount] = useState<number | null>(null);
    const [hsTotalCount, setHsTotalCount] = useState<number | null>(null);
    const [maintenanceScore, setMaintenanceScore] = useState<number | null>(null);
    const [maintenanceYesCount, setMaintenanceYesCount] = useState<number | null>(null);
    const [maintenanceTotalCount, setMaintenanceTotalCount] = useState<number | null>(null);
    const [restrictiveScore, setRestrictiveScore] = useState<number | null>(null);
    const [restrictiveYesCount, setRestrictiveYesCount] = useState<number | null>(null);
    const [restrictiveTotalCount, setRestrictiveTotalCount] = useState<number | null>(null);
    const [fireScore, setFireScore] = useState<number | null>(null);
    const [fireYesCount, setFireYesCount] = useState<number | null>(null);
    const [fireTotalCount, setFireTotalCount] = useState<number | null>(null);
    const [infectionScore, setInfectionScore] = useState<number | null>(null);
    const [infectionYesCount, setInfectionYesCount] = useState<number | null>(null);
    const [infectionTotalCount, setInfectionTotalCount] = useState<number | null>(null);
    const [mealtimeScore, setMealtimeScore] = useState<number | null>(null);
    const [mealtimeYesCount, setMealtimeYesCount] = useState<number | null>(null);
    const [mealtimeTotalCount, setMealtimeTotalCount] = useState<number | null>(null);
    const [nightScore, setNightScore] = useState<number | null>(null);
    const [nightYesCount, setNightYesCount] = useState<number | null>(null);
    const [nightTotalCount, setNightTotalCount] = useState<number | null>(null);
    const [staffFileScore, setStaffFileScore] = useState<number | null>(null);
    const [staffFileYesCount, setStaffFileYesCount] = useState<number | null>(null);
    const [staffFileTotalCount, setStaffFileTotalCount] = useState<number | null>(null);
    const [kitchenScore, setKitchenScore] = useState<number | null>(null);
    const [kitchenYesCount, setKitchenYesCount] = useState<number | null>(null);
    const [kitchenTotalCount, setKitchenTotalCount] = useState<number | null>(null);

    // Trend tracking state
    const [trends, setTrends] = useState<Record<string, { direction: 'up' | 'down' | 'stable', change: number }>>({});
    const [historicalData, setHistoricalData] = useState<Record<string, any>>({});



    useEffect(() => {
        if (!workspace || !workspace.id) return;

        (async () => {
            try {
                // If workspace.id refers to another user/doc, try to read any previously-saved image there
                if (workspace.id && workspace.id !== user?.id) {
                    const wsDocRef = doc(db, workspaceBasePath(workspace.id, (workspace as any)?.organisationId || null));
                    const wsSnap = await getDoc(wsDocRef);
                    if (wsSnap.exists()) {
                        const data = wsSnap.data();
                        // Store workspace-provided logo into state so it participates in the merge priority
                        if (data?.profilePicture) {
                            setWorkspaceLogo(data.profilePicture);
                            return; // prefer workspace-saved image until user doc subscription overrides it
                        } else if (data?.uploadedLogo) {
                            setWorkspaceLogo(data.uploadedLogo);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error('workspace fallback header logo fetch failed', err);
            }
        })();

        // Live subscribe to both organisation-scoped and top-level user documents so updates in either
        // location are reflected immediately. We keep separate states for each source and merge them.
        let orgUnsub: (() => void) | undefined;
        let topUnsub: (() => void) | undefined;
        if (user?.id) {
            const orgId = (workspace as any)?.organisationId;
            try {
                if (orgId) {
                    const orgRef = doc(db, `organisations/${orgId}/users`, user.id);
                    orgUnsub = onSnapshot(orgRef, (d) => {
                        const data = d.data();
                        setOrgUserLogo(data?.profilePicture ?? data?.uploadedLogo ?? null);
                    }, (err) => {
                        console.warn('Failed to subscribe to org-scoped user document for header logo', err);
                        setOrgUserLogo(null);
                    });
                }
            } catch (e) {
                console.warn('Error setting up org-scoped user listener', e);
                setOrgUserLogo(null);
            }

            try {
                const topRef = doc(db, 'users', user.id);
                topUnsub = onSnapshot(topRef, (d) => {
                    const data = d.data();
                    setTopUserLogo(data?.profilePicture ?? data?.uploadedLogo ?? null);
                }, (err) => {
                    console.warn('Failed to subscribe to top-level user document for header logo', err);
                    setTopUserLogo(null);
                });
            } catch (e) {
                console.warn('Error setting up top-level user listener', e);
                setTopUserLogo(null);
            }
        }

        // Replace existing single unsubscribe with a combined cleanup that stops both listeners
        const unsubscribeFromUser = () => {
            try { if (typeof orgUnsub === 'function') orgUnsub(); } catch (e) { /* ignore */ }
            try { if (typeof topUnsub === 'function') topUnsub(); } catch (e) { /* ignore */ }
        };

        // Subscribe to audit latest scores (organisation-aware)
        const settingsCol = workspace && workspace.id ? workspaceCollectionPath(workspace.id, 'settings', (workspace as any)?.organisationId || null) : workspaceCollectionPath('', 'settings', null);
        const ref = doc(db, settingsCol, 'audit_latest_scores');
        const unsubAudit = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as any;
                const nextAuditScoreMap = createEmptyAuditScoreMap();

                AUDIT_TYPES.forEach((auditKey) => {
                    const audit = data?.[auditKey];
                    nextAuditScoreMap[auditKey] = {
                        scorePercent: typeof audit?.scorePercent === 'number' ? audit.scorePercent : null,
                        yesCount: typeof audit?.yesCount === 'number' ? audit.yesCount : null,
                        totalCount: typeof audit?.totalCount === 'number' ? audit.totalCount : null,
                    };
                });

                setAuditScoreMap(nextAuditScoreMap);
                const cp = data?.['care-plan'];
                const hs = data?.['health-safety'];
                const m = data?.['maintenance'];
                const r = data?.['restrictive-practice'];
                const f = data?.['fire-safety'];
                const ic = data?.['infection-control'];
                const mt = data?.['mealtime'];
                const nv = data?.['night-visit'];
                const sf = data?.['staff-file'];
                const k = data?.['kitchen'];

                // Care plan
                setCarePlanScore(typeof cp?.scorePercent === 'number' ? cp.scorePercent : null);
                setCarePlanYesCount(typeof cp?.yesCount === 'number' ? cp.yesCount : null);
                setCarePlanTotalCount(typeof cp?.totalCount === 'number' ? cp.totalCount : null);
                setCarePlanUpdatedAt(cp?.updatedAt ?? null);

                // Health & Safety
                setHsScore(typeof hs?.scorePercent === 'number' ? hs.scorePercent : null);
                setHsYesCount(typeof hs?.yesCount === 'number' ? hs.yesCount : null);
                setHsTotalCount(typeof hs?.totalCount === 'number' ? hs.totalCount : null);
                setHsUpdatedAt(hs?.updatedAt ?? null);

                // Maintenance
                setMaintenanceScore(typeof m?.scorePercent === 'number' ? m.scorePercent : null);
                setMaintenanceYesCount(typeof m?.yesCount === 'number' ? m.yesCount : null);
                setMaintenanceTotalCount(typeof m?.totalCount === 'number' ? m.totalCount : null);

                // Restrictive Practice
                setRestrictiveScore(typeof r?.scorePercent === 'number' ? r.scorePercent : null);
                setRestrictiveYesCount(typeof r?.yesCount === 'number' ? r.yesCount : null);
                setRestrictiveTotalCount(typeof r?.totalCount === 'number' ? r.totalCount : null);

                // Fire Safety
                setFireScore(typeof f?.scorePercent === 'number' ? f.scorePercent : null);
                setFireYesCount(typeof f?.yesCount === 'number' ? f.yesCount : null);
                setFireTotalCount(typeof f?.totalCount === 'number' ? f.totalCount : null);

                // Infection Control
                setInfectionScore(typeof ic?.scorePercent === 'number' ? ic.scorePercent : null);
                setInfectionYesCount(typeof ic?.yesCount === 'number' ? ic.yesCount : null);
                setInfectionTotalCount(typeof ic?.totalCount === 'number' ? ic.totalCount : null);

                // Mealtime
                setMealtimeScore(typeof mt?.scorePercent === 'number' ? mt.scorePercent : null);
                setMealtimeYesCount(typeof mt?.yesCount === 'number' ? mt.yesCount : null);
                setMealtimeTotalCount(typeof mt?.totalCount === 'number' ? mt.totalCount : null);

                // Night Visit
                setNightScore(typeof nv?.scorePercent === 'number' ? nv.scorePercent : null);
                setNightYesCount(typeof nv?.yesCount === 'number' ? nv.yesCount : null);
                setNightTotalCount(typeof nv?.totalCount === 'number' ? nv.totalCount : null);

                // Staff File
                setStaffFileScore(typeof sf?.scorePercent === 'number' ? sf.scorePercent : null);
                setStaffFileYesCount(typeof sf?.yesCount === 'number' ? sf.yesCount : null);
                setStaffFileTotalCount(typeof sf?.totalCount === 'number' ? sf.totalCount : null);

                // Kitchen
                setKitchenScore(typeof k?.scorePercent === 'number' ? k.scorePercent : null);
                setKitchenYesCount(typeof k?.yesCount === 'number' ? k.yesCount : null);
                setKitchenTotalCount(typeof k?.totalCount === 'number' ? k.totalCount : null);

                // Calculate trends by comparing with previous month's data
                if (data) {
                    calculateTrends(data);
                }
            } else {
                setAuditScoreMap(createEmptyAuditScoreMap());
                // Reset all values if no data
                setCarePlanScore(null);
                setCarePlanYesCount(null);
                setCarePlanTotalCount(null);
                setCarePlanUpdatedAt(null);
                setHsScore(null);
                setHsYesCount(null);
                setHsTotalCount(null);
                setHsUpdatedAt(null);
                setMaintenanceScore(null);
                setMaintenanceYesCount(null);
                setMaintenanceTotalCount(null);
                setRestrictiveScore(null);
                setRestrictiveYesCount(null);
                setRestrictiveTotalCount(null);
                setFireScore(null);
                setFireYesCount(null);
                setFireTotalCount(null);
                setInfectionScore(null);
                setInfectionYesCount(null);
                setInfectionTotalCount(null);
                setMealtimeScore(null);
                setMealtimeYesCount(null);
                setMealtimeTotalCount(null);
                setNightScore(null);
                setNightYesCount(null);
                setNightTotalCount(null);
                setStaffFileScore(null);
                setStaffFileYesCount(null);
                setStaffFileTotalCount(null);
                setKitchenScore(null);
                setKitchenYesCount(null);
                setKitchenTotalCount(null);
            }
        }, (err) => {
            console.warn('Failed to listen to audit_latest_scores', err);
        });

        return () => {
            unsubscribeFromUser();
            if (unsubAudit) unsubAudit();
        };
    }, [workspace?.id, (workspace as any)?.organisationId]);

    useEffect(() => {
        let cancelled = false;
        setMonthlyStatusLoaded(false);

        const loadStatus = async () => {
            if (!workspace?.id) {
                if (!cancelled) {
                    setMonthlyAuditStatus(createEmptyAuditStatusMap());
                    setMonthlyStatusLoaded(false);
                }
                return;
            }

            try {
                const status = await getMonthlyAuditCompletionStatus(workspace.id, (workspace as any)?.organisationId || null);
                if (cancelled) return;

                const nextStatus = createEmptyAuditStatusMap();
                Object.entries(status || {}).forEach(([key, value]) => {
                    if (Object.prototype.hasOwnProperty.call(nextStatus, key)) {
                        nextStatus[key as AuditType] = Boolean(value);
                    }
                });

                setMonthlyAuditStatus(nextStatus);
                setMonthlyStatusLoaded(true);
            } catch (error) {
                if (!cancelled) {
                    console.warn('Failed to load monthly audit completion status', error);
                    setMonthlyAuditStatus(createEmptyAuditStatusMap());
                    setMonthlyStatusLoaded(false);
                }
            }
        };

        loadStatus();

        return () => {
            cancelled = true;
        };
    }, [workspace?.id, (workspace as any)?.organisationId]);



    const scoreBasedCompletedCount = useMemo(() => (
        AUDIT_TYPES.reduce((count, type) => {
            const entry = auditScoreMap[type];
            return count + (entry && entry.scorePercent !== null ? 1 : 0);
        }, 0)
    ), [auditScoreMap]);

    const monthlyCompletedCount = useMemo(() => (
        AUDIT_TYPES.reduce((count, type) => count + (monthlyAuditStatus[type] ? 1 : 0), 0)
    ), [monthlyAuditStatus]);

    const completedAuditCount = monthlyStatusLoaded ? monthlyCompletedCount : scoreBasedCompletedCount;
    const totalAuditCount = AUDIT_TYPES.length;

    // Function to calculate trends
    const calculateTrends = (currentData: any) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        // Store current month's data
        setHistoricalData(prev => ({
            ...prev,
            [monthKey]: currentData
        }));

        // Calculate previous month
        const prevDate = new Date(currentYear, currentMonth - 1);
        const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        // Get previous month's data from localStorage
        // Get previous month's data from localStorage
        let savedHistory: string | null = null;
        try {
            if (typeof window !== 'undefined') {
                savedHistory = localStorage.getItem(`audit_history_${workspace?.id}`);
            }
        } catch (e) {
            // ignore
        }
        const history = savedHistory ? JSON.parse(savedHistory) : {};

        const prevData = history[prevMonthKey];

        if (prevData && currentData && workspace?.id) {
            const newTrends: Record<string, { direction: 'up' | 'down' | 'stable', change: number }> = {};

            // Calculate overall trend
            const currentOverall = calculateOverallStatsFromData(currentData);
            const prevOverall = calculateOverallStatsFromData(prevData);

            if (currentOverall.overallPercentage !== null && prevOverall.overallPercentage !== null) {
                const overallChange = currentOverall.overallPercentage - prevOverall.overallPercentage;
                const overallDirection = overallChange > 2 ? 'up' : overallChange < -2 ? 'down' : 'stable';
                newTrends['overall'] = { direction: overallDirection, change: Math.round(overallChange) };
            }

            setTrends(newTrends);
        }

        // Save current data to localStorage for next month comparison
        if (workspace?.id) {
            try {
                if (typeof window !== 'undefined') {
                    const savedHistory = localStorage.getItem(`audit_history_${workspace.id}`);
                    const history = savedHistory ? JSON.parse(savedHistory) : {};
                    const updatedHistory = { ...history, [monthKey]: currentData };
                    localStorage.setItem(`audit_history_${workspace.id}`, JSON.stringify(updatedHistory));
                }
            } catch (e) {
                // ignore
            }
        }
    };

    // Helper function to calculate overall stats from raw data
    const calculateOverallStatsFromData = (data: any) => {
        let totalYes = 0;
        let totalQuestions = 0;
        let completedAudits = 0;

        AUDIT_TYPES.forEach(auditType => {
            const audit = data[auditType];
            if (audit && typeof audit.yesCount === 'number' && typeof audit.totalCount === 'number') {
                totalYes += audit.yesCount;
                totalQuestions += audit.totalCount;
                completedAudits++;
            }
        });

        const overallPercentage = totalQuestions > 0 ? Math.round((totalYes / totalQuestions) * 100) : null;

        return {
            overallPercentage,
            totalYes,
            totalQuestions,
            completedAudits
        };
    };

    // Calculate overall statistics
    const calculateOverallStats = () => {
        const totals = AUDIT_TYPES.map((type) => auditScoreMap[type]);
        const totalYesCount = totals.reduce((sum, entry) => sum + (entry?.yesCount ?? 0), 0);
        const totalQuestions = totals.reduce((sum, entry) => sum + (entry?.totalCount ?? 0), 0);
        const overallPercentage = totalQuestions > 0 ? Math.round((totalYesCount / totalQuestions) * 100) : null;

        return {
            totalYesCount,
            totalQuestions,
            overallPercentage,
            auditsCompleted: completedAuditCount,
            totalAudits: totalAuditCount
        };
    };

    // Lightweight NDPS helpers (same logic as dependency calculator page)
    function calculateNDPSScore(resident: any) {
        const NPDS_FIELDS = [
            'bcn_mobility', 'bcn_transfers', 'bcn_washing', 'bcn_dressing', 'bcn_toileting', 'bcn_continence', 'bcn_feeding', 'bcn_turning', 'bcn_getting_up', 'bcn_bed_mobility', 'bcn_walking', 'bcn_stairs',
            'snn_breathing', 'snn_drugs', 'snn_skin_care', 'snn_treatment', 'snn_observation',
            'therapy_communication', 'therapy_cognitive', 'therapy_behaviour'
        ];
        let bcn = 0, snn = 0, therapy = 0;
        const bcnKeys = ['bcn_mobility', 'bcn_transfers', 'bcn_washing', 'bcn_dressing', 'bcn_toileting', 'bcn_continence', 'bcn_feeding', 'bcn_turning', 'bcn_getting_up', 'bcn_bed_mobility', 'bcn_walking', 'bcn_stairs'];
        const snnKeys = ['snn_breathing', 'snn_drugs', 'snn_skin_care', 'snn_treatment', 'snn_observation'];
        const therapyKeys = ['therapy_communication', 'therapy_cognitive', 'therapy_behaviour'];
        for (const field of NPDS_FIELDS) {
            const level = resident[field] || '';
            let score = 0;
            switch (level) {
                case 'Low': score = 1; break;
                case 'Medium': score = 2; break;
                case 'High': score = 3; break;
                default: score = 0;
            }
            if (bcnKeys.includes(field)) bcn += score;
            else if (snnKeys.includes(field)) snn += score;
            else therapy += score;
        }
        bcn = Math.min(bcn, 65); snn = Math.min(snn, 25); therapy = Math.min(therapy, 10);
        return bcn + snn + therapy;
    }

    function getNDPSBand(score: number) {
        if (score <= 5) return { band: 1, name: 'Independent' };
        if (score <= 10) return { band: 2, name: 'Low Dependency' };
        if (score <= 15) return { band: 3, name: 'Medium Dependency' };
        if (score <= 20) return { band: 4, name: 'High Dependency' };
        return { band: 5, name: 'Very High Dependency' };
    }

    // Helper function to calculate shift hours from start and end times
    const calculateShiftHours = (startTime: string, endTime: string): number => {
        const start = new Date(`1970-01-01T${startTime}:00`);
        const end = new Date(`1970-01-01T${endTime}:00`);
        const diffMs = end.getTime() - start.getTime();
        return diffMs / (1000 * 60 * 60); // Convert to hours
    };

    // Calculate individual component scores for overall health
    const calculateComponentScores = () => {
        // Audits score (30% weight) - based on average of all individual audit scores (uncompleted audits count as 0%)
        const allAuditScores = AUDIT_TYPES.map(type => {
            const score = auditScoreMap[type]?.scorePercent;
            return score !== null && score !== undefined ? score : 0; // Uncompleted audits count as 0%
        });

        const auditsScore = allAuditScores.length > 0
            ? Math.round(allAuditScores.reduce((sum, score) => sum + score, 0) / allAuditScores.length)
            : 0;

        // Action Plans score (20% weight) - based on completion rate of action plans
        // For now, we'll use a simple heuristic: if there are completed audits, assume some action plans exist
        // This could be improved with actual action plan tracking
        const actionPlansScore = completedAuditCount > 0 ? Math.min(100, (completedAuditCount / totalAuditCount) * 100) : 0;

        // Supervisions score (20% weight) - based on completion rate of supervisions/appraisals
        let supervisionsScore = 0;
        if (Object.keys(supervisionsData.completionStatus).length > 0) {
            // Calculate total expected supervisions across all roles
            const trackerAppraisalMapping = {
                'Deputy/ies': ['deputy-supervision'],
                'Clinical lead & Nurses': ['carers-supervision', 'clinical-lead-supervision', 'nurses-supervision'],
                'Senior/Care team managers': ['deputy-supervision', 'senior-carer-supervision'],
                'Admin staff': ['reception-supervision', 'admin-supervision'],
                'Maintenance staff': ['maintenence-person-supervision'],
                'Activities staff': ['activities-supervision'],
                'Kitchen staff': ['chef-supervision', 'kitchen-assistant-supervision'],
                'Domestic staff': ['domestic-staff-supervision', 'housekeeping-supervision'],
            };

            const totalExpectedSupervisions = Object.values(trackerAppraisalMapping).reduce((sum, slugs) => sum + slugs.length, 0);

            // Count actual completed supervisions
            let completedSupervisions = 0;
            Object.values(supervisionsData.completionStatus).forEach(roleMap => {
                Object.values(roleMap).forEach(completed => {
                    if (completed) completedSupervisions++;
                });
            });

            supervisionsScore = totalExpectedSupervisions > 0 ? Math.round((completedSupervisions / totalExpectedSupervisions) * 100) : 0;
        }

        // Rotas score (15% weight) - comprehensive staffing adequacy assessment
        let rotasScore = 0;
        if (dependencyData && dependencyData.residents.length > 0 && rotaData) {
            // Step 1: Calculate dependency-required staff (care needs based)
            const NDPS_STAFFING_RATIOS_DAY: Record<number, number> = { 1: 1 / 8, 2: 1 / 5, 3: 1 / 3, 4: 1 / 2, 5: 1 / 1.5 };
            const NDPS_STAFFING_RATIOS_NIGHT: Record<number, number> = { 1: 1 / 15, 2: 1 / 10, 3: 1 / 6, 4: 1 / 4, 5: 1 / 2.5 };

            const bandCountsLocal: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            dependencyData.residents.forEach((r: any) => {
                const score = calculateNDPSScore(r);
                const b = getNDPSBand(score).band;
                bandCountsLocal[b] = (bandCountsLocal[b] || 0) + 1;
            });

            let requiredDayStaff = 0, requiredNightStaff = 0;
            for (const b of [1, 2, 3, 4, 5]) {
                const cnt = bandCountsLocal[b] || 0;
                const dayRatio = NDPS_STAFFING_RATIOS_DAY[b] || 0;
                const nightRatio = NDPS_STAFFING_RATIOS_NIGHT[b] || 0;
                requiredDayStaff += cnt * dayRatio;
                requiredNightStaff += cnt * nightRatio;
            }

            const dependencyRequiredStaff = Math.ceil(requiredDayStaff) + Math.ceil(requiredNightStaff);

            // Step 2: Calculate rota-required staff (scheduled vs minimum requirements)
            // Use similar logic to staffing overview card - expect at least 40% of staff per day
            const expectedShiftsPerDay = Math.max(3, Math.floor(rotaData.totalStaff * 0.4));
            const rotaAdequacyRatio = rotaData.avgShiftsPerDay / expectedShiftsPerDay;

            // Step 3: Calculate actual staff assignment (are scheduled shifts filled?)
            // For now, assume shifts are assigned if they exist (could be enhanced to check staffId)
            const assignmentRatio = rotaData.shiftsThisWeek > 0 ? 1.0 : 0.0; // Placeholder - could check actual assignments

            // Step 4: Comprehensive score calculation
            // Weight: 40% dependency coverage, 40% rota scheduling, 20% staff assignment
            const dependencyCoverage = Math.min(1.0, rotaData.totalStaff / Math.max(1, dependencyRequiredStaff));
            const rotaScheduling = Math.min(1.0, rotaAdequacyRatio);
            const staffAssignment = assignmentRatio;

            const comprehensiveRatio = (dependencyCoverage * 0.4) + (rotaScheduling * 0.4) + (staffAssignment * 0.2);

            if (comprehensiveRatio >= 1.0) {
                rotasScore = 100; // Excellent - over-staffed/scheduled
            } else if (comprehensiveRatio >= 0.9) {
                rotasScore = 90; // Very good coverage
            } else if (comprehensiveRatio >= 0.8) {
                rotasScore = 80; // Good coverage
            } else if (comprehensiveRatio >= 0.7) {
                rotasScore = 70; // Adequate coverage
            } else if (comprehensiveRatio >= 0.6) {
                rotasScore = 60; // Moderate coverage
            } else if (comprehensiveRatio >= 0.5) {
                rotasScore = 50; // Poor coverage
            } else if (comprehensiveRatio >= 0.4) {
                rotasScore = 40; // Very poor coverage
            } else if (comprehensiveRatio >= 0.3) {
                rotasScore = 30; // Critical shortage
            } else if (comprehensiveRatio >= 0.2) {
                rotasScore = 20; // Severe shortage
            } else {
                rotasScore = 10; // Minimal coverage
            }
        } else if (dailyEntry) {
            // Fallback to daily check-in staffing if dependency/rota data not available
            const dayStaff = dailyEntry.staffingDay || dailyEntry.staffing?.day;
            const nightStaff = dailyEntry.staffingNight || dailyEntry.staffing?.night;
            const hasStaffing = (typeof dayStaff === 'number' && dayStaff > 0) || (typeof nightStaff === 'number' && nightStaff > 0);
            const targetStaff = 20;
            const actualStaff = (dayStaff || 0) + (nightStaff || 0);
            rotasScore = hasStaffing ? Math.min(100, Math.round((actualStaff / targetStaff) * 100)) : 0;
        }

        // Dependency score (15% weight) - based on resident dependency calculator data
        let dependencyScore = 0;
        if (dependencyData && dependencyData.residents.length > 0) {
            // Calculate a score based on dependency distribution and management
            // Higher dependency bands indicate more complex care needs
            const totalResidents = dependencyData.residents.length;
            const highDependencyCount = (dependencyData.bandCounts[4] || 0) + (dependencyData.bandCounts[5] || 0); // High + Very High dependency
            const highDependencyRatio = highDependencyCount / totalResidents;

            // Score based on ability to manage dependency levels
            // Lower score for higher proportions of high-dependency residents (more challenging to manage)
            if (highDependencyRatio <= 0.2) dependencyScore = 90; // Mostly independent/low dependency - excellent
            else if (highDependencyRatio <= 0.4) dependencyScore = 75; // Moderate high dependency - good
            else if (highDependencyRatio <= 0.6) dependencyScore = 60; // High dependency - fair
            else dependencyScore = 45; // Very high dependency - needs attention
        }

        return {
            audits: auditsScore,
            actionPlans: actionPlansScore,
            supervisions: supervisionsScore,
            rotas: rotasScore,
            dependency: dependencyScore
        };
    };

    const overallStats = calculateOverallStats();

    // Latest daily checkin entry for the workspace (used to feed Occupancy/Staffing cards)
    const [dailyEntry, setDailyEntry] = useState<any | null>(null);

    // Central control for the daily check-in modal so other widgets (e.g. Focus queue)
    // can open it without re-implementing the modal logic.
    const [isDailyCheckinModalOpen, setIsDailyCheckinModalOpen] = useState(false);

    // Staffing teams modal state
    const [isStaffingModalOpen, setIsStaffingModalOpen] = useState(false);

    // Staffing trends modal state
    const [isStaffingTrendsModalOpen, setIsStaffingTrendsModalOpen] = useState(false);

    // Occupancy trends modal state
    const [isOccupancyModalOpen, setIsOccupancyModalOpen] = useState(false);

    // Compliance overview modal state
    const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);

    // Audit detail modal state
    const [auditDetailModal, setAuditDetailModal] = useState<{
        isOpen: boolean;
        auditType: string;
        auditName: string;
        currentScore: number | null;
    }>({
        isOpen: false,
        auditType: '',
        auditName: '',
        currentScore: null
    });

    // Supervisions data for overall health calculation
    const [supervisionsData, setSupervisionsData] = useState<{
        completionStatus: Record<string, Record<string, boolean>>;
        appraisalData: Record<string, any>;
    }>({ completionStatus: {}, appraisalData: {} });
    const [supervisionsLoading, setSupervisionsLoading] = useState(false);

    // Dependency data for overall health calculation
    const [dependencyData, setDependencyData] = useState<{
        residents: any[];
        bandCounts: Record<number, number>;
    } | null>(null);
    const [dependencyLoading, setDependencyLoading] = useState(false);

    // Rota data for staffing comparison
    const [rotaData, setRotaData] = useState<{
        totalStaff: number;
        shiftsThisWeek: number;
        totalHoursScheduled: number;
        shiftsPerDay: number[];
        avgShiftsPerDay: number;
    } | null>(null);
    const [rotaLoading, setRotaLoading] = useState(false);

    // Calculate overall health score with weighted components - moved after state declarations
    const healthScore = useMemo(() => {
        const components = calculateComponentScores();

        // Apply weights: 30% Audits, 20% Action Plans, 20% Supervisions, 15% Rotas, 15% Dependency
        const weightedScore = Math.round(
            (components.audits * 0.30) +
            (components.actionPlans * 0.20) +
            (components.supervisions * 0.20) +
            (components.rotas * 0.15) +
            (components.dependency * 0.15)
        );

        return {
            overallScore: weightedScore,
            components
        };
    }, [supervisionsData, dailyEntry, overallStats, dependencyData]);

    // Ensure all modals are closed on mount
    useEffect(() => {
        setIsStaffingModalOpen(false);
        setIsStaffingTrendsModalOpen(false);
        setIsOccupancyModalOpen(false);
        setIsComplianceModalOpen(false);
        setAuditDetailModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    useEffect(() => {
        if (!workspace || !workspace.id) return;
        try {
            const colRef = collection(db, workspaceCollectionPath(workspace.id, 'daily-checkins', (workspace as any)?.organisationId || null));
            const q = fsQuery(colRef, orderBy('createdAt', 'desc'), limit(1));
            const unsub = onSnapshot(q, (snap) => {
                if (!snap.empty) {
                    const docSnap = snap.docs[0];
                    setDailyEntry({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setDailyEntry(null);
                }
            }, (err) => {
                console.warn('Failed to listen to daily-checkins', err);
            });
            return () => unsub();
        } catch (e) {
            console.error('Failed to attach daily-checkins listener', e);
        }
    }, [workspace?.id]);

    // Load supervisions data for overall health calculation
    useEffect(() => {
        if (!workspace?.id) return;

        setSupervisionsLoading(true);

        try {
            // Load from appraisal-tracker collection which contains completion data
            const trackerCol = collection(db, workspaceCollectionPath(workspace.id, 'appraisal-tracker', (workspace as any).organisationId));
            const trackerSnapshot = getDocs(trackerCol).then((snapshot: any) => {
                const completionStatus: Record<string, Record<string, boolean>> = {};
                const appraisalData: Record<string, any> = {};

                // Aggregate data from all users
                snapshot.docs.forEach((docSnap: any) => {
                    const data = docSnap.data() as any;

                    // Aggregate completion status
                    if (data.completionStatus) {
                        Object.entries(data.completionStatus).forEach(([role, roleMap]: [string, any]) => {
                            if (!completionStatus[role]) {
                                completionStatus[role] = {};
                            }
                            Object.entries(roleMap).forEach(([key, completed]: [string, any]) => {
                                completionStatus[role][key] = completed;
                            });
                        });
                    }

                    // Aggregate appraisal data
                    if (data.appraisalData) {
                        Object.entries(data.appraisalData).forEach(([key, value]: [string, any]) => {
                            appraisalData[key] = value;
                        });
                    }
                });

                setSupervisionsData({ completionStatus, appraisalData });
                setSupervisionsLoading(false);
            }).catch((error: any) => {
                console.error('Failed to load appraisals/supervisions:', error);
                setSupervisionsData({ completionStatus: {}, appraisalData: {} });
                setSupervisionsLoading(false);
            });
        } catch (error) {
            console.error('Failed to set up supervisions listener:', error);
            setSupervisionsLoading(false);
        }
    }, [workspace?.id]);

    // Load dependency data for overall health calculation
    useEffect(() => {
        if (!workspace?.id) return;

        setDependencyLoading(true);

        try {
            const ref = workspace.id ? getWorkspaceDocRef(workspace.id, 'dependency_calculator', 'default', (workspace as any)?.organisationId || null) : null;
            if (!ref) {
                setDependencyData(null);
                setDependencyLoading(false);
                return;
            }

            const unsub = onSnapshot(ref, (snap: any) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const res = Array.isArray(data.residents) ? data.residents : [];

                    // Calculate band distribution
                    const bc: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                    res.forEach((r: any) => {
                        const score = calculateNDPSScore(r);
                        const b = getNDPSBand(score).band;
                        bc[b] = (bc[b] || 0) + 1;
                    });

                    setDependencyData({ residents: res, bandCounts: bc });
                } else {
                    setDependencyData(null);
                }
                setDependencyLoading(false);
            }, (err) => {
                console.warn('Failed to listen to dependency_calculator', err);
                setDependencyData(null);
                setDependencyLoading(false);
            });
            return () => unsub();
        } catch (error) {
            console.error('Failed to set up dependency listener:', error);
            setDependencyData(null);
            setDependencyLoading(false);
        }
    }, [workspace?.id]);

    // Load rota data for staffing comparison
    useEffect(() => {
        if (!workspace?.id) return;

        setRotaLoading(true);

        const loadRotaData = async () => {
            try {
                // Load staff from workspace
                const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any)?.organisationId || undefined));
                const workspaceSnap = await getDoc(workspaceRef);

                const allStaff: any[] = [];

                if (workspaceSnap.exists()) {
                    const data = workspaceSnap.data();
                    const departments = ['managers', 'nurses', 'ctms', 'domestics', 'maintenances', 'kitchens', 'activities'];

                    departments.forEach(dept => {
                        if (data[dept] && Array.isArray(data[dept])) {
                            allStaff.push(...data[dept]);
                        }
                    });
                }

                const totalStaff = allStaff.length;

                // Get current week boundaries
                const now = new Date();
                const weekStart = startOfWeek(now, { weekStartsOn: 1 });
                const weekKey = format(weekStart, 'yyyy-MM-dd');

                // Load rota data for current week
                const rotaRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any)?.organisationId || undefined), 'rotas', weekKey);
                const rotaSnap = await getDoc(rotaRef);

                let shifts: any[] = [];
                if (rotaSnap.exists()) {
                    const rotaData = rotaSnap.data();
                    shifts = rotaData.shifts || [];
                }

                const shiftsThisWeek = shifts.length;

                // Calculate total hours scheduled
                const totalHours = shifts.reduce((sum: number, shift: any) => {
                    if (shift.startTime && shift.endTime) {
                        return sum + calculateShiftHours(shift.startTime, shift.endTime);
                    }
                    return sum;
                }, 0);

                // Calculate shifts per day for more detailed analysis
                const daysInWeek = 7;
                const weekDates = Array.from({ length: daysInWeek }, (_, i) =>
                    format(addDays(weekStart, i), 'yyyy-MM-dd')
                );

                const shiftsPerDay = weekDates.map(date =>
                    shifts.filter((s: any) => s.date === date).length
                );

                const avgShiftsPerDay = shiftsPerDay.length > 0
                    ? shiftsPerDay.reduce((a: number, b: number) => a + b, 0) / shiftsPerDay.length
                    : 0;

                setRotaData({
                    totalStaff,
                    shiftsThisWeek,
                    totalHoursScheduled: Math.round(totalHours),
                    shiftsPerDay,
                    avgShiftsPerDay
                });
                setRotaLoading(false);
            } catch (error) {
                console.error('Failed to load rota data:', error);
                setRotaData(null);
                setRotaLoading(false);
            }
        };

        loadRotaData();
    }, [workspace?.id]);

    // Function to get gradient colors based on score percentage
    const getGradientColors = (score: number | null) => {
        if (score === null) return { start: '#e5e7eb', end: '#cbd5e1' }; // Gray gradient for N/A
        if (score >= 80) return { start: '#34d399', end: '#059669' }; // Green gradient for high scores
        if (score >= 20) return { start: '#fbbf24', end: '#d97706' }; // Amber gradient for medium scores  
        return { start: '#f87171', end: '#dc2626' }; // Red gradient for low scores
    };

    // Function to handle daily entry updates from the modal
    const handleDailyEntryUpdate = (entry: any) => {
        setDailyEntry(entry);
    };

    // Function to handle audit card clicks - now opens detail modal
    const handleAuditCardClick = (auditKey: string) => {
        // Find the audit data to pass to the modal
        const auditMap: Record<string, { name: string; score: number | null }> = {
            'care-plan': { name: 'Care Plan', score: carePlanScore },
            'health-safety': { name: 'Health & Safety', score: hsScore },
            'maintenance': { name: 'Maintenance', score: maintenanceScore },
            'restrictive-practice': { name: 'Restrictive Practice', score: restrictiveScore },
            'fire-safety': { name: 'Fire Safety', score: fireScore },
            'infection-control': { name: 'Infection Control', score: infectionScore },
            'mealtime': { name: 'Mealtime', score: mealtimeScore },
            'night-visit': { name: 'Night Visit', score: nightScore },
            'staff-file': { name: 'Staff File', score: staffFileScore },
            'kitchen': { name: 'Kitchen', score: kitchenScore }
        };

        const auditData = auditMap[auditKey];
        if (auditData) {
            setAuditDetailModal({
                isOpen: true,
                auditType: auditKey,
                auditName: auditData.name,
                currentScore: auditData.score
            });
        }
    }

    // Function to navigate to audit forms by triggering view change to audits
    const navigateToAuditForm = (auditKey: string) => {
        // Dispatch event to switch dashboard view to audits and set the audit type
        if (typeof window !== 'undefined') {
            if (typeof window !== 'undefined') {
                localStorage.setItem('openAuditType', auditKey);
            }
            window.dispatchEvent(new CustomEvent('navigate-to-audits', {
                detail: { auditType: auditKey }
            }));
        }
    };

    const isTodayCompleted = useMemo(() => {
        if (!dailyEntry?.id) return false;
        const todayKey = new Date().toISOString().split('T')[0];
        return dailyEntry.id === todayKey;
    }, [dailyEntry]);

    const focusItems = useMemo<FocusItem[]>(() => {
        const items: FocusItem[] = [];
        const seenDocIds = new Set<string>();

        if (!isTodayCompleted) {
            items.push({
                id: "daily-checkin",
                title: "Complete today's daily check-in",
                description: "Log occupancy, staffing, incidents and safeguards so leadership has today's snapshot.",
                badge: { label: "Due today", variant: "destructive" },
                icon: <CalendarCheck2 className="h-4 w-4" />,
                iconWrapperClass: "bg-red-100/80 border-red-200 text-red-600",
                onClick: () => setIsDailyCheckinModalOpen(true),
            });
        }

        if (showJournalAlertCard) {
            const noun = openJournalCount === 1 ? "entry" : "entries";
            const awaitingLabel = `${openJournalCount} awaiting`;

            items.push({
                id: "journal-attention",
                title: `${openJournalCount} journal ${noun} need a response`,
                description: "Review reflective journal submissions and close them out once actions are taken.",
                badge: { label: awaitingLabel, variant: "destructive" },
                icon: <NotebookPen className="h-4 w-4" />,
                iconWrapperClass: "bg-amber-100 border-amber-200 text-amber-700",
                onClick: navigateToJournal,
            });
        }

        if (actionableItems.untaggedCount > 0) {
            actionableItems.untaggedDocs.slice(0, 2).forEach((doc) => {
                seenDocIds.add(doc.id);
                items.push({
                    id: `doc-${doc.id}`,
                    title: `Tag “${doc.name}”`,
                    description: "Add tags so inspectors and the wider team can surface it instantly.",
                    badge: { label: "Document", variant: "outline" },
                    meta: `Uploaded ${new Date(doc.createdAt).toLocaleDateString()}`,
                    icon: <Tag className="h-4 w-4" />,
                    iconWrapperClass: "bg-blue-50 border-blue-200 text-blue-600",
                    onClick: () => onSelect(doc),
                });
            });
        }

        actionableItems.recentDocs.slice(0, 2).forEach((doc) => {
            if (seenDocIds.has(doc.id)) return;
            items.push({
                id: `recent-${doc.id}`,
                title: `Review “${doc.name}”`,
                description: "Give this fresh upload a once-over and share any follow-up actions.",
                badge: { label: "New upload", variant: "secondary" },
                meta: `Uploaded ${new Date(doc.createdAt).toLocaleDateString()} by ${doc.owner?.name ?? "Unknown"}`,
                icon: <Clock className="h-4 w-4" />,
                iconWrapperClass: "bg-cyan-50 border-cyan-200 text-cyan-600",
                onClick: () => onSelect(doc),
            });
        });

        const outstandingAuditKeys = (monthlyStatusLoaded
            ? AUDIT_TYPES.filter((type) => !monthlyAuditStatus[type])
            : AUDIT_TYPES.filter((type) => auditScoreMap[type].scorePercent === null)
        ).slice(0, 2);

        outstandingAuditKeys.forEach((type) => {
            const displayName = AUDIT_DISPLAY_NAMES[type] ?? type.replace(/-/g, ' ');
            items.push({
                id: `audit-${type}`,
                title: `Complete the ${displayName} audit`,
                description: "Record this month's responses to keep compliance reporting current.",
                badge: { label: monthlyStatusLoaded ? "Due this month" : "Missing data", variant: "destructive" },
                icon: <ClipboardCheck className="h-4 w-4" />,
                iconWrapperClass: "bg-amber-100 border-amber-200 text-amber-700",
                onClick: () => navigateToAuditForm(type),
            });
        });

        return items.slice(0, 5);
    }, [
        actionableItems,
        auditScoreMap,
        isTodayCompleted,
        monthlyAuditStatus,
        monthlyStatusLoaded,
        openJournalCount,
        showJournalAlertCard,
        navigateToJournal,
        navigateToAuditForm,
        onSelect,
        setIsDailyCheckinModalOpen,
    ]);


    return (
        <div className="flex flex-col h-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pointer-events-auto">
            <main className="flex-1">
                <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
                    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-8 lg:space-y-12 pointer-events-auto">
                        <DashboardHero
                            workspace={workspace}
                            headerLogo={headerLogo}
                            overallStats={overallStats}
                            actionableItems={actionableItems}
                            workspaceId={workspace?.id}
                            onDocumentAdd={onDocumentAdd}
                            onFolderAdd={onFolderAdd}
                            onComplianceOverviewClick={() => setIsComplianceModalOpen(true)}
                            onStatsClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new CustomEvent('navigate-to-stats'));
                                }
                            }}
                            isTodayCompleted={isTodayCompleted}
                            onDailyEntryUpdate={setDailyEntry}
                            dailyEntry={dailyEntry}
                            orgId={(workspace as any)?.organisationId || null}
                            onOccupancyTrendsClick={() => setIsOccupancyModalOpen(true)}
                            onStaffingTeamsClick={() => setIsStaffingModalOpen(true)}
                            onStaffingTrendsClick={() => setIsStaffingTrendsModalOpen(true)}
                            isDailyCheckinOpen={isDailyCheckinModalOpen}
                            onDailyModalChange={setIsDailyCheckinModalOpen}
                            showJournalAlert={showJournalAlertCard}
                            openJournalCount={openJournalCount}
                            onJournalClick={navigateToJournal}
                            healthScore={healthScore}
                        />
                        <ExecutiveSummary
                            documents={documents}
                            onSelect={onSelect}
                            workspaceId={workspace?.id || ''}
                            orgId={(workspace as any)?.organisationId || null}
                            overallStats={overallStats}
                            getGradientColors={getGradientColors}
                            trends={trends}
                            dailyEntry={dailyEntry}
                            onDailyEntryUpdate={handleDailyEntryUpdate}
                            carePlanScore={carePlanScore}
                            hsScore={hsScore}
                            maintenanceScore={maintenanceScore}
                            restrictiveScore={restrictiveScore}
                            fireScore={fireScore}
                            infectionScore={infectionScore}
                            mealtimeScore={mealtimeScore}
                            nightScore={nightScore}
                            staffFileScore={staffFileScore}
                            kitchenScore={kitchenScore}
                            handleAuditCardClick={handleAuditCardClick}
                            onStaffingTeamsClick={() => setIsStaffingModalOpen(true)}
                            onStaffingTrendsClick={() => setIsStaffingTrendsModalOpen(true)}
                            onOccupancyTrendsClick={() => setIsOccupancyModalOpen(true)}
                            onComplianceOverviewClick={() => setIsComplianceModalOpen(true)}
                            navigateToAuditForm={navigateToAuditForm}
                            isTodayCompleted={isTodayCompleted}
                            actionableItems={actionableItems}
                            focusItems={focusItems}
                        />
                    </div>
                </div>
            </main>

            {/* Staffing Teams Modal */}
            <StaffingTeamsModal
                isOpen={isStaffingModalOpen}
                onClose={() => setIsStaffingModalOpen(false)}
                workspaceId={workspace?.id || ''}
                organisationId={(workspace as any)?.organisationId || null}
            />

            {/* Staffing Trends Modal */}
            <StaffingTrendsModal
                isOpen={isStaffingTrendsModalOpen}
                onClose={() => setIsStaffingTrendsModalOpen(false)}
                workspaceId={workspace?.id || ''}
                organisationId={(workspace as any)?.organisationId || null}
            />

            {/* Audit Detail Modal */}
            <AuditDetailModal
                isOpen={auditDetailModal.isOpen}
                onClose={() => setAuditDetailModal(prev => ({ ...prev, isOpen: false }))}
                workspaceId={workspace?.id || ''}
                auditType={auditDetailModal.auditType}
                auditName={auditDetailModal.auditName}
                currentScore={auditDetailModal.currentScore}
            />

            {/* Occupancy Trends Modal */}
            <OccupancyTrendsModal
                isOpen={isOccupancyModalOpen}
                onClose={() => setIsOccupancyModalOpen(false)}
                workspaceId={workspace?.id || ''}
            />

            {/* Compliance Overview Modal */}
            <ComplianceOverviewModal
                isOpen={isComplianceModalOpen}
                onClose={() => setIsComplianceModalOpen(false)}
                workspaceId={workspace?.id || ''}
                organisationId={(workspace as any)?.organisationId || null}
            />
        </div>
    );
}

