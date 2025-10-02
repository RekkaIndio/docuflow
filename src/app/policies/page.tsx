"use client";

import React, { useEffect, useState, useMemo } from 'react';
import PageHeader from '../../components/page-header';

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
    (async () => {
      try {
        // Fetch local templates (filesystem-backed) and Firebase policies
        const [localRes, firebaseRes] = await Promise.all([
          fetch('/api/policies'),
          fetch('/api/policies/firebase')
        ]);

        const localData = localRes.ok ? await localRes.json() : { files: [] };
        const firebaseData = firebaseRes.ok ? await firebaseRes.json() : { drafts: [], published: [] };

        if (!mounted) return;

        // localData.files may be array of strings (legacy) or array of PolicyItem
        const localFiles = localData.files || [];

        // Build combined list: prefer published entries from Firebase where available
        const published = (firebaseData.published || []) as any[];

        // Map published policies to the UI PolicyItem shape
        const publishedFiles = published.map((p: any) => {
          const name = p?.policyName || p?.id || 'untitled-policy';
          const file = `${name}.pdf`;
          const url = p?.pdfPath || `/policies/${encodeURIComponent(String(name))}.pdf`;
          const title = p?.meta?.title || (typeof name === 'string' ? name.replace(/[-_]/g, ' ') : String(name));
          return {
            file,
            url,
            title,
            version: p?.meta?.version || p?.version || null,
            effectiveDate: p?.meta?.effectiveDate || null,
            reviewDate: p?.meta?.reviewDate || null,
            appliesTo: p?.meta?.appliesTo || null,
            isCompleted: true,
            lastCustomized: p?.updatedAt || p?.createdAt || null,
            raw: p
          };
        });

        // Combine and dedupe by file name (published should override local template)
        const combinedMap = new Map<string, any>();

        // Add local templates first
        (Array.isArray(localFiles) ? localFiles : []).forEach((f: any) => {
          const key = typeof f === 'string' ? f : f.file;
          combinedMap.set(key, f);
        });

        // Override/add published files
        publishedFiles.forEach((pf) => {
          combinedMap.set(String(pf.file), pf);
        });

        const combined = Array.from(combinedMap.values());
        setFiles(combined || []);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load policies or Firebase data:', err);
        setFiles([]);
      }
    })();

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

  // Handle opening specific policy from chat
  useEffect(() => {
    const handleOpenSpecificPolicy = (event: CustomEvent) => {
      const { policyName } = event.detail;
      if (!policyName || !sortedItems.length) return;

      // Find the policy that matches the requested name
      const matchingPolicy = sortedItems.find(item =>
        item.title.toLowerCase().includes(policyName.toLowerCase()) ||
        item.fileName.toLowerCase().includes(policyName.toLowerCase())
      );

      if (matchingPolicy) {
        // Load the actual policy content from Firebase
        const loadPolicyContent = async () => {
          try {
            const response = await fetch('/api/policies/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: matchingPolicy.title }),
            });

            if (!response.ok) {
              throw new Error('Failed to fetch policy content from Firebase');
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
              // Use the first (best) match
              const policyData = data.results[0];

              // Create a document object with actual content from Firebase
              const documentData = {
                id: policyData.id,
                name: policyData.name,
                extractedJson: policyData.extractedJson,
                createdAt: policyData.createdAt,
                folderId: 'policies',
                status: policyData.status,
                tags: ['policy'],
                summary: policyData.summary
              };

              // Set the active document for chat interactions
              try {
                window.dispatchEvent(new CustomEvent('set-active-document', {
                  detail: {
                    documentId: policyData.id,
                    documentName: policyData.name,
                    documentData: documentData
                  }
                }));
                console.log('Set active document:', policyData.name);
              } catch (e) {
                console.error('Error setting active document:', e);
              }
            } else {
              throw new Error('No policy found in Firebase');
            }

          } catch (error) {
            console.error('Error loading policy content from Firebase:', error);
            // Fallback: create document object without content
            const documentData = {
              id: matchingPolicy.fileName,
              name: matchingPolicy.title,
              extractedJson: {
                content: `Policy: ${matchingPolicy.title}. Content could not be loaded from Firebase.`,
                title: matchingPolicy.title,
                type: 'policy'
              },
              createdAt: matchingPolicy.effectiveDate || new Date().toISOString(),
              folderId: 'policies',
              status: 'current',
              tags: ['policy'],
              summary: `Policy document: ${matchingPolicy.title}`
            };

            try {
              window.dispatchEvent(new CustomEvent('set-active-document', {
                detail: {
                  documentId: matchingPolicy.fileName,
                  documentName: matchingPolicy.title,
                  documentData: documentData
                }
              }));
            } catch (e) {
              console.error('Error setting active document:', e);
            }
          }
        };

        // Load content asynchronously
        loadPolicyContent();

        // Open the policy document (same as clicking on it)
        const isString = typeof matchingPolicy.raw === 'string';
        const url = isString ? `/policies/${encodeURIComponent(matchingPolicy.fileName)}` : (matchingPolicy.raw.url || `/policies/${encodeURIComponent(matchingPolicy.fileName)}`);

        try {
          window.dispatchEvent(new CustomEvent('navigate-to-document', {
            detail: {
              policyFile: matchingPolicy.fileName,
              documentName: matchingPolicy.title
            }
          }));
        } catch (e) {
          // Fallback to opening directly
          window.open(url, '_blank');
        }
      }
    };

    // Listen for the custom event
    if (typeof window !== 'undefined') {
      window.addEventListener('open-specific-policy', handleOpenSpecificPolicy as EventListener);
      // Also support pending policy from sessionStorage (sent by chat before navigation)
      try {
        const pending = window.sessionStorage ? window.sessionStorage.getItem('docuflow.pendingPolicy') : null;
        if (pending) {
          // Clear it so it doesn't re-open on subsequent mounts
          try { window.sessionStorage.removeItem('docuflow.pendingPolicy'); } catch (e) {}
          // Defer to allow the page to fully render and populate sortedItems
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('open-specific-policy', { detail: { policyName: pending } })); } catch (e) {}
          }, 500);
        }
      } catch (e) {
        // ignore storage errors
      }

      return () => window.removeEventListener('open-specific-policy', handleOpenSpecificPolicy as EventListener);
    }
  }, [sortedItems]);

  return (
    <div>
      <PageHeader
        title="Policies"
        subtitle={null}
      />

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
          const isCompleted = true;

          return (
            <div
              key={fileName}
              role="button"
              tabIndex={0}
              onClick={() => {
                // Before navigating, try to load full policy content from Firebase
                (async () => {
                  try {
                    const response = await fetch('/api/policies/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query: title }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      if (data.results && data.results.length > 0) {
                        const policyData = data.results[0];
                        const documentData = {
                          id: policyData.id,
                          name: policyData.name,
                          extractedJson: policyData.extractedJson,
                          createdAt: policyData.createdAt,
                          folderId: 'policies',
                          status: policyData.status,
                          tags: ['policy'],
                          summary: policyData.summary
                        };

                        try {
                          window.dispatchEvent(new CustomEvent('set-active-document', {
                            detail: {
                              documentId: policyData.id,
                              documentName: policyData.name,
                              documentData: documentData
                            }
                          }));
                          // Persist to sessionStorage so navigation doesn't lose the activeDoc
                          try {
                            if (typeof window !== 'undefined' && window.sessionStorage) {
                              window.sessionStorage.setItem('docuflow.activeDocument', JSON.stringify(documentData));
                            }
                          } catch (e) {
                            // ignore
                          }

                          // Debug: log extractedJson size so we can detect empty content issues
                          try {
                            const len = (policyData.extractedJson && policyData.extractedJson.content) ? (policyData.extractedJson.content.length) : 0;
                            console.log('Set active document (click):', policyData.name, 'extractedJson.length=', len);
                          } catch (e) {
                            console.log('Set active document (click):', policyData.name);
                          }
                        } catch (e) {
                          console.error('Error dispatching set-active-document on click:', e);
                        }
                      }
                    }
                  } catch (err) {
                    console.warn('Failed to pre-load policy content from Firebase on click:', err);
                  } finally {
                    try {
                      window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { policyFile: fileName, documentName: title } }));
                    } catch (e) {
                      const url = isString ? `/policies/${encodeURIComponent(fileName)}` : (it.raw.url || `/policies/${encodeURIComponent(fileName)}`);
                      window.open(url, '_blank');
                    }
                  }
                })();
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { policyFile: fileName, documentName: title } })); } catch (err) { const url = isString ? `/policies/${encodeURIComponent(fileName)}` : (it.raw.url || `/policies/${encodeURIComponent(fileName)}`); window.open(url, '_blank'); } } }}
              className={`group relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-[200px] flex flex-col ${
                isCompleted 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300' 
                  : 'bg-white/90 border-blue-100 hover:border-blue-200'
              }`}
            >
              {/* Subtle background pattern for completed cards */}
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
                </div>
                
                <div className="space-y-2 flex-grow">
                  <h3 className={`font-semibold text-lg leading-tight ${
                    isCompleted ? 'text-green-800' : 'text-blue-900 group-hover:text-blue-800'
                  }`}>
                    {title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Click to view this policy document
                  </p>
                </div>
                
                {/* Show renewal date if available */}
                {reviewDate && (
                  <div className={`mt-4 pt-4 border-t ${isCompleted ? 'border-green-200' : 'border-blue-200'}`}>
                    <div className={`flex items-center justify-between text-xs ${isCompleted ? 'text-green-700' : 'text-blue-700'}`}>
                      <span>Renewal Date</span>
                      <span className="font-medium">{formatDateSafe(reviewDate)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Bottom accent bar */}
              <div className={`absolute left-0 bottom-0 h-1 w-full transition-all duration-300 ${
                isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}></div>
            </div>
          );
        });
      })()}
        </div>
      </div>
    </div>
  );
}

