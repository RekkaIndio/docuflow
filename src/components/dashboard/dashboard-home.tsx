"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, FileSpreadsheet, FileIcon, FileX2, Briefcase, Clock, User, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Edit3, FileCheck, CheckCircle, AlertCircle, ClipboardList, ChevronRight, Shield, Heart } from "lucide-react";
import type { Workspace, Document, Folder as FolderType } from "@/lib/types";
import { useMemo } from "react";
import { useAuth } from '@/hooks/use-auth';
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
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query as fsQuery, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { workspaceDocPath, workspaceCollectionPath, workspaceBasePath } from '@/lib/paths';
import { getWorkspaceCollectionRef, getWorkspaceDocRef, getMonthlyAuditCompletionStatus } from '@/lib/firestore';
import { AUDIT_TYPES, AuditType } from '@/lib/audit-types';
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

// Component to display trend indicators
// Local styles for the pulsing pending state. Using a box-shadow animation on
// the Card itself avoids clipping issues from `overflow: hidden` and keeps the
// glow visible while preserving the card's content layering.
const PendingPulseStyles = () => (
    <style jsx>{`
        .pulse-pending {
            position: relative;
            /* Enhanced glow effect for better visibility */
            box-shadow: 0 0 20px 4px rgba(251, 191, 36, 0.4), 0 0 40px 8px rgba(251, 191, 36, 0.2);
            animation: pulse-amber 2s infinite ease-in-out;
            border: 2px solid rgba(251, 191, 36, 0.6) !important;
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

        /* Enhanced pulsing animation with amber glow for pending daily check-in */
        @keyframes pulse-amber {
            0% { 
                transform: scale(1); 
                box-shadow: 0 0 20px 4px rgba(251, 191, 36, 0.4), 0 0 40px 8px rgba(251, 191, 36, 0.2);
                border-color: rgba(251, 191, 36, 0.6);
            }
            50% { 
                transform: scale(1.02); 
                box-shadow: 0 0 30px 8px rgba(251, 191, 36, 0.6), 0 0 60px 15px rgba(251, 191, 36, 0.3);
                border-color: rgba(251, 191, 36, 0.8);
            }
            100% { 
                transform: scale(1); 
                box-shadow: 0 0 20px 4px rgba(251, 191, 36, 0.4), 0 0 40px 8px rgba(251, 191, 36, 0.2);
                border-color: rgba(251, 191, 36, 0.6);
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

const TrendIndicator = ({ auditType, trends }: { auditType: string, trends: Record<string, { direction: 'up' | 'down' | 'stable', change: number }> }) => {
    const trend = trends[auditType];
    if (!trend) return null;

    const { direction, change } = trend;
    const isPositive = direction === 'up';
    const isNegative = direction === 'down';
    
    return (
        <div className="flex items-center gap-1 text-xs">
            {isPositive && (
                <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">+{change}%</span>
                </>
            )}
            {isNegative && (
                <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">{change}%</span>
                </>
            )}
            {direction === 'stable' && (
                <>
                    <Minus className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-500">No change</span>
                </>
            )}
        </div>
    );
};

type AuditScoreEntry = {
    scorePercent: number | null;
    yesCount: number | null;
    totalCount: number | null;
};

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
    isTodayCompleted,
    onDailyEntryUpdate,
    dailyEntry,
    orgId,
    onOccupancyTrendsClick,
    onStaffingTeamsClick,
    onStaffingTrendsClick,
}: {
    workspace?: Workspace | null;
    headerLogo: string | null;
    overallStats: OverallStats;
    actionableItems: ActionableItems;
    workspaceId?: string;
    onDocumentAdd: (document: Document) => void;
    onFolderAdd: (folder: FolderType) => void;
    onComplianceOverviewClick?: () => void;
    isTodayCompleted: boolean;
    onDailyEntryUpdate?: (entry: any) => void;
    dailyEntry?: any;
    orgId?: string | null;
    onOccupancyTrendsClick?: () => void;
    onStaffingTeamsClick?: () => void;
    onStaffingTrendsClick?: () => void;
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

    return (
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/50 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-white shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-60">
                <div className="absolute -top-24 -right-20 h-80 w-80 rounded-full bg-cyan-500/30 blur-3xl animate-pulse" />
                <div className="absolute bottom-[-6rem] left-[-4rem] h-96 w-96 rounded-full bg-violet-500/25 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 grid gap-10 p-8 lg:grid-cols-[minmax(0,1.3fr),minmax(0,0.9fr)] lg:p-12">
                <div className="space-y-8">
                    <div className="flex flex-wrap items-center gap-5">
                        <Avatar className="h-16 w-16 border border-white/20 bg-white/10">
                            <AvatarImage src={headerLogo ?? undefined} alt={workspace?.name ?? "Workspace"} />
                            <AvatarFallback>
                                <Users className="h-7 w-7 text-white/80" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Workspace Overview</p>
                            <h1 className="text-3xl font-semibold sm:text-4xl">
                                {workspace?.name ?? "Your workspace"}
                            </h1>
                            <p className="max-w-2xl text-base text-white/70">
                                Stay ahead of compliance, staffing, and resident care with a single, curated view of today's priorities and long-term performance.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                       
                    
                        {onComplianceOverviewClick ? (
                            <Button
                                variant="outline"
                                size="lg"
                                className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:border-white/60 backdrop-blur-sm shadow-md transition-all"
                                onClick={onComplianceOverviewClick}
                            >
                                View compliance overview
                            </Button>
                        ) : null}
                    </div>

                    {/* Quick Metrics Cards */}
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                            trigger={
                                <div
                                    className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/5 p-5 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl hover:from-white/25 hover:to-white/10 cursor-pointer min-h-[140px] flex flex-col justify-between ${
                                        !isTodayCompleted ? "pulse-pending" : ""
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-xl p-3 bg-blue-500/20 text-blue-100">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                                                Daily check-in
                                            </div>
                                            <div className="text-xl font-bold text-white">
                                                {isTodayCompleted ? "Complete" : "Pending"}
                                            </div>
                                            <div className="text-xs text-white/60">
                                                {isTodayCompleted ? "Logged for today" : "Awaiting today's update"}
                                            </div>
                                        </div>
                                        {!isTodayCompleted && (
                                            <AlertCircle className="h-5 w-5 text-amber-300" />
                                        )}
                                        {isTodayCompleted && (
                                            <CheckCircle className="h-5 w-5 text-emerald-300" />
                                        )}
                                    </div>
                                </div>
                            }
                        />

                        {/* Staffing Card */}
                        <MiniStaffingCard
                            workspaceId={workspaceId}
                            orgId={orgId}
                            dailyEntry={dailyEntry}
                            onTeamsClick={onStaffingTeamsClick}
                            onTrendsClick={onStaffingTrendsClick}
                        />
                    </div>
                </div>

                <div className="flex flex-col justify-between gap-6 rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-7 backdrop-blur-md shadow-lg">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold uppercase tracking-wider text-white">Health snapshot</span>
                            <Badge className={`${isTodayCompleted ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-100" : "bg-amber-500/30 border-amber-400/50 text-amber-100"} border backdrop-blur-sm shadow-md`}>
                                {isTodayCompleted ? "✓ Complete" : "⚠ Pending"}
                            </Badge>
                        </div>
                        <p className="text-sm text-white/75 leading-relaxed">
                            A condensed view of performance so you know exactly where to focus next.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                        <AuditDonut completed={overallStats.auditsCompleted} total={overallStats.totalAudits} />
                        <div className="space-y-3 text-sm text-white/75">
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-emerald-200" />
                                <span>
                                    {overallStats.overallPercentage !== null
                                        ? `Overall compliance is ${overallStats.overallPercentage}%`
                                        : "No compliance data yet"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-sky-200" />
                                <span>{overallStats.auditsCompleted} audits completed this month</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-indigo-200" />
                                <span>{actionableItems.docsThisWeekCount} documents uploaded in the last 7 days</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/20 bg-black/20 p-4 text-sm text-white/75">
                        {actionableItems.untaggedCount > 0 ? (
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 text-amber-200" />
                                <div>
                                    <p className="font-medium text-white">{actionableItems.untaggedCount} document{actionableItems.untaggedCount === 1 ? "" : "s"} need tagging.</p>
                                    <p className="text-white/65">Add tags to keep your evidence organised and discoverable.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3">
                                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-200" />
                                <div>
                                    <p className="font-medium text-white">All documents are tagged.</p>
                                    <p className="text-white/65">You're ready for your next inspection day.</p>
                                </div>
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
    const [editing, setEditing] = useState(false);
    const [totalBedsInput, setTotalBedsInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    }, [workspaceId]);

    // Initialize editing input when totalBeds changes
    useEffect(() => {
        if (totalBeds !== null) {
            setTotalBedsInput(totalBeds.toString());
        }
    }, [totalBeds]);

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

    const handleSave = async () => {
        setError(null);
        if (!workspaceId) return;
        const totalBedsValue = parseInt(totalBedsInput || '0', 10);
        if (isNaN(totalBedsValue) || totalBedsValue < 0) {
            setError('Please enter a valid non-negative number');
            return;
        }
        setSaving(true);
        try {
            const settingsCol = workspaceCollectionPath(workspaceId, 'settings', orgId || null);
            const settingsColRef = collection(db, settingsCol);
            const settingsRef = doc(settingsColRef, 'occupancy');
            await setDoc(settingsRef, {
                totalBeds: totalBedsValue,
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
        <div
            className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/5 p-5 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl hover:from-white/25 hover:to-white/10 min-h-[140px] flex flex-col justify-between ${editing ? '' : 'cursor-pointer'} ${
                needsAttention ? "pulse-occupancy" : ""
            }`}
            onClick={editing ? undefined : onTrendsClick}
        >
            <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 bg-purple-500/20 text-purple-100">
                    <Briefcase className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                        Occupancy
                    </div>
                    {editing ? (
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-white/90 mb-2">
                                Total Beds
                            </div>
                            <input
                                type="number"
                                className="w-20 border border-white/30 rounded px-2 py-1 text-sm font-bold text-white bg-white/10 placeholder-white/50"
                                value={totalBedsInput}
                                onChange={e => setTotalBedsInput(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)).toString())}
                                min={0}
                                disabled={saving}
                                placeholder="0"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            />
                            {error && <div className="text-xs text-red-300">{error}</div>}
                            <div className="flex gap-2">
                                <Button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSave();
                                    }} 
                                    disabled={saving || loading} 
                                    size="sm" 
                                    className="relative z-30 pointer-events-auto bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 text-xs"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                                <Button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditing(false);
                                        setError(null);
                                    }} 
                                    disabled={saving} 
                                    size="sm" 
                                    variant="outline"
                                    className="relative z-30 pointer-events-auto text-white/80 border-white/30 hover:bg-white/10 text-xs"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-xl font-bold text-white">
                                {displayOccupied !== null && displayTotal !== null ? `${displayOccupied}/${displayTotal}` : "—"}
                            </div>
                            <div className="text-xs text-white/60">
                                {percent > 0 ? `${percent}% occupied` : "Set occupancy in daily check-in"}
                            </div>
                        </>
                    )}
                </div>
                {!editing && (
                    <>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="relative z-30 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 pointer-events-auto p-2" 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditing(true);
                            }} 
                            disabled={saving || loading}
                        >
                            <Edit3 className="w-4 h-4" />
                        </Button>
                        {percent >= 80 && (
                            <CheckCircle className="h-5 w-5 text-emerald-300" />
                        )}
                        {percent < 70 && percent > 0 && (
                            <AlertCircle className="h-5 w-5 text-amber-300" />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Mini version of Staffing Card for hero header
function MiniStaffingCard({ workspaceId, orgId, dailyEntry, onTeamsClick, onTrendsClick }: { workspaceId?: string, orgId?: string | null, dailyEntry?: any, onTeamsClick?: () => void, onTrendsClick?: () => void }) {
    const [staffingData, setStaffingData] = useState<{ day: string; night: string; lastUpdated?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [dayInput, setDayInput] = useState('');
    const [nightInput, setNightInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                    const day = data.staffingDay || data.staffing?.day || '0';
                    const night = data.staffingNight || data.staffing?.night || '0';
                    const preferredDay = (dailyEntry && (dailyEntry.staffingDay !== undefined)) ? String(dailyEntry.staffingDay) : String(day);
                    const preferredNight = (dailyEntry && (dailyEntry.staffingNight !== undefined)) ? String(dailyEntry.staffingNight) : String(night);
                    setStaffingData({
                        day: preferredDay,
                        night: preferredNight,
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
    }, [workspaceId]);

    // Initialize editing inputs when data changes
    useEffect(() => {
        if (staffingData) {
            setDayInput(staffingData.day);
            setNightInput(staffingData.night);
        }
    }, [staffingData]);

    const totalStaff = editing ? 
        (parseInt(dayInput || '0') + parseInt(nightInput || '0')) :
        (staffingData ? (parseInt(staffingData.day || '0') + parseInt(staffingData.night || '0')) : 0);
    const STAFF_TARGET = 20;
    const percent = STAFF_TARGET > 0 ? Math.min(100, Math.round((totalStaff / STAFF_TARGET) * 100)) : 0;
    
    // Determine if this should glow (low staffing)
    const needsAttention = totalStaff === 0 || percent < 80;

    const handleSave = async () => {
        setError(null);
        if (!workspaceId) return;
        const day = parseInt(dayInput || '0', 10);
        const night = parseInt(nightInput || '0', 10);
        if (isNaN(day) || isNaN(night) || day < 0 || night < 0) {
            setError('Please enter valid non-negative numbers');
            return;
        }
        setSaving(true);
        try {
            const now = new Date();
            const dateKey = now.toISOString().split('T')[0];
            const colRef = collection(db, workspaceCollectionPath(workspaceId, 'daily-checkins', orgId || null));
            const docRef = doc(colRef, dateKey);
            await setDoc(docRef, {
                staffingDay: day,
                staffingNight: night,
                createdAt: now,
                recordedAt: now,
            }, { merge: true });
            setEditing(false);
        } catch (e) {
            setError('Failed to save staff levels');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/5 p-5 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl hover:from-white/25 hover:to-white/10 min-h-[140px] flex flex-col justify-between ${editing ? '' : 'cursor-pointer'} ${
                needsAttention ? "pulse-staffing" : ""
            }`}
            onClick={editing ? undefined : onTrendsClick}
        >
            <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 bg-blue-500/20 text-blue-100">
                    <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                        Staffing
                    </div>
                    {editing ? (
                        <div className="space-y-2">
                            <div className="text-sm font-bold text-white">
                                Total: {totalStaff}
                            </div>
                            <div className="flex gap-2 items-center">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-white/70">Day</label>
                                    <input
                                        type="number"
                                        className="w-14 border border-white/30 rounded px-2 py-1 text-sm font-bold text-white bg-white/10 placeholder-white/50"
                                        value={dayInput}
                                        onChange={e => setDayInput(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)).toString())}
                                        min={0}
                                        disabled={saving}
                                        placeholder="0"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-white/70">Night</label>
                                    <input
                                        type="number"
                                        className="w-14 border border-white/30 rounded px-2 py-1 text-sm font-bold text-white bg-white/10 placeholder-white/50"
                                        value={nightInput}
                                        onChange={e => setNightInput(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)).toString())}
                                        min={0}
                                        disabled={saving}
                                        placeholder="0"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                            {error && <div className="text-xs text-red-300">{error}</div>}
                            <div className="flex gap-2">
                                <Button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSave();
                                    }} 
                                    disabled={saving || loading} 
                                    size="sm" 
                                    className="relative z-30 pointer-events-auto bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 text-xs"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                                <Button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditing(false);
                                        setError(null);
                                    }} 
                                    disabled={saving} 
                                    size="sm" 
                                    variant="outline"
                                    className="relative z-30 pointer-events-auto text-white/80 border-white/30 hover:bg-white/10 text-xs"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-xl font-bold text-white">
                                {totalStaff > 0 ? totalStaff : "—"}
                            </div>
                            <div className="text-xs text-white/60">
                                {staffingData ? `Day: ${staffingData.day}, Night: ${staffingData.night}` : "No data available"}
                            </div>
                        </>
                    )}
                </div>
                {!editing && (
                    <>
                        <div className="flex flex-col gap-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="relative z-30 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 pointer-events-auto p-2" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditing(true);
                                }} 
                                disabled={saving || loading}
                            >
                                <Edit3 className="w-4 h-4" />
                            </Button>
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
                        {totalStaff >= STAFF_TARGET && (
                            <CheckCircle className="h-5 w-5 text-emerald-300" />
                        )}
                        {totalStaff > 0 && totalStaff < STAFF_TARGET && (
                            <AlertCircle className="h-5 w-5 text-amber-300" />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

type ExecutiveSummaryProps = {
    documents: Document[];
    actionableItems: ActionableItems;
    onSelect: (doc: Document) => void;
    workspaceId?: string;
    orgId?: string | null;
    overallStats: OverallStats;
    getGradientColors: (score: number | null) => { start: string; end: string };
    trends: Record<string, { direction: 'up' | 'down' | 'stable'; change: number }>;
    dailyEntry?: any;
    onDailyEntryUpdate?: (entry: any) => void;
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
    handleAuditCardClick: (auditKey: string) => void;
    onStaffingTeamsClick?: () => void;
    onStaffingTrendsClick?: () => void;
    onOccupancyTrendsClick?: () => void;
    onComplianceOverviewClick?: () => void;
    navigateToAuditForm: (auditKey: string) => void;
    isTodayCompleted: boolean;
};

const PriorityPanel = ({ actionableItems, onSelect }: { actionableItems: ActionableItems; onSelect: (doc: Document) => void }) => {
    const { untaggedDocs, untaggedCount, recentDocs } = actionableItems;
    const remainingUntagged = Math.max(untaggedCount - untaggedDocs.length, 0);

    return (
        <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-white hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
            <CardHeader className="pb-4 pt-5">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-md">
                        <ClipboardList className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900">Focus queue</CardTitle>
                </div>
                <CardDescription className="text-sm text-slate-600 leading-relaxed">
                    Quick wins and outstanding actions to keep the workspace inspection-ready.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Documents needing tags</span>
                        <Badge variant={untaggedCount > 0 ? "destructive" : "secondary"} className="rounded-full">
                            {untaggedCount > 0 ? `${untaggedCount} pending` : "All clear"}
                        </Badge>
                    </div>
                    {untaggedDocs.length > 0 ? (
                        <div className="space-y-2">
                            {untaggedDocs.map((doc) => (
                                <button
                                    type="button"
                                    key={doc.id}
                                    className="flex w-full items-center justify-between rounded-xl border border-slate-200/60 bg-gradient-to-r from-slate-50 to-white px-4 py-3 text-left transition-all hover:border-blue-300 hover:from-blue-50 hover:to-white hover:shadow-md group"
                                    onClick={() => onSelect(doc)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-white p-2.5 shadow-md border border-slate-100 group-hover:border-blue-200 group-hover:shadow-lg transition-all">
                                            {getFileIcon(doc.fileType)}
                                        </div>
                                        <div>
                                            <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">{doc.name}</p>
                                            <p className="text-xs text-slate-500">Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </button>
                            ))}
                            {remainingUntagged > 0 && (
                                <p className="text-xs text-slate-500 pl-2">+{remainingUntagged} more documents waiting for tags</p>
                            )}
                        </div>
                    ) : (
                        <p className="rounded-xl border border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                            All documents are tagged. Great work!
                        </p>
                    )}
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Recent uploads</span>
                        <Badge variant="outline" className="rounded-full text-xs">Last 72 hours</Badge>
                    </div>
                    {recentDocs.length > 0 ? (
                        <div className="space-y-2">
                            {recentDocs.map((doc) => (
                                <button
                                    type="button"
                                    key={`recent-${doc.id}`}
                                    onClick={() => onSelect(doc)}
                                    className="flex w-full items-center justify-between rounded-xl border border-slate-200/60 bg-gradient-to-r from-white to-slate-50 px-4 py-3 text-left transition-all hover:border-cyan-300 hover:from-cyan-50 hover:to-white hover:shadow-md group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 p-2.5 shadow-md border border-cyan-200 group-hover:from-cyan-200 group-hover:to-blue-200 transition-all">
                                            <Clock className="h-4 w-4 text-cyan-600" />
                                        </div>
                                        <div>
                                            <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">{doc.name}</p>
                                            <p className="text-xs text-slate-500">By {doc.owner?.name ?? "Unknown"}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                            No new uploads in the last few days.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const ExecutiveSummary = ({
    documents,
    actionableItems,
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
}: ExecutiveSummaryProps) => {
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

            <div className="grid gap-6 2xl:grid-cols-5">
                <div className="space-y-6 2xl:col-span-3">
                    <Card
                        className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-violet-50 to-white shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        onClick={() => {
                            if (typeof window !== "undefined") {
                                window.dispatchEvent(new CustomEvent("navigate-to-audits"));
                            }
                        }}
                    >
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 shadow-md" />
                        <CardHeader className="pb-4 pt-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <FileCheck className="h-4 w-4" />
                                    <CardTitle className="text-base font-semibold text-slate-900">Audits</CardTitle>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigateToAuditForm("");
                                    }}
                                >
                                    View audits
                                </Button>
                            </div>
                            <CardDescription className="text-sm text-slate-500">
                                Track monthly completions and jump straight into the next outstanding audit.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                    <AuditDonut completed={overallStats.auditsCompleted} total={overallStats.totalAudits} />
                                    <div>
                                        <p className="text-lg font-semibold text-slate-900">
                                            {overallStats.auditsCompleted}/{overallStats.totalAudits} audits complete
                                        </p>
                                        <p className="text-sm text-slate-500">This month</p>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    Keep pace by completing {overallStats.totalAudits - overallStats.auditsCompleted} more audits this cycle.
                                </div>
                            </div>

                            <div className="space-y-2">
                                {(() => {
                                    const auditTypes = [
                                        { key: "care-plan", name: "Care Plan", score: carePlanScore },
                                        { key: "health-safety", name: "Health & Safety", score: hsScore },
                                        { key: "maintenance", name: "Maintenance", score: maintenanceScore },
                                        { key: "restrictive-practice", name: "Restrictive Practice", score: restrictiveScore },
                                        { key: "fire-safety", name: "Fire Safety", score: fireScore },
                                        { key: "infection-control", name: "Infection Control", score: infectionScore },
                                        { key: "mealtime", name: "Mealtime", score: mealtimeScore },
                                        { key: "night-visit", name: "Night Visit", score: nightScore },
                                        { key: "staff-file", name: "Staff File", score: staffFileScore },
                                        { key: "kitchen", name: "Kitchen", score: kitchenScore },
                                    ];

                                    const incompleteAudits = auditTypes.filter((audit) => audit.score === null || audit.score === 0);

                                    if (incompleteAudits.length === 0) {
                                        return (
                                            <div className="flex items-center justify-center rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-6 text-emerald-700 shadow-sm">
                                                <CheckCircle className="mr-2 h-5 w-5" />
                                                <span className="font-semibold">All scheduled audits are complete this month.</span>
                                            </div>
                                        );
                                    }

                                    return incompleteAudits.map((audit) => (
                                        <button
                                            key={audit.key}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigateToAuditForm(audit.key);
                                                handleAuditCardClick(audit.key);
                                            }}
                                            className="group flex w-full items-center justify-between rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-white px-4 py-3 text-left text-sm text-slate-700 transition-all hover:border-amber-400 hover:from-amber-100 hover:to-amber-50 hover:shadow-md"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 rounded-lg bg-amber-100 group-hover:bg-amber-200 transition-colors">
                                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                                </div>
                                                <span className="font-medium">{audit.name}</span>
                                            </div>
                                            <Badge variant="destructive" className="rounded-full text-xs shadow-sm">Pending</Badge>
                                        </button>
                                    ));
                                })()}
                            </div>
                        </CardContent>
                    </Card>

                    <ActionPlansCard
                        workspaceId={workspaceId}
                        orgId={orgId}
                        documents={documents}
                        onSelect={onSelect}
                    />
                </div>

                <div className="space-y-6 2xl:col-span-2">
                    <PriorityPanel actionableItems={actionableItems} onSelect={onSelect} />
                    <ResidentCareCard workspaceId={workspaceId} orgId={orgId} />
                </div>
            </div>
        </section>
    );
};

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
        <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 hover:shadow-2xl text-white transition-all duration-300 cursor-pointer min-h-[220px] flex flex-col" onClick={onTrendsClick}>
            {/* Animated background effects */}
            <div className="pointer-events-none absolute inset-0 opacity-20">
                <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/30 blur-3xl" />
                <div className="absolute bottom-[-3rem] left-[-2rem] h-40 w-40 rounded-full bg-pink-300/40 blur-3xl" />
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

function ActionPlansCard({ workspaceId, orgId, documents, onSelect }: { 
    workspaceId?: string,
    orgId?: string | null,
    documents: Document[], 
    onSelect: (item: Document) => void 
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

    return (
        <Card className="group relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50 to-white rounded-2xl shadow-xl">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 shadow-md" />
            <CardHeader className="pb-4 pt-5">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                        <ClipboardList className="h-4 w-4 text-green-600" />
                        Action Plans
                    </CardTitle>
                    <div className="text-sm text-gray-600">{totalActionPlans} items</div>
                </div>
                 <CardDescription className="text-xs text-gray-600 font-medium">
                     Active plans and recent documents
                 </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
                {loading ? (
                    <div className="text-sm text-gray-600">Loading...</div>
                ) : (
                    <>
                        {totalActionPlans > 0 ? (
                            <div className="space-y-3">
                                {/* Show recent action plan audits */}
                                {actionPlans.slice(0, 2).map(plan => (
                                    <div key={plan.id} className="flex items-center justify-between p-3 hover:bg-green-50/50 rounded-xl cursor-pointer transition-colors duration-200 border border-green-100/40">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            <span className="text-sm font-medium truncate text-gray-700">
                                                {plan.auditType ? 
                                                    `${plan.auditType.replace(/-/g, ' ')} audit` : 
                                                    'Audit action plan'
                                                }
                                            </span>
                                        </div>
                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                            {plan.createdAt ? 
                                                new Date(plan.createdAt).toLocaleDateString() : 
                                                'Recent'
                                            }
                                        </Badge>
                                    </div>
                                ))}
                                
                                {/* Show action plan documents */}
                                {actionPlansFolders.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 hover:bg-green-50/50 rounded-xl cursor-pointer transition-colors duration-200 border border-green-100/40" onClick={() => onSelect(doc)}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            {getFileIcon(doc.fileType)}
                                            <span className="text-sm font-medium truncate text-gray-700">{doc.name}</span>
                                        </div>
                                        <Badge variant="outline" className="text-xs font-medium px-2 py-1 border-green-200 text-green-700">
                                            {doc.fileType?.toUpperCase()}
                                        </Badge>
                                    </div>
                                ))}
                                
                                {totalActionPlans > 3 && (
                                    <div className="text-xs text-gray-500 text-center pt-2 font-medium">
                                        +{totalActionPlans - 3} more action plans
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <ClipboardList className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                                <p className="text-sm text-gray-600 font-medium">No active action plans</p>
                                <p className="text-xs text-gray-500 mt-1">Complete an audit to create action plans</p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function ResidentCareCard({ workspaceId, orgId }: { workspaceId?: string, orgId?: string | null }) {
    const [loading, setLoading] = useState(true);
    const [residents, setResidents] = useState<any[]>([]);
    const [bandCounts, setBandCounts] = useState<Record<number, number>>({1:0,2:0,3:0,4:0,5:0});
    const [staffBreakdown, setStaffBreakdown] = useState<any>({ Day: { ctms:0, carers:0, total:0 }, Night: { ctms:0, carers:0, total:0 } });

    // Lightweight NDPS helpers (same logic as dependency calculator page)
    function calculateNDPSScore(resident: any) {
        const NPDS_FIELDS = [
          'bcn_mobility','bcn_transfers','bcn_washing','bcn_dressing','bcn_toileting','bcn_continence','bcn_feeding','bcn_turning','bcn_getting_up','bcn_bed_mobility','bcn_walking','bcn_stairs',
          'snn_breathing','snn_drugs','snn_skin_care','snn_treatment','snn_observation',
          'therapy_communication','therapy_cognitive','therapy_behaviour'
        ];
        let bcn = 0, snn = 0, therapy = 0;
        const bcnKeys = ['bcn_mobility','bcn_transfers','bcn_washing','bcn_dressing','bcn_toileting','bcn_continence','bcn_feeding','bcn_turning','bcn_getting_up','bcn_bed_mobility','bcn_walking','bcn_stairs'];
        const snnKeys = ['snn_breathing','snn_drugs','snn_skin_care','snn_treatment','snn_observation'];
        const therapyKeys = ['therapy_communication','therapy_cognitive','therapy_behaviour'];
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
        const NDPS_STAFFING_RATIOS_DAY: Record<number, number> = { 1: 1/8, 2: 1/5, 3: 1/3, 4: 1/2, 5: 1/1.5 };
        const NDPS_STAFFING_RATIOS_NIGHT: Record<number, number> = { 1: 1/15, 2: 1/10, 3: 1/6, 4: 1/4, 5: 1/2.5 };
        const bandCountsLocal: Record<number, number> = {1:0,2:0,3:0,4:0,5:0};
        ress.forEach(r => { const band = getNDPSBand(calculateNDPSScore(r)).band; bandCountsLocal[band] = (bandCountsLocal[band] || 0) + 1; });
        let day = 0, night = 0;
        for (const b of [1,2,3,4,5]) {
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
                const bc: Record<number, number> = {1:0,2:0,3:0,4:0,5:0};
                res.forEach((r: any) => {
                    const score = calculateNDPSScore(r);
                    const b = getNDPSBand(score).band;
                    bc[b] = (bc[b] || 0) + 1;
                });
                setBandCounts(bc);
                setStaffBreakdown(calculateStaffBreakdown(res));
            } else {
                setResidents([]);
                setBandCounts({1:0,2:0,3:0,4:0,5:0});
                setStaffBreakdown({ Day: { ctms:0, carers:0, total:0 }, Night: { ctms:0, carers:0, total:0 } });
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
    const bandPercentages = [1,2,3,4,5].map(b => totalResidents > 0 ? Math.round((bandCounts[b] / totalResidents) * 100) : 0);
    
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
        <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600 hover:shadow-2xl text-white transition-all duration-300">
            {/* Animated background effects */}
            <div className="pointer-events-none absolute inset-0 opacity-30">
                <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/20 blur-3xl" />
                <div className="absolute bottom-[-4rem] left-[-3rem] h-52 w-52 rounded-full bg-cyan-300/30 blur-3xl" />
            </div>

            <CardHeader className="pb-4 relative z-20">
                <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
                        <Heart className="h-6 w-6 text-white" />
                    </div>
                    <Badge className="bg-white/20 border-white/30 text-white font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm shadow-md">
                        {residents.length} residents
                    </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-white mb-1">Dependency Overview</CardTitle>
                <CardDescription className="text-cyan-50">Resident care levels and staffing insights</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 relative z-20">
                {/* Visual Dependency Distribution */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-cyan-200" />
                            Dependency Distribution
                        </h3>
                        <span className="text-xs text-cyan-100 bg-white/10 px-2 py-1 rounded-full">NDPS Bands</span>
                    </div>
                    
                    {/* Horizontal stacked bar */}
                    <div className="flex h-8 rounded-full overflow-hidden mb-4 shadow-inner bg-white/5">
                        {[1,2,3,4,5].map(b => {
                            const width = bandPercentages[b-1];
                            return width > 0 ? (
                                <div 
                                    key={b} 
                                    className={`${bandColors[b-1].bg} flex items-center justify-center transition-all duration-300 hover:opacity-80`}
                                    style={{ width: `${width}%` }}
                                >
                                    {width > 8 && <span className="text-xs font-bold text-white">{bandCounts[b]}</span>}
                                </div>
                            ) : null;
                        })}
                    </div>

                    {/* Band legend with counts */}
                    <div className="grid grid-cols-5 gap-2">
                        {[1,2,3,4,5].map(b => (
                            <div key={b} className="text-center">
                                <div className={`h-2 ${bandColors[b-1].bg} rounded-full mb-1.5 shadow-sm`} />
                                <div className="text-xs font-semibold text-white">{bandCounts[b] ?? 0}</div>
                                <div className="text-[10px] text-cyan-100 leading-tight">{bandLabels[b-1]}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Staffing Requirements Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Day Shift */}
                    <div className="bg-gradient-to-br from-amber-400/20 to-orange-400/20 backdrop-blur-sm border border-amber-300/30 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-amber-400/30 rounded-lg">
                                <Sun className="h-4 w-4 text-amber-100" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Day Shift</div>
                                <div className="text-xs text-amber-100">Required staff</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-amber-100">CTMs</span>
                                <span className="text-lg font-bold text-white">{staffBreakdown.Day?.ctms ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-amber-100">Carers</span>
                                <span className="text-lg font-bold text-white">{staffBreakdown.Day?.carers ?? 0}</span>
                            </div>
                            <div className="border-t border-amber-300/30 pt-2 mt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-amber-50">Total</span>
                                    <span className="text-2xl font-bold text-white">{staffBreakdown.Day?.total ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Night Shift */}
                    <div className="bg-gradient-to-br from-indigo-400/20 to-blue-400/20 backdrop-blur-sm border border-indigo-300/30 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-indigo-400/30 rounded-lg">
                                <Moon className="h-4 w-4 text-indigo-100" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Night Shift</div>
                                <div className="text-xs text-indigo-100">Required staff</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-indigo-100">CTMs</span>
                                <span className="text-lg font-bold text-white">{staffBreakdown.Night?.ctms ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-indigo-100">Carers</span>
                                <span className="text-lg font-bold text-white">{staffBreakdown.Night?.carers ?? 0}</span>
                            </div>
                            <div className="border-t border-indigo-300/30 pt-2 mt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-indigo-50">Total</span>
                                    <span className="text-2xl font-bold text-white">{staffBreakdown.Night?.total ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-white">{(staffBreakdown.Day?.total || 0) + (staffBreakdown.Night?.total || 0)}</div>
                        <div className="text-xs text-cyan-100 mt-1 flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            Total Staff
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-white">
                            {residents.length > 0 ? `${Math.round((residents.length / Math.max(1, calculateNDPSStaffing(residents).Day)) * 10) / 10}:1` : '—'}
                        </div>
                        <div className="text-xs text-cyan-100 mt-1 flex items-center justify-center gap-1">
                            <Users className="h-3 w-3" />
                            Day Ratio
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-white">
                            {residents.length > 0 ? `${Math.round((residents.length / Math.max(1, calculateNDPSStaffing(residents).Night)) * 10) / 10}:1` : '—'}
                        </div>
                        <div className="text-xs text-cyan-100 mt-1 flex items-center justify-center gap-1">
                            <Users className="h-3 w-3" />
                            Night Ratio
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StaffingCard({ workspaceId, orgId, dailyEntry, onTeamsClick, onTrendsClick }: { workspaceId?: string, orgId?: string | null, dailyEntry?: any, onTeamsClick?: () => void, onTrendsClick?: () => void }) {
    const [staffingData, setStaffingData] = useState<{ day: string; night: string; lastUpdated?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [dayInput, setDayInput] = useState('');
    const [nightInput, setNightInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Optionally, set a target/ideal staff number for visual reference
    const STAFF_TARGET = 20; // You can make this configurable or fetch from settings

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
                    const day = data.staffingDay || data.staffing?.day || '0';
                    const night = data.staffingNight || data.staffing?.night || '0';
                    const lastUpdated = data.createdAt ? 
                        (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) :
                        new Date(data.recordedAt || Date.now());
                    // If dailyEntry exists, prefer its values for immediate UI feedback
                    const preferredDay = (dailyEntry && (dailyEntry.staffingDay !== undefined)) ? String(dailyEntry.staffingDay) : String(day);
                    const preferredNight = (dailyEntry && (dailyEntry.staffingNight !== undefined)) ? String(dailyEntry.staffingNight) : String(night);
                    setStaffingData({
                        day: preferredDay,
                        night: preferredNight,
                        lastUpdated: lastUpdated.toLocaleString()
                    });
                    setDayInput(preferredDay);
                    setNightInput(preferredNight);
                } else {
                    setStaffingData(null);
                    setDayInput('');
                    setNightInput('');
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
    }, [workspaceId]);

    const totalStaff = (editing
        ? (parseInt(dayInput || '0', 10) + parseInt(nightInput || '0', 10))
        : (staffingData ? (parseInt(staffingData.day || '0') + parseInt(staffingData.night || '0')) : 0)
    );
    const percent = STAFF_TARGET > 0 ? Math.min(100, Math.round((totalStaff / STAFF_TARGET) * 100)) : 0;
    // Gradient colors for ring, matching audit card style
    let gradientColors = { start: '#34d399', end: '#059669' };
    if (percent < 80 && percent >= 20) gradientColors = { start: '#fbbf24', end: '#d97706' };
    else if (percent < 20) gradientColors = { start: '#f87171', end: '#dc2626' };

    const handleSave = async () => {
        setError(null);
        if (!workspaceId) return;
        const day = parseInt(dayInput || '0', 10);
        const night = parseInt(nightInput || '0', 10);
        if (isNaN(day) || isNaN(night) || day < 0 || night < 0) {
            setError('Please enter valid non-negative numbers');
            return;
        }
        setSaving(true);
        try {
            // Save as a new daily check-in for today
            const now = new Date();
            const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const colRef = collection(db, workspaceCollectionPath(workspaceId, 'daily-checkins', orgId || null));
            // Use dateKey as doc id to avoid multiple for same day
            const docRef = doc(colRef, dateKey);
            await setDoc(docRef, {
                staffingDay: day,
                staffingNight: night,
                createdAt: now,
                recordedAt: now,
                // Optionally, add a userId if available
            }, { merge: true });
            setEditing(false);
        } catch (e) {
            setError('Failed to save staff levels');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-500 hover:shadow-2xl text-white transition-all duration-300 cursor-pointer min-h-[220px] flex flex-col" onClick={onTrendsClick}>
            {/* Animated background effects */}
            <div className="pointer-events-none absolute inset-0 opacity-20">
                <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/30 blur-3xl" />
                <div className="absolute bottom-[-3rem] left-[-2rem] h-40 w-40 rounded-full bg-cyan-300/40 blur-3xl" />
            </div>
            <CardHeader className="pb-4 relative z-20">
                <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        {onTeamsClick && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="relative z-30 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 pointer-events-auto" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onTeamsClick();
                                }} 
                                disabled={saving || loading}
                            >
                                <Users className="w-4 h-4 mr-1" />
                                Teams
                            </Button>
                        )}
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
                <CardTitle className="text-lg font-bold text-white mb-2">Staffing</CardTitle>
                <CardDescription className="text-blue-100">Monitor current staffing levels</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 flex-1">
                {loading ? (
                    <div className="text-sm text-blue-100">Loading...</div>
                ) : (
                    <div className="flex items-center gap-4 min-h-[80px]">
                        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center relative">
                            <style>{`.staffing-hide-pie-text text { display: none !important; }`}</style>
                            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                <span className="text-xl font-bold text-white drop-shadow">{totalStaff}</span>
                            </div>
                            <div className="staffing-hide-pie-text">
                                <OccupancyPie
                                    percent={percent}
                                    size={64}
                                    strokeWidth={6}
                                    gradientColors={gradientColors}
                                    centerClassName=""
                                    centerFill="#fff"
                                    centerFontSize={18}
                                />
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-center p-2 bg-white/10 rounded-lg border border-white/20">
                                    <Sun className="h-4 w-4 text-yellow-300 mx-auto mb-1" />
                                    {editing ? (
                                        <input
                                            type="number"
                                            className="w-12 border border-white/30 rounded px-1 py-0.5 text-center text-sm font-bold text-white bg-white/10 placeholder-white/50"
                                            value={dayInput}
                                            onChange={e => setDayInput(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)).toString())}
                                            min={0}
                                            disabled={saving}
                                            placeholder="0"
                                            // Prevent input interactions from bubbling and reopening modals
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => e.stopPropagation()}
                                            onFocus={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            onWheel={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="text-lg font-bold text-white">{staffingData?.day ?? '0'}</div>
                                    )}
                                    <div className="text-xs text-blue-200 font-medium">Day</div>
                                </div>
                                <div className="text-center p-2 bg-white/10 rounded-lg border border-white/20">
                                    <Moon className="h-4 w-4 text-indigo-300 mx-auto mb-1" />
                                    {editing ? (
                                        <input
                                            type="number"
                                            className="w-12 border border-white/30 rounded px-1 py-0.5 text-center text-sm font-bold text-white bg-white/10 placeholder-white/50"
                                            value={nightInput}
                                            onChange={e => setNightInput(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)).toString())}
                                            min={0}
                                            disabled={saving}
                                            placeholder="0"
                                            // Prevent input interactions from bubbling and reopening modals
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => e.stopPropagation()}
                                            onFocus={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            onWheel={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="text-lg font-bold text-white">{staffingData?.night ?? '0'}</div>
                                    )}
                                    <div className="text-xs text-blue-200 font-medium">Night</div>
                                </div>
                            </div>
                            {error && <div className="text-xs text-red-300 text-center font-medium">{error}</div>}
                            {editing ? (
                                <div className="flex justify-center mt-2">
                                    <Button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSave();
                                        }} 
                                        disabled={saving || loading} 
                                        size="sm" 
                                        className="relative z-30 pointer-events-auto bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 transition-colors duration-200"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            ) : (
                                staffingData?.lastUpdated && (
                                    <div className="text-xs text-blue-200 text-center font-medium">
                                        <Clock className="inline-block h-3 w-3 mr-1 align-text-bottom" />
                                        Last updated: {staffingData.lastUpdated}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
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
    const settingsCol = workspace && workspace.id ? workspaceCollectionPath(workspace.id, 'settings', (workspace as any)?.organisationId || null) : workspaceCollectionPath('','settings', null);
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
        const savedHistory = localStorage.getItem(`audit_history_${workspace?.id}`);
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
            const savedHistory = localStorage.getItem(`audit_history_${workspace.id}`);
            const history = savedHistory ? JSON.parse(savedHistory) : {};
            const updatedHistory = { ...history, [monthKey]: currentData };
            localStorage.setItem(`audit_history_${workspace.id}`, JSON.stringify(updatedHistory));
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

    const overallStats = calculateOverallStats();

    // Latest daily checkin entry for the workspace (used to feed Occupancy/Staffing cards)
    const [dailyEntry, setDailyEntry] = useState<any | null>(null);

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
        localStorage.setItem('openAuditType', auditKey);
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
                isTodayCompleted={isTodayCompleted}
                onDailyEntryUpdate={setDailyEntry}
                dailyEntry={dailyEntry}
                orgId={(workspace as any)?.organisationId || null}
                onOccupancyTrendsClick={() => setIsOccupancyModalOpen(true)}
                onStaffingTeamsClick={() => setIsStaffingModalOpen(true)}
                onStaffingTrendsClick={() => setIsStaffingTrendsModalOpen(true)}
            />                        <ExecutiveSummary
                            documents={documents}
                            actionableItems={actionableItems}
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
                        />

                        {/* Recent Activity Timeline */}
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                                    <Clock className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recent Activity</h2>
                            </div>

                            <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-50/10 to-indigo-50/20"></div>
                                <CardContent className="relative p-6">
                                    <div className="space-y-6">
                                        {/* Timeline items */}
                                        {recentDocuments.slice(0, 4).map((doc: Document, index: number) => (
                                            <div key={doc.id} className="flex items-start gap-4 group cursor-pointer" onClick={() => onSelect(doc)}>
                                                {/* Timeline connector */}
                                                <div className="flex flex-col items-center">
                                                    <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg group-hover:bg-blue-600 transition-colors duration-300"></div>
                                                    {index < recentDocuments.slice(0, 4).length - 1 && (
                                                        <div className="w-0.5 h-16 bg-gradient-to-b from-blue-300 to-transparent mt-2"></div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 pb-6">
                                                    <Card className="p-4 bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:shadow-lg hover:bg-white/90 transition-all duration-300 group-hover:scale-[1.02]">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors duration-300">
                                                                {getFileIcon(doc.fileType)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors duration-300">
                                                                        {doc.name}
                                                                    </h3>
                                                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                                                        {doc.fileType?.toUpperCase()}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                                    <span className="flex items-center gap-1">
                                                                        <User className="h-3 w-3" />
                                                                        {doc.owner.name}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-3 w-3" />
                                                                        {new Date(doc.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                <ChevronRight className="h-4 w-4" />
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Audit completion activity */}
                                        {overallStats.auditsCompleted > 0 && (
                                            <div className="flex items-start gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
                                                    {recentDocuments.length > 0 && (
                                                        <div className="w-0.5 h-16 bg-gradient-to-b from-green-300 to-transparent mt-2"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 hover:shadow-lg transition-all duration-300">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-2 bg-green-500 rounded-lg">
                                                                <CheckCircle className="h-5 w-5 text-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="font-semibold text-green-800 mb-1">
                                                                    {overallStats.auditsCompleted} audit{overallStats.auditsCompleted > 1 ? 's' : ''} completed
                                                                </h3>
                                                                <div className="flex items-center gap-4 text-sm text-green-700">
                                                                    <span className="flex items-center gap-1">
                                                                        <BarChart3 className="h-3 w-3" />
                                                                        Overall score: {overallStats.overallPercentage}%
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <TrendingUp className="h-3 w-3" />
                                                                        {overallStats.auditsCompleted}/{overallStats.totalAudits} completed
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-green-500">
                                                                <ChevronRight className="h-4 w-4" />
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </div>
                                            </div>
                                        )}

                                        {/* Empty state */}
                                        {recentDocuments.length === 0 && overallStats.auditsCompleted === 0 && (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Clock className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No recent activity</h3>
                                                <p className="text-gray-600 max-w-md mx-auto">
                                                    Start by uploading a document or completing an audit to see your activity timeline here.
                                                </p>
                                                <div className="mt-6 flex justify-center gap-3">
                                                    <Button variant="outline" className="gap-2">
                                                        <FileText className="h-4 w-4" />
                                                        Upload Document
                                                    </Button>
                                                    <Button variant="outline" className="gap-2">
                                                        <FileCheck className="h-4 w-4" />
                                                        Start Audit
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* View more link */}
                                        {(recentDocuments.length > 4 || overallStats.auditsCompleted > 0) && (
                                            <div className="text-center pt-4">
                                                <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2">
                                                    View All Activity
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            {/* Staffing Teams Modal */}
            <StaffingTeamsModal
                isOpen={isStaffingModalOpen}
                onClose={() => setIsStaffingModalOpen(false)}
                workspaceId={workspace?.id || ''}
            />

            {/* Staffing Trends Modal */}
            <StaffingTrendsModal
                isOpen={isStaffingTrendsModalOpen}
                onClose={() => setIsStaffingTrendsModalOpen(false)}
                workspaceId={workspace?.id || ''}
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

