"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, User, Calendar, Target, Award, TrendingUp, Heart, CheckCircle } from "lucide-react";
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

export default function AppraisalsPage() {
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
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white rounded-b-[64px] shadow-2xl mb-8">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-40 -translate-x-40"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 px-6 py-8 md:px-8 md:py-12">
    <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4 -ml-20 md:-ml-32 lg:-ml-48">
                <div className="relative">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">Home Manager – Annual Appraisal</h1>
                  <p className="text-blue-100 text-lg">Annual review and development for Home Managers</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
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
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/20 to-transparent rounded-b-[64px]"></div>
      </div>

  <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
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
            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
      </div>
    </div>
  );
}
