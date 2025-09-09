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
        setFiles(data.files || []);
      })
      .catch(() => {
        if (!mounted) return;
        setFiles([]);
      });
    return () => { mounted = false };
  }, []);

  // Listen for navigate-to-document events on this page
  useEffect(() => {
    const handleDocumentNavigation = (event: CustomEvent) => {
      const { policyFile, policyUrl, documentName } = event.detail || {};
      
      if (policyFile || policyUrl) {
        try {
          const docId = `policy:${policyFile || (policyUrl || '').split('/').pop()}`;
          const docName = documentName || (policyFile || (policyUrl || '').split('/').pop()) || 'Policy Document';
          
          const syntheticDoc: Document = {
            id: docId,
            name: docName,
            type: 'document',
            fileType: 'pdf',
            createdAt: new Date().toISOString(),
            owner: user || { id: 'system', name: 'Policy Library', email: null, avatarUrl: null },
            workspaceId: 'admin-policies',
            folderId: null,
            downloadUrl: policyUrl || `/policies/${policyFile}`,
          } as Document;

          setSelectedDocument(syntheticDoc);
        } catch (e) {
          console.error('Failed to create synthetic document:', e);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('navigate-to-document', handleDocumentNavigation as EventListener);
      return () => {
        window.removeEventListener('navigate-to-document', handleDocumentNavigation as EventListener);
      };
    }
  }, [user]);

  const stats = useMemo(() => {
    if (!files || files.length === 0) return { total: 0, overdue: 0, dueSoon: 0, ok: 0, noDate: 0, reviewLater: 0 };
    let total = 0, overdue = 0, dueSoon = 0, ok = 0, noDate = 0, reviewLater = 0;
    (files as any[]).forEach((f) => {
      total += 1;
      const reviewDate = typeof f === 'string' ? null : (f.reviewDate || null);
      const s = getReviewStatus(reviewDate);
      if (s.kind === 'overdue') overdue += 1;
      else if (s.kind === 'due-soon') dueSoon += 1;
      else if (s.kind === 'ok') ok += 1;
      else if (s.kind === 'neutral' && s.label === 'Review due later') reviewLater += 1;
      else noDate += 1;
    });
    return { total, overdue, dueSoon, ok, noDate, reviewLater };
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
    <div className="p-6">
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-b-lg shadow-sm mb-6">
        <div className="w-full mx-auto flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/5 rounded-md">
              {/* Policy icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2003.org/2000/svg" className="text-white/90">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
              <div>
              <h2 className="text-2xl font-bold leading-tight">Policies</h2>
              <div className="mt-1 text-sm text-slate-200">Manage policy documents. Create policies from templates or edit existing ones.</div>

              <div className="mt-4 flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-md text-center">
                  <div className="text-xs text-slate-200 mb-1">Total</div>
                  <div className="text-xl font-semibold">{stats.total}</div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-md text-center border border-red-500/20">
                  <div className="text-xs text-red-300 mb-1">Overdue</div>
                  <div className="text-xl font-semibold text-red-300">{stats.overdue}</div>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-md text-center border border-yellow-500/20">
                  <div className="text-xs text-yellow-300 mb-1">Due soon</div>
                  <div className="text-xl font-semibold text-yellow-300">{stats.dueSoon}</div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-md text-center border border-green-500/20">
                  <div className="text-xs text-green-300 mb-1">Up to date</div>
                  <div className="text-xl font-semibold text-green-300">{stats.ok}</div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-md text-center border border-blue-500/20">
                  <div className="text-xs text-blue-300 mb-1">Review later</div>
                  <div className="text-xl font-semibold text-blue-300">{stats.reviewLater}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2003.org/2000/svg" className="mr-2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 16H3v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
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

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(() => {
          if (files === null) return <div className="text-sm text-muted-foreground">Loading…</div>;
          if (files && files.length === 0) return <div className="text-sm text-muted-foreground">No policies published yet.</div>;

          return sortedItems.length ? (
            // map over sortedItems
            sortedItems.map((it) => {
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
                  className={`bg-card border rounded-lg p-4 flex flex-col justify-between shadow-sm relative ${borderClass}`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      review.kind === 'overdue' ? 'bg-red-100 text-red-800' :
                      review.kind === 'due-soon' ? 'bg-yellow-100 text-yellow-800' :
                      review.kind === 'ok' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {review.label}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-md">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2003.org/2000/svg" className="text-blue-600">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-lg mb-1">{title}</div>
                      
                      {/* Show renewal date prominently for completed policies */}
                      {isCompleted && reviewDate && (
                        <div className="text-xs text-green-700 font-semibold mb-1">Renewal date: {formatDateSafe(reviewDate)}</div>
                      )}

                      {(version || effectiveDate || isCompleted) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {version && <span className="mr-2">v{version}</span>}
                          {effectiveDate && <span className="mr-2">Effective: {formatDateSafe(effectiveDate)}</span>}
                          {isCompleted && lastCustomized && (
                            <div className="mt-1 text-[13px]">Last updated: <span className="font-medium">{formatDateSafe(lastCustomized)}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {isCompleted ? 'Customized PDF' : 'Template PDF'} • {new Date().toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{reviewDate ? `Review: ${formatDateSafe(reviewDate)}` : 'Review date: —'}</div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="mt-4">
                    {isCompleted ? (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            const url = isString ? `/policies/${encodeURIComponent(fileName)}` : (it.raw.url || `/policies/${encodeURIComponent(fileName)}`);
                            const event = new CustomEvent('navigate-to-document', { 
                              detail: { policyFile: fileName, documentName: title, policyUrl: url },
                              bubbles: true 
                            });
                            window.dispatchEvent(event);
                          } catch (e) {
                            const url = isString ? `/policies/${encodeURIComponent(fileName)}` : (it.raw.url || `/policies/${encodeURIComponent(fileName)}`);
                            window.open(url, '_blank');
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        View Policy
                      </Button>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          const policyBaseName = fileName.replace(/\.pdf$/, '');
                          router.push(`/admin/policies/${encodeURIComponent(policyBaseName)}/edit`);
                        }}
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2003.org/2000/svg" className="mr-2">
                          <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Create Policy
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : null;
        })()}
      </div>
    </div>
  );
}
