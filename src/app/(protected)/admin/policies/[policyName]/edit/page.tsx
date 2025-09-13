"use client";

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/workspace';
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
  const { collection, getDocs, query, where } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebase');
  const teamsCollection = collection(db, `workspaces/${workspace.id}/teams`);
  const snapshot = await getDocs(teamsCollection);
  const fetchedTeams = snapshot.docs.map(d => ({ id: d.id, ...d.data(), workspaceId: workspace.id }));
        setTeams(fetchedTeams);
        if (fetchedTeams.length === 0) {
          console.warn('No teams found for workspace', workspace.id);
        }
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

        // Load the markdown content for this policy
        const response = await fetch(`/api/policies/${encodeURIComponent(policyName)}/content`);
        
        if (!response.ok) {
          throw new Error(`Failed to load policy: ${response.statusText}`);
        }

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

    if (policyName) {
      loadPolicy();
    }
  }, [policyName]);

  const handleSave = async (filledPolicy: string, filledMeta: PolicyMeta, assignedTeams?: string[]) => {
    try {
      // Attach assignedTeams to meta
      const metaWithTeams = { ...filledMeta, assignedTeams: assignedTeams || [] };
      const response = await fetch(`/api/policies/${encodeURIComponent(policyName)}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: filledPolicy,
          meta: metaWithTeams,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save policy');
      }

      alert('Policy draft saved successfully to Firebase!');
    } catch (err) {
      console.error('Failed to save policy:', err);
      alert('Failed to save policy. Please try again.');
    }
  };

  const handleGeneratePDF = async (filledPolicy: string, filledMeta: PolicyMeta) => {
    try {
      const response = await fetch(`/api/policies/${encodeURIComponent(policyName)}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: filledPolicy,
          meta: filledMeta,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Check if the policy was updated (published)
      const wasUpdated = response.headers.get('X-Policy-Updated') === 'true';

      // Download the generated PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${policyName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (wasUpdated) {
        alert('Policy PDF generated and published successfully to Firebase! All users will now see the updated version when viewing this policy.');
      } else {
        alert('Policy PDF generated and saved to Firebase successfully!');
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
            <Button
              onClick={() => router.back()}
              variant="destructive"
            >
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
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/admin/policies')}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Policies
          </Button>
          <div className="text-gray-300">•</div>
          <span className="text-gray-800 font-medium">Edit Policy</span>
        </div>
      </div>

      {/* Policy Editor */}
      <div className="flex-1 overflow-auto bg-gray-50">
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