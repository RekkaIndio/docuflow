"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { DocumentView } from '@/components/dashboard/document-view';
import type { Document } from '@/lib/types';

type PolicyItem = {
  file: string;
  url: string;
  title?: string | null;
  version?: string | null;
  effectiveDate?: string | null;
  reviewDate?: string | null;
  appliesTo?: string | null;
  isCompleted?: boolean;
  lastCustomized?: string | null;
};

function formatDateSafe(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString();
}

function getReviewStatus(reviewDate?: string | null) {
  if (!reviewDate) return { label: 'No review date', kind: 'neutral' };
  const now = new Date();
  const rev = new Date(reviewDate);
  if (isNaN(rev.getTime())) return { label: 'Invalid date', kind: 'neutral' };
  const diffMs = rev.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'Overdue', kind: 'overdue' };
  if (diffDays <= 60) return { label: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`, kind: 'due-soon' };
  if (diffDays <= 180) return { label: 'Up to date', kind: 'ok' };
  return { label: 'Review due later', kind: 'neutral' };
}

// Try to extract a year from a variety of date string formats
function parseYearFromDateString(s?: string | null): number | null {
  if (!s) return null;
  // Try native Date parse first
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.getFullYear();

  // Try ISO-ish formats or YYYY-MM-DD
  const isoMatch = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) return parseInt(isoMatch[1], 10);

  // Try DD/MM/YYYY or D/M/YYYY
  const dmY = s.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (dmY) return parseInt(dmY[3], 10);

  // Fallback: extract any 4-digit year
  const anyYear = s.match(/(20\d{2}|19\d{2})/);
  if (anyYear) return parseInt(anyYear[1], 10);
  return null;
}

export default function AdminPoliciesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<PolicyItem[] | string[] | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewLoading, setViewLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'tracker'>('list');

  // Tracker state (persisted to localStorage)
  const [trackerState, setTrackerState] = useState<Record<string, Record<string, boolean>>>({});
  const TRACKER_STORAGE_KEY = 'docuflow.admin.policies.tracker.v1';

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(TRACKER_STORAGE_KEY) : null;
      if (raw) setTrackerState(JSON.parse(raw));
    } catch (e) {}
  }, []);

  const saveTrackerState = (next: Record<string, Record<string, boolean>>) => {
    setTrackerState(next);
    try { if (typeof window !== 'undefined') window.localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
  };

  const toggleTracker = (policyFile: string, monthKey: string) => {
    const cur = trackerState[policyFile] || {};
    const nextForPolicy = { ...cur, [monthKey]: !cur[monthKey] };
    saveTrackerState({ ...trackerState, [policyFile]: nextForPolicy });
  };

  const getFileTypeFromName = (name: string) => {
    const ext = (name || '').split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'csv') return 'csv';
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
    if (ext === 'docx' || ext === 'doc') return 'docx';
    if (ext === 'txt') return 'txt';
    return 'pdf';
  };

  // Preload policy content and open DocumentView
  const preloadAndOpenPolicy = async (item: any) => {
    const title = item.title || item.fileName || item.file;
    const fileName = item.fileName || (typeof item.raw === 'string' ? item.raw : item.file);
    setViewLoading(fileName);

    // try to pick up any public URL or raw url from the published item so DocumentView can preview
    const possibleDownloadUrl = (item && typeof item === 'object' && (item.url || item.downloadUrl || item.raw && typeof item.raw !== 'string' && (item.raw.url || item.raw.pdfPath))) || undefined;
    const fallbackDoc: Document = {
      id: fileName,
      name: title,
      type: 'document',
      fileType: getFileTypeFromName(fileName) as any,
      createdAt: item.effectiveDate || new Date().toISOString(),
      owner: user || { id: 'system', name: null, email: null, avatarUrl: null },
      extractedJson: { content: `Policy: ${title}. Content not available.`, title, type: 'policy' },
      folderId: 'policies',
      summary: `Policy document: ${title}`,
      downloadUrl: possibleDownloadUrl
    };

    try {
      const resp = await fetch('/api/policies/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: title }) });
      if (resp.ok) {
        const data = await resp.json();
        if (data.results && data.results.length > 0) {
          const policyData = data.results[0];
          // prefer pdfPath if present
          if (!policyData.downloadUrl && policyData.pdfPath) policyData.downloadUrl = policyData.pdfPath;
          const possibleDownloadUrl2 = (item && typeof item === 'object' && (item.url || item.downloadUrl || item.raw && typeof item.raw !== 'string' && (item.raw.url || item.raw.pdfPath))) || undefined;
          const documentData: Document = {
            id: policyData.id || fileName,
            name: policyData.name || title,
            type: 'document',
            fileType: getFileTypeFromName(fileName) as any,
            createdAt: policyData.createdAt || new Date().toISOString(),
            owner: user || { id: 'system', name: null, email: null, avatarUrl: null },
            extractedJson: policyData.extractedJson || fallbackDoc.extractedJson,
            folderId: 'policies',
            summary: policyData.summary || fallbackDoc.summary,
            storagePath: policyData.storagePath || undefined,
            downloadUrl: policyData.downloadUrl || policyData.url || possibleDownloadUrl2 || undefined,
            tags: policyData.tags || ['policy'],
            renewalDate: policyData.renewalDate || item.reviewDate || undefined
          };

          setSelectedDocument(documentData);
          try { window.dispatchEvent(new CustomEvent('set-active-document', { detail: { documentId: documentData.id, documentName: documentData.name, documentData } })); } catch (e) {}
          try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { policyFile: fileName, documentName: title } })); } catch (e) {}
          setViewLoading(null);
          return;
        }
      }

      // If nothing found by title, try searching by filename (common for published items)
      const resp2 = await fetch('/api/policies/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: fileName }) });
      if (resp2.ok) {
        const data2 = await resp2.json();
        if (data2.results && data2.results.length > 0) {
          const policyData = data2.results[0];
          if (!policyData.downloadUrl && policyData.pdfPath) policyData.downloadUrl = policyData.pdfPath;
          const documentData: Document = {
            id: policyData.id || fileName,
            name: policyData.name || title,
            type: 'document',
            fileType: getFileTypeFromName(fileName) as any,
            createdAt: policyData.createdAt || new Date().toISOString(),
            owner: user || { id: 'system', name: null, email: null, avatarUrl: null },
            extractedJson: policyData.extractedJson || fallbackDoc.extractedJson,
            folderId: 'policies',
            summary: policyData.summary || fallbackDoc.summary,
            storagePath: policyData.storagePath || undefined,
            downloadUrl: policyData.downloadUrl || policyData.url || possibleDownloadUrl || undefined,
            tags: policyData.tags || ['policy'],
            renewalDate: policyData.renewalDate || item.reviewDate || undefined
          };

          setSelectedDocument(documentData);
          try { window.dispatchEvent(new CustomEvent('set-active-document', { detail: { documentId: documentData.id, documentName: documentData.name, documentData } })); } catch (e) {}
          try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { policyFile: fileName, documentName: title } })); } catch (e) {}
          setViewLoading(null);
          return;
        }
      }
    } catch (err) {
      console.warn('Policy preload failed', err);
    }

    setSelectedDocument(fallbackDoc);
    try { window.dispatchEvent(new CustomEvent('set-active-document', { detail: { documentId: fallbackDoc.id, documentName: fallbackDoc.name, documentData: fallbackDoc } })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { policyFile: fileName, documentName: title } })); } catch (e) {}
    setViewLoading(null);
  };

  // When a year cell is clicked: if completed -> open DocumentView, else -> go to editor
  const onYearCellClick = (item: any, yearKey: string) => {
    const isCompleted = !(typeof item.raw === 'string') && (!!item.raw.isCompleted || item.raw.status === 'completed');
    if (isCompleted) {
      // open DocumentView for this policy
      preloadAndOpenPolicy(item);
    } else {
      // navigate to editor
      const fileName = item.fileName || (typeof item.raw === 'string' ? item.raw : item.file);
      router.push(`/admin/policies/${encodeURIComponent(fileName.replace(/\.pdf$/i, ''))}/edit`);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [localRes, firebaseRes] = await Promise.all([fetch('/api/policies'), fetch('/api/policies/firebase')]);
        const localData = localRes.ok ? await localRes.json() : { files: [] };
        const firebaseData = firebaseRes.ok ? await firebaseRes.json() : { drafts: [], published: [] };
        if (!mounted) return;
        const localFiles = localData && typeof localData === 'object' && 'files' in localData ? (localData.files as any[]) : (localData as any[]);
        const published = (firebaseData.published || []) as any[];
        const publishedFiles = published.map(p => ({ file: p.pdfPath ? p.pdfPath.split('/').pop() : `${p.policyName}.pdf`, url: p.pdfPath || `/policies/${encodeURIComponent(p.policyName)}.pdf`, title: p.meta?.title || p.policyName.replace(/[-_]/g, ' '), version: p.meta?.version || p.version || null, effectiveDate: p.meta?.effectiveDate || null, reviewDate: p.meta?.reviewDate || null, appliesTo: p.meta?.appliesTo || null, isCompleted: true, lastCustomized: p.updatedAt || p.createdAt || null }));
        const combinedMap = new Map<string, any>();
        (Array.isArray(localFiles) ? localFiles : []).forEach((f: any) => { const key = typeof f === 'string' ? f : f.file; combinedMap.set(key, f); });
        publishedFiles.forEach((pf) => combinedMap.set(pf.file, pf));
        const combined = Array.from(combinedMap.values());
        setFiles(combined || []);
      } catch (err) {
        console.error('Error fetching policies', err);
        if (mounted) setFiles([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // handle open-specific-policy from chat
  useEffect(() => {
    const handleOpenSpecificPolicy = (event: CustomEvent) => {
      const { policyName } = event.detail;
      if (!policyName || !sortedItems.length) return;
      const matchingPolicy = sortedItems.find(item => item.title.toLowerCase().includes(policyName.toLowerCase()) || item.fileName.toLowerCase().includes(policyName.toLowerCase()));
      if (matchingPolicy) router.push(`/admin/policies/${encodeURIComponent(matchingPolicy.fileName.replace(/\.pdf$/i, ''))}/edit`);
    };
    if (typeof window !== 'undefined') { window.addEventListener('open-specific-policy', handleOpenSpecificPolicy as EventListener); return () => window.removeEventListener('open-specific-policy', handleOpenSpecificPolicy as EventListener); }
  }, [router]);

  const sortedItems = useMemo(() => {
    if (!files || files.length === 0) return [];
    const items = (files as any[]).map((f) => {
      const isString = typeof f === 'string';
      const fileName = isString ? f : f.file;
      const title = isString ? fileName.replace(/[-_]/g, ' ').replace('.pdf', '') : (f.title || fileName.replace(/[-_]/g, ' ').replace('.pdf', ''));
      const version = isString ? null : f.version;
      const effectiveDate = isString ? null : f.effectiveDate;
      const reviewDate = isString ? null : f.reviewDate;
      const appliesTo = isString ? null : (f.appliesTo || null);
      const review = getReviewStatus(reviewDate);
      const ts = reviewDate ? (new Date(reviewDate)).getTime() : Number.POSITIVE_INFINITY;
      return { raw: f, fileName, title, version, effectiveDate, reviewDate, appliesTo, review, ts };
    });
    const filteredItems = searchQuery ? items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.fileName.toLowerCase().includes(searchQuery.toLowerCase())) : items;
    const priority = (kind: string, label?: string) => { if (kind === 'overdue') return 0; if (kind === 'due-soon') return 1; if (kind === 'ok') return 2; if (kind === 'neutral' && label === 'Review due later') return 3; return 4; };
    filteredItems.sort((a, b) => { const pa = priority(a.review.kind, a.review.label); const pb = priority(b.review.kind, b.review.label); if (pa !== pb) return pa - pb; return (a.ts || 0) - (b.ts || 0); });
    return filteredItems;
  }, [files, searchQuery]);

  const stats = useMemo(() => {
    if (!files || files.length === 0) return { total: 0, overdue: 0, dueSoon: 0, ok: 0, reviewLater: 0 };
    let total = 0, overdue = 0, dueSoon = 0, ok = 0, reviewLater = 0;
    (files as any[]).forEach((f) => { const isCompleted = typeof f !== 'string' && f.isCompleted; if (!isCompleted) return; total += 1; const reviewDate = typeof f === 'string' ? null : (f.reviewDate || null); const s = getReviewStatus(reviewDate); if (s.kind === 'overdue') overdue += 1; else if (s.kind === 'due-soon') dueSoon += 1; else if (s.kind === 'ok') ok += 1; else reviewLater += 1; });
    return { total, overdue, dueSoon, ok, reviewLater };
  }, [files]);

  // Determine which years to show in the tracker: default to current year and previous 4,
  // but also include any years found in the policy date fields so completed policies are visible.
  const trackerYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    // Next 5 years starting from currentYear
    const years: number[] = [];
    for (let y = currentYear; y <= currentYear + 4; y++) years.push(y);
    return years;
  }, [sortedItems]);

  if (selectedDocument) {
    return (
      <DocumentView document={selectedDocument} onBack={() => setSelectedDocument(null)} isChatOpen={false} />
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="w-full flex items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold leading-tight tracking-tight">Policies</h2>
              <div className="mt-1 text-slate-200 text-base leading-relaxed">Manage policy documents. Create policies from templates or edit existing ones.</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="min-w-[88px] h-14 flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm rounded-md text-center border border-white/20 px-3">
                <div className="text-xs text-slate-200">Total</div>
                <div className="text-lg font-semibold mt-1">{stats.total}</div>
              </div>
              <div className="min-w-[88px] h-14 flex flex-col items-center justify-center bg-red-500/10 rounded-md text-center border border-red-500/20 px-3">
                <div className="text-xs text-red-300">Overdue</div>
                <div className="text-lg font-semibold text-red-300 mt-1">{stats.overdue}</div>
              </div>
              <div className="min-w-[88px] h-14 flex flex-col items-center justify-center bg-yellow-500/10 rounded-md text-center border border-yellow-500/20 px-3">
                <div className="text-xs text-yellow-300">Due soon</div>
                <div className="text-lg font-semibold text-yellow-300 mt-1">{stats.dueSoon}</div>
              </div>
              <div className="min-w-[88px] h-14 flex flex-col items-center justify-center bg-green-500/10 rounded-md text-center border border-green-500/20 px-3">
                <div className="text-xs text-green-300">Up to date</div>
                <div className="text-lg font-semibold text-green-300 mt-1">{stats.ok}</div>
              </div>
              <div className="min-w-[88px] h-14 flex flex-col items-center justify-center bg-blue-500/10 rounded-md text-center border border-blue-500/20 px-3">
                <div className="text-xs text-blue-300">Review later</div>
                <div className="text-lg font-semibold text-blue-300 mt-1">{stats.reviewLater}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 w-full max-w-full">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-md ${viewMode === 'list' ? 'bg-white text-slate-900' : 'bg-transparent text-slate-500'}`}>List</button>
            <button onClick={() => setViewMode('tracker')} className={`px-3 py-1 rounded-md ${viewMode === 'tracker' ? 'bg-white text-slate-900' : 'bg-transparent text-slate-500'}`}>Tracker</button>
          </div>

          <div className="w-1/3">
            <div className="relative w-full">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <Input type="text" placeholder="Search policies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </div>
        </div>

        {viewMode === 'tracker' ? (
          <div className="px-4 sm:px-8 lg:px-16">
            <div className="w-full">
              <div className="bg-white/90 rounded-2xl shadow-xl border border-blue-100 p-6 sm:p-10 mb-8 min-h-[420px] flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-6">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-blue-500"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-900 leading-tight">Policy Tracker</h2>
                    <div className="text-blue-700 text-sm mt-1">Overview of published policies by year</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-200 shadow-sm rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <th className="py-4 px-6 text-left font-semibold border-b border-blue-500">Policy</th>
                        {trackerYears.map((y) => (
                          <th key={y} className={`py-4 px-6 font-semibold border-b border-blue-500 text-center ${y === new Date().getFullYear() ? 'bg-blue-700' : ''}`}>
                            {y}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((it, idx) => {
                        const file = it.fileName;
                        const prefilledYears: Record<string, boolean> = {};
                        const isCompleted = !(typeof it.raw === 'string') && (!!it.raw.isCompleted || it.raw.status === 'completed');
                        if (isCompleted) {
                          const candidates: (string | null | undefined)[] = [it.raw && typeof it.raw !== 'string' ? it.raw.lastCustomized : undefined, it.raw && typeof it.raw !== 'string' ? it.raw.createdAt : undefined, it.reviewDate, it.effectiveDate];
                          candidates.forEach((s) => {
                            if (!s) return;
                            const parsed = new Date(s);
                            if (!isNaN(parsed.getTime()) && parsed.getTime() <= Date.now()) {
                              const y = parsed.getFullYear();
                              if (trackerYears.includes(y)) prefilledYears[String(y)] = true;
                            }
                          });
                        }

                        const reviewDateVal = it.reviewDate ? (new Date(it.reviewDate)) : null;
                        const reviewYear = reviewDateVal ? reviewDateVal.getFullYear() : null;
                        const daysUntilReview = reviewDateVal ? Math.ceil((reviewDateVal.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                        return (
                          <tr key={file} className={`transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'} border-b border-gray-200`}>
                            <td className="py-4 px-6 font-medium text-gray-900 border-r border-gray-200">{it.title}</td>
                            {trackerYears.map((yr) => {
                              const yearKey = String(yr);
                              const stored = trackerState[file] && trackerState[file][yearKey];
                              const checked = stored || !!prefilledYears[yearKey];
                              const isCurrent = yr === new Date().getFullYear();
                              // needs update indicator: reviewDate falls within next 30 days and corresponds to this year
                              const needsUpdate = reviewYear === yr && daysUntilReview !== null && daysUntilReview >= 0 && daysUntilReview <= 30;
                              return (
                                <td
                                  key={yearKey}
                                  className={`py-4 px-6 text-center border-r border-gray-200 cursor-pointer transition-all duration-200 hover:bg-blue-100 hover:shadow-inner ${isCurrent ? 'bg-blue-50' : ''}`}
                                  onClick={() => onYearCellClick(it, yearKey)}
                                >
                                  <div className="relative inline-block">
                                    {checked ? (
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-md bg-blue-500 text-white">✓</div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-full border-2 border-gray-300 border-dashed flex items-center justify-center text-gray-400 hover:border-blue-400 transition-colors">
                                        <span className="text-xs">+</span>
                                      </div>
                                    )}
                                    {needsUpdate && (
                                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-600 ring-2 ring-white" title="Review due soon" />
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full">
            {files === null ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : files && files.length === 0 ? (
              <div className="text-sm text-muted-foreground">No policies published yet.</div>
            ) : (
              sortedItems.length ? sortedItems.map((it) => {
                const { fileName, title, version, effectiveDate, reviewDate, appliesTo, review } = it;
                const isString = typeof it.raw === 'string';
                const isCompleted = !isString && it.raw.isCompleted;
                return (
                  <div key={fileName} className={`group relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-[200px] flex flex-col cursor-pointer ${isCompleted ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300' : 'bg-white/90 border-blue-100 hover:border-blue-200'}`} onClick={() => router.push(`/admin/policies/${encodeURIComponent(fileName.replace(/\.pdf$/i, ''))}/edit`)}>
                    {isCompleted && (<div className="absolute inset-0 opacity-5 pointer-events-none"><div className="absolute top-0 right-0 w-32 h-32 bg-green-400 rounded-full -translate-y-16 translate-x-16"></div><div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400 rounded-full translate-y-12 -translate-x-12"></div></div>)}
                    <div className="relative p-6 flex flex-col flex-grow">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${isCompleted ? 'bg-green-500 text-white' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'}`}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                      <div className="space-y-2 flex-grow">
                        <h3 className={`font-semibold text-lg leading-tight ${isCompleted ? 'text-green-800' : 'text-blue-900 group-hover:text-blue-800'}`}>{title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{isCompleted ? 'Completed - Click to review or update' : 'Click to begin creating this policy'}</p>
                      </div>
                      {isCompleted && (
                        <div className="mt-4 pt-4 border-t border-green-200 space-y-2">
                          <div className="flex items-center justify-between text-xs text-green-700"><span>Status</span><span className="font-medium">✓ Complete</span></div>
                          {reviewDate && (<div className="flex items-center justify-between text-xs text-green-700"><span>Renewal Date</span><span className="font-medium">{formatDateSafe(reviewDate)}</span></div>)}
                          <div className="pt-2 flex gap-2">
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); preloadAndOpenPolicy(it); }}>{viewLoading === it.fileName ? 'Loading…' : 'View'}</Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/admin/policies/${encodeURIComponent(fileName.replace(/\.pdf$/i, ''))}/edit`); }}>Edit</Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`absolute left-0 bottom-0 h-1 w-full transition-all duration-300 ${isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}></div>
                  </div>
                );
              }) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}

