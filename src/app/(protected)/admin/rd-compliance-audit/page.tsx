"use client";

import React, { useState } from "react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ProfessionalVisitor {
  name: string;
  role: string;
  comments: string;
}

interface StaffEntry {
  name: string;
  role: string;
  safeguarding: string;
  cqc: string;
  mcaDols: string;
  iddsiKnowledge: string;
  fileChecklist: Record<string, string>;
  fileComments: string;
}

const yesNoOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const yesNoNaOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "na", label: "N/A" },
];

const metOptions = [
  { value: "met", label: "Met" },
  { value: "partly-met", label: "Partly Met" },
  { value: "not-met", label: "Not Met" },
];

const staffFileChecklistItems = [
  { key: "interview", label: "Interview" },
  { key: "identification", label: "Identification" },
  { key: "cv", label: "CV" },
  { key: "contract", label: "Contract" },
  { key: "rightToWork", label: "Right to work" },
  { key: "induction", label: "Induction" },
  { key: "supervisions", label: "Supervisions" },
  { key: "appraisal", label: "Appraisal" },
];

const safetyCertificates = [
  { key: "fireRiskAssessment", label: "Fire Risk Assessment – Annual Review" },
  { key: "legionellaRiskAssessment", label: "Legionella Risk Assessment – Annual internal review" },
  { key: "legionellaSample", label: "Legionella Sample Certificate – 6 Monthly" },
  { key: "liftLoler", label: "Lift LOLER – 6 Monthly" },
  { key: "hoistLoler", label: "Hoist LOLER – 6 Monthly" },
  { key: "slingLoler", label: "Sling LOLER – 6 Monthly" },
  { key: "weighChairService", label: "Weigh Chair Service – Annual" },
  { key: "fireAlarm", label: "Fire Alarm – 6 Monthly" },
  { key: "emergencyLights", label: "Emergency Lights – Annual" },
  { key: "fireEquipment", label: "Fire Equipment – Annual" },
  { key: "gasAppliances", label: "Gas Appliances (Boilers)/Gas Soundness – Annual" },
  { key: "gasEquipment", label: "Gas Equipment (Kitchen & Laundry) – Annual" },
  { key: "patTest", label: "PAT Test – Annual" },
  { key: "extractClean", label: "Kitchen Extract/Laundry Ducting clean – Annual" },
  { key: "eicr", label: "5 Yearly Electrical Inspection (EICR) – 5 years" },
  { key: "asbestos", label: "Asbestos Risk Assessment – where applicable" },
  { key: "bedInspection", label: "Bed Inspection – Annual (MO Completes)" },
];

