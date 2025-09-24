"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, User, Calendar, Target, Award, TrendingUp, Heart, CheckCircle } from "lucide-react";
import AdminPageHeader from '@/components/admin/admin-page-header';
import ManagerSearchSelect from "@/components/admin/manager-search-select";
import { useAdminWorkspaces } from '@/context/admin-workspaces';
import Link from "next/link";
import { db } from '@/lib/firebase';
import { workspaceDocPath } from '@/lib/paths';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';

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

export default function AppraisalsPage() {
  const adminWorkspaces = useAdminWorkspaces();
  const defaultAdminWorkspace = adminWorkspaces && adminWorkspaces.length > 0 ? adminWorkspaces[0] : null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'form' | 'tracker'>('form');

  // Managers and appraisals for tracker
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [appraisals, setAppraisals] = useState<any[] | null>(null);
  const TRACKER_STORAGE_KEY = 'docuflow.admin.appraisals.tracker.v1';
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

  const toggleTracker = (managerId: string, yearKey: string) => {
    const cur = trackerState[managerId] || {};
    const nextFor = { ...cur, [yearKey]: !cur[yearKey] };
    saveTrackerState({ ...trackerState, [managerId]: nextFor });
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

    const fetchAppraisals = async () => {
      try {
        const res = await fetch('/api/admin/appraisals');
        if (!mounted) return;
        if (!res.ok) {
          setAppraisals([]);
          return;
        }
        const data = await res.json();
        // Expect array of appraisals with managerId and appraisalDate or createdAt
        setAppraisals(Array.isArray(data) ? data : (data?.items || []));
      } catch (err) {
        console.error('Error loading appraisals', err);
        setAppraisals([]);
      }
    };

    fetchManagers();
    fetchAppraisals();
    return () => { mounted = false; };
  }, [defaultAdminWorkspace]);

  // If URL contains managerId & year, prefill the form after managers are loaded
  useEffect(() => {
    if (!managers || managers.length === 0) return;
    const mid = searchParams?.get?.('managerId');
    const year = searchParams?.get?.('year');
    if (!mid) return;
    const found = managers.find(m => m.id === mid || `${m.name}-${m.id}` === mid || `${m.name}` === mid);
    if (found) {
      setSelectedManager(found);
      // set a sensible date for the selected year (Jan 1)
      if (year) {
        setAppraisalDate(`${year}-01-01`);
      }
      setViewMode('form');
    }
  }, [managers, searchParams]);

  const trackerYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y <= currentYear + 4; y++) years.push(y);
    return years;
  }, []);

  // Build a quick map of completed years per manager from appraisals
  const completedMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    if (!appraisals || !Array.isArray(appraisals)) return map;
    appraisals.forEach((a: any) => {
      const mid = a.managerId || a.manager?.id || a.managerId;
      const dateStr = a.appraisalDate || a.createdAt || a.updatedAt || a.date;
      if (!mid || !dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const y = String(d.getFullYear());
      if (!map[mid]) map[mid] = {};
      map[mid][y] = true;
    });
    return map;
  }, [appraisals]);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [role, setRole] = useState("");
  const [appraiser, setAppraiser] = useState("");
  const [appraisalDate, setAppraisalDate] = useState("");
  const [periodCovered, setPeriodCovered] = useState("");
  
  // Previous objectives
  const [previousObjectives, setPreviousObjectives] = useState([
    { objective: "", status: "", comments: "" },
    { objective: "", status: "", comments: "" },
    { objective: "", status: "", comments: "" }
  ]);
  const [previousObjectivesOverallComments, setPreviousObjectivesOverallComments] = useState("");
  
  // Key performance areas
  const [careQualityCompliance, setCareQualityCompliance] = useState("");
  const [leadershipPeopleManagement, setLeadershipPeopleManagement] = useState("");
  const [residentOutcomesEngagement, setResidentOutcomesEngagement] = useState("");
  const [businessOperationalPerformance, setBusinessOperationalPerformance] = useState("");
  
  // Other sections
  const [strengthsAchievements, setStrengthsAchievements] = useState("");
  const [developmentNeeds, setDevelopmentNeeds] = useState("");
  const [nextObjectives, setNextObjectives] = useState(["", "", ""]);
  
  // Career development
  const [trainingCompleted, setTrainingCompleted] = useState("");
  const [trainingRequired, setTrainingRequired] = useState("");
  const [careerAspirations, setCareerAspirations] = useState("");
  
  // Wellbeing
  const [managingDemands, setManagingDemands] = useState("");
  const [seniorManagementSupport, setSeniorManagementSupport] = useState("");
  const [reasonableAdjustments, setReasonableAdjustments] = useState("");
  
  // Overall outcome
  const [overallRating, setOverallRating] = useState("");
  const [summaryCommentsAppraiser, setSummaryCommentsAppraiser] = useState("");
  const [summaryCommentsAppraisee, setSummaryCommentsAppraisee] = useState("");
  
  // Signatures
  const [managerSignature, setManagerSignature] = useState("");
  const [managerSignatureDate, setManagerSignatureDate] = useState("");
  const [appraiserSignature, setAppraiserSignature] = useState("");
  const [appraiserSignatureDate, setAppraiserSignatureDate] = useState("");
  
  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAppraisal = async (status: 'draft' | 'completed') => {
    if (!selectedManager) {
      alert('Please select a manager');
      return;
    }

    setIsSaving(true);
    try {
      const appraisalData = {
        workspaceId: selectedManager.workspaceId,
        managerId: selectedManager.id,
        managerName: selectedManager.name,
        role,
        appraiser,
        appraisalDate,
        periodCovered,
        previousObjectives,
        previousObjectivesOverallComments,
        careQualityCompliance,
        leadershipPeopleManagement,
        residentOutcomesEngagement,
        businessOperationalPerformance,
        strengthsAchievements,
        developmentNeeds,
        nextObjectives,
        trainingCompleted,
        trainingRequired,
        careerAspirations,
        managingDemands,
        seniorManagementSupport,
        reasonableAdjustments,
        overallRating,
        summaryCommentsAppraiser,
        summaryCommentsAppraisee,
        managerSignature,
        managerSignatureDate,
        appraiserSignature,
        appraiserSignatureDate,
        status,
        createdBy: 'admin' // TODO: Get from auth context
      };

      const response = await fetch('/api/admin/appraisals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appraisalData),
      });

      if (!response.ok) {
        throw new Error('Failed to save appraisal');
      }

      const result = await response.json();
      alert(`Appraisal ${status === 'completed' ? 'completed' : 'saved as draft'} successfully!`);
      
    } catch (error) {
      console.error('Error saving appraisal:', error);
      alert('Failed to save appraisal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => handleSaveAppraisal('draft');
  const handleCompleteAppraisal = () => handleSaveAppraisal('completed');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
      {/* Header */}
      <>
        <AdminPageHeader
          title="Home Manager – Annual Appraisal"
          subtitle="Annual review and development for Home Managers"
          icon={<FileText className="w-6 h-6 text-white" />}
        />
        <div className="flex items-center gap-3 mb-4 px-6 md:px-8 lg:px-10">
          <Link href="/admin/appraisals/history">
            <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <FileText className="w-4 h-4 mr-2" />
              View History
            </Button>
          </Link>
          <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <FileText className="w-4 h-4 mr-2" />
            New Appraisal
          </Button>
        </div>
      </>

  <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
        {/* Tabs and main content area: render tracker OR the two-column form layout */}
        <div>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode('form')} className={`px-3 py-1 rounded-md ${viewMode === 'form' ? 'bg-white text-slate-900' : 'bg-transparent text-slate-500'}`}>Form</button>
              <button onClick={() => setViewMode('tracker')} className={`px-3 py-1 rounded-md ${viewMode === 'tracker' ? 'bg-white text-slate-900' : 'bg-transparent text-slate-500'}`}>Tracker</button>
            </div>
          </div>

          {/* TRACKER VIEW */}
          {viewMode === 'tracker' && (
            <div className="px-4 sm:px-8 lg:px-16">
              <div className="w-full">
                <div className="bg-white/90 rounded-2xl shadow-xl border border-blue-100 p-6 sm:p-10 mb-8 min-h-[240px] flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-blue-500"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>
                    <div>
                      <h2 className="text-2xl font-bold text-blue-900 leading-tight">Appraisals Tracker</h2>
                      <div className="text-blue-700 text-sm mt-1">Overview of manager appraisals by year</div>
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
                                      setAppraisalDate(`${yearKey}-01-01`);
                                      setViewMode('form');
                                      // update the URL so the state is shareable
                                      try {
                                        router.push(`/admin/appraisals?managerId=${encodeURIComponent(managerId)}&year=${yearKey}`);
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

          {/* FORM VIEW */}
          {viewMode === 'form' && (
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Left panel for details, sticky and NOT part of the form */}
              <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-6 border border-slate-200 shadow-xl mb-8 lg:mb-0 self-start">
                <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-160px)] lg:overflow-auto lg:pr-2">
                  <h1 className="text-2xl lg:text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Home Manager – Annual Appraisal</h1>
                  <p className="mb-4 text-slate-500">Annual review and development for Home Managers. Complete all required fields.</p>
                  <div className="space-y-4 mt-4 p-1">
                    <div>
                      <Label htmlFor="employee-name">Employee Name</Label>
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
                      <Label htmlFor="appraiser">Appraiser</Label>
                      <Input
                        id="appraiser"
                        placeholder="Regional Director / Senior Role"
                        value={appraiser}
                        onChange={(e) => setAppraiser(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="appraisal-date">Date of Appraisal</Label>
                      <Input
                        id="appraisal-date"
                        type="date"
                        value={appraisalDate}
                        onChange={(e) => setAppraisalDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="period-covered">Period Covered</Label>
                      <Input
                        id="period-covered"
                        placeholder="From – To"
                        value={periodCovered}
                        onChange={(e) => setPeriodCovered(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main form right column, scrollable */}
              <div className="flex-1 min-w-0 pr-2">
                <form onSubmit={(e) => { e.preventDefault(); handleCompleteAppraisal(); }} className="flex flex-col gap-8">
                  {/* Row 1: Previous Objectives and Key Performance Areas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 1. Review of Previous Year's Objectives */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Target className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">1. Previous Objectives</h2>
                            <p className="text-sm text-muted-foreground">Assessment of previous year performance</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="grid grid-cols-1 gap-2 p-3 bg-slate-50 rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-sm">Objective {i}</Label>
                              <Input 
                                placeholder={`Objective ${i}`} 
                                className="h-8"
                                value={previousObjectives[i-1].objective}
                                onChange={(e) => {
                                  const newObjectives = [...previousObjectives];
                                  newObjectives[i-1].objective = e.target.value;
                                  setPreviousObjectives(newObjectives);
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-sm">Status</Label>
                                <Select
                                  value={previousObjectives[i-1].status}
                                  onValueChange={(value) => {
                                    const newObjectives = [...previousObjectives];
                                    newObjectives[i-1].status = value;
                                    setPreviousObjectives(newObjectives);
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="achieved">Achieved</SelectItem>
                                    <SelectItem value="partially">Partially</SelectItem>
                                    <SelectItem value="not-achieved">Not Achieved</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-sm">Comments</Label>
                                <Input 
                                  placeholder="Comments" 
                                  className="h-8"
                                  value={previousObjectives[i-1].comments}
                                  onChange={(e) => {
                                    const newObjectives = [...previousObjectives];
                                    newObjectives[i-1].comments = e.target.value;
                                    setPreviousObjectives(newObjectives);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="space-y-2">
                          <Label className="text-sm">Overall Comments</Label>
                          <Textarea 
                            placeholder="Comments on overall performance" 
                            className="min-h-[60px]"
                            value={previousObjectivesOverallComments}
                            onChange={(e) => setPreviousObjectivesOverallComments(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* 2. Key Performance Areas */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">2. Key Performance Areas</h2>
                            <p className="text-sm text-muted-foreground">Assessment across core performance areas</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {/* a. Care Quality & Compliance */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm">a. Care Quality & Compliance</h3>
                          <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                            <li>CQC inspections, LA monitoring, internal audits</li>
                            <li>Safeguarding management and incident reporting</li>
                            <li>Continuous improvement in care standards</li>
                          </ul>
                          <Textarea 
                            placeholder="Comments" 
                            className="min-h-[40px]"
                            value={careQualityCompliance}
                            onChange={(e) => setCareQualityCompliance(e.target.value)}
                          />
                        </div>

                        {/* b. Leadership & People Management */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm">b. Leadership & People Management</h3>
                          <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                            <li>Staff supervision, appraisal, training compliance</li>
                            <li>Recruitment, retention, absence management</li>
                            <li>Positive team culture and staff wellbeing</li>
                          </ul>
                          <Textarea 
                            placeholder="Comments" 
                            className="min-h-[40px]"
                            value={leadershipPeopleManagement}
                            onChange={(e) => setLeadershipPeopleManagement(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 2: Resident Outcomes and Business Performance */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardContent className="p-4 space-y-4">
                        {/* c. Resident Outcomes & Engagement */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm">c. Resident Outcomes & Engagement</h3>
                          <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                            <li>Resident and family feedback (surveys, compliments)</li>
                            <li>Resident involvement in care planning</li>
                            <li>Promoting dignity, independence, choice</li>
                          </ul>
                          <Textarea 
                            placeholder="Comments" 
                            className="min-h-[40px]"
                            value={residentOutcomesEngagement}
                            onChange={(e) => setResidentOutcomesEngagement(e.target.value)}
                          />
                        </div>

                        {/* d. Business & Operational Performance */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm">d. Business & Operational Performance</h3>
                          <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                            <li>Occupancy levels and financial management</li>
                            <li>Budget control and resource use</li>
                            <li>Contribution to organisational goals</li>
                          </ul>
                          <Textarea 
                            placeholder="Comments" 
                            className="min-h-[40px]"
                            value={businessOperationalPerformance}
                            onChange={(e) => setBusinessOperationalPerformance(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* 3. Strengths & Achievements */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Award className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">3. Strengths & Achievements</h2>
                            <p className="text-sm text-muted-foreground">Notable successes and positive contributions</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <Textarea
                          placeholder="Comments for notable successes, e.g., inspection outcomes, team development, service improvements"
                          className="min-h-[120px]"
                          value={strengthsAchievements}
                          onChange={(e) => setStrengthsAchievements(e.target.value)}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 3: Development Needs and Next Objectives */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 4. Development Needs */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">4. Development Needs</h2>
                            <p className="text-sm text-muted-foreground">Areas requiring improvement and support</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <Textarea
                          placeholder="Comments areas requiring improvement, training needs, or further support"
                          className="min-h-[100px]"
                          value={developmentNeeds}
                          onChange={(e) => setDevelopmentNeeds(e.target.value)}
                        />
                      </CardContent>
                    </Card>

                    {/* 5. Objectives for the Next 12 Months */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Target className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">5. Next 12 Months Objectives</h2>
                            <p className="text-sm text-muted-foreground">SMART objectives for the coming year</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="space-y-2">
                            <Label className="text-sm">Objective {i} (SMART)</Label>
                            <Input 
                              placeholder="Specific, Measurable, Achievable, Relevant, Time-bound" 
                              className="h-8"
                              value={nextObjectives[i-1]}
                              onChange={(e) => {
                                const newObjectives = [...nextObjectives];
                                newObjectives[i-1] = e.target.value;
                                setNextObjectives(newObjectives);
                              }}
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 4: Career Development and Wellbeing */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 6. Career Development & Training */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">6. Career Development</h2>
                            <p className="text-sm text-muted-foreground">Training history and future development needs</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Training completed last year</Label>
                          <Textarea 
                            placeholder="Training completed" 
                            className="min-h-[40px]"
                            value={trainingCompleted}
                            onChange={(e) => setTrainingCompleted(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Training required next year</Label>
                          <Textarea 
                            placeholder="Training required" 
                            className="min-h-[40px]"
                            value={trainingRequired}
                            onChange={(e) => setTrainingRequired(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Career progression aspirations</Label>
                          <Textarea 
                            placeholder="Career aspirations" 
                            className="min-h-[40px]"
                            value={careerAspirations}
                            onChange={(e) => setCareerAspirations(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* 7. Wellbeing & Support */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                            <Heart className="w-5 h-5 text-pink-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">7. Wellbeing & Support</h2>
                            <p className="text-sm text-muted-foreground">Personal wellbeing and support requirements</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Managing demands of the role</Label>
                          <Textarea 
                            placeholder="How are you managing the demands?" 
                            className="min-h-[40px]"
                            value={managingDemands}
                            onChange={(e) => setManagingDemands(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Support from senior management</Label>
                          <Textarea 
                            placeholder="Support required" 
                            className="min-h-[40px]"
                            value={seniorManagementSupport}
                            onChange={(e) => setSeniorManagementSupport(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Reasonable adjustments needed</Label>
                          <Textarea 
                            placeholder="Any adjustments needed" 
                            className="min-h-[40px]"
                            value={reasonableAdjustments}
                            onChange={(e) => setReasonableAdjustments(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 5: Overall Outcome and Signatures */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 8. Overall Appraisal Outcome */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">8. Overall Outcome</h2>
                            <p className="text-sm text-muted-foreground">Final assessment and recommendations</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-3">
                          <Label className="text-sm">Overall Rating</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "Exceeds Expectations", value: "exceeds" },
                              { label: "Meets Expectations", value: "meets" },
                              { label: "Requires Improvement", value: "requires-improvement" },
                              { label: "Unsatisfactory", value: "unsatisfactory" }
                            ].map((option) => (
                              <div key={option.value} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={option.value}
                                  checked={overallRating === option.value}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setOverallRating(option.value);
                                    } else {
                                      setOverallRating("");
                                    }
                                  }}
                                />
                                <Label htmlFor={option.value} className="text-xs">{option.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Summary Comments (Appraiser)</Label>
                            <Textarea 
                              placeholder="Appraiser comments" 
                              className="min-h-[60px]"
                              value={summaryCommentsAppraiser}
                              onChange={(e) => setSummaryCommentsAppraiser(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Summary Comments (Appraisee)</Label>
                            <Textarea 
                              placeholder="Appraisee comments" 
                              className="min-h-[60px]"
                              value={summaryCommentsAppraisee}
                              onChange={(e) => setSummaryCommentsAppraisee(e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Signatures */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">Signatures</h2>
                            <p className="text-sm text-muted-foreground">Formal approval and agreement</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-3">
                            <Label className="text-base font-medium">Manager (Appraisee)</Label>
                            <Input 
                              placeholder="Signature" 
                              className="h-8"
                              value={managerSignature}
                              onChange={(e) => setManagerSignature(e.target.value)}
                            />
                            <div className="space-y-2">
                              <Label className="text-sm">Date</Label>
                              <Input 
                                type="date" 
                                className="h-8"
                                value={managerSignatureDate}
                                onChange={(e) => setManagerSignatureDate(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-base font-medium">Regional Director (Appraiser)</Label>
                            <Input 
                              placeholder="Signature" 
                              className="h-8"
                              value={appraiserSignature}
                              onChange={(e) => setAppraiserSignature(e.target.value)}
                            />
                            <div className="space-y-2">
                              <Label className="text-sm">Date</Label>
                              <Input 
                                type="date" 
                                className="h-8"
                                value={appraiserSignatureDate}
                                onChange={(e) => setAppraiserSignatureDate(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

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
                      onClick={handleCompleteAppraisal}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Completing...' : 'Complete Appraisal'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
