"use client";

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/workspace';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PolicyEditor from '@/components/PolicyEditor';

interface PolicyMeta {
  title?: string;
  version?: string;
  effectiveDate?: string;
  reviewDate?: string;
  appliesTo?: string;
  [key: string]: string | undefined;
}

export default function AdminPolicyEditPage({ params }: { params: Promise<{ policyName: string }> }) {
  const router = useRouter();
  const workspace = useWorkspace();
  const { user } = useAuth();
  const [policyContent, setPolicyContent] = useState<string>('');
  const [policyMeta, setPolicyMeta] = useState<PolicyMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [policyName, setPolicyName] = useState<string>('');

  // Teams state (fetch from Firestore)
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!workspace?.id) return;
      setTeamsLoading(true);
      setTeamsError(null);
      try {
  const { collection, getDocs } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebase');
  const { workspaceCollectionPath } = await import('@/lib/paths');
  const teamsCollection = collection(db, workspaceCollectionPath(workspace.id, 'teams', (workspace as any)?.organisationId || null));
        const snapshot = await getDocs(teamsCollection);
        const fetchedTeams = snapshot.docs.map(d => ({ id: d.id, ...d.data(), workspaceId: workspace.id }));
        setTeams(fetchedTeams);
        if (fetchedTeams.length === 0) console.warn('No teams found for workspace', workspace.id);
      } catch (err) {
        setTeamsError('Failed to load teams');
        setTeams([]);
      } finally {
        setTeamsLoading(false);
      }
    };
    fetchTeams();
  }, [workspace?.id]);

  useEffect(() => {
    const loadPolicyName = async () => {
      const resolvedParams = await params;
      setPolicyName(resolvedParams.policyName);
    };
    loadPolicyName();
  }, [params]);

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`/api/policies/${encodeURIComponent(policyName)}/content`);
        if (!response.ok) throw new Error(`Failed to load policy: ${response.statusText}`);
        const data = await response.json();
        setPolicyContent(data.content || '');
        setPolicyMeta(data.meta || {});
      } catch (err) {
        console.error('Failed to load policy:', err);
        setError(err instanceof Error ? err.message : 'Failed to load policy');
      } finally {
        setLoading(false);
      }
    };

    if (policyName) loadPolicy();
  }, [policyName]);

  const handleSave = async (filledPolicy: string, filledMeta: PolicyMeta, assignedTeams?: string[]) => {
    try {
      const metaWithTeams = { ...filledMeta, assignedTeams: assignedTeams || [] };
      if (typeof window !== 'undefined') {
        // Debug logging removed: saving policy to Firebase
      }
  // If workspace.organisationId is not present, try a server-side derive to get an org id
  // Prefer workspace.organisationId when present, otherwise fall back to authenticated user's organisationId
  let orgToSend = (workspace as any)?.organisationId || (user as any)?.organisationId || null;
      if (!orgToSend && workspace?.id) {
        try {
          const resp = await fetch('/api/debug/derive-org', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId: workspace.id }) });
          if (resp.ok) {
            const json = await resp.json().catch(() => null);
            if (json && json.foundOrg) orgToSend = json.foundOrg;
          }
        } catch (e) {
          // ignore - we'll send null and server will try other fallbacks
        }
      }

      // Final fallback: if we still don't have an org but we have an authenticated user id,
      // try fetching the server-side user document which should include organisationId.
      if (!orgToSend && (user as any)?.id) {
        try {
          const uu = await fetch(`/api/users/${(user as any).id}`);
          if (uu.ok) {
            const serverUser = await uu.json().catch(() => null);
            if (serverUser?.organisationId) orgToSend = serverUser.organisationId;
          }
        } catch (e) {
          // ignore - fallback not available
        }
      }

      // Debug: show workspace and organisation being sent
      try {
        // Debug logging removed: workspace and organisation being sent for save
      } catch (e) {}

      const response = await fetch(`/api/policies/${encodeURIComponent(policyName)}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: filledPolicy, meta: metaWithTeams, workspaceId: workspace?.id || null, organisationId: orgToSend || null }),
      });

      if (!response.ok) throw new Error('Failed to save policy');

      // Parse JSON body to surface debug info the server may have returned
      let saveJson: any = null;
      try {
        saveJson = await response.clone().json().catch(() => null);
      } catch (e) {
        saveJson = null;
      }

      // Debug: surface which org the server used and whether an org-scoped doc was saved
      try {
        const orgUsed = response.headers.get('X-Org-Used');
        const workspaceSaved = response.headers.get('X-Workspace-Doc-Saved');
        const workspacePath = response.headers.get('X-Workspace-Policy-Path') || saveJson?.publishedPath || null;
        // Debug logging removed: save response headers and json

        if ((orgUsed && orgUsed !== 'none') || saveJson?.debug?.usedOrgId) {
          const used = orgUsed && orgUsed !== 'none' ? orgUsed : saveJson?.debug?.usedOrgId;
          const path = workspacePath || `/organisations/${used}/policies/${policyName}`;
          alert(`Policy draft saved to organisation ${used}. Path: ${path}`);
        } else if (saveJson?.debug) {
          // If server returned debug info, show the derivation attempts
          const dbg = saveJson.debug;
          alert('Policy draft saved, but no organisationId was used. Debug: ' + JSON.stringify(dbg));
        } else if (orgUsed === 'none') {
          alert('Policy draft saved, but no organisationId was found — policy was NOT saved under an organisation.');
        } else {
          alert('Policy draft saved, but org-scoped write did not occur or failed. Check console for details.');
        }
      } catch (e) {
        alert('Policy draft saved successfully to Firebase!');
      }

      // Notify other parts of the app that a policy was updated (so lists refresh)
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('policy-updated')); } catch (e) {}
    } catch (err) {
      console.error('Failed to save policy:', err);
      alert('Failed to save policy. Please try again.');
    }
  };

  const handleGeneratePDF = async (filledPolicy: string, filledMeta: PolicyMeta) => {
    try {
      if (typeof window !== 'undefined') {
        // Debug logging removed: generating PDF / publishing policy
      }

  // If workspace.organisationId missing, attempt server derive so we can publish into org scope
  // Also fallback to authenticated user's organisationId when workspace isn't set
  let orgToSend = (workspace as any)?.organisationId || (user as any)?.organisationId || null;
      if (!orgToSend && workspace?.id) {
        try {
          const resp = await fetch('/api/debug/derive-org', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId: workspace.id }) });
          if (resp.ok) {
            const json = await resp.json().catch(() => null);
            if (json && json.foundOrg) orgToSend = json.foundOrg;
          }
        } catch (e) {
          // ignore - server will fallback
        }
      }

      // Final fallback: if we still don't have an org but we have an authenticated user id,
      // try fetching the server-side user document which should include organisationId.
      if (!orgToSend && (user as any)?.id) {
        try {
          const uu = await fetch(`/api/users/${(user as any).id}`);
          if (uu.ok) {
            const serverUser = await uu.json().catch(() => null);
            if (serverUser?.organisationId) orgToSend = serverUser.organisationId;
          }
        } catch (e) {
          // ignore - fallback not available
        }
      }

      // Debug: show workspace and organisation being sent for generate
      try {
        // Debug logging removed: workspace and organisation being sent for generate
      } catch (e) {}

      const response = await fetch(`/api/policies/${encodeURIComponent(policyName)}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: filledPolicy, meta: filledMeta, workspaceId: workspace?.id || null, organisationId: orgToSend || null }),
      });

      if (!response.ok) {
        let errText = 'Failed to generate PDF';
        try { const errJson = await response.json(); errText = errJson?.error || errJson?.message || errText; } catch (e) {}
        throw new Error(errText);
      }

      const contentType = response.headers.get('content-type') || '';
      const wasUpdated = response.headers.get('X-Policy-Updated') === 'true';

      if (contentType.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${policyName}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (wasUpdated) alert('Policy PDF generated and published successfully to Firebase! All users will now see the updated version when viewing this policy.');
        else alert('Policy PDF generated and saved to Firebase successfully!');
        // Notify other parts of the app and navigate back to policies list
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('policy-updated')); } catch (e) {}
        // If server provided a workspace policy path header, attempt to fetch the saved workspace document
        try {
          const workspacePath = response.headers.get('X-Workspace-Policy-Path');
          // If server returned a workspace path, ensure it's organisation-scoped; avoid attempting to fetch
          // legacy `/workspaces/...` paths which are likely blocked by Firestore rules. If the header is not
          // present or points to a legacy path, prefer the JSON body payload `workspacePublishedDocument`.
          if (workspacePath && typeof window !== 'undefined' && !workspacePath.startsWith('/workspaces/')) {
            try {
              const resp = await fetch(`/api${workspacePath}`);
              if (resp.ok) {
                const doc = await resp.json();
                try { window.sessionStorage.setItem('docuflow.activeDocument', JSON.stringify(doc)); } catch (e) {}
                try { window.dispatchEvent(new CustomEvent('set-active-document', { detail: { documentId: doc.id, documentName: doc.policyName || doc.name || policyName, documentData: doc } })); } catch (e) {}
              }
            } catch (e) {
              // ignore fetch errors; header is best-effort
            }
          } else {
            // If the server returned a JSON body with workspacePublishedDocument, consume that
            try {
              const json = await response.clone().json().catch(() => null);
              if (json && json.workspacePublishedDocument && typeof window !== 'undefined') {
                try { window.sessionStorage.setItem('docuflow.activeDocument', JSON.stringify(json.workspacePublishedDocument)); } catch (e) {}
                try { window.dispatchEvent(new CustomEvent('set-active-document', { detail: { documentId: json.workspacePublishedDocument.id, documentName: json.workspacePublishedDocument.policyName || policyName, documentData: json.workspacePublishedDocument } })); } catch (e) {}
              }
            } catch (e) {}
          }
        } catch (e) {}

        router.push('/admin/policies');
      } else {
        let json: any = null;
        try { json = await response.json(); } catch (e) {}

        const headerPdfUrl = response.headers.get('X-PDF-URL');
        const jsonPdfUrl = json?.pdfUrl;
        const downloadUrl = headerPdfUrl || jsonPdfUrl || null;

        if (downloadUrl) {
          const openNow = confirm((json?.message || 'Policy published successfully.') + ' Would you like to open the generated PDF now?');
          if (openNow) window.open(downloadUrl, '_blank');
        } else {
          if (wasUpdated) alert(json?.message || 'Policy published successfully. PDF generation skipped in this environment.');
          else alert(json?.message || 'Policy published successfully.');
        }

        // Notify other parts of the app and try to persist the returned workspace document so chat can use it
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('policy-updated')); } catch (e) {}

        try {
          const json = await response.json().catch(() => null);
          if (json) {
            // If server included the workspacePublishedDocument in the response body, persist & dispatch it
            if (json.workspacePublishedDocument && typeof window !== 'undefined') {
              try { window.sessionStorage.setItem('docuflow.activeDocument', JSON.stringify(json.workspacePublishedDocument)); } catch (e) {}
              try { window.dispatchEvent(new CustomEvent('set-active-document', { detail: { documentId: json.workspacePublishedDocument.id, documentName: json.workspacePublishedDocument.policyName || policyName, documentData: json.workspacePublishedDocument } })); } catch (e) {}
            }
          }
        } catch (e) {
          // ignore
        }

        router.push('/admin/policies');
      }
      
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading policy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Policy</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.back()} variant="destructive">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Large gradient header matching Policies page style (no stat pills) */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
        {/* Subtle background pattern (matching Policies page) */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              {/* Policy icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold leading-tight tracking-tight">Edit Policy</h2>
              <div className="mt-1 text-slate-200 text-base leading-relaxed">Edit and publish policies for this workspace.</div>
            </div>
          </div>

          {/* Right side intentionally removed to match your request (no pills/stats) */}
        </div>
      </div>

      {/* Small white header (Back / Edit Policy) */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-600 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push('/admin/policies')} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Policies
          </Button>
          <div className="text-gray-300 dark:text-slate-500">•</div>
          <span className="text-gray-800 dark:text-slate-200 font-medium">Edit Policy</span>
        </div>
      </div>

      {/* Policy Editor */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900">
        <PolicyEditor
          policyContent={policyContent}
          policyMeta={policyMeta}
          onSave={handleSave}
          onGeneratePDF={handleGeneratePDF}
          teams={teams}
          teamsLoading={teamsLoading}
          teamsError={teamsError}
        />
      </div>
    </div>
  );
}