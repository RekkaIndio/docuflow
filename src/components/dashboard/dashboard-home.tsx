
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Folder, Users, FileText, FileSpreadsheet, FileIcon, FileX2, Briefcase, Clock, User, TrendingUp, TrendingDown, Minus, Archive, Calendar, BarChart3, Edit3 } from "lucide-react";
import type { Workspace, Document, Folder as FolderType } from "@/lib/types";
import { useMemo } from "react";
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
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query as fsQuery, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import OccupancyPie from '@/components/admin/occupancy-pie';
import OverviewCards from './overview-cards';
// consolidated imports above

// Component to display trend indicators
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


const RecentFilesTable = ({ documents, onSelect }: { documents: Document[], onSelect: (doc: Document) => void }) => (
    <Card className="border border-blue-200 shadow-sm bg-white/80 backdrop-blur-md rounded-xl">
        <CardHeader className="pb-2 border-b border-blue-100 bg-gradient-to-r from-blue-50/60 to-transparent rounded-t-xl">
            <CardTitle className="text-base font-semibold text-blue-900 tracking-tight">Recent Files</CardTitle>
            <CardDescription className="text-xs text-blue-700/70">The last 5 documents that were uploaded or modified.</CardDescription>
        </CardHeader>
    <CardContent className="pt-4">
            {/* Mobile-friendly card layout */}
            <div className="block sm:hidden space-y-3">
                {documents.length > 0 ? documents.map(doc => (
                    <Card key={doc.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer border border-blue-500" onClick={() => onSelect(doc)}>
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center gap-3 min-w-0">
                                {getFileIcon(doc.fileType)}
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm leading-tight break-words">{doc.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="truncate flex-1 mr-2">{doc.owner.name}</span>
                                <span className="flex-shrink-0">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </Card>
                )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet.</p>
                )}
            </div>
            {/* Desktop table layout */}
            <div className="hidden sm:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Last Modified</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.length > 0 ? documents.map(doc => (
                             <TableRow key={doc.id} className="cursor-pointer" onClick={() => onSelect(doc)}>
                                <TableCell>
                                    <div className="flex items-center gap-4">
                                        <div className="text-xs text-slate-300">Occupancy</div>
                                        {/* Removed duplicate right-hand percent — now displayed in the pie center */}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                         <Avatar className="h-6 w-6">
                                            <AvatarImage src={doc.owner.avatarUrl ?? undefined} alt={doc.owner.name ?? undefined} />
                                            <AvatarFallback>{doc.owner.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-muted-foreground">{doc.owner.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                               <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                 No documents uploaded yet.
                               </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
);

const QuickActions = ({ documents, onSelect, workspaceId, overallStats, getGradientColors, trends }: { 
    documents: Document[], 
    onSelect: (doc: Document) => void, 
    workspaceId?: string,
    overallStats: any,
    getGradientColors: (score: number | null) => { start: string; end: string },
    trends: Record<string, { direction: 'up' | 'down' | 'stable', change: number }>
}) => {
    const actionableItems = useMemo(() => {
        const today = new Date();
        const overdueRenewals = documents.filter(doc => {
            if (!doc.renewalDate) return false;
            return new Date(doc.renewalDate) < today;
        });

        const untaggedDocs = documents.filter(doc => !doc.tags || doc.tags.length === 0);
        const recentDocs = documents
            .filter(doc => new Date(doc.createdAt) > new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000))
            .slice(0, 3);

        return {
            overdueRenewals: overdueRenewals.slice(0, 3),
            untaggedDocs: untaggedDocs.slice(0, 3),
            recentDocs
        };
    }, [documents]);

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Overdue Renewals */}
                <Card className="hover:shadow-lg transition-shadow border border-blue-200 bg-white/80 backdrop-blur-md rounded-xl">
                    <CardHeader className="pb-2 border-b border-blue-100 bg-gradient-to-r from-blue-50/60 to-transparent rounded-t-xl">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            Overdue Renewals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-3">
                        {actionableItems.overdueRenewals.length > 0 ? (
                            actionableItems.overdueRenewals.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer" onClick={() => onSelect(doc)}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        {getFileIcon(doc.fileType)}
                                        <span className="text-sm truncate">{doc.name}</span>
                                    </div>
                                    <Badge variant="destructive" className="text-xs">Overdue</Badge>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-2">No overdue renewals</p>
                        )}
                    </CardContent>
                </Card>
                
                {/* Occupancy card: enter occupied beds, total beds shown in title */}
                <OccupancyCard workspaceId={workspaceId} />
            
                {/* Overall Score Card - replacing Recent Activity */}
                <Card className="hover:shadow-lg transition-shadow border border-blue-200 bg-white/80 backdrop-blur-md rounded-xl">
                    <CardHeader className="pb-2 border-b border-blue-100 bg-gradient-to-r from-blue-50/60 to-transparent rounded-t-xl">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            Overall Audit Score
                        </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Audit score for all categories</CardDescription>

                    </CardHeader>
                    <CardContent className="space-y-3 pt-3">
                        <div className="flex items-center gap-4">
                            <div className="w-36 h-36 flex items-center justify-center relative">
                                <OccupancyPie 
                                    percent={overallStats.overallPercentage ?? 0} 
                                    size={120} 
                                    strokeWidth={16} 
                                    gradientColors={getGradientColors(overallStats.overallPercentage)}
                                    centerFontSize={16} 
                                />
                            </div>
                            <div>
                                <div className="text-lg font-semibold">
                                    {overallStats.overallPercentage !== null ? `${overallStats.overallPercentage}%` : 'N/A'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {overallStats.totalYesCount} of {overallStats.totalQuestions} passed
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {overallStats.auditsCompleted}/10 audits completed
                                </div>
                                {overallStats.overallPercentage !== null && (
                                    <div className="mt-2">
                                        <TrendIndicator auditType="overall" trends={trends} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const QuickAccess = ({ folders, onSelect }: { folders: FolderType[], onSelect: (item: FolderType) => void }) => (
    <div className="w-full">
        <h2 className="text-lg font-semibold mb-4 text-blue-900 tracking-tight">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.length > 0 ? folders.map(folder => (
             <Card key={folder.id} className="hover:shadow-lg transition-shadow cursor-pointer border border-blue-200 bg-white/80 backdrop-blur-md rounded-xl" onClick={() => onSelect(folder)}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6 border-b border-blue-100 bg-gradient-to-r from-yellow-50/60 to-transparent rounded-t-xl">
                    <Folder className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{folder.items.length} items</span>
                </CardHeader>
                    <CardContent className="px-4 sm:px-6 pt-3">
                        <p className="font-semibold text-sm sm:text-base break-words leading-tight text-blue-900">{folder.name}</p>
                    </CardContent>
                </Card>
            )) : (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">No folders created yet.</p>
            )}
        </div>
    </div>
);

type OccupancyData = { totalBeds: number; occupiedBeds: number };

function OccupancyCard({ workspaceId }: { workspaceId?: string }) {
    const [totalBeds, setTotalBeds] = useState<number | ''>('');
    const [occupiedBeds, setOccupiedBeds] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingTotal, setEditingTotal] = useState(false);
    const [careHomePercent, setCareHomePercent] = useState<number | null>(null);

    useEffect(() => {
        if (!workspaceId) return;
        setLoading(true);
        let unsubCareHome: (() => void) | null = null;
        let unsubSettings: (() => void) | null = null;

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
                }
            } catch (e) {
                // ignore - fallback to Firestore listeners
            }
        })();

        // Prefer live care-homes occupancy if available via Firestore (production)
        try {
            const chRef = doc(db, `care-homes`, workspaceId, 'occupancy', 'current');
            unsubCareHome = onSnapshot(chRef, (snap) => {
                if (snap.exists()) {
                    const data = snap.data() as OccupancyData;
                    setTotalBeds(typeof data.totalBeds === 'number' ? data.totalBeds : '');
                    setOccupiedBeds(typeof data.occupiedBeds === 'number' ? data.occupiedBeds : '');
                }
                setLoading(false);
            }, (err) => {
                console.error('care-homes occupancy listener error', err);
                setLoading(false);
            });
        } catch (e) {
            console.warn('Failed to attach care-homes listener, falling back to workspace settings', e);
        }

        // Always listen to workspace settings occupancy as a fallback
        try {
            const ref = doc(db, `workspaces/${workspaceId}/settings`, 'occupancy');
            unsubSettings = onSnapshot(ref, (snap) => {
                if (snap.exists()) {
                    const data = snap.data() as OccupancyData;
                    setTotalBeds(typeof data.totalBeds === 'number' ? data.totalBeds : '');
                    setOccupiedBeds(typeof data.occupiedBeds === 'number' ? data.occupiedBeds : '');
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
            if (unsubCareHome) unsubCareHome();
            if (unsubSettings) unsubSettings();
        };
    }, [workspaceId]);

    const save = async () => {
        setError(null);
        // validation
        const t = typeof totalBeds === 'number' ? totalBeds : parseInt(String(totalBeds || '0'), 10);
        const o = typeof occupiedBeds === 'number' ? occupiedBeds : parseInt(String(occupiedBeds || '0'), 10);
        if (isNaN(t) || isNaN(o) || t < 0 || o < 0) {
            setError('Please enter valid non-negative numbers');
            return;
        }
        if (o > t) {
            setError('Occupied beds cannot exceed total beds');
            return;
        }
        if (!workspaceId) {
            setError('Workspace not available');
            return;
        }
        setSaving(true);
        try {
            const ref = doc(db, `workspaces/${workspaceId}/settings`, 'occupancy');
            await setDoc(ref, { totalBeds: t, occupiedBeds: o }, { merge: true });
            // Also update top-level workspace occupancy (0..1) so admin views can read it directly
            try {
                const wsRef = doc(db, 'workspaces', workspaceId);
                const occupancyValue = t > 0 ? (o / t) : 0;
                await updateDoc(wsRef, { occupancy: occupancyValue });
                // Also update dev in-memory care-homes store via API so /admin/care-homes shows updated values
                try {
                    await fetch(`/api/care-homes/${workspaceId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ occupancy: occupancyValue })
                    });
                    // reflect immediately in local dev indicator
                    setCareHomePercent(occupancyValue);
                } catch (apiErr) {
                    // not critical
                    console.warn('Failed to PATCH dev care-homes API', apiErr);
                }
            } catch (we) {
                // log but don't fail the whole save if workspace doc update fails
                console.error('Failed to update workspace occupancy', we);
            }
        } catch (e) {
            console.error('Failed to save occupancy', e);
            setError('Failed to save occupancy');
        } finally {
            setSaving(false);
        }
    }

    const computedPercent = typeof totalBeds === 'number' && totalBeds > 0 && typeof occupiedBeds === 'number'
        ? Math.round((occupiedBeds / totalBeds) * 100)
        : 0;
    const percent = typeof careHomePercent === 'number' ? Math.round(careHomePercent * 100) : computedPercent;

    const radius = 48;
    const stroke = 12;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <Card className="hover:shadow-lg transition-shadow border border-blue-200 bg-white/80 backdrop-blur-md rounded-xl">
            <CardHeader className="pb-2 border-b border-blue-100 bg-gradient-to-r from-blue-50/60 to-transparent rounded-t-xl">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                        <div>
                            <div className="flex items-baseline gap-2">
                                <CardTitle className="text-sm font-medium text-blue-900">Occupancy</CardTitle>
                                <span className="text-sm text-muted-foreground">{typeof totalBeds === 'number' && totalBeds >= 0 ? `${totalBeds} beds` : '— beds'}</span>
                            </div>
                            <CardDescription className="text-xs text-muted-foreground">Track current occupancy for this workspace.</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingTotal(!editingTotal)} className="text-xs">
                            <Edit3 className="w-4 h-4 mr-1" /> {editingTotal ? 'Done' : 'Edit total'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
                <div className="flex items-center gap-6">
                    <div className="w-36 h-36 flex items-center justify-center relative">
                        <OccupancyPie percent={percent} size={120} strokeWidth={16} />
                    </div>

                    <div className="flex-1">
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground">Occupied beds</label>
                                <input
                                    type="number"
                                    className="w-full border rounded px-2 py-1"
                                    value={occupiedBeds as any}
                                    onChange={e => setOccupiedBeds(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)))}
                                    min={0}
                                />
                            </div>
                            {editingTotal && (
                                <div>
                                    <label className="text-xs text-muted-foreground">Total beds</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded px-2 py-1"
                                        value={totalBeds as any}
                                        onChange={e => setTotalBeds(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)))}
                                        min={0}
                                    />
                                </div>
                            )}
                            {error && <p className="text-xs text-destructive">{error}</p>}
                            <div className="flex items-center gap-2">
                                <Button onClick={save} disabled={saving || loading}>
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                                <span className="text-xs text-muted-foreground">{loading ? 'Loading…' : ''}</span>
                            </div>
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
    workspace: Workspace;
    onSelect: (item: Document | FolderType) => void;
    onDocumentAdd: (document: Document) => void;
    onFolderAdd: (folder: FolderType) => void;
}

export function DashboardHome({ workspace, onSelect, onDocumentAdd, onFolderAdd }: DashboardHomeProps) {
    const isMobile = useIsMobile();
    
    const { documents, folders } = useMemo(() => getAllItems(workspace.folders), [workspace.folders]);
    
    const recentDocuments = useMemo(() => {
        return [...documents] // Create a shallow copy before sorting
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [documents]);

    const quickAccessFolders = useMemo(() => {
        // In a real app, this would be based on usage. For now, just show top-level folders.
        return workspace.folders.filter(item => item.type === 'folder').slice(0, 4) as FolderType[];
    }, [workspace.folders])

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
        if (!workspace?.id) return;
        const ref = doc(db, `workspaces/${workspace.id}/settings`, 'audit_latest_scores');
        const unsub = onSnapshot(ref, (snap) => {
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
        return () => unsub();
    }, [workspace?.id]);

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

    // Function to get gradient colors based on score percentage
    const getGradientColors = (score: number | null) => {
        if (score === null) return { start: '#e5e7eb', end: '#cbd5e1' }; // Gray gradient for N/A
        if (score >= 80) return { start: '#34d399', end: '#059669' }; // Green gradient for high scores
        if (score >= 20) return { start: '#fbbf24', end: '#d97706' }; // Amber gradient for medium scores  
        return { start: '#f87171', end: '#dc2626' }; // Red gradient for low scores
    };

    // Function to get color based on score percentage
    const getScoreColor = (score: number | null) => {
        if (score === null) return '#cbd5e1'; // Gray for N/A
        if (score >= 80) return '#10b981'; // Green for high scores (80%+)
        if (score >= 20) return '#f59e0b'; // Amber for medium scores (20-79%)
        return '#ef4444'; // Red for low scores (0-19%)
    };

    return (
    <div className="flex flex-col h-full min-h-screen bg-background">
            {/* Dark hero header (workspace style) */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-b-lg shadow-sm">
                <div className="w-full mx-auto flex items-start justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/5 rounded-md">
                            <Folder className="w-10 h-10 text-white/90" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold leading-tight">{workspace.name}</h2>
                            <div className="mt-1 text-sm text-slate-200">Welcome back! Here's a summary of your workspace.</div>
                            <div className="mt-3 flex items-center gap-2">
                                <Button size="sm" onClick={() => { /* noop for now */ }}>New folder</Button>
                                <Button size="sm" variant="outline" onClick={() => { /* noop */ }}>Share</Button>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                                <div>
                                    <div className="text-xs text-slate-300">Documents</div>
                                    <div className="text-lg font-semibold">{documents.length}</div>
                                </div>
                            </div>
                            <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                                <div>
                                    <div className="text-xs text-slate-300">Folders</div>
                                    <div className="text-lg font-semibold">{folders.length}</div>
                                </div>
                            </div>
                            <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                                <div className="text-xs text-slate-300">Recent</div>
                                <div className="text-lg font-semibold">{recentDocuments.length}</div>
                            </div>
                            <div className="p-4 bg-white/6 rounded-lg flex items-center gap-4 shadow-md">
                                <div className="flex items-center justify-center w-16 h-16 bg-white/5 rounded-full">
                                    <OccupancyPie
                                        percent={Math.round(((workspace?.settings?.occupancy ?? workspace?.occupancy ?? 0) * 100) || 0)}
                                        size={72}
                                        strokeWidth={10}
                                        centerFill="#ffffff"
                                        centerFontSize={20}
                                        centerClassName="font-bold"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs text-slate-300">Occupancy</div>
                                    {/* numeric percent intentionally removed from right side; primary value is in pie center */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto space-y-6 sm:space-y-8 md:space-y-12">
               <QuickActions 
                   documents={documents} 
                   onSelect={onSelect} 
                   workspaceId={workspace.id} 
                   overallStats={overallStats}
                   getGradientColors={getGradientColors}
                   trends={trends}
               />
               <QuickAccess folders={quickAccessFolders} onSelect={onSelect} />
               
               {/* Recent Activity Section */}
               <div className="w-full">
                   <h2 className="text-lg font-semibold mb-4 text-blue-900 tracking-tight">Recent Activity</h2>
                   <Card className="hover:shadow-lg transition-shadow border border-blue-200 bg-white/80 backdrop-blur-md rounded-xl">
                       <CardHeader className="pb-2 border-b border-blue-100 bg-gradient-to-r from-blue-50/60 to-transparent rounded-t-xl">
                           <CardTitle className="text-sm font-medium flex items-center gap-2">
                               <TrendingUp className="h-4 w-4 text-green-500" />
                               Recent Documents
                           </CardTitle>
                           <CardDescription className="text-xs text-blue-700/70">Latest documents that were uploaded or modified.</CardDescription>
                       </CardHeader>
                       <CardContent className="space-y-2 pt-3">
                           {recentDocuments.length > 0 ? (
                               recentDocuments.map(doc => (
                                   <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer" onClick={() => onSelect(doc)}>
                                       <div className="flex items-center gap-2 min-w-0">
                                           {getFileIcon(doc.fileType)}
                                           <span className="text-sm truncate">{doc.name}</span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                           <Badge variant="outline" className="text-xs">
                                               {new Date(doc.createdAt).toLocaleDateString()}
                                           </Badge>
                                       </div>
                                   </div>
                               ))
                           ) : (
                               <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                           )}
                       </CardContent>
                   </Card>
               </div>
            </main>
        </div>
    );
}

// Care plan stats are now surfaced in the standalone StatsView component.
