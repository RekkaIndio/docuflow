"use client";

import React, { useEffect, useState } from 'react';
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
  const [policyContent, setPolicyContent] = useState<string>('');
  const [policyMeta, setPolicyMeta] = useState<PolicyMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [policyName, setPolicyName] = useState<string>('');

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

  const handleSave = async (filledPolicy: string, filledMeta: PolicyMeta) => {
    try {
      const response = await fetch(`/api/policies/${encodeURIComponent(policyName)}/save`, {
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
      {/* Header */}
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
        />
      </div>
    </div>
  );
}