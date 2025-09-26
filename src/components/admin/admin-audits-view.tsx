"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tag, FileText, Calendar } from 'lucide-react';
import type { Workspace } from '@/lib/types';

interface AuditsViewProps {
  workspace: Workspace;
  recentUploads: Array<{ name: string; createdAt?: string; id?: string }>;
  aggregateAuditData?: { totalYesCount?: number; totalQuestions?: number; overallPercentage?: number; auditsCompleted?: number; totalAudits?: number } | null;
}

export default function AuditsView({ workspace, recentUploads, aggregateAuditData }: AuditsViewProps) {
  const [snapshots, setSnapshots] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [monthlyCompletionStatus, setMonthlyCompletionStatus] = useState<Record<string, boolean>>({});

  // Minimal mapping for human-readable audit names
  const AUDIT_NAMES: Record<string, string> = {
    'accident-incident': 'Accident & Incident',
    'call-bell-monitoring': 'Call Bell Monitoring',
    'care-plan': 'Care Plan',
    'equipment': 'Equipment',
    'fire-safety': 'Fire Safety',
    'hand-hygiene': 'Hand Hygiene',
    'health-safety': 'Health & Safety',
    'infection-control': 'Infection Control',
    'kitchen': 'Kitchen',
    'maintenance': 'Maintenance',
    'managers-weekly': "Managers' Weekly",
    'managers-monthly': "Managers' Monthly",
    'mealtime': 'Mealtime',
    'night-visit': 'Night Visit',
    'restrictive-practice': 'Restrictive Practice',
    'staff-file': 'Staff File',
    'weight-monitoring': 'Weight Monitoring',
    'wound-monitoring': 'Wound Monitoring',
    'risk-register': 'Risk Register'
  };

  useEffect(() => {
    let mounted = true;
    if (!workspace?.id) return;
    setLoading(true);
    (async () => {
      try {
        const { getMonthlyAuditSnapshots, getMonthlyAuditCompletionStatus } = await import('@/lib/firestore');
        const [snaps, completion] = await Promise.all([
          getMonthlyAuditSnapshots(workspace.id, undefined, (workspace as any).organisationId),
          getMonthlyAuditCompletionStatus(workspace.id, (workspace as any).organisationId)
        ]);
        if (!mounted) return;
        setSnapshots(snaps || {});
        setMonthlyCompletionStatus(completion || {});
      } catch (e) {
        console.error('Failed to load monthly audit snapshots', e);
        if (mounted) {
          setSnapshots({});
          setMonthlyCompletionStatus({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [workspace?.id]);

  const completedEntries = Object.entries(snapshots).filter(([, arr]) => Array.isArray(arr) && arr.length > 0);
  const AUDIT_TYPES = Object.keys(AUDIT_NAMES);

  const formatTime = (snap: any) => {
    const t = snap?.snapshotCreatedAt;
    if (!t) return snap?.createdAt ? String(snap.createdAt) : 'Unknown';
    try {
      if (typeof t.toDate === 'function') return t.toDate().toLocaleString();
      return new Date(t).toLocaleString();
    } catch (e) {
      return String(t);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-0">
          <CardHeader>
            <div className="text-sm font-semibold">Audits Summary</div>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div className="mb-2">Overall Score: {aggregateAuditData?.overallPercentage ?? '—'}%</div>
              <div className="mb-2">Audits Completed: {aggregateAuditData?.auditsCompleted ?? 0}/{aggregateAuditData?.totalAudits ?? 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-0 md:col-span-2">
          <CardHeader>
            <div className="text-sm font-semibold">Recent Audit Uploads</div>
          </CardHeader>
          <CardContent>
            {recentUploads.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent audits</div>
            ) : (
              <ul className="divide-y divide-blue-50">
                {recentUploads.map((r, idx) => (
                  <li key={`${r.name}-${String(r.createdAt)}-${idx}`} className="py-2">
                    <button
                      onClick={() => {
                        try {
                          let documentId = (r as any).id || (r as any).documentId || null;
                          if (!documentId && r && r.name) {
                            // try the same lookup approach used in admin workspace view
                            const targetName = String(r.name).toLowerCase().trim();
                            const findDoc = (items: any[]): string | null => {
                              for (const it of items || []) {
                                if (it.type === 'document') {
                                  const n = String(it.name || '').toLowerCase().trim();
                                  if (n === targetName || n.includes(targetName) || targetName.includes(n)) return it.id;
                                } else if (it.type === 'folder') {
                                  const res = findDoc(it.items || []);
                                  if (res) return res;
                                }
                              }
                              return null;
                            };
                            try {
                              const found = findDoc((workspace as any).folders || []);
                              if (found) documentId = found;
                            } catch (e) {
                              // ignore
                            }
                          }

                          if (documentId && typeof window !== 'undefined' && window.dispatchEvent) {
                            window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: r.name } }));
                            try { localStorage.setItem('lastHighlightedDocumentId', documentId); } catch (e) {}
                            if (r.name) try { localStorage.setItem('lastHighlightedDocumentName', r.name); } catch (e) {}
                          } else {
                            const dl = (r as any).downloadUrl || (r as any).url;
                            if (dl) window.open(dl, '_blank');
                            else console.warn('Could not locate document for recent upload:', r.name);
                          }
                        } catch (e) { console.warn('Recent upload click error', e); }
                      }}
                      className="w-full text-left cursor-pointer hover:underline flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-600" />
                        <div>
                          <div className="text-sm font-medium truncate">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : 'Unknown'}</div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600">Open</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Audits</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground mt-2">Loading audits…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
            {AUDIT_TYPES.map((auditType) => {
              const arr = snapshots[auditType] || [];
              // pick latest snapshot if any
              const latest = (arr || []).slice().sort((a: any, b: any) => {
                const ta = a?.snapshotCreatedAt?.toDate ? a.snapshotCreatedAt.toDate().getTime() : (a?.snapshotCreatedAt ? new Date(a.snapshotCreatedAt).getTime() : 0);
                const tb = b?.snapshotCreatedAt?.toDate ? b.snapshotCreatedAt.toDate().getTime() : (b?.snapshotCreatedAt ? new Date(b.snapshotCreatedAt).getTime() : 0);
                return tb - ta;
              })[0];

              const isCompleted = !!monthlyCompletionStatus[auditType] || (Array.isArray(arr) && arr.length > 0);
              const score = latest?.scorePercent ?? latest?.score ?? null;
              const yes = latest?.yesCount ?? null;
              const total = latest?.totalCount ?? null;

              // Use the same visual style as the main audits page AuditCard (read-only)
              const snapshotCount = Array.isArray(arr) ? arr.length : 0;
              const isUrgent = false;

              return (
                <div key={auditType} className={`group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 min-h-[170px] flex flex-col justify-between`}>
                  {/* Background accents */}
                  <div className="absolute inset-0 opacity-[0.02]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-900 to-transparent rounded-full -translate-y-16 translate-x-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-900 to-transparent rounded-full translate-y-12 -translate-x-12" />
                  </div>

                  {/* Top accent bar */}
                  <div className={`h-1 w-full bg-gradient-to-r ${isCompleted ? 'from-green-500 to-green-600' : 'from-blue-500 to-blue-600'}`} />

                  <div className="p-6 relative z-10 flex-1 flex">
                    <div className="flex items-start gap-4 w-full">
                      <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-100' : 'bg-blue-100'} shadow-sm`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className={`text-lg font-semibold text-gray-900 ${isCompleted ? 'text-green-800' : ''} group-hover:text-gray-800 transition-colors`}>
                            {AUDIT_NAMES[auditType] ?? auditType}
                          </h3>
                          <div className="text-xs text-muted-foreground">{snapshotCount} snapshot{snapshotCount !== 1 ? 's' : ''}</div>
                        </div>
                        <p className={`text-sm text-gray-600 mt-1 ${isCompleted ? 'text-green-700' : ''} group-hover:text-gray-700 transition-colors`}>Latest: {latest ? formatTime(latest) : '—'}</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-100'}`}>
                          {isCompleted ? 'Completed' : 'Incomplete'}
                        </div>

                        {/* View button intentionally removed for admin read-only cards */}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
