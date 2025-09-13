"use client";

import React, { useEffect, useState, useMemo } from 'react';

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

export default function PoliciesPage() {
  const [files, setFiles] = useState<PolicyItem[] | string[] | null>(null);

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
    if (diffDays <= 30) return { label: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`, kind: 'due-soon' };
    return { label: 'Up to date', kind: 'ok' };
  }

  useEffect(() => {
    let mounted = true;
    fetch('/api/policies')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        // data.files may be an array of strings (legacy) or array of objects (new)
        setFiles(data.files || []);
      })
      .catch(() => {
        if (!mounted) return;
        setFiles([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    if (!files || files.length === 0) return { total: 0, overdue: 0, dueSoon: 0, ok: 0, noDate: 0 };
    let total = 0, overdue = 0, dueSoon = 0, ok = 0, noDate = 0;
    (files as any[]).forEach((f) => {
      // Only count completed policies for users
      const isCompleted = typeof f !== 'string' && f.isCompleted;
      if (!isCompleted) return;
      
      total += 1;
      const reviewDate = typeof f === 'string' ? null : (f.reviewDate || null);
      const s = getReviewStatus(reviewDate);
      if (s.kind === 'overdue') overdue += 1;
      else if (s.kind === 'due-soon') dueSoon += 1;
      else if (s.kind === 'ok') ok += 1;
      else noDate += 1;
    });
    return { total, overdue, dueSoon, ok, noDate };
  }, [files]);

  const sortedItems = useMemo(() => {
    if (!files || files.length === 0) return [];
    // Filter to only include completed policies for users
    const completedPolicies = (files as any[]).filter(f => typeof f !== 'string' && f.isCompleted);
    
    const items = completedPolicies.map((f) => {
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

    // priority: overdue (0) -> due-soon (1) -> no-date (2) -> ok (3)
    const priority = (kind: string) => (kind === 'overdue' ? 0 : kind === 'due-soon' ? 1 : kind === 'ok' ? 3 : 2);

    items.sort((a, b) => {
      const pa = priority(a.review.kind);
      const pb = priority(b.review.kind);
      if (pa !== pb) return pa - pb;
      // both same priority, sort by timestamp (earliest first)
      return (a.ts || 0) - (b.ts || 0);
    });

    return items;
  }, [files]);

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold leading-tight tracking-tight">Policies</h2>
              <div className="text-slate-200 text-base leading-relaxed">Below are the available policy documents. Click to open or download.</div>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-300">
                      <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Total</div>
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-300">
                      <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Overdue</div>
                    <div className="text-2xl font-bold text-white">{stats.overdue}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow-300">
                      <circle cx="12" cy="12" r="10" fill="currentColor"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Due soon</div>
                    <div className="text-2xl font-bold text-white">{stats.dueSoon}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-300">
                      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Up to date</div>
                    <div className="text-2xl font-bold text-white">{stats.ok}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {(() => {
        if (files === null) return <div className="text-sm text-muted-foreground">Loading…</div>;
        if (sortedItems.length === 0) return <div className="text-sm text-muted-foreground">No completed policies available yet. Please contact your administrator.</div>;

        // render sorted items
        return sortedItems.map((it) => {
          const { fileName, title, version, effectiveDate, reviewDate, appliesTo, review } = it;
          const isString = typeof it.raw === 'string';
          const lastCustomized = !isString && it.raw.lastCustomized;
          
          // All policies shown to users are completed
          const isCompleted = false;

          return (
            <div
              key={fileName}
              role="button"
              tabIndex={0}
              onClick={() => {
                try {
                  window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { policyFile: fileName, documentName: title } }));
                } catch (e) {
                  const url = isString ? `/policies/${encodeURIComponent(fileName)}` : (it.raw.url || `/policies/${encodeURIComponent(fileName)}`);
                  window.open(url, '_blank');
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { policyFile: fileName, documentName: title } })); } catch (err) { const url = isString ? `/policies/${encodeURIComponent(fileName)}` : (it.raw.url || `/policies/${encodeURIComponent(fileName)}`); window.open(url, '_blank'); } } }}
              className={`group relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-[200px] flex flex-col bg-white/90 border-blue-100 hover:border-blue-200 cursor-pointer focus:outline-none`}
            >
              <div className="relative p-6 flex flex-col flex-grow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-2 flex-grow">
                  <h3 className="font-semibold text-lg leading-tight text-blue-900 group-hover:text-blue-800">
                    {title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Click to view this policy document
                  </p>
                </div>
                
                {/* Show renewal date if available */}
                {reviewDate && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="flex items-center justify-between text-xs text-blue-700">
                      <span>Renewal Date</span>
                      <span className="font-medium">{formatDateSafe(reviewDate)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Bottom accent bar */}
              <div className="absolute left-0 bottom-0 h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            </div>
          );
        });
      })()}
        </div>
      </div>
    </div>
  );
}

