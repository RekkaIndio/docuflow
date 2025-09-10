
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Folder, Users, FileText, FileSpreadsheet, FileIcon, FileX2, Briefcase, Clock, User, TrendingUp, TrendingDown, Minus, Archive, Calendar, BarChart3, Edit3, FileCheck, CheckCircle, AlertCircle, ClipboardList } from "lucide-react";
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
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query as fsQuery, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import OccupancyPie from '@/components/admin/occupancy-pie';
import OverviewCards from './overview-cards';
// consolidated imports above
import { Sun, Moon } from "lucide-react";
import DailyCheckinModal from './daily-checkin-modal';
import { openDocument } from '@/lib/document-utils';

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
    <Card className="border border-blue-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-2xl">
        <CardHeader className="pb-3 border-b border-blue-100/80 bg-gradient-to-r from-blue-50/40 to-transparent rounded-t-2xl">
            <CardTitle className="text-base font-semibold text-blue-900 tracking-tight animate-in slide-in-from-left-2 duration-300">Recent Files</CardTitle>
            <CardDescription className="text-xs text-blue-700/70 font-medium">The last 5 documents that were uploaded or modified</CardDescription>
        </CardHeader>
    <CardContent className="pt-4">
            {/* Mobile-friendly card layout */}
            <div className="block sm:hidden space-y-4">
                {documents.length > 0 ? documents.map(doc => (
                    <Card key={doc.id} className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer border border-blue-100/60 hover:border-blue-200 bg-white/60 hover:bg-white/80 rounded-xl" onClick={() => onSelect(doc)}>
                        <div className="flex flex-col space-y-3">
                            <div className="flex items-center gap-4 min-w-0">
                                {getFileIcon(doc.fileType)}
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm leading-tight break-words text-gray-900">{doc.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                                <span className="truncate flex-1 mr-2 font-medium">{doc.owner.name}</span>
                                <span className="flex-shrink-0 bg-gray-100 px-2 py-1 rounded-full font-medium">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </Card>
                )) : (
                    <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 font-medium">No documents uploaded yet</p>
                        <p className="text-xs text-gray-500 mt-1">Upload your first document to get started</p>
                    </div>
                )}
            </div>
            {/* Desktop table layout */}
            <div className="hidden sm:block">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-gray-100">
                            <TableHead className="font-semibold text-gray-700">Name</TableHead>
                            <TableHead className="font-semibold text-gray-700">Owner</TableHead>
                            <TableHead className="font-semibold text-gray-700">Last Modified</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.length > 0 ? documents.map(doc => (
                             <TableRow key={doc.id} className="cursor-pointer hover:bg-blue-50/30 transition-colors duration-200 border-b border-gray-50" onClick={() => onSelect(doc)}>
                                <TableCell className="font-medium text-gray-900">
                                    <div className="flex items-center gap-3">
                                        {getFileIcon(doc.fileType)}
                                        <span className="truncate">{doc.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                         <Avatar className="h-6 w-6">
                                            <AvatarImage src={doc.owner.avatarUrl ?? undefined} alt={doc.owner.name ?? undefined} />
                                            <AvatarFallback className="text-xs font-medium bg-blue-100 text-blue-700">{doc.owner.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-gray-700 font-medium">{doc.owner.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-600 font-medium">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                               <TableCell colSpan={3} className="text-center text-gray-600 py-8">
                                 <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                 <p className="font-medium">No documents uploaded yet</p>
                               </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
);

const QuickActions = ({ documents, onSelect, workspaceId, overallStats, getGradientColors, trends, dailyEntry, onDailyEntryUpdate, carePlanScore, hsScore, maintenanceScore, restrictiveScore, fireScore, infectionScore, mealtimeScore, nightScore, staffFileScore, kitchenScore, handleAuditCardClick }: { 
    documents: Document[], 
    onSelect: (doc: Document) => void, 
    workspaceId?: string,
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

    handleAuditCardClick: (auditKey: string) => void
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

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                {/* Daily Check-in */}
                <Card className="group hover:shadow-xl transition-all duration-300 border border-blue-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-blue-100/50">
                    <CardHeader className="pb-3 border-b border-blue-100/80 bg-gradient-to-r from-blue-50/40 to-transparent rounded-t-2xl">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            Daily Check-in
                        </CardTitle>
                        <CardDescription className="text-xs text-blue-700/70 font-medium">Record occupancy, staffing, and other daily metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="text-sm text-gray-600 leading-relaxed">
                            Quick daily metrics recording for your workspace
                        </div>
                        <DailyCheckinModal 
                            workspaceId={workspaceId || ''} 
                            onEntryUpdate={onDailyEntryUpdate}
                            trigger={
                                <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    {dailyEntry ? 'Update Check-in' : 'Start Check-in'}
                                </Button>
                            }
                        />
                    </CardContent>
                </Card>
                
                {/* Occupancy Card */}
                <OccupancyCard workspaceId={workspaceId} dailyEntry={dailyEntry} />
                
                {/* Staffing Card */}
                <StaffingCard workspaceId={workspaceId} dailyEntry={dailyEntry} />
                
                {/* Overall Score Card */}
                <Card className="group hover:shadow-xl transition-all duration-300 border border-blue-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-blue-100/50">
                    <CardHeader className="pb-3 border-b border-blue-100/80 bg-gradient-to-r from-blue-50/40 to-transparent rounded-t-2xl">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            Overall Audit Score
                        </CardTitle>
                    <CardDescription className="text-xs text-blue-700/70 font-medium">Audit score for all categories</CardDescription>

                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="flex items-center gap-6">
                            <div className="w-32 h-32 flex items-center justify-center relative">
                                <OccupancyPie 
                                    percent={overallStats.overallPercentage ?? 0} 
                                    size={112} 
                                    strokeWidth={14} 
                                    gradientColors={getGradientColors(overallStats.overallPercentage)}
                                    centerFontSize={28}
                                    centerClassName="font-bold"
                                />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-gray-900">
                                        {overallStats.overallPercentage !== null ? `${overallStats.overallPercentage}%` : 'N/A'}
                                    </div>
                                    {overallStats.overallPercentage !== null && (
                                        <div className="flex items-center">
                                            {overallStats.overallPercentage >= 80 ? 
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> :
                                            overallStats.overallPercentage >= 60 ? 
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div> :
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                            }
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm text-gray-600">
                                        {overallStats.totalYesCount} of {overallStats.totalQuestions} passed
                                    </div>
                                    {overallStats.totalQuestions > 0 && (
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                                style={{ width: `${(overallStats.totalYesCount / overallStats.totalQuestions) * 100}%` }}
                                            ></div>
                                        </div>
                                    )}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {overallStats.auditsCompleted}/{overallStats.totalAudits} audits completed
                                </div>
                                {overallStats.overallPercentage !== null && (
                                    <div className="mt-3">
                                        <TrendIndicator auditType="overall" trends={trends} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Compliance Status Grid */}
            <div className="mt-8">
                <h2 className="text-xl font-bold mb-6 text-gray-900 tracking-tight animate-in slide-in-from-left-4 duration-300">Compliance Overview</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
                    {(() => {
                        // Complete audit list matching audits page and firestore function
                        const allAudits = [
                            { key: 'accident-incident', name: 'Accident & Incident', score: null, icon: '�' },
                            { key: 'call-bell-monitoring', name: 'Call Bell Monitoring', score: null, icon: '�' },
                            { key: 'care-plan', name: 'Care Plan', score: carePlanScore, icon: '�' },
                            { key: 'equipment', name: 'Equipment', score: null, icon: '⚙️' },
                            { key: 'fire-safety', name: 'Fire Safety', score: fireScore, icon: '🔥' },
                            { key: 'hand-hygiene', name: 'Hand Hygiene', score: null, icon: '🧼' },
                            { key: 'health-safety', name: 'Health & Safety', score: hsScore, icon: '⚕️' },
                            { key: 'infection-control', name: 'Infection Control', score: infectionScore, icon: '🦠' },
                            { key: 'kitchen', name: 'Kitchen', score: kitchenScore, icon: '👨‍🍳' },
                            { key: 'maintenance', name: 'Maintenance', score: maintenanceScore, icon: '🔧' },
                            { key: 'managers-weekly', name: 'Managers Weekly', score: null, icon: '📊' },
                            { key: 'mealtime', name: 'Mealtime', score: mealtimeScore, icon: '🍽️' },
                            { key: 'night-visit', name: 'Night Visit', score: nightScore, icon: '🌙' },
                            { key: 'restrictive-practice', name: 'Restrictive Practice', score: restrictiveScore, icon: '🔒' },
                            { key: 'staff-file', name: 'Staff File', score: staffFileScore, icon: '📁' },
                            { key: 'weight-monitoring', name: 'Weight Monitoring', score: null, icon: '⚖️' },
                            { key: 'wound-monitoring', name: 'Wound Monitoring', score: null, icon: '🩹' },
                            { key: 'risk-register', name: 'Risk Register', score: null, icon: '📊' }
                        ];

                        // Filter to show only pending audits (those without scores or with scores < 100%)
                        const pendingAudits = allAudits.filter(audit => 
                            audit.score === null || audit.score < 100
                        );

                        return pendingAudits.map(audit => {
                        // All pending audits are shown with pending status
                        const statusColor = 'bg-gray-100 border-gray-300 text-gray-600';
                        
                        return (
                            <div 
                                key={audit.key} 
                                className={`p-3 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer hover:scale-105 transform ${statusColor}`}
                                onClick={() => handleAuditCardClick(audit.key)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleAuditCardClick(audit.key);
                                    }
                                }}
                                title={`Complete ${audit.name} audit`}
                            >
                                <div className="text-center">
                                    <div className="text-2xl mb-1">{audit.icon}</div>
                                    <div className="text-xs font-semibold truncate">{audit.name}</div>
                                    <div className="text-sm font-bold mt-1">
                                        Pending
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 opacity-75">
                                        Click to Complete
                                    </div>
                                </div>
                            </div>
                        );
                        });
                    })()}
                </div>
                
                {/* Completed Audits Summary */}
                {(() => {
                    // Complete audit list matching audits page and firestore function
                    const allAudits = [
                        { key: 'accident-incident', name: 'Accident & Incident', score: null, icon: '�' },
                        { key: 'call-bell-monitoring', name: 'Call Bell Monitoring', score: null, icon: '�' },
                        { key: 'care-plan', name: 'Care Plan', score: carePlanScore, icon: '�' },
                        { key: 'equipment', name: 'Equipment', score: null, icon: '⚙️' },
                        { key: 'fire-safety', name: 'Fire Safety', score: fireScore, icon: '🔥' },
                        { key: 'hand-hygiene', name: 'Hand Hygiene', score: null, icon: '🧼' },
                        { key: 'health-safety', name: 'Health & Safety', score: hsScore, icon: '⚕️' },
                        { key: 'infection-control', name: 'Infection Control', score: infectionScore, icon: '🦠' },
                        { key: 'kitchen', name: 'Kitchen', score: kitchenScore, icon: '👨‍🍳' },
                        { key: 'maintenance', name: 'Maintenance', score: maintenanceScore, icon: '🔧' },
                        { key: 'managers-weekly', name: 'Managers Weekly', score: null, icon: '📊' },
                        { key: 'mealtime', name: 'Mealtime', score: mealtimeScore, icon: '🍽️' },
                        { key: 'night-visit', name: 'Night Visit', score: nightScore, icon: '🌙' },
                        { key: 'restrictive-practice', name: 'Restrictive Practice', score: restrictiveScore, icon: '🔒' },
                        { key: 'staff-file', name: 'Staff File', score: staffFileScore, icon: '📁' },
                        { key: 'weight-monitoring', name: 'Weight Monitoring', score: null, icon: '⚖️' },
                        { key: 'wound-monitoring', name: 'Wound Monitoring', score: null, icon: '🩹' },
                        { key: 'risk-register', name: 'Risk Register', score: null, icon: '�' }
                    ];

                    // Show completed audits (those with scores >= 100%)
                    const completedAudits = allAudits.filter(audit => 
                        audit.score !== null && audit.score >= 100
                    );

                    if (completedAudits.length > 0) {
                        return (
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">Completed This Month</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {completedAudits.map(audit => (
                                        <div key={audit.key} className="p-3 rounded-xl border bg-green-50 border-green-200 text-green-800">
                                            <div className="text-center">
                                                <div className="text-2xl mb-1">{audit.icon}</div>
                                                <div className="text-xs font-semibold truncate">{audit.name}</div>
                                                <div className="text-sm font-bold mt-1">
                                                    {audit.score !== null ? `${audit.score}%` : 'Complete'} ✓
                                                </div>
                                                <div className="text-xs text-green-600 mt-1 opacity-75">
                                                    Completed
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}
            </div>
            
            {/* Audits and Action Plans Section */}
            <div className="mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 max-w-6xl">
                    {/* Audits Card */}
                    <Card className="group hover:shadow-xl transition-all duration-300 border border-blue-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-blue-100/50">
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
                                        <div className="space-y-3 max-h-40 overflow-y-auto">
                                            {incompleteAudits.slice(0, 4).map(audit => (
                                                <div key={audit.key} className="flex items-center justify-between p-3 bg-red-50/60 rounded-xl border border-red-200/40 hover:bg-red-50/80 transition-colors duration-200">
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
                    <ActionPlansCard workspaceId={workspaceId} documents={documents} onSelect={onSelect} />
                </div>
            </div>
        </div>
    );
};

const QuickAccess = ({ folders, onSelect }: { folders: FolderType[], onSelect: (item: FolderType) => void }) => (
    <div className="w-full">
        <h2 className="text-xl font-bold mb-6 text-gray-900 tracking-tight animate-in slide-in-from-left-4 duration-300">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.length > 0 ? folders.map(folder => (
             <Card key={folder.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer border border-yellow-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-yellow-100/50" onClick={() => onSelect(folder)}>
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 sm:px-6 border-b border-yellow-100/80 bg-gradient-to-r from-yellow-50/40 to-transparent rounded-t-2xl">
                    <Folder className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500 font-medium bg-yellow-100/60 px-2 py-1 rounded-full">{folder.items.length} items</span>
                </CardHeader>
                    <CardContent className="px-5 sm:px-6 pt-4">
                        <p className="font-semibold text-sm sm:text-base break-words leading-tight text-gray-900 group-hover:text-yellow-700 transition-colors duration-200">{folder.name}</p>
                    </CardContent>
                </Card>
            )) : (
                <div className="col-span-full text-center py-8">
                    <Folder className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 font-medium">No folders created yet</p>
                    <p className="text-xs text-gray-500 mt-1">Create your first folder to get started</p>
                </div>
            )}
        </div>
    </div>
);

type OccupancyData = { totalBeds: number; occupiedBeds: number };

function OccupancyCard({ workspaceId, dailyEntry }: { workspaceId?: string, dailyEntry?: any }) {
    const [totalBeds, setTotalBeds] = useState<number | null>(null);
    const [occupiedBeds, setOccupiedBeds] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
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
                    setTotalBeds(typeof data.totalBeds === 'number' ? data.totalBeds : null);
                    setOccupiedBeds(typeof data.occupiedBeds === 'number' ? data.occupiedBeds : null);
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
            if (unsubCareHome) unsubCareHome();
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

    return (
        <Card className="group hover:shadow-xl transition-all duration-300 border border-indigo-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-indigo-100/50">
            <CardHeader className="pb-3 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/40 to-transparent rounded-t-2xl">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-indigo-500" />
                        <div>
                            <div className="flex items-baseline gap-3">
                                <CardTitle className="text-sm font-semibold text-gray-900">Occupancy</CardTitle>
                                <span className="text-sm text-gray-600 font-medium">{typeof totalBeds === 'number' && totalBeds >= 0 ? `${totalBeds} beds` : '— beds'}</span>
                            </div>
                            <CardDescription className="text-xs text-gray-600 font-medium mt-1">Track current occupancy for this workspace</CardDescription>
                        </div>
                    </div>
                    <div />
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="flex items-center gap-8">
                        <div className="w-32 h-32 flex items-center justify-center relative">
                            <OccupancyPie percent={percent} size={112} strokeWidth={14} gradientColors={gradientColors} centerFontSize={28} />
                        </div>

                    <div className="flex-1">
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-600 font-medium uppercase tracking-wide">Occupied beds</label>
                                <div className="text-xl font-bold mt-1 text-gray-900">{displayOccupied !== null ? displayOccupied : '—'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 font-medium uppercase tracking-wide">Total beds</label>
                                <div className="text-xl font-bold mt-1 text-gray-900">{displayTotal !== null ? displayTotal : (totalBeds !== null ? totalBeds : '—')}</div>
                            </div>
                            <div className="text-sm text-gray-500">{loading ? 'Loading…' : ''}</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


// Use shared OccupancyPie for staffing visual

function ActionPlansCard({ workspaceId, documents, onSelect }: { 
    workspaceId?: string, 
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

        // Listen to audits collection to find action plans
        try {
            const auditsRef = collection(db, 'audits');
            // Simplified query to avoid composite index requirement
            const q = fsQuery(auditsRef, 
                where('workspaceId', '==', workspaceId),
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
                    .filter((plan: any) => plan.createActionPlan === true)
                    .slice(0, 5);
                setActionPlans(plans);
                setLoading(false);
            }, (err) => {
                console.error('Failed to listen to action plans', err);
                setLoading(false);
                setActionPlans([]);
            });
            
            return () => unsub();
        } catch (e) {
            console.error('Failed to set up action plans listener', e);
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

function StaffingCard({ workspaceId, dailyEntry }: { workspaceId?: string, dailyEntry?: any }) {
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
            const colRef = collection(db, `workspaces/${workspaceId}/daily-checkins`);
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
            const colRef = collection(db, `workspaces/${workspaceId}/daily-checkins`);
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
        <Card className="group hover:shadow-xl transition-all duration-300 border border-blue-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-blue-100/50">
            <CardHeader className="pb-3 border-b border-blue-100/80 bg-gradient-to-r from-blue-50/40 to-blue-100/30 rounded-t-2xl">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-blue-500" />
                        <div>
                            <CardTitle className="text-sm font-semibold text-gray-900">Staffing</CardTitle>
                            <CardDescription className="text-xs text-gray-600 font-medium">Latest staffing levels from check-ins</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-xs hover:bg-blue-50 transition-colors duration-200" onClick={() => setEditing(e => !e)} disabled={saving || loading}>
                            <Edit3 className="w-4 h-4 mr-1" /> {editing ? 'Cancel' : 'Edit'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {loading ? (
                    <div className="text-sm text-gray-600">Loading...</div>
                ) : (
                    <div className="flex items-center gap-8">
                        <div className="w-32 h-32 flex items-center justify-center relative">
                            <style>{`.staffing-hide-pie-text text { display: none !important; }`}</style>
                            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-white drop-shadow" style={{marginTop: '-2px'}}>{totalStaff}</span>
                            </div>
                            <div className="staffing-hide-pie-text">
                                <OccupancyPie
                                    percent={percent}
                                    size={112}
                                    strokeWidth={16}
                                    gradientColors={gradientColors}
                                    centerClassName=""
                                    centerFill="#fff"
                                    centerFontSize={36}
                                />
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col items-center p-3 bg-yellow-50/60 rounded-xl border border-yellow-200/40">
                                    <Sun className="h-6 w-6 text-yellow-500 mb-2" />
                                    {editing ? (
                                        <input
                                            type="number"
                                            className="w-16 border border-yellow-300 rounded-lg px-2 py-1 text-center text-lg font-bold text-yellow-700 bg-white"
                                            value={dayInput}
                                            onChange={e => setDayInput(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)).toString())}
                                            min={0}
                                            disabled={saving}
                                        />
                                    ) : (
                                        <span className="text-xl font-bold text-yellow-700">{staffingData?.day ?? '0'}</span>
                                    )}
                                    <span className="text-xs text-gray-600 font-medium">Day Shift</span>
                                </div>
                                <div className="flex flex-col items-center p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/40">
                                    <Moon className="h-6 w-6 text-indigo-500 mb-2" />
                                    {editing ? (
                                        <input
                                            type="number"
                                            className="w-16 border border-indigo-300 rounded-lg px-2 py-1 text-center text-lg font-bold text-indigo-700 bg-white"
                                            value={nightInput}
                                            onChange={e => setNightInput(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)).toString())}
                                            min={0}
                                            disabled={saving}
                                        />
                                    ) : (
                                        <span className="text-xl font-bold text-indigo-700">{staffingData?.night ?? '0'}</span>
                                    )}
                                    <span className="text-xs text-gray-600 font-medium">Night Shift</span>
                                </div>
                            </div>
                            {error && <div className="text-xs text-red-600 text-center mt-2 font-medium">{error}</div>}
                            {editing ? (
                                <div className="flex items-center gap-3 justify-center mt-3">
                                    <Button onClick={handleSave} disabled={saving || loading} className="bg-blue-500 hover:bg-blue-600 transition-colors duration-200">
                                        {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            ) : (
                                staffingData?.lastUpdated && (
                                    <div className="text-xs text-blue-600 text-center mt-3 font-medium">
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

    // Latest daily checkin entry for the workspace (used to feed Occupancy/Staffing cards)
    const [dailyEntry, setDailyEntry] = useState<any | null>(null);

    useEffect(() => {
        if (!workspace?.id) return;
        try {
            const colRef = collection(db, `workspaces/${workspace.id}/daily-checkins`);
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

    // Function to navigate to audit forms
    const handleAuditCardClick = (auditKey: string) => {
        // Always navigate to audit form
        navigateToAuditForm(auditKey);
    };

    // Function to navigate to audit forms by triggering view change to audits
    const navigateToAuditForm = (auditKey: string) => {
        // Use the same navigation pattern as the sidebar - trigger a view change event
        if (typeof window !== 'undefined') {
            // Store the specific audit type in localStorage so the audits page can open it
            localStorage.setItem('openAuditType', auditKey);
            // Dispatch event to change view to audits
            window.dispatchEvent(new CustomEvent('navigate-to-audits', { 
                detail: { auditType: auditKey } 
            }));
        }
    };





    return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
            {/* Refined hero header with improved spacing and typography */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
                </div>
                <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
                    <div className="flex items-start gap-6">
                        <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                            <Folder className="w-12 h-12 text-white" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold leading-tight tracking-tight">{workspace.name}</h1>
                            <p className="text-slate-200 text-base leading-relaxed">Welcome back! Here's a summary of your workspace activity.</p>
                            <div className="mt-4 flex items-center gap-3">
                                <Button size="sm" className="bg-white/10 hover:bg-white/20 border-white/20 backdrop-blur-sm transition-all duration-200" onClick={() => { /* noop for now */ }}>
                                    <Folder className="w-4 h-4 mr-2" />
                                    New folder
                                </Button>
                                <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200" onClick={() => { /* noop */ }}>
                                    Share workspace
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="hidden xl:flex items-center gap-6">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <FileText className="w-5 h-5 text-blue-300" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Documents</div>
                                        <div className="text-2xl font-bold text-white">{documents.length}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-green-500/20 rounded-lg">
                                        <Folder className="w-5 h-5 text-green-300" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Folders</div>
                                        <div className="text-2xl font-bold text-white">{folders.length}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                        <Clock className="w-5 h-5 text-purple-300" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Recent</div>
                                        <div className="text-2xl font-bold text-white">{recentDocuments.length}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-16 h-16 bg-white/10 rounded-full border border-white/20">
                                        <OccupancyPie
                                            percent={Math.round(((workspace?.settings?.occupancy ?? workspace?.occupancy ?? 0) * 100) || 0)}
                                            size={64}
                                            strokeWidth={8}
                                            centerFill="#ffffff"
                                            centerFontSize={18}
                                            centerClassName="font-bold text-slate-800"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Occupancy</div>
                                        <div className="text-sm text-slate-200 mt-1">Current status</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6 sm:space-y-8 md:space-y-12 animate-in fade-in-0 duration-500">
               <QuickActions 
                   documents={documents} 
                   onSelect={onSelect} 
                   workspaceId={workspace.id} 
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
               />


               {/* Recent Activity Timeline */}
               <div>
                   <h2 className="text-xl font-bold mb-6 text-gray-900 tracking-tight animate-in slide-in-from-left-4 duration-300">Recent Activity</h2>
                   <Card className="border border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-2xl mb-8">
                       <CardContent className="p-6">
                           <div className="space-y-4">
                               {recentDocuments.slice(0, 3).map((doc: Document) => (
                                   <div key={doc.id} className="flex items-center gap-4 p-3 hover:bg-slate-50/60 rounded-xl transition-colors duration-200 cursor-pointer" onClick={() => onSelect(doc)}>
                                       <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                       <div className="flex items-center gap-3 flex-1 min-w-0">
                                           {getFileIcon(doc.fileType)}
                                           <div className="min-w-0 flex-1">
                                               <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
                                               <div className="text-xs text-gray-500">
                                                   Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                                               </div>
                                           </div>
                                       </div>
                                       <Badge variant="secondary" className="text-xs">{doc.fileType?.toUpperCase()}</Badge>
                                   </div>
                               ))}
                               {overallStats.auditsCompleted > 0 && (
                                   <div className="flex items-center gap-4 p-3 hover:bg-green-50/60 rounded-xl transition-colors duration-200">
                                       <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                       <div className="flex items-center gap-3 flex-1">
                                           <CheckCircle className="h-5 w-5 text-green-600" />
                                           <div>
                                               <div className="text-sm font-medium text-gray-900">
                                                   {overallStats.auditsCompleted} audit{overallStats.auditsCompleted > 1 ? 's' : ''} completed
                                               </div>
                                               <div className="text-xs text-gray-500">Overall score: {overallStats.overallPercentage}%</div>
                                           </div>
                                       </div>
                                       <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">AUDIT</Badge>
                                   </div>
                               )}
                               {recentDocuments.length === 0 && overallStats.auditsCompleted === 0 && (
                                   <div className="text-center py-6 text-gray-500">
                                       <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                       <p className="text-sm font-medium">No recent activity</p>
                                       <p className="text-xs">Start by uploading a document or completing an audit</p>
                                   </div>
                               )}
                           </div>
                       </CardContent>
                   </Card>
               </div>

               <RecentFilesTable documents={recentDocuments} onSelect={onSelect} />
               <QuickAccess folders={quickAccessFolders} onSelect={onSelect} />
            </main>
        </div>
    );
}

// Care plan stats are now surfaced in the standalone StatsView component.
