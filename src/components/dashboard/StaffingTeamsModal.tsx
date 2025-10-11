"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Sun, Moon, Save, X } from 'lucide-react';
import { doc, setDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { DialogDescription } from '@/components/ui/dialog';
import { workspaceCollectionPath } from '@/lib/paths';
import { getWorkspaceCollectionRef, getWorkspaceDocRef } from '@/lib/firestore';
import { db } from '@/lib/firebase';

interface StaffingTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  organisationId?: string | null;
}

interface TeamStaffing {
  management: { day: number; night: number };
  nurses: { day: number; night: number };
  ctm: { day: number; night: number };
  domestic: { day: number; night: number };
  kitchen: { day: number; night: number };
  maintenance: { day: number; night: number };
}

const teamCategories = [
  { key: 'management', label: 'Management', icon: Users },
  { key: 'nurses', label: 'Nurses', icon: Users },
  { key: 'ctm', label: 'CTM', icon: Users },
  { key: 'domestic', label: 'Domestic', icon: Users },
  { key: 'kitchen', label: 'Kitchen', icon: Users },
  { key: 'maintenance', label: 'Maintenance', icon: Users },
] as const;

export function StaffingTeamsModal({ isOpen, onClose, workspaceId, organisationId }: StaffingTeamsModalProps) {
  const [staffingData, setStaffingData] = useState<TeamStaffing>({
    management: { day: 0, night: 0 },
    nurses: { day: 0, night: 0 },
    ctm: { day: 0, night: 0 },
    domestic: { day: 0, night: 0 },
    kitchen: { day: 0, night: 0 },
    maintenance: { day: 0, night: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Load existing staffing data
  useEffect(() => {
    if (!workspaceId || !isOpen) return;

    setLoading(true);
    try {
      // Try to read orgId from workspace stored in the top-level app state when available.
      // Fallback: pass null which the helper treats as legacy top-level path.
      const orgId = null as string | null;
      const colRef = getWorkspaceCollectionRef(workspaceId, 'daily-checkins', orgId);
      if (!colRef) {
        setLoading(false);
        return;
      }
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(1));
      const unsub = onSnapshot(q, (snap: any) => {
        if (!snap.empty) {
          const latestDoc = snap.docs[0];
          const data = latestDoc.data();
          const teamsData = data.staffingTeams || {};

          setStaffingData({
            management: { day: teamsData.management?.day || 0, night: teamsData.management?.night || 0 },
            nurses: { day: teamsData.nurses?.day || 0, night: teamsData.nurses?.night || 0 },
            ctm: { day: teamsData.ctm?.day || 0, night: teamsData.ctm?.night || 0 },
            domestic: { day: teamsData.domestic?.day || 0, night: teamsData.domestic?.night || 0 },
            kitchen: { day: teamsData.kitchen?.day || 0, night: teamsData.kitchen?.night || 0 },
            maintenance: { day: teamsData.maintenance?.day || 0, night: teamsData.maintenance?.night || 0 },
          });
        }
        setLoading(false);
      }, (err) => {
        console.error('Failed to load staffing teams data', err);
        if (err && (err.code === 'permission-denied' || String(err).toLowerCase().includes('insufficient permissions'))) {
          setPermissionDenied(true);
        }
        setLoading(false);
      });
      return () => unsub();
    } catch (e) {
      console.error('Failed to set up staffing teams listener', e);
      setLoading(false);
    }
  }, [workspaceId, isOpen]);

  const handleInputChange = (team: keyof TeamStaffing, shift: 'day' | 'night', value: string) => {
    const numValue = Math.max(0, parseInt(value || '0', 10));
    setStaffingData(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [shift]: numValue
      }
    }));
  };

  const calculateTotals = () => {
    const dayTotal = Object.values(staffingData).reduce((sum, team) => sum + team.day, 0);
    const nightTotal = Object.values(staffingData).reduce((sum, team) => sum + team.night, 0);
    return { dayTotal, nightTotal, total: dayTotal + nightTotal };
  };

  const handleSave = async () => {
    if (!workspaceId) return;

    setError(null);
    setSaving(true);

    try {
      const now = new Date();
      const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const orgId = null as string | null;
      const docRef = getWorkspaceDocRef(workspaceId, 'daily-checkins', dateKey, orgId);
      if (!docRef) throw new Error('Cannot determine daily-checkins path');

      // Calculate totals for backward compatibility
      const { dayTotal, nightTotal } = calculateTotals();

      await setDoc(docRef, {
        staffingTeams: staffingData,
        staffingDay: dayTotal,
        staffingNight: nightTotal,
        createdAt: now,
        recordedAt: now,
      }, { merge: true });

      onClose();
    } catch (e) {
      setError('Failed to save staffing teams data');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const { dayTotal, nightTotal, total } = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl p-0">
        {/* Dark hero header to match dashboard style */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Staffing Teams Breakdown</h2>
                <DialogDescription className="text-slate-300 text-sm mt-1">Detailed staffing breakdown by team and shift</DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-b-lg border-0 shadow-none">
          <CardContent className="p-6">
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8">Loading staffing data...</div>
              ) : permissionDenied ? (
                <div className="text-center py-8">
                  <div className="text-sm text-amber-700 font-medium">You don't have permission to view historical staffing teams data.</div>
                  <div className="text-xs text-amber-600 mt-2">Ask your workspace administrator to grant access or record today&apos;s staffing using the button below.</div>
                </div>
              ) : (
                <>
                  {/* Summary Card */}
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                        <Users className="h-5 w-5" />
                        Total Staffing Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200/50">
                          <Sun className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-600">{dayTotal}</div>
                          <div className="text-sm text-gray-600">Day Shift</div>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200/50">
                          <Moon className="h-6 w-6 text-indigo-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-indigo-600">{nightTotal}</div>
                          <div className="text-sm text-gray-600">Night Shift</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200/50">
                          <Users className="h-6 w-6 text-green-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-green-600">{total}</div>
                          <div className="text-sm text-gray-600">Total Staff</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Staffing Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamCategories.map(({ key, label, icon: Icon }) => (
                      <Card key={key} className="hover:shadow-md transition-shadow duration-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                            <Icon className="h-4 w-4 text-blue-600" />
                            {label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1 text-sm text-gray-700">
                                <Sun className="h-3 w-3 text-yellow-500" />
                                Day Shift
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                value={staffingData[key].day}
                                onChange={(e) => handleInputChange(key, 'day', e.target.value)}
                                className="text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                disabled={saving}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1 text-sm text-gray-700">
                                <Moon className="h-3 w-3 text-indigo-500" />
                                Night Shift
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                value={staffingData[key].night}
                                onChange={(e) => handleInputChange(key, 'night', e.target.value)}
                                className="text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                disabled={saving}
                              />
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 text-center font-medium">
                            Total: {staffingData[key].day + staffingData[key].night} staff
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {error && (
                    <div className="text-red-600 text-center font-medium bg-red-50 p-3 rounded-lg border border-red-200">
                      {error}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={onClose} disabled={saving} className="border-gray-300 hover:bg-gray-50">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Staffing'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}