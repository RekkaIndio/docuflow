
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Folder, Users, FileText, FileSpreadsheet, FileIcon, FileX2, Briefcase, Clock, User, TrendingUp, TrendingDown, Minus, Archive, Calendar, BarChart3, Edit3, FileCheck, CheckCircle, AlertCircle, ClipboardList, ChevronRight, Zap, Shield, Heart } from "lucide-react";
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
import { SidebarTrigger } from "../ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query as fsQuery, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { workspaceDocPath, workspaceCollectionPath, workspaceBasePath } from '@/lib/paths';
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

// Component to display trend indicators
// Local styles for the pulsing pending state. Using a box-shadow animation on
// the Card itself avoids clipping issues from `overflow: hidden` and keeps the
// glow visible while preserving the card's content layering.
const PendingPulseStyles = () => (
    <style jsx>{`
        .pulse-pending {
            position: relative;
            /* base subtle glow */
            box-shadow: 0 0 8px 2px rgba(239,68,68,0.18);
            animation: pulse-red 2s infinite ease-in-out;
        }

        /* Slight scaling + shadow intensity change gives a visible pulse without
             relying on pseudo-elements that can be clipped by overflow:hidden. */
        @keyframes pulse-red {
            0% { transform: scale(1); box-shadow: 0 0 6px 1px rgba(239,68,68,0.12); }
            50% { transform: scale(1.01); box-shadow: 0 0 24px 10px rgba(239,68,68,0.30); }
            100% { transform: scale(1); box-shadow: 0 0 6px 1px rgba(239,68,68,0.12); }
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

const QuickActions = ({ documents, onSelect, workspaceId, orgId, overallStats, getGradientColors, trends, dailyEntry, onDailyEntryUpdate, carePlanScore, hsScore, maintenanceScore, restrictiveScore, fireScore, infectionScore, mealtimeScore, nightScore, staffFileScore, kitchenScore, handleAuditCardClick, onStaffingTeamsClick, onStaffingTrendsClick, onOccupancyTrendsClick, onComplianceOverviewClick, navigateToAuditForm }: { 
    documents: Document[], 
    onSelect: (doc: Document) => void, 
    workspaceId?: string,
    orgId?: string | null,
    overallStats: any,
    getGradientColors: (score: number | null) => { start: string; end: string },
    trends: Record<string, { direction: 'up' | 'down' | 'stable', change: number }>
    dailyEntry?: any,
    onDailyEntryUpdate?: (entry: any) => void,
    carePlanScore: number | null,
    hsScore: number | null,
    maintenanceScore: number | null,
    restrictiveScore: number | null,
    fireScore: number | null,
    infectionScore: number | null,
    mealtimeScore: number | null,
    nightScore: number | null,
    staffFileScore: number | null,
    kitchenScore: number | null,

    handleAuditCardClick: (auditKey: string) => void,
    onStaffingTeamsClick?: () => void,
    onStaffingTrendsClick?: () => void,
    onOccupancyTrendsClick?: () => void,
    onComplianceOverviewClick?: () => void,
    navigateToAuditForm: (auditKey: string) => void
}) => {
    const actionableItems = useMemo(() => {
        const today = new Date();
        
        const untaggedDocs = documents.filter(doc => !doc.tags || doc.tags.length === 0);
        const recentDocs = documents
            .filter(doc => new Date(doc.createdAt) > new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000))
            .slice(0, 3);

        return {
            untaggedDocs: untaggedDocs.slice(0, 3),
            recentDocs
        };
    }, [documents]);

    // Check if today's daily check-in has been completed
    const todayKey = new Date().toISOString().split('T')[0];
    const isTodayCompleted = dailyEntry && dailyEntry.id === todayKey;

    return (
        <div className="w-full space-y-8">
            <PendingPulseStyles />
            {/* Section Header */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Quick Actions</h2>
                </div>
                <p className="text-gray-600 max-w-2xl">Access your most important tools and monitor key metrics at a glance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 relative z-10 pointer-events-auto">
                {/* Daily Check-in Card */}
                {/* Wrapper ensures animated box-shadow is visible (prevents clipping).
                    When pending, we add a small padding and the `pulse-pending` class. */}
                <div className={`relative z-0 ${!isTodayCompleted ? 'p-2 rounded-2xl' : ''}`}>
                        { !isTodayCompleted && (
                            <div
                                aria-hidden
                                className="absolute -inset-2 rounded-2xl pointer-events-none"
                                style={{
                                    zIndex: 0,
                                    // tightened visible glow: smaller spread and stronger near-edge color
                                    boxShadow: '0 0 36px 16px rgba(239,68,68,0.78)',
                                    background: 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.88) 0%, rgba(239,68,68,0.66) 20%, rgba(239,68,68,0.38) 45%, rgba(239,68,68,0.12) 70%, transparent 100%)',
                                    // reduced blur so glow sits closer to the card
                                    filter: 'blur(2px)',
                                    animation: 'pulse-red 1600ms infinite ease-in-out'
                                }}
                            />
                        )}
                    <Card className={`group relative z-20 overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-xl text-white transition-all duration-300 ${!isTodayCompleted ? 'pulse-pending' : ''}`}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
                                <Calendar className="h-6 w-6 text-white" />
                            </div>
                            {!isTodayCompleted && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-full border border-amber-400/30">
                                    <AlertCircle className="h-3 w-3 text-amber-300" />
                                    <span className="text-xs font-medium text-amber-200">Pending</span>
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-lg font-bold text-white mb-2">Daily Check-in</CardTitle>
                        <CardDescription className="text-blue-100">Record occupancy, staffing, and daily metrics</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 min-h-[80px]">
                            <div className="flex-shrink-0 w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">
                                    {isTodayCompleted ? '✓' : '!'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm text-blue-50 leading-relaxed mb-3">
                                    {isTodayCompleted ? 
                                        "Today's check-in completed ✓" : 
                                        "Complete today's daily metrics"
                                    }
                                </div>
                                <DailyCheckinModal 
                                    workspaceId={workspaceId || ''} 
                                    onEntryUpdate={onDailyEntryUpdate}
                                    trigger={
                                        <Button className={`relative z-20 w-full transition-all duration-300 shadow-lg hover:shadow-xl pointer-events-auto ${
                                            isTodayCompleted 
                                                ? 'bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50' 
                                                : 'bg-white text-blue-600 hover:bg-blue-50 border-white hover:border-blue-200'
                                        } border backdrop-blur-sm`}>
                                            {isTodayCompleted ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Update Check-in
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="h-4 w-4 mr-2" />
                                                    Complete Check-in
                                                </>
                                            )}
                                        </Button>
                                    }
                                />
                            </div>
                        </div>
                    </CardContent>
                    </Card>
                </div>
                
                {/* Occupancy Card */}
                <OccupancyCard workspaceId={workspaceId} orgId={orgId} dailyEntry={dailyEntry} onTrendsClick={onOccupancyTrendsClick} />
                
                {/* Staffing Card */}
                <StaffingCard workspaceId={workspaceId} orgId={orgId} dailyEntry={dailyEntry} onTeamsClick={onStaffingTeamsClick} onTrendsClick={onStaffingTrendsClick} />
                
                {/* Overall Score Card */}
                <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-xl text-white transition-all duration-300 cursor-pointer" onClick={onComplianceOverviewClick}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
                                <BarChart3 className="h-6 w-6 text-white" />
                            </div>
                            {overallStats.overallPercentage !== null && (
                                <div className="flex items-center">
                                    {overallStats.overallPercentage >= 80 ? 
                                        <div className="w-3 h-3 bg-green-300 rounded-full"></div> :
                                    overallStats.overallPercentage >= 60 ? 
                                        <div className="w-3 h-3 bg-yellow-300 rounded-full"></div> :
                                        <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                                    }
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-lg font-bold text-white mb-2">Compliance Score</CardTitle>
                        <CardDescription className="text-emerald-100">Overall audit performance across all categories</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 min-h-[80px]">
                            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
                                <OccupancyPie 
                                    percent={overallStats.overallPercentage ?? 0} 
                                    size={64} 
                                    strokeWidth={6} 
                                    gradientColors={getGradientColors(overallStats.overallPercentage)}
                                    centerFontSize={14}
                                    centerClassName="font-bold text-white"
                                    centerFill="transparent"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-baseline gap-2">
                                    <div className="text-xl font-bold text-white">
                                        {overallStats.overallPercentage !== null ? `${overallStats.overallPercentage}%` : 'N/A'}
                                    </div>
                                    {overallStats.overallPercentage !== null && (
                                        <TrendIndicator auditType="overall" trends={trends} />
                                    )}
                                </div>
                                <div className="text-sm text-emerald-100">
                                    {overallStats.totalYesCount} of {overallStats.totalQuestions} passed
                                </div>
                                <div className="text-sm text-emerald-100">
                                    {overallStats.auditsCompleted}/{overallStats.totalAudits} audits completed
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Compliance Status Grid removed. Placeholder for future dashboard widgets. */}
            <div className="space-y-6">
                {/* TODO: Add new dashboard widgets here. */}
            </div>
            
            {/* Audits and Action Plans Section - two-column grid, left, same width as above */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pointer-events-auto relative z-10">
                <div className="flex flex-col gap-6 pointer-events-auto relative z-10">
                    {/* Audits Card */}
                    <Card className="hover:shadow-xl transition-all duration-300 border border-blue-200/60 bg-white rounded-2xl shadow-lg hover:shadow-blue-100/50 pointer-events-auto relative z-[100] cursor-pointer" onClick={() => {
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('navigate-to-audits'));
                        }
                    }}>
                        <CardHeader className="pb-3 border-b border-blue-100/80 bg-gradient-to-r from-blue-50/40 to-transparent rounded-t-2xl">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
                                <FileCheck className="h-4 w-4 text-blue-500" />
                                Audits
                            </CardTitle>
                            <CardDescription className="text-xs text-blue-700/70 font-medium">Audits requiring completion</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-3">
                                {(() => {
                                    const auditTypes = [
                                        { key: 'care-plan', name: 'Care Plan', score: carePlanScore },
                                        { key: 'health-safety', name: 'Health & Safety', score: hsScore },
                                        { key: 'maintenance', name: 'Maintenance', score: maintenanceScore },
                                        { key: 'restrictive-practice', name: 'Restrictive Practice', score: restrictiveScore },
                                        { key: 'fire-safety', name: 'Fire Safety', score: fireScore },
                                        { key: 'infection-control', name: 'Infection Control', score: infectionScore },
                                        { key: 'mealtime', name: 'Mealtime', score: mealtimeScore },
                                        { key: 'night-visit', name: 'Night Visit', score: nightScore },
                                        { key: 'staff-file', name: 'Staff File', score: staffFileScore },
                                        { key: 'kitchen', name: 'Kitchen', score: kitchenScore }
                                    ];

                                    const incompleteAudits = auditTypes.filter(audit => audit.score === null || audit.score === 0);

                                    if (incompleteAudits.length === 0) {
                                        return (
                                            <div className="text-center py-6">
                                                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                                                <p className="text-sm text-gray-600 font-medium">All audits completed!</p>
                                                <p className="text-xs text-gray-500 mt-1">Great job maintaining compliance</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-3 max-h-60 overflow-y-auto pointer-events-auto">
                                            {incompleteAudits.slice(0, 4).map(audit => (
                                                <div key={audit.key} className="flex items-center justify-between p-3 bg-red-50/60 rounded-xl border border-red-200/40 hover:bg-red-50/80 transition-colors duration-200 pointer-events-auto cursor-pointer" onClick={() => navigateToAuditForm(audit.key)}>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                        <span className="text-sm font-medium truncate text-gray-700">{audit.name}</span>
                                                    </div>
                                                    <Badge variant="destructive" className="text-xs font-medium px-2 py-1">Pending</Badge>
                                                </div>
                                            ))}
                                            {incompleteAudits.length > 4 && (
                                                <p className="text-xs text-gray-500 text-center pt-2 font-medium">
                                                    +{incompleteAudits.length - 4} more audits pending
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="text-xs text-gray-600 text-center pt-3 border-t border-gray-100 font-medium">
                                {overallStats.auditsCompleted} of {overallStats.totalAudits} audits completed
                            </div>
                        </CardContent>
                    </Card>
                    {/* Action Plans Card */}
                    <ActionPlansCard workspaceId={workspaceId} orgId={orgId} documents={documents} onSelect={onSelect} />
                </div>
                {/* Placeholder for new card to the right */}
                <ResidentCareCard workspaceId={workspaceId} />
            </div>
        </div>
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
        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 hover:shadow-xl text-white transition-all duration-300 cursor-pointer" onClick={onTrendsClick}>
            <CardHeader className="pb-3 relative z-20">
                <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
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
            
            <CardContent className="space-y-4">
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
        <Card className="group hover:shadow-xl transition-all duration-300 border border-green-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-green-100/50">
            <CardHeader className="pb-3 border-b border-green-100/80 bg-gradient-to-r from-green-50/40 to-transparent rounded-t-2xl">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                    <ClipboardList className="h-4 w-4 text-green-600" />
                    Action Plans
                </CardTitle>
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
                                        <Badge variant="secondary" className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700">
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

function ResidentCareCard({ workspaceId }: { workspaceId?: string }) {
    // Sample data for demonstration
    const sampleData = {
        bands: [
            { band: 1, count: 9, name: "Independent" },
            { band: 2, count: 8, name: "Low Dependency" },
            { band: 3, count: 4, name: "Medium Dependency" },
            { band: 4, count: 3, name: "High Dependency" },
            { band: 5, count: 0, name: "Very High Dependency" }
        ],
        staffRatios: {
            dayRatio: "4:1",
            nightRatio: "8:1",
            totalCareHours: "28h",
            avgCarePerResident: "1.1h"
        },
        staffRequired: {
            dayShift: {
                nurses: 2,
                ctms: 1,
                carers: 3,
                total: 6
            },
            nightShift: {
                nurses: 1,
                ctms: 1,
                carers: 1,
                total: 3
            },
            totalStaff24h: 9
        }
    };

    return (
        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-teal-500 to-teal-600 hover:shadow-xl text-white transition-all duration-300">
            <CardHeader className="pb-3 relative z-20">
                <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
                        <Heart className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-teal-200 font-medium bg-white/10 px-3 py-1 rounded-full border border-white/20">
                            {sampleData.staffRequired.totalStaff24h} staff
                        </span>
                    </div>
                </div>
                <CardTitle className="text-lg font-bold text-white mb-2">Dependency Levels</CardTitle>
                <CardDescription className="text-teal-100">Dependency levels and staffing requirements</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Four smaller cards in a 2x2 grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Bands Card */}
                    <Card className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-sm hover:bg-white/15 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-4">
                            <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-teal-200" />
                                Bands
                            </div>
                            <div className="space-y-2">
                                {sampleData.bands.map((band) => (
                                    <div key={band.band} className="flex items-center justify-between text-sm">
                                        <span className="text-teal-100">Band {band.band}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{band.count}</span>
                                            <span className="text-xs text-teal-200">({band.name})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Staff Ratios Card */}
                    <Card className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-sm hover:bg-white/15 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-4">
                            <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4 text-teal-200" />
                                Staff Ratios
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">Day Ratio</span>
                                    <span className="font-bold text-white">{sampleData.staffRatios.dayRatio}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">Night Ratio</span>
                                    <span className="font-bold text-white">{sampleData.staffRatios.nightRatio}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">Total Care Hours</span>
                                    <span className="font-bold text-white">{sampleData.staffRatios.totalCareHours}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">Avg. Care/Resident</span>
                                    <span className="font-bold text-white">{sampleData.staffRatios.avgCarePerResident}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Staff Required Card - Day Shift */}
                    <Card className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-sm hover:bg-white/15 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-4">
                            <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <Sun className="h-4 w-4 text-teal-200" />
                                Day Shift
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">Nurses</span>
                                    <span className="font-bold text-white">{sampleData.staffRequired.dayShift.nurses}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">CTMs</span>
                                    <span className="font-bold text-white">{sampleData.staffRequired.dayShift.ctms}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">Carers</span>
                                    <span className="font-bold text-white">{sampleData.staffRequired.dayShift.carers}</span>
                                </div>
                                <div className="border-t border-white/20 pt-2 mt-2">
                                    <div className="flex items-center justify-between text-sm font-semibold">
                                        <span className="text-white">Total</span>
                                        <span className="text-teal-200">{sampleData.staffRequired.dayShift.total}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Staff Required Card - Night Shift */}
                    <Card className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-sm hover:bg-white/15 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-4">
                            <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <Moon className="h-4 w-4 text-teal-200" />
                                Night Shift
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">Nurses</span>
                                    <span className="font-bold text-white">{sampleData.staffRequired.nightShift.nurses}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">CTMs</span>
                                    <span className="font-bold text-white">{sampleData.staffRequired.nightShift.ctms}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-teal-100">Carers</span>
                                    <span className="font-bold text-white">{sampleData.staffRequired.nightShift.carers}</span>
                                </div>
                                <div className="border-t border-white/20 pt-2 mt-2">
                                    <div className="flex items-center justify-between text-sm font-semibold">
                                        <span className="text-white">Total</span>
                                        <span className="text-teal-200">{sampleData.staffRequired.nightShift.total}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Total Staff Summary */}
                <Card className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-sm hover:bg-white/15 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-white flex items-center gap-2">
                                <Clock className="h-4 w-4 text-teal-200" />
                                Total Staff (24h)
                            </div>
                            <div className="text-xl font-bold text-white">{sampleData.staffRequired.totalStaff24h}</div>
                        </div>
                    </CardContent>
                </Card>
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
        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:shadow-xl text-white transition-all duration-300 cursor-pointer" onClick={onTrendsClick}>
            <CardHeader className="pb-3 relative z-20">
                <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
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
                <CardDescription className="text-purple-100">Latest staffing levels from check-ins</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="text-sm text-purple-100">Loading...</div>
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
                                    <div className="text-xs text-purple-200 font-medium">Day</div>
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
                                    <div className="text-xs text-purple-200 font-medium">Night</div>
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
                                    <div className="text-xs text-purple-200 text-center font-medium">
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
    
    const { documents, folders } = useMemo(() => getAllItems(workspace?.folders || []), [workspace?.folders]);


    
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
        let unsubscribeFromUser: (() => void) | undefined;

        (async () => {
            try {
                // If workspace.id refers to another user/doc, try to read any previously-saved image there
                if (workspace.id && workspace.id !== user?.id) {
                    const wsDocRef = doc(db, workspaceBasePath(workspace.id, (workspace as any)?.organisationId || null));
                    const wsSnap = await getDoc(wsDocRef);
                    if (wsSnap.exists()) {
                        const data = wsSnap.data();
                        if (data?.profilePicture) {
                            setHeaderLogo(data.profilePicture);
                            return; // prefer workspace-saved image until user doc subscription overrides it
                        } else if (data?.uploadedLogo) {
                            setHeaderLogo(data.uploadedLogo);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error('workspace fallback header logo fetch failed', err);
            }
        })();

        // Live subscribe to the authenticated user's doc (this should be the source of truth)
        if (user?.id) {
            // Try organisation-scoped user document first, then fall back to top-level
            const orgId = (workspace as any)?.organisationId;
            let userDocRef;
            if (orgId) {
                userDocRef = doc(db, `organisations/${orgId}/users`, user.id);
            } else {
                userDocRef = doc(db, 'users', user.id);
            }
            unsubscribeFromUser = onSnapshot(userDocRef, (d) => {
                const data = d.data();
                if (data?.profilePicture) {
                    setHeaderLogo(data.profilePicture);
                } else if (data?.uploadedLogo) {
                    setHeaderLogo(data.uploadedLogo);
                }
            }, (err) => {
                console.warn('Failed to subscribe to user document for header logo', err);
                // If org-scoped fails and we have orgId, try top-level as fallback
                if (orgId && err.code === 'permission-denied') {
                    const fallbackRef = doc(db, 'users', user.id);
                    const fallbackUnsub = onSnapshot(fallbackRef, (d) => {
                        const data = d.data();
                        if (data?.profilePicture) {
                            setHeaderLogo(data.profilePicture);
                        } else if (data?.uploadedLogo) {
                            setHeaderLogo(data.uploadedLogo);
                        }
                    }, (fallbackErr) => {
                        console.warn('Failed to subscribe to fallback user document', fallbackErr);
                    });
                    // Update the unsubscribe function to clean up both listeners
                    unsubscribeFromUser = () => {
                        fallbackUnsub();
                    };
                }
            });
        }

    // Subscribe to audit latest scores (organisation-aware)
    const settingsCol = workspace && workspace.id ? workspaceCollectionPath(workspace.id, 'settings', (workspace as any)?.organisationId || null) : workspaceCollectionPath('','settings', null);
    const ref = doc(db, settingsCol, 'audit_latest_scores');
        const unsubAudit = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as any;
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
            if (unsubscribeFromUser) unsubscribeFromUser();
            if (unsubAudit) unsubAudit();
        };
    }, [workspace?.id, (workspace as any)?.organisationId]);



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
        const auditTypes = ['care-plan', 'health-safety', 'maintenance', 'restrictive-practice', 
                           'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen'];
        
        let totalYes = 0;
        let totalQuestions = 0;
        let completedAudits = 0;
        
        auditTypes.forEach(auditType => {
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
        const scores = [
            { score: carePlanScore, yesCount: carePlanYesCount, totalCount: carePlanTotalCount },
            { score: hsScore, yesCount: hsYesCount, totalCount: hsTotalCount },
            { score: maintenanceScore, yesCount: maintenanceYesCount, totalCount: maintenanceTotalCount },
            { score: restrictiveScore, yesCount: restrictiveYesCount, totalCount: restrictiveTotalCount },
            { score: fireScore, yesCount: fireYesCount, totalCount: fireTotalCount },
            { score: infectionScore, yesCount: infectionYesCount, totalCount: infectionTotalCount },
            { score: mealtimeScore, yesCount: mealtimeYesCount, totalCount: mealtimeTotalCount },
            { score: nightScore, yesCount: nightYesCount, totalCount: nightTotalCount },
            { score: staffFileScore, yesCount: staffFileYesCount, totalCount: staffFileTotalCount },
            { score: kitchenScore, yesCount: kitchenYesCount, totalCount: kitchenTotalCount }
        ];

        const validScores = scores.filter(item => 
            item.score !== null && item.yesCount !== null && item.totalCount !== null
        );

        if (validScores.length === 0) {
            return {
                totalYesCount: 0,
                totalQuestions: 0,
                overallPercentage: null,
                auditsCompleted: 0,
                totalAudits: 10
            };
        }

        const totalYesCount = validScores.reduce((sum, item) => sum + item.yesCount!, 0);
        const totalQuestions = validScores.reduce((sum, item) => sum + item.totalCount!, 0);
        const overallPercentage = totalQuestions > 0 ? Math.round((totalYesCount / totalQuestions) * 100) : null;

        return {
            totalYesCount,
            totalQuestions,
            overallPercentage,
            auditsCompleted: validScores.length,
            totalAudits: 10
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
    };

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



    return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pointer-events-auto">
        {/* Enhanced hero header with modern design */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white rounded-b-3xl">
                {/* Animated background elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-40 -translate-x-40"></div>
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000"></div>
                </div>

                <div className="relative z-10 p-8">
                    <div className="w-full mx-auto flex items-start justify-between gap-8">
                        <div className="flex items-start gap-6">
                            <div className="p-1 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                                {/* Header logo precedence: headerLogo (from user doc) -> workspace.profilePicture -> workspace.settings.uploadedLogo -> fallback icon */}
                                <Avatar className="w-10 h-10 bg-white/5">
                                    <AvatarImage src={headerLogo ?? workspace?.profilePicture ?? workspace?.settings?.uploadedLogo ?? undefined} alt={workspace?.name ?? 'Workspace'} />
                                    <AvatarFallback>
                                        <Users className="w-6 h-6 text-white" />
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium text-white/90">Welcome back</span>
                                </div>
                                <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
                                    {workspace?.name ?? 'Your workspace'}
                                </h1>
                            </div>
                        </div>

                        {/* Key metrics cards - right side */}
                        <div className="hidden xl:flex items-center gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                                    <div className="flex items-center gap-2 lg:gap-3 h-full">
                                        <div className="p-2 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors duration-300">
                                            <Users className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-300" />
                                        </div>
                                        <div>
                                            <div className="text-xl lg:text-2xl font-bold text-white">{overallStats.auditsCompleted}</div>
                                            <div className="text-xs text-emerald-200 font-medium uppercase tracking-wide">Audits Done</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Overall compliance card with pie chart on left */}
                                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                                    <div className="flex items-center gap-2 lg:gap-3 h-full">
                                        <div className="flex-shrink-0">
                                            <OccupancyPie
                                                percent={overallStats.overallPercentage ?? 0}
                                                size={40}
                                                strokeWidth={5}
                                                centerFill="#ffffff"
                                                centerFontSize={10}
                                                centerClassName="font-bold text-slate-800"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xl lg:text-2xl font-bold text-white truncate">
                                                {overallStats.overallPercentage !== null ? `${overallStats.overallPercentage}%` : '—'}
                                            </div>
                                            <div className="text-xs text-blue-200 font-medium uppercase tracking-wide">Compliance</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <main className="flex-1">
                <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
                    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-8 lg:space-y-12 pointer-events-auto">
                        {/* Quick Actions Section */}
                        <QuickActions
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

