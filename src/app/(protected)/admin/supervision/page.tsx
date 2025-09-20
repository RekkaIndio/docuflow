"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminWorkspaces } from '@/context/admin-workspaces';
import { FileText, User, Calendar, Target, Award, TrendingUp, Heart, CheckCircle, Users } from "lucide-react";
import ManagerSearchSelect from "@/components/admin/manager-search-select";
import Link from "next/link";

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
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white rounded-b-[64px] shadow-2xl mb-8">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-40 -translate-x-40"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 px-6 py-8 md:px-8 md:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4 -ml-20 md:-ml-32 lg:-ml-48">
                <div className="relative">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">Home Manager Supervision Record</h1>
                  <p className="text-blue-100 text-lg">Regular supervision and development for Home Managers</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
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
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/20 to-transparent rounded-b-[64px]"></div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        <div className="w-full space-y-6">
          <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
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
              <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
      </div>
    </div>
  </div>
</div>
  );
}