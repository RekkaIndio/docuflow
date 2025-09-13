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

  // If review date is in the past, it's overdue
  if (diffDays < 0) return { label: 'Overdue', kind: 'overdue' };

  // If review date is within 60 days, it's due soon
  if (diffDays <= 60) return { label: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`, kind: 'due-soon' };

  // If review date is within 180 days (6 months), it's up to date
  if (diffDays <= 180) return { label: 'Up to date', kind: 'ok' };

  // If review date is more than 6 months away, it might need attention
  return { label: 'Review due later', kind: 'neutral' };
}

export default function AdminPoliciesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<PolicyItem[] | string[] | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch('/api/policies')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        // API may return { files: [...] } or directly an array
        const payload = data && typeof data === 'object' && 'files' in data ? (data.files as any[]) : (data as any[]);
        setFiles(payload || []);
      })
      .catch((err) => {
        console.error('Error fetching policies', err);
        if (mounted) setFiles([]);
      });

    return () => { mounted = false; };
  }, []);

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

    // Filter by search query
    const filteredItems = searchQuery
      ? items.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.fileName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : items;

    // priority: overdue (0) -> due-soon (1) -> ok (2) -> review-later (3) -> no-date (4)
    const priority = (kind: string, label?: string) => {
      if (kind === 'overdue') return 0;
      if (kind === 'due-soon') return 1;
      if (kind === 'ok') return 2;
      if (kind === 'neutral' && label === 'Review due later') return 3;
      return 4; // no date or other neutral
    };

    filteredItems.sort((a, b) => {
      const pa = priority(a.review.kind, a.review.label);
      const pb = priority(b.review.kind, b.review.label);
      if (pa !== pb) return pa - pb;
      return (a.ts || 0) - (b.ts || 0);
    });

    return filteredItems;
  }, [files, searchQuery]);

  const stats = useMemo(() => {
    if (!files || files.length === 0) return { total: 0, overdue: 0, dueSoon: 0, ok: 0, reviewLater: 0 };
    let total = 0, overdue = 0, dueSoon = 0, ok = 0, reviewLater = 0;
    (files as any[]).forEach((f) => {
      const isCompleted = typeof f !== 'string' && f.isCompleted;
      if (!isCompleted) return;
      total += 1;
      const reviewDate = typeof f === 'string' ? null : (f.reviewDate || null);
      const s = getReviewStatus(reviewDate);
      if (s.kind === 'overdue') overdue += 1;
      else if (s.kind === 'due-soon') dueSoon += 1;
      else if (s.kind === 'ok') ok += 1;
      else reviewLater += 1;
    });
    return { total, overdue, dueSoon, ok, reviewLater };
  }, [files]);

  // If a document is selected, show DocumentView
  if (selectedDocument) {
    return (
      <DocumentView 
        document={selectedDocument} 
        onBack={() => setSelectedDocument(null)}
        isChatOpen={false}
      />
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
  <div className="w-full flex items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              {/* Policy icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2003.org/2000/svg" className="text-white">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
              <div>
              <h2 className="text-3xl font-bold leading-tight tracking-tight">Policies</h2>
              <div className="mt-1 text-slate-200 text-base leading-relaxed">Manage policy documents. Create policies from templates or edit existing ones.</div>
            </div>
            </div>

              <div className="flex items-center gap-4">
                {/** Uniform stat pills: fixed size and identical styling container */}
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative w-full max-w-full">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2003.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <Input
            type="text"
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full">
        {(() => {
          if (files === null) return <div className="text-sm text-muted-foreground">Loading…</div>;
          if (files && files.length === 0) return <div className="text-sm text-muted-foreground">No policies published yet.</div>;

          return sortedItems.length ? sortedItems.map((it) => {
            const { fileName, title, version, effectiveDate, reviewDate, appliesTo, review } = it;
            const isString = typeof it.raw === 'string';
            const isCompleted = !isString && it.raw.isCompleted;
            const lastCustomized = !isString && it.raw.lastCustomized;
            
            // Status-based styling
            const statusColors = {
              overdue: 'border-red-200 bg-red-50',
              'due-soon': 'border-yellow-200 bg-yellow-50',
              ok: 'border-green-200 bg-green-50',
              neutral: 'border-blue-200 bg-blue-50'
            };
            const borderClass = statusColors[review.kind as keyof typeof statusColors] || statusColors.neutral;

            return (
              <div
                key={fileName}
                className={`group relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-[200px] flex flex-col ${
                  isCompleted 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300' 
                    : 'bg-white/90 border-blue-100 hover:border-blue-200'
                }`}
              >
                {/* Subtle background pattern for completed policies */}
                {isCompleted && (
                  <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-400 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400 rounded-full translate-y-12 -translate-x-12"></div>
                  </div>
                )}

                <div className="relative p-6 flex flex-col flex-grow">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                    }`}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-600 text-white text-xs font-medium shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L7 12.172 4.707 9.879a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l9-9z" clipRule="evenodd" />
                          </svg>
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 flex-grow">
                    <h3 className={`font-semibold text-lg leading-tight ${
                      isCompleted ? 'text-green-800' : 'text-blue-900 group-hover:text-blue-800'
                    }`}>
                      {title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {isCompleted ? 'Completed - Click to review or update' : 'Click to begin creating this policy'}
                    </p>
                  </div>
                  
                  {/* Progress indicator for completed policies */}
                  {isCompleted && (
                    <div className="mt-4 pt-4 border-t border-green-200 space-y-2">
                      <div className="flex items-center justify-between text-xs text-green-700">
                        <span>Status</span>
                        <span className="font-medium">✓ Complete</span>
                      </div>
                      {reviewDate && (
                        <div className="flex items-center justify-between text-xs text-green-700">
                          <span>Renewal Date</span>
                          <span className="font-medium">{formatDateSafe(reviewDate)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Bottom accent bar */}
                <div className={`absolute left-0 bottom-0 h-1 w-full transition-all duration-300 ${
                  isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}></div>
              </div>
            );
          }) : null;
        })()}
      </div>
    </div>
    </div>
  );
}
