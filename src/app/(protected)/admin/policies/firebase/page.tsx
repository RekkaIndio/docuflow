"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, Download } from 'lucide-react';

interface PolicyDocument {
  id: string;
  policyName: string;
  originalPolicyName: string;
  content: string;
  meta: any;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
  version: string;
  pdfPath?: string;
  _refPath?: string;
}

interface FirebasePolicies {
  drafts: PolicyDocument[];
  published: PolicyDocument[];
  total: number;
}

export default function FirebasePoliciesPage() {
  const [policies, setPolicies] = useState<FirebasePolicies>({ drafts: [], published: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/policies/firebase');
      
      if (!response.ok) {
        throw new Error('Failed to load policies from Firebase');
      }

      const data = await response.json();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load Firebase policies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const deletePolicy = async (policyId: string, collectionOrPath: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) {
      return;
    }

    try {
      // If collectionOrPath looks like a full firestore path (contains '/'), pass as path param
      const isPath = collectionOrPath.includes('/');
      const url = isPath
        ? `/api/policies/firebase?path=${encodeURIComponent(collectionOrPath)}&id=${policyId}`
        : `/api/policies/firebase?id=${policyId}&collection=${collectionOrPath}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete policy');
      }

      alert('Policy deleted successfully!');
      loadPolicies(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete policy:', err);
      alert('Failed to delete policy. Please try again.');
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading policies from Firebase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Policies</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadPolicies} variant="destructive">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const PolicyCard = ({ policy, collection }: { policy: PolicyDocument; collection: string }) => (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{policy.originalPolicyName}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          policy.status === 'published' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {policy.status}
        </span>
      </div>
      
      <div className="text-sm text-gray-600 space-y-1 mb-3">
        <p><strong>Version:</strong> {policy.version}</p>
        <p><strong>Created:</strong> {new Date(policy.createdAt).toLocaleDateString()}</p>
        <p><strong>Updated:</strong> {new Date(policy.updatedAt).toLocaleDateString()}</p>
        {policy.meta?.effectiveDate && (
          <p><strong>Effective Date:</strong> {policy.meta.effectiveDate}</p>
        )}
      </div>

      <div className="flex gap-2">
        {policy.pdfPath && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.open(policy.pdfPath, '_blank')}
          >
            <Eye className="w-4 h-4 mr-1" />
            View PDF
          </Button>
        )}
        <Button 
          size="sm" 
          variant="destructive"
          onClick={() => deletePolicy(policy.id, collection)}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Firebase Policy Storage</h1>
          <p className="text-gray-600">
            Manage policies stored in Firebase. Total: {policies.total} policies
          </p>
          <Button onClick={loadPolicies} className="mt-4">
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Published Policies */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Published Policies ({policies.published.length})
            </h2>
            <div className="space-y-4">
              {policies.published.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No published policies found</p>
              ) : (
                policies.published.map((policy) => (
                  <PolicyCard 
                    key={policy.id} 
                    policy={policy} 
                    collection={policy._refPath || 'published_policies'} 
                  />
                ))
              )}
            </div>
          </div>

          {/* Draft Policies */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Draft Policies ({policies.drafts.length})
            </h2>
            <div className="space-y-4">
              {policies.drafts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No draft policies found</p>
              ) : (
                policies.drafts.map((policy) => (
                  <PolicyCard 
                    key={policy.id} 
                    policy={policy} 
                    collection="completed_policies" 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}