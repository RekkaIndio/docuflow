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
    <div className="p-6">
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-b-lg shadow-sm mb-6">
        <div className="w-full mx-auto flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/5 rounded-md">
              {/* simple icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/90">
                <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-tight">Policies</h2>
              <div className="mt-1 text-sm text-slate-200">Below are the available policy documents. Click to open or download.</div>
              {/* stat cards */}
              <div className="mt-3 flex items-center gap-3">
                <div className="p-3 bg-white/5 rounded-md">
                  <div className="text-xs text-slate-200">Total</div>
                  <div className="text-xl font-semibold">{stats.total}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-md">
                  <div className="text-xs text-slate-200">Overdue</div>
                  <div className="text-xl font-semibold text-red-300">{stats.overdue}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-md">
                  <div className="text-xs text-slate-200">Due soon</div>
                  <div className="text-xl font-semibold text-yellow-300">{stats.dueSoon}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-md">
                  <div className="text-xs text-slate-200">Up to date</div>
                  <div className="text-xl font-semibold text-green-300">{stats.ok}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {(() => {
        if (files === null) return <div className="text-sm text-muted-foreground">Loading…</div>;
        if (files.length === 0) return <div className="text-sm text-muted-foreground">No policies published yet.</div>;

        // render sorted items (overdue -> due-soon -> ok -> no-date)
        return sortedItems.map((it) => {
          const { fileName, title, version, effectiveDate, reviewDate, appliesTo, review } = it;
          const isString = typeof it.raw === 'string';
          const borderClass = review.kind === 'overdue' ? 'border-l-4 border-red-500' : review.kind === 'due-soon' ? 'border-l-4 border-yellow-500' : review.kind === 'ok' ? 'border-l-4 border-green-500' : '';

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
              className={`bg-card border rounded-lg p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:shadow-md focus:outline-none ${borderClass}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-lg">{title}</div>
                    {review && review.kind !== 'neutral' && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          review.kind === 'overdue' ? 'bg-red-100 text-red-800' : review.kind === 'due-soon' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {review.label}
                      </span>
                    )}
                  </div>

                  {(version || effectiveDate || appliesTo) && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {version && <span className="mr-2">v{version}</span>}
                      {effectiveDate && <span className="mr-2">Effective: {formatDateSafe(effectiveDate)}</span>}
                      {appliesTo && <div className="mt-1 text-[13px]">Applies to: <span className="font-medium">{appliesTo}</span></div>}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">PDF • {new Date().toLocaleDateString()}</div>
                <div className="text-xs text-muted-foreground">
                  {reviewDate ? `Review: ${formatDateSafe(reviewDate)}` : 'Review date: —'}
                </div>
              </div>
            </div>
          );
        });
      })()}
      </div>
    </div>
  );
}