export default function RDComplianceAuditPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [professionalVisitors, setProfessionalVisitors] = useState<ProfessionalVisitor[]>([
    { name: "", role: "", comments: "" },
  ]);
  const [staffEntries, setStaffEntries] = useState<StaffEntry[]>([
    {
      name: "",
      role: "",
      safeguarding: "",
      cqc: "",
      mcaDols: "",
      iddsiKnowledge: "",
      fileChecklist: staffFileChecklistItems.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = "";
        return acc;
      }, {}),
      fileComments: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVisitorChange = (index: number, field: keyof ProfessionalVisitor, value: string) => {
    setProfessionalVisitors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addVisitor = () => {
    setProfessionalVisitors((prev) => [...prev, { name: "", role: "", comments: "" }]);
  };

  const removeVisitor = (index: number) => {
    setProfessionalVisitors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStaffChange = (
    index: number,
    field: keyof Omit<StaffEntry, "fileChecklist">,
    value: string,
  ) => {
    setStaffEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleStaffChecklistChange = (index: number, itemKey: string, value: string) => {
    setStaffEntries((prev) => {
      const next = [...prev];
      const updatedChecklist = { ...next[index].fileChecklist, [itemKey]: value };
      next[index] = { ...next[index], fileChecklist: updatedChecklist };
      return next;
    });
  };

  const addStaffEntry = () => {
    setStaffEntries((prev) => [
      ...prev,
      {
        name: "",
        role: "",
        safeguarding: "",
        cqc: "",
        mcaDols: "",
        iddsiKnowledge: "",
        fileChecklist: staffFileChecklistItems.reduce<Record<string, string>>((acc, item) => {
          acc[item.key] = "";
          return acc;
        }, {}),
        fileComments: "",
      },
    ]);
  };

  const removeStaffEntry = (index: number) => {
    setStaffEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      console.log("RD compliance audit (preview)", {
        form,
        professionalVisitors,
        staffEntries,
      });
      alert("Audit response captured locally. Submission handling to be implemented.");
    } catch (error) {
      console.error("RD compliance audit submission error", error);
      alert("Could not submit the audit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSelect = (
    field: string,
    label: string,
    options: { value: string; label: string }[],
    placeholder = "Select option",
  ) => (
    <div className="space-y-2" key={field}>
      <Label htmlFor={field}>{label}</Label>
      <Select value={form[field] ?? ""} onValueChange={(value) => setField(field, value)}>
        <SelectTrigger id={field} className="bg-white">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderTextArea = (field: string, label: string, placeholder?: string) => (
    <div className="space-y-2" key={field}>
      <Label htmlFor={field}>{label}</Label>
      <Textarea
        id={field}
        value={form[field] ?? ""}
        onChange={(event) => setField(field, event.target.value)}
        placeholder={placeholder}
        className="min-h-[80px]"
      />
    </div>
  );

  const renderInput = (field: string, label: string, type = "text", placeholder?: string) => (
    <div className="space-y-2" key={field}>
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        type={type}
        value={form[field] ?? ""}
        onChange={(event) => setField(field, event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminPageHeader
        title="RD Compliance Audit"
        subtitle="Complete the Regional Director compliance review for each visit"
        icon={<ClipboardCheck className="w-6 h-6 text-white" />}
      />
      <div className="px-6 pb-12 md:px-8 lg:px-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Visit overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderInput("auditDate", "Date", "date")}
              {renderInput("home", "Home")}
              {renderSelect("announced", "Announced or unannounced", [
                { value: "announced", label: "Announced" },
                { value: "unannounced", label: "Unannounced" },
              ])}
              {renderInput("visitDuration", "Duration of visit")}
              {renderInput("registeredManager", "Registered manager name")}
              {renderInput("responsiblePerson", "Responsible person at the time of visit")}
              {renderInput("occupancy", "Occupancy")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previous actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderSelect(
                "previousActionPlanStatus",
                "Have actions from the last action plan been completed?",
                metOptions,
                "Select status",
              )}
              {renderTextArea(
                "previousActionPlanComments",
                "Comments",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resident and relative discussions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "discussionFacilities", label: "Facilities" },
                { key: "discussionCare", label: "Care" },
                { key: "discussionStaff", label: "Staff in general" },
                { key: "discussionActivities", label: "Activities" },
                { key: "discussionInclusion", label: "Inclusion in care planning where applicable" },
              ].map((item) =>
                renderTextArea(
                  item.key,
                  item.label,
                  "Capture verbatim feedback and any required follow-up",
                ),
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activities review</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderSelect(
                "activityPlannerVisible",
                "Is there a well displayed clear activity planner in place?",
                yesNoOptions,
              )}
              {renderTextArea(
                "activityPlannerVisibleComments",
                "Comments – activity planner",
              )}
              {renderSelect(
                "activityFollowingPlanner",
                "Are the activities as per the planner at the time of visit?",
                yesNoOptions,
              )}
              {renderTextArea(
                "activityFollowingPlannerComments",
                "Comments – alignment with planner",
              )}
              {renderSelect(
                "activitySuitable",
                "Are the activities suitable to the residents' needs?",
                yesNoOptions,
              )}
              {renderTextArea(
                "activitySuitableComments",
                "Comments – suitability",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resident presentation</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTextArea(
                "residentAppearance",
                "Residents' appearance and general presentation",
                "Include observations on hair, nails, clothing, facial hair, jewellery, etc.",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engagement and meetings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderInput("lastResidentsMeeting", "Last date of residents meeting", "date")}
              {renderTextArea(
                "lastResidentsMeetingActions",
                "Actions from residents meeting",
              )}
              {renderSelect(
                "oneToOnesInPlace",
                "Are there any 1-1s in place?",
                yesNoOptions,
              )}
              {renderTextArea(
                "oneToOnesDocumentation",
                "If yes, is documentation correct? Include carer knowledge checks.",
              )}
              {renderInput("lastRelativesMeeting", "Last date of relatives meeting", "date")}
              {renderTextArea(
                "lastRelativesMeetingActions",
                "Actions from relatives meeting",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Professional visitors feedback</CardTitle>
              <Button type="button" onClick={addVisitor} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add visitor
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {professionalVisitors.map((visitor, index) => (
                <div key={`visitor-${index}`} className="rounded-lg border bg-white p-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`visitor-name-${index}`}>Name</Label>
                      <Input
                        id={`visitor-name-${index}`}
                        value={visitor.name}
                        onChange={(event) => handleVisitorChange(index, "name", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`visitor-role-${index}`}>Role</Label>
                      <Input
                        id={`visitor-role-${index}`}
                        value={visitor.role}
                        onChange={(event) => handleVisitorChange(index, "role", event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`visitor-comments-${index}`}>Comments</Label>
                    <Textarea
                      id={`visitor-comments-${index}`}
                      value={visitor.comments}
                      onChange={(event) => handleVisitorChange(index, "comments", event.target.value)}
                      placeholder="Summarise feedback from the professional visitor"
                    />
                  </div>
                  {professionalVisitors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-600"
                      onClick={() => removeVisitor(index)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove visitor
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Staff conversations and file review</CardTitle>
              <Button type="button" onClick={addStaffEntry} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add staff member
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {staffEntries.map((staff, index) => (
                <div key={`staff-${index}`} className="space-y-6 rounded-lg border bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`staff-name-${index}`}>Staff name</Label>
                      <Input
                        id={`staff-name-${index}`}
                        value={staff.name}
                        onChange={(event) => handleStaffChange(index, "name", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`staff-role-${index}`}>Staff role</Label>
                      <Input
                        id={`staff-role-${index}`}
                        value={staff.role}
                        onChange={(event) => handleStaffChange(index, "role", event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`staff-safeguarding-${index}`}>Safeguarding knowledge</Label>
                      <Textarea
                        id={`staff-safeguarding-${index}`}
                        value={staff.safeguarding}
                        onChange={(event) => handleStaffChange(index, "safeguarding", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`staff-cqc-${index}`}>CQC knowledge</Label>
                      <Textarea
                        id={`staff-cqc-${index}`}
                        value={staff.cqc}
                        onChange={(event) => handleStaffChange(index, "cqc", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`staff-mca-${index}`}>MCA / DoLS knowledge</Label>
                      <Textarea
                        id={`staff-mca-${index}`}
                        value={staff.mcaDols}
                        onChange={(event) => handleStaffChange(index, "mcaDols", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`staff-iddsi-${index}`}>IDDSI knowledge</Label>
                      <Textarea
                        id={`staff-iddsi-${index}`}
                        value={staff.iddsiKnowledge}
                        onChange={(event) => handleStaffChange(index, "iddsiKnowledge", event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Staff file checks</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {staffFileChecklistItems.map((item) => (
                        <div key={`${item.key}-${index}`} className="space-y-2">
                          <Label>{item.label}</Label>
                          <Select
                            value={staff.fileChecklist[item.key] ?? ""}
                            onValueChange={(value) => handleStaffChecklistChange(index, item.key, value)}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="na">N/A</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`staff-file-comments-${index}`}>Staff file comments</Label>
                      <Textarea
                        id={`staff-file-comments-${index}`}
                        value={staff.fileComments}
                        onChange={(event) => handleStaffChange(index, "fileComments", event.target.value)}
                        placeholder="Summarise key findings from the staff file review"
                      />
                    </div>
                  </div>
                  {staffEntries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-600"
                      onClick={() => removeStaffEntry(index)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove staff member
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staffing overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderInput(
                "careStaffCount",
                "How many care staff are in the building?",
                "number",
                "Enter headcount",
              )}
              {renderTextArea(
                "careStaffCountComments",
                "Comments – staffing numbers",
              )}
              {renderSelect(
                "careStaffMatchesRota",
                "Does this match the rota?",
                yesNoOptions,
              )}
              {renderTextArea(
                "careStaffMatchesRotaComments",
                "Comments – rota alignment",
              )}
              {renderSelect(
                "careStaffMeetsDependency",
                "Does staffing meet dependency needs?",
                yesNoOptions,
              )}
              {renderTextArea(
                "careStaffDependencyComments",
                "Comments – dependency needs",
              )}
              {renderInput(
                "trainingFireStats",
                "Staff training stats – Fire",
              )}
              {renderInput(
                "trainingMovingHandling",
                "Staff training stats – Moving and handling",
              )}
              {renderInput(
                "trainingFirstAid",
                "Staff training stats – First aid",
              )}
              {renderInput(
                "trainingMedication",
                "Staff training stats – Medication",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly audits and oversight</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderSelect(
                "monthlyAuditsCompleted",
                "Have the monthly audits been completed?",
                yesNoOptions,
              )}
              {renderTextArea(
                "monthlyAuditsComments",
                "Comments – monthly audits",
              )}
              {renderTextArea(
                "weightLossOverview",
                "Weight loss overview",
              )}
              {renderTextArea(
                "woundOverview",
                "Wound overview",
              )}
              {renderTextArea(
                "accidentIncidentOverview",
                "Accident and incident overview",
              )}
              {renderTextArea(
                "cqcSafeguardOverview",
                "CQC and safeguard overview",
              )}
              {renderTextArea(
                "dolsOverview",
                "DoLS overview",
              )}
              {renderTextArea(
                "callBellOverview",
                "Call bell overview",
              )}
              {renderTextArea(
                "iddsiOverview",
                "IDDSI overview",
              )}
              {renderTextArea(
                "riskRegisterOverview",
                "Risk register overview",
              )}
              {renderSelect(
                "auditActionsCompleted",
                "Have all actions from audit action plans been completed?",
                yesNoOptions,
              )}
              {renderTextArea(
                "auditActionsComments",
                "Comments – audit action plans",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality and compliance records</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {[
                { key: "accidentsSignedOff", label: "Accidents and incidents signed off" },
                { key: "carePlanReviewsOverdue", label: "Any care plan reviews overdue?" },
                { key: "triangulationInPlace", label: "Triangulation in place (spot check 10%)" },
                { key: "woundReviewsOverdue", label: "Wound reviews overdue?" },
                { key: "iddsiRecordsCorrect", label: "IDDSI records correct?" },
                { key: "missedCare", label: "Any missed care?" },
                { key: "residentsFluidTargets", label: "Residents on fluid charts offered target?" },
                { key: "bowelChartsComplete", label: "Bowel charts completed and concerns highlighted?" },
                { key: "repositioningCharts", label: "Repositioning charts in place and adhered to?" },
                { key: "hygieneCharts", label: "Hygiene charts in place and compliant?" },
                { key: "oralHealthCharts", label: "Oral health charts in place and compliant?" },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <Label>{item.label}</Label>
                  <Select
                    value={form[item.key] ?? ""}
                    onValueChange={(value) => setField(item.key, value)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={form[`${item.key}Comments`] ?? ""}
                    onChange={(event) => setField(`${item.key}Comments`, event.target.value)}
                    placeholder="Add context or required actions"
                    className="min-h-[80px]"
                  />
                </div>
              ))}
              {renderTextArea(
                "careNotesSample",
                "Care notes sample",
                "Record whether entries are detailed and accurate",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifiable incidents and safeguarding</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderInput(
                "cqcNotificationsCount",
                "CQC notifications raised for the month",
                "number",
              )}
              {renderSelect(
                "cqcNotificationLogUpdated",
                "Is the CQC notification log up to date?",
                yesNoOptions,
              )}
              {renderInput(
                "safeguardsRaised",
                "Safeguards raised for the month",
                "number",
              )}
              {renderSelect(
                "safeguardLogUpdated",
                "Is the safeguarding log up to date?",
                yesNoOptions,
              )}
              {renderTextArea(
                "notifiableIncidentsComments",
                "Comments – incidents and safeguarding",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medication oversight</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {renderSelect(
                  "medicationAuditCompleted",
                  "Is the medication audit completed for the month?",
                  yesNoOptions,
                )}
                {renderSelect(
                  "medicationActionsCompleted",
                  "Medication audit actions completed?",
                  yesNoOptions,
                )}
                {renderTextArea(
                  "medicationAuditComments",
                  "Medication audit comments",
                )}
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">MAR chart spot checks (3 residents)</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderInput(
                    "marSpotCheckResident",
                    "Resident initials and room number",
                  )}
                  {renderSelect(
                    "marFrontPageUpToDate",
                    "Front page up to date (photo, allergies, PRN protocol)?",
                    yesNoOptions,
                  )}
                  {renderSelect(
                    "marChartLegible",
                    "MAR chart legible (written) / factual (digital)?",
                    yesNoOptions,
                  )}
                  {renderSelect(
                    "marMissedDoses",
                    "Any missed doses?",
                    yesNoOptions,
                  )}
                  {renderSelect(
                    "marPrnDocumented",
                    "PRNs administered with reasoning documented?",
                    yesNoOptions,
                  )}
                  {renderSelect(
                    "marCountsMatch",
                    "Actual count matches MAR count?",
                    yesNoOptions,
                  )}
                </div>
                {renderTextArea(
                  "marSpotCheckComments",
                  "MAR spot check comments",
                )}
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Controlled drugs spot check (3 residents)</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderSelect(
                    "cdInIndex",
                    "Recorded in the index?",
                    yesNoOptions,
                  )}
                  {renderSelect(
                    "cdLegibleWriting",
                    "Legible writing?",
                    yesNoOptions,
                  )}
                  {renderSelect(
                    "cdReceivedSigned",
                    "Received dates and signatures present?",
                    yesNoOptions,
                  )}
                  {renderSelect(
                    "cdTwoSignatures",
                    "Two signatures for checks and administering?",
                    yesNoOptions,
                  )}
                </div>
                {renderTextArea(
                  "cdSpotCheckComments",
                  "Controlled drugs comments",
                )}
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Medication room</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { key: "medRoomTempChecks", label: "Room temperature checks completed" },
                    { key: "medFridgeTempChecks", label: "Fridge temperature checks completed" },
                    { key: "medRoomCleaning", label: "Medication room cleaning completed" },
                    { key: "medRoomClutterFree", label: "Room free of clutter" },
                    { key: "medNoOverstocking", label: "No overstocking of medication" },
                    { key: "medReturnsManaged", label: "Returns processed" },
                    { key: "medSharpsBinsDated", label: "Sharps bins dated on open and close" },
                  ].map((item) => (
                    <div key={item.key} className="space-y-2">
                      <Label>{item.label}</Label>
                      <Select
                        value={form[item.key] ?? ""}
                        onValueChange={(value) => setField(item.key, value)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="na">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        value={form[`${item.key}Comments`] ?? ""}
                        onChange={(event) => setField(`${item.key}Comments`, event.target.value)}
                        placeholder="Notes or actions"
                        className="min-h-[60px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Medication administration observation</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderSelect(
                    "medAdminTabard",
                    "Is the person administering medication wearing a DND tabard?",
                    yesNoOptions,
                  )}
                  {renderTextArea(
                    "medAdminTabardComments",
                    "Comments – DND tabard",
                  )}
                  {renderSelect(
                    "medAdminRsFollowed",
                    "Is the RS of medication administration followed?",
                    yesNoOptions,
                  )}
                  {renderTextArea(
                    "medAdminRsComments",
                    "Comments – RS adherence",
                  )}
                  {renderSelect(
                    "medAdminKnowledge",
                    "Can the staff member explain their medication responsibilities?",
                    yesNoOptions,
                  )}
                  {renderTextArea(
                    "medAdminKnowledgeComments",
                    "Comments – staff knowledge",
                  )}
                  {renderSelect(
                    "medAdminTimeStamped",
                    "Time-specific medication administered and time stamped correctly?",
                    yesNoOptions,
                  )}
                  {renderTextArea(
                    "medAdminTimeStampedComments",
                    "Comments – time stamping",
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feedback and external actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderInput("complaintsCount", "Complaints for the month", "number")}
              {renderTextArea(
                "complaintsComments",
                "Complaints comments",
              )}
              {renderInput("complimentsCount", "Compliments for the month", "number")}
              {renderTextArea(
                "complimentsComments",
                "Compliments comments",
              )}
              {renderSelect(
                "externalActionPlans",
                "Any action plans in place from outside or regulatory bodies?",
                yesNoOptions,
              )}
              {renderTextArea(
                "externalActionPlansComments",
                "Comments – external action plans",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kitchen compliance</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderTextArea(
                "ehoRating",
                "EHO rating",
                "Record rating and any commentary",
              )}
              {renderSelect(
                "kitchenMonthlyAudit",
                "Monthly audit completed?",
                yesNoOptions,
              )}
              {renderSelect(
                "kitchenAuditActions",
                "Actions from audit completed?",
                yesNoOptions,
              )}
              {renderSelect(
                "kitchenRecordsUpToDate",
                "Kitchen records up to date?",
                yesNoOptions,
              )}
              {renderSelect(
                "kitchenCleanOrganised",
                "Kitchen clean and organised?",
                yesNoOptions,
              )}
              {renderSelect(
                "kitchenColourCoded",
                "Colour coded equipment in use where applicable?",
                yesNoOptions,
              )}
              {renderTextArea(
                "kitchenComments",
                "Kitchen comments",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Domestic and environment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderSelect(
                "laundryClean",
                "Laundry – clean and organised?",
                yesNoOptions,
              )}
              {renderTextArea(
                "laundryCleanComments",
                "Laundry comments",
              )}
              {renderSelect(
                "laundryInOutSign",
                "Laundry in/out sign in place?",
                yesNoOptions,
              )}
              {renderTextArea(
                "laundryInOutComments",
                "Laundry in/out comments",
              )}
              {renderSelect(
                "environmentClean",
                "Environment clean and tidy?",
                yesNoOptions,
              )}
              {renderTextArea(
                "environmentCleanComments",
                "Environment comments",
              )}
              {renderSelect(
                "domesticRecordsUpToDate",
                "Domestic records up to date?",
                yesNoOptions,
              )}
              {renderTextArea(
                "domesticRecordsComments",
                "Domestic records comments",
              )}
              {renderSelect(
                "colourCodedEquipment",
                "Colour coded equipment in use?",
                yesNoOptions,
              )}
              {renderSelect(
                "coshhCompliant",
                "COSHH compliant?",
                yesNoOptions,
              )}
              {renderTextArea(
                "coshhComments",
                "COSHH comments",
              )}
              {renderTextArea(
                "domesticKnowledge",
                "Domestic knowledge – document interactions and understanding",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safety certificates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {safetyCertificates.map((item) => (
                <div key={item.key} className="space-y-2">
                  <Label>{item.label}</Label>
                  <Select
                    value={form[item.key] ?? ""}
                    onValueChange={(value) => setField(item.key, value)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {renderTextArea(
                "safetyCertificatesComments",
                "Overall comments – safety certificates",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fire safety</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderSelect(
                "fireTestsWeekly",
                "Fire test in place weekly?",
                yesNoOptions,
              )}
              {renderTextArea(
                "fireTestsWeeklyComments",
                "Comments – fire tests",
              )}
              {renderSelect(
                "fireDrillsTwiceYearly",
                "Fire drills minimum twice yearly?",
                yesNoOptions,
              )}
              {renderTextArea(
                "fireDrillsComments",
                "Comments – fire drills",
              )}
              {renderSelect(
                "fireRiskAssessmentUpToDate",
                "Fire risk assessment up to date and all actions complete?",
                yesNoOptions,
              )}
              {renderTextArea(
                "fireRiskAssessmentComments",
                "Comments – fire risk assessment",
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Improvement plans and summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {renderSelect(
                "plannedImprovements",
                "Any planned improvements for the home?",
                yesNoOptions,
              )}
              {renderTextArea(
                "plannedImprovementsComments",
                "Comments from the registered manager or responsible person",
              )}
              {renderTextArea(
                "overallComments",
                "Overall comments",
              )}
              {renderSelect(
                "actionPlanRequired",
                "Action plan required?",
                yesNoOptions,
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => alert("Save draft not yet implemented")}>Save draft</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit audit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
