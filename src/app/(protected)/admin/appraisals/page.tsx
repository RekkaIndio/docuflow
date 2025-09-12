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
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden shadow-lg mb-8 rounded-b-2xl">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="relative z-10 px-6 py-8 md:px-8 md:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Home Manager – Annual Appraisal</h1>
                  <p className="text-blue-100 text-lg">Annual review and development for Home Managers</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <FileText className="w-4 h-4 mr-2" />
                  New Appraisal
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/20 to-transparent rounded-b-2xl"></div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Basic Information Card */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Appraisal Details</h2>
                  <p className="text-sm text-muted-foreground">Basic information about the appraisal</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-name">Employee Name</Label>
                  <ManagerSearchSelect
                    value={selectedManager?.name || ""}
                    onChange={(manager) => {
                      setSelectedManager(manager);
                      // Auto-populate role as "Home Manager" when a manager is selected
                      if (manager) {
                        setRole("Home Manager");
                      } else {
                        setRole("");
                      }
                    }}
                    placeholder="Search for manager..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    placeholder="Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appraiser">Appraiser</Label>
                  <Input
                    id="appraiser"
                    placeholder="Regional Director / Senior Role"
                    value={appraiser}
                    onChange={(e) => setAppraiser(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appraisal-date">Date of Appraisal</Label>
                  <Input
                    id="appraisal-date"
                    type="date"
                    value={appraisalDate}
                    onChange={(e) => setAppraisalDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-covered">Period Covered</Label>
                  <Input
                    id="period-covered"
                    placeholder="From – To"
                    value={periodCovered}
                    onChange={(e) => setPeriodCovered(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
                      <Input placeholder={`Objective ${i}`} className="h-8" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm">Status</Label>
                        <Select>
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
                        <Input placeholder="Comments" className="h-8" />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="space-y-2">
                  <Label className="text-sm">Overall Comments</Label>
                  <Textarea placeholder="Comments on overall performance" className="min-h-[60px]" />
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
                  <Textarea placeholder="Comments" className="min-h-[40px]" />
                </div>

                {/* b. Leadership & People Management */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">b. Leadership & People Management</h3>
                  <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                    <li>Staff supervision, appraisal, training compliance</li>
                    <li>Recruitment, retention, absence management</li>
                    <li>Positive team culture and staff wellbeing</li>
                  </ul>
                  <Textarea placeholder="Comments" className="min-h-[40px]" />
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
                  <Textarea placeholder="Comments" className="min-h-[40px]" />
                </div>

                {/* d. Business & Operational Performance */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">d. Business & Operational Performance</h3>
                  <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                    <li>Occupancy levels and financial management</li>
                    <li>Budget control and resource use</li>
                    <li>Contribution to organisational goals</li>
                  </ul>
                  <Textarea placeholder="Comments" className="min-h-[40px]" />
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
                    <Input placeholder="Specific, Measurable, Achievable, Relevant, Time-bound" className="h-8" />
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
                  <Textarea placeholder="Training completed" className="min-h-[40px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Training required next year</Label>
                  <Textarea placeholder="Training required" className="min-h-[40px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Career progression aspirations</Label>
                  <Textarea placeholder="Career aspirations" className="min-h-[40px]" />
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
                  <Textarea placeholder="How are you managing the demands?" className="min-h-[40px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Support from senior management</Label>
                  <Textarea placeholder="Support required" className="min-h-[40px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Reasonable adjustments needed</Label>
                  <Textarea placeholder="Any adjustments needed" className="min-h-[40px]" />
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
                        <Checkbox id={option.value} />
                        <Label htmlFor={option.value} className="text-xs">{option.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Summary Comments (Appraiser)</Label>
                    <Textarea placeholder="Appraiser comments" className="min-h-[60px]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Summary Comments (Appraisee)</Label>
                    <Textarea placeholder="Appraisee comments" className="min-h-[60px]" />
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
                    <Input placeholder="Signature" className="h-8" />
                    <div className="space-y-2">
                      <Label className="text-sm">Date</Label>
                      <Input type="date" className="h-8" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Regional Director (Appraiser)</Label>
                    <Input placeholder="Signature" className="h-8" />
                    <div className="space-y-2">
                      <Label className="text-sm">Date</Label>
                      <Input type="date" className="h-8" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline">Save Draft</Button>
            <Button className="bg-blue-600 hover:bg-blue-700">Complete Appraisal</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
