"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminWorkspaces } from '@/context/admin-workspaces';
import { FileText, User, Calendar, Target, Award, TrendingUp, Heart, CheckCircle, Users } from "lucide-react";
import AdminPageHeader from '@/components/admin/admin-page-header';
import ManagerSearchSelect from "@/components/admin/manager-search-select";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from "next/link";
import { db } from '@/lib/firebase';
import { workspaceDocPath } from '@/lib/paths';
import { doc, getDoc } from 'firebase/firestore';

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

export default function SupervisionPage() {
  const adminWorkspaces = useAdminWorkspaces();
  const defaultAdminWorkspace = adminWorkspaces && adminWorkspaces.length > 0 ? adminWorkspaces[0] : null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'form' | 'tracker'>('form');

  // Managers and supervisions for tracker
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [supervisions, setSupervisions] = useState<any[] | null>(null);
  const TRACKER_STORAGE_KEY = 'docuflow.admin.supervisions.tracker.v1';
  const [trackerState, setTrackerState] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(TRACKER_STORAGE_KEY) : null;
      if (raw) setTrackerState(JSON.parse(raw));
    } catch (e) {}
  }, []);

  const saveTrackerState = (next: Record<string, Record<string, boolean>>) => {
    setTrackerState(next);
    try { if (typeof window !== 'undefined') window.localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
  };

  useEffect(() => {
    let mounted = true;
    const fetchManagers = async () => {
      try {
        if (!defaultAdminWorkspace || !defaultAdminWorkspace.id) {
          setManagers([]);
          return;
        }
        const docPath = workspaceDocPath(defaultAdminWorkspace.id, undefined, defaultAdminWorkspace.organisationId);
        const ref = doc(db, docPath);
        const snap = await getDoc(ref);
        if (!mounted) return;
        if (!snap.exists()) {
          setManagers([]);
          return;
        }
        const data = snap.data() as any;
        const mgrs = Array.isArray(data?.managers) ? data.managers : [];
        setManagers(mgrs);
      } catch (err) {
        console.error('Error loading managers for tracker', err);
        setManagers([]);
      }
    };

    const fetchSupervisions = async () => {
      try {
        const res = await fetch('/api/admin/supervisions');
        if (!mounted) return;
        if (!res.ok) {
          setSupervisions([]);
          return;
        }
        const data = await res.json();
        // Expect array of supervisions with managerId and supervisionDate or createdAt
        setSupervisions(Array.isArray(data.supervisions) ? data.supervisions : (data?.items || []));
      } catch (err) {
        console.error('Error loading supervisions', err);
        setSupervisions([]);
      }
    };

    fetchManagers();
    fetchSupervisions();
    return () => { mounted = false; };
  }, [defaultAdminWorkspace]);

  const trackerYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y <= currentYear + 4; y++) years.push(y);
    return years;
  }, []);

  // Build a quick map of completed years per manager from supervisions
  const completedMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    if (!supervisions || !Array.isArray(supervisions)) return map;
    supervisions.forEach((s: any) => {
      const mid = s.managerId || s.manager?.id || s.managerId;
      const dateStr = s.supervisionDate || s.createdAt || s.updatedAt || s.date;
      if (!mid || !dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const y = String(d.getFullYear());
      if (!map[mid]) map[mid] = {};
      map[mid][y] = true;
    });
    return map;
  }, [supervisions]);

  const toggleTracker = (managerId: string, yearKey: string) => {
    const cur = trackerState[managerId] || {};
    const nextFor = { ...cur, [yearKey]: !cur[yearKey] };
    saveTrackerState({ ...trackerState, [managerId]: nextFor });
  };
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [role, setRole] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [supervisionDate, setSupervisionDate] = useState("");
  const [location, setLocation] = useState("");
  const [nextSupervisionDue, setNextSupervisionDue] = useState("");

  // Section states
  const [previousActions, setPreviousActions] = useState("");
  const [regulatoryCompliance, setRegulatoryCompliance] = useState("");
  const [careQuality, setCareQuality] = useState("");
  const [auditResults, setAuditResults] = useState("");
  const [staffingLevels, setStaffingLevels] = useState("");
  const [occupancyPerformance, setOccupancyPerformance] = useState("");
  const [leadershipSupport, setLeadershipSupport] = useState("");
  const [staffCulture, setStaffCulture] = useState("");
  const [positiveLeadership, setPositiveLeadership] = useState("");
  const [trainingCompleted, setTrainingCompleted] = useState("");
  const [learningNeeds, setLearningNeeds] = useState("");
  const [careerAspirations, setCareerAspirations] = useState("");
  const [workloadManagement, setWorkloadManagement] = useState("");
  const [additionalSupport, setAdditionalSupport] = useState("");
  const [wellbeingConcerns, setWellbeingConcerns] = useState("");
  const [agreedActions, setAgreedActions] = useState("");
  const [superviseeSignature, setSuperviseeSignature] = useState("");
  const [superviseeSignatureDate, setSuperviseeSignatureDate] = useState("");
  const [supervisorSignature, setSupervisorSignature] = useState("");
  const [supervisorSignatureDate, setSupervisorSignatureDate] = useState("");

  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSupervision = async (status: 'draft' | 'completed') => {
    if (!selectedManager) {
      alert('Please select a supervisee');
      return;
    }

    setIsSaving(true);
    try {
      const supervisionData = {
        workspaceId: selectedManager.workspaceId,
        managerId: selectedManager.id,
        managerName: selectedManager.name,
        role,
        supervisor,
        supervisionDate,
        location: location as 'in-person' | 'virtual' | 'care-home-site',
        nextSupervisionDue,
        previousActions,
        regulatoryCompliance,
        careQuality,
        auditResults,
        staffingLevels,
        occupancyPerformance,
        leadershipSupport,
        staffCulture,
        positiveLeadership,
        trainingCompleted,
        learningNeeds,
        careerAspirations,
        workloadManagement,
        additionalSupport,
        wellbeingConcerns,
        agreedActions,
        superviseeSignature,
        superviseeSignatureDate,
        supervisorSignature,
        supervisorSignatureDate,
        status,
        createdBy: 'admin' // TODO: Get from auth context
      };

      const response = await fetch('/api/admin/supervisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supervisionData),
      });

      if (!response.ok) {
        throw new Error('Failed to save supervision');
      }

      const result = await response.json();
      alert(`Supervision ${status === 'completed' ? 'completed' : 'saved as draft'} successfully!`);

    } catch (error) {
      console.error('Error saving supervision:', error);
      alert('Failed to save supervision. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => handleSaveSupervision('draft');
  const handleCompleteSupervision = () => handleSaveSupervision('completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
      {/* Header */}
      <>
        <AdminPageHeader
          title="Home Manager Supervision Record"
          subtitle="Regular supervision and development for Home Managers"
          icon={<Users className="w-5 h-5 text-white" />}
        />
        <div className="flex items-center gap-3 mb-4 px-6 md:px-8 lg:px-10">
          <Link href="/admin/supervision/history">
            <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <FileText className="w-4 h-4 mr-2" />
              View History
            </Button>
          </Link>
          <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Users className="w-4 h-4 mr-2" />
            New Supervision
          </Button>
        </div>
      </>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        <div className="w-full space-y-6">
          <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
        {/* Tabs and main content area */}
        <div>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode('form')} className={`px-3 py-1 rounded-md ${viewMode === 'form' ? 'bg-white text-slate-900' : 'bg-transparent text-slate-500'}`}>Form</button>
              <button onClick={() => setViewMode('tracker')} className={`px-3 py-1 rounded-md ${viewMode === 'tracker' ? 'bg-white text-slate-900' : 'bg-transparent text-slate-500'}`}>Tracker</button>
            </div>
          </div>

          {/* FORM VIEW */}
          {viewMode === 'form' && (
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left panel for details, sticky and NOT part of the form */}
          <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-6 border border-slate-200 shadow-xl mb-8 lg:mb-0 self-start">
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-160px)] lg:overflow-auto lg:pr-2">
              <h1 className="text-2xl lg:text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Home Manager Supervision</h1>
              <p className="mb-4 text-slate-500">Regular supervision and development for Home Managers</p>
              <div className="space-y-4 mt-4 p-1">
                <div>
                  <Label htmlFor="supervisee-name">Supervisee Name</Label>
                  <ManagerSearchSelect
                    value={selectedManager?.name || ""}
                    workspaceId={defaultAdminWorkspace?.id}
                    organisationId={defaultAdminWorkspace?.organisationId}
                    onChange={(manager) => {
                      setSelectedManager(manager);
                      if (manager) {
                        setRole("Home Manager");
                      } else {
                        setRole("");
                      }
                    }}
                    placeholder="Search for manager..."
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    placeholder="Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="supervisor">Supervisor</Label>
                  <Input
                    id="supervisor"
                    placeholder="Supervisor Name and Role"
                    value={supervisor}
                    onChange={(e) => setSupervisor(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="supervision-date">Date of Supervision</Label>
                  <Input
                    id="supervision-date"
                    type="date"
                    value={supervisionDate}
                    onChange={(e) => setSupervisionDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminWorkspaces.map((ws) => (
                        <SelectItem key={ws.id} value={ws.name}>{ws.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="next-supervision">Next Supervision Due</Label>
                  <Input
                    id="next-supervision"
                    type="date"
                    value={nextSupervisionDue}
                    onChange={(e) => setNextSupervisionDue(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main form right column, scrollable */}
          <div className="flex-1 min-w-0 pr-2">
            <form onSubmit={(e) => { e.preventDefault(); handleCompleteSupervision(); }} className="flex flex-col gap-8">

              {/* 1. Review of Previous Actions */}
              <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">1. Review of Previous Actions</h2>
                  <p className="text-sm text-muted-foreground">List actions agreed at last supervision and progress updates</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                placeholder="List actions agreed at last supervision and progress updates"
                value={previousActions}
                onChange={(e) => setPreviousActions(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* 2. Operational Performance */}
          <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">2. Operational Performance</h2>
                  <p className="text-sm text-muted-foreground">Assessment of key operational areas</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Regulatory compliance (CQC, LA, safeguarding)</Label>
                <Textarea
                  placeholder="Comments on regulatory compliance"
                  value={regulatoryCompliance}
                  onChange={(e) => setRegulatoryCompliance(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Care quality and outcomes for residents</Label>
                <Textarea
                  placeholder="Comments on care quality and resident outcomes"
                  value={careQuality}
                  onChange={(e) => setCareQuality(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Audit results, complaints, compliments</Label>
                <Textarea
                  placeholder="Comments on audit results and feedback"
                  value={auditResults}
                  onChange={(e) => setAuditResults(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Staffing levels, recruitment, retention</Label>
                <Textarea
                  placeholder="Comments on staffing"
                  value={staffingLevels}
                  onChange={(e) => setStaffingLevels(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Occupancy and business performance</Label>
                <Textarea
                  placeholder="Comments on occupancy and business performance"
                  value={occupancyPerformance}
                  onChange={(e) => setOccupancyPerformance(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Leadership & Management */}
          <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">3. Leadership & Management</h2>
                  <p className="text-sm text-muted-foreground">Assessment of leadership and team management</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">How are you supporting, supervising, and appraising your team?</Label>
                <Textarea
                  placeholder="Comments on team support and supervision"
                  value={leadershipSupport}
                  onChange={(e) => setLeadershipSupport(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">What challenges are you facing with staff culture, morale, or performance?</Label>
                <Textarea
                  placeholder="Comments on staff culture and challenges"
                  value={staffCulture}
                  onChange={(e) => setStaffCulture(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Examples of positive leadership demonstrated since last supervision</Label>
                <Textarea
                  placeholder="Examples of positive leadership"
                  value={positiveLeadership}
                  onChange={(e) => setPositiveLeadership(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Professional Development */}
          <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">4. Professional Development</h2>
                  <p className="text-sm text-muted-foreground">Training and development progress</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Training completed since last supervision</Label>
                <Textarea
                  placeholder="Training completed"
                  value={trainingCompleted}
                  onChange={(e) => setTrainingCompleted(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Identified learning or leadership development needs</Label>
                <Textarea
                  placeholder="Learning and development needs"
                  value={learningNeeds}
                  onChange={(e) => setLearningNeeds(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Career aspirations and support required</Label>
                <Textarea
                  placeholder="Career aspirations and support needed"
                  value={careerAspirations}
                  onChange={(e) => setCareerAspirations(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* 5. Reflection & Wellbeing */}
          <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">5. Reflection & Wellbeing</h2>
                  <p className="text-sm text-muted-foreground">Personal reflection and wellbeing assessment</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">How are you managing workload, pressure, and responsibilities?</Label>
                <Textarea
                  placeholder="Comments on workload management"
                  value={workloadManagement}
                  onChange={(e) => setWorkloadManagement(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Are there areas where you require additional support from senior management?</Label>
                <Textarea
                  placeholder="Additional support required"
                  value={additionalSupport}
                  onChange={(e) => setAdditionalSupport(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Any wellbeing concerns or adjustments needed?</Label>
                <Textarea
                  placeholder="Wellbeing concerns and adjustments"
                  value={wellbeingConcerns}
                  onChange={(e) => setWellbeingConcerns(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* 6. Agreed Actions & Support */}
          <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">6. Agreed Actions & Support</h2>
                  <p className="text-sm text-muted-foreground">Clear, measurable actions with timescales and responsible person</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                placeholder="List clear, measurable actions with timescales and responsible person"
                value={agreedActions}
                onChange={(e) => setAgreedActions(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* 7. Signatures */}
          <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">7. Signatures</h2>
                  <p className="text-sm text-muted-foreground">Formal approval and agreement</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Supervisee Signature</Label>
                  <Input
                    placeholder="Supervisee signature"
                    value={superviseeSignature}
                    onChange={(e) => setSuperviseeSignature(e.target.value)}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm">Date</Label>
                    <Input
                      type="date"
                      value={superviseeSignatureDate}
                      onChange={(e) => setSuperviseeSignatureDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-base font-medium">Supervisor Signature</Label>
                  <Input
                    placeholder="Supervisor signature"
                    value={supervisorSignature}
                    onChange={(e) => setSupervisorSignature(e.target.value)}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm">Date</Label>
                    <Input
                      type="date"
                      value={supervisorSignatureDate}
                      onChange={(e) => setSupervisorSignatureDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleCompleteSupervision}
                  disabled={isSaving}
                >
                  {isSaving ? 'Completing...' : 'Complete Supervision'}
                </Button>
              </div>
            </form>
          </div>
        </div>
          )}

          {/* TRACKER VIEW */}
          {viewMode === 'tracker' && (
            <div className="px-4 sm:px-8 lg:px-16">
              <div className="w-full">
                <div className="bg-white/90 rounded-2xl shadow-xl border border-blue-100 p-6 sm:p-10 mb-8 min-h-[240px] flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-blue-500"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>
                    <div>
                      <h2 className="text-2xl font-bold text-blue-900 leading-tight">Supervisions Tracker</h2>
                      <div className="text-blue-700 text-sm mt-1">Overview of manager supervisions by year</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-200 shadow-sm rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                          <th className="py-4 px-6 text-left font-semibold border-b border-blue-500">Manager</th>
                          {trackerYears.map((y) => (
                            <th key={y} className={`py-4 px-6 font-semibold border-b border-blue-500 text-center ${y === new Date().getFullYear() ? 'bg-blue-700' : ''}`}>
                              {y}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(managers || []).map((m: Manager, idx: number) => {
                          const managerId = m.id || `${m.name}-${idx}`;
                          const storedFor = trackerState[managerId] || {};
                          const completedFor = completedMap[managerId] || {};
                          return (
                            <tr key={managerId} className={`transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'} border-b border-gray-200`}>
                              <td className="py-4 px-6 font-medium text-gray-900 border-r border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedManager(m);
                                    setRole('Home Manager');
                                    setViewMode('form');
                                  }}
                                  className="text-left w-full text-gray-900 hover:underline"
                                >
                                  {m.name}
                                </button>
                              </td>
                              {trackerYears.map((yr) => {
                                const yearKey = String(yr);
                                const prefilled = !!completedFor[yearKey];
                                const stored = storedFor[yearKey];
                                const checked = stored || prefilled;
                                return (
                                  <td key={yearKey} className={`py-4 px-6 text-center border-r border-gray-200 cursor-pointer transition-all duration-200 hover:bg-blue-100 hover:shadow-inner ${yr === new Date().getFullYear() ? 'bg-blue-50' : ''}`} onClick={() => {
                                    if (checked) {
                                      toggleTracker(managerId, yearKey);
                                    } else {
                                      // Immediately prefill the form client-side so the '+' is responsive
                                      setSelectedManager(m);
                                      setRole('Home Manager');
                                      setSupervisionDate(`${yearKey}-01-01`);
                                      setViewMode('form');
                                      // update the URL so the state is shareable
                                      try {
                                        router.push(`/admin/supervision?managerId=${encodeURIComponent(managerId)}&year=${yearKey}`);
                                      } catch (e) {
                                        // ignore router errors
                                      }
                                    }
                                  }}>
                                    <div className="relative inline-block">
                                      {checked ? (
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-md bg-blue-500 text-white">✓</div>
                                      ) : (
                                        <div className="w-10 h-10 rounded-full border-2 border-gray-300 border-dashed flex items-center justify-center text-gray-400 hover:border-blue-400 transition-colors">
                                          <span className="text-xs">+</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  </div>
</div>
  );
}