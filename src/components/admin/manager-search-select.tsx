"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { workspaceDocPath } from '@/lib/paths';
import { doc, getDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, Building, ChevronDown, X } from 'lucide-react';

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  workspaceId: string;
  workspaceName: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ManagerSearchSelectProps {
  value?: string;
  onChange: (manager: Manager | null) => void;
  // Optional: explicitly specify which workspace to read managers from.
  workspaceId?: string | null;
  organisationId?: string | null;
  placeholder?: string;
  className?: string;
}

export default function ManagerSearchSelect({
  value,
  onChange,
  placeholder = "Search for a manager...",
  className = "",
  workspaceId: propWorkspaceId,
  organisationId: propOrganisationId,
}: ManagerSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user, loading: authLoading } = useAuth();

  // Fetch managers on component mount (but wait for auth hydration)
  useEffect(() => {
    const fetchManagers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Prefer loading managers from the current workspace document (client-side read)
        // This mirrors how TeamsView reads managers and avoids calling the admin-only endpoint.
  // Prefer props if provided (useful for admin pages where the user context may not indicate the target workspace)
  const workspaceId = propWorkspaceId || (user as any)?.workspaceId || (user as any)?.currentWorkspaceId;
  const orgId = propOrganisationId || (user as any)?.organisationId;

        if (!workspaceId) {
          // No workspace context available; return empty list
          setManagers([]);
          setFilteredManagers([]);
          return;
        }

  const docPath = workspaceDocPath(workspaceId, undefined, orgId);
  const docRef = doc(db, docPath);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setManagers([]);
          setFilteredManagers([]);
          return;
        }
        const data = snap.data() as any;
        const mgrs = Array.isArray(data?.managers) ? data.managers : [];
        setManagers(mgrs);
        setFilteredManagers(mgrs);
      } catch (err) {
        console.error('Error fetching managers:', err);
        setError('Failed to load managers');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch after auth finishes hydrating so organisationId is available
    if (!authLoading) {
      fetchManagers();
    }
  }, [authLoading, user]);

  // Filter managers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredManagers(managers);
    } else {
      const filtered = managers.filter(manager =>
        manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.workspaceName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredManagers(filtered);
    }
  }, [searchTerm, managers]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selection
  const handleSelect = (manager: Manager) => {
    setSelectedManager(manager);
    setSearchTerm(manager.name);
    setIsOpen(false);
    onChange(manager);
  };

  // Handle clearing selection
  const handleClear = () => {
    setSelectedManager(null);
    setSearchTerm('');
    onChange(null);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          className="pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {selectedManager ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto shadow-lg border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading managers...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-500">
                {error}
              </div>
            ) : filteredManagers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchTerm ? 'No managers found' : 'No managers available'}
              </div>
            ) : (
              <div className="py-1">
                {filteredManagers.map((manager) => (
                  <button
                    key={manager.id}
                    type="button"
                    onClick={() => handleSelect(manager)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {manager.name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {manager.email}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Building className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 truncate">
                            {manager.workspaceName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected manager display (when not editing) */}
      {selectedManager && !isOpen && (
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{selectedManager.name}</div>
              <div className="text-sm text-gray-600">{selectedManager.email}</div>
              <div className="flex items-center gap-1 mt-1">
                <Building className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{selectedManager.workspaceName}</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Manager
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}