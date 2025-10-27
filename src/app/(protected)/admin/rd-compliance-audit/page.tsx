"use client";

import React, { useState } from "react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  // Tracker state
  const [trackerData, setTrackerData] = useState<Record<string, any[]>>({
    "2024-01": [{ id: 1, date: "2024-01-15", home: "Sample Home", rating: "Good" }],
    "2024-02": [{ id: 2, date: "2024-02-10", home: "Sample Home", rating: "Excellent" }],
    // Add more mock data as needed
  });
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isTrackerDialogOpen, setIsTrackerDialogOpen] = useState(false);

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({
    'previous-actions': true,
    'resident-discussions': false,
    'activities-review': false,
    'resident-presentation': false,
    'engagement-meetings': false,
    'professional-visitors': false,
    'staff-review': false,
    'staffing-overview': false,
    'monthly-audits': false,
    'quality-records': false,
    'incidents-safeguarding': false,
    'medication-oversight': false,
    'feedback-external': false,
    'kitchen-compliance': false,
    'domestic-environment': false,
    'safety-certificates': false,
    'fire-safety': false,
    'improvement-summary': false,
  }));

  // Section definitions
  const sections = [
    {
      id: 'previous-actions',
      title: 'Previous Actions',
      guidance: 'Review completion of actions from the last action plan.',
    },
    {
      id: 'resident-discussions',
      title: 'Resident and Relative Discussions',
      guidance: 'Capture feedback from residents and relatives about facilities, care, staff, activities, and inclusion.',
    },
    {
      id: 'activities-review',
      title: 'Activities Review',
      guidance: 'Assess the activity planner, alignment with schedule, and suitability for resident needs.',
    },
    {
      id: 'resident-presentation',
      title: 'Resident Presentation',
      guidance: 'Observe and document residents\' appearance and general presentation.',
    },
    {
      id: 'engagement-meetings',
      title: 'Engagement and Meetings',
      guidance: 'Review resident and relative meetings, 1-1s, and documentation.',
    },
    {
      id: 'professional-visitors',
      title: 'Professional Visitors Feedback',
      guidance: 'Document feedback from professional visitors during the visit.',
    },
    {
      id: 'staff-review',
      title: 'Staff Conversations and File Review',
      guidance: 'Review staff knowledge, conduct file checks, and assess training records.',
    },
    {
      id: 'staffing-overview',
      title: 'Staffing Overview',
      guidance: 'Assess staffing levels, rota alignment, dependency needs, and training stats.',
    },
    {
      id: 'monthly-audits',
      title: 'Monthly Audits and Oversight',
      guidance: 'Review completion of monthly audits and oversight areas.',
    },
    {
      id: 'quality-records',
      title: 'Quality and Compliance Records',
      guidance: 'Check care notes, triangulation, wound reviews, and other quality indicators.',
    },
    {
      id: 'incidents-safeguarding',
      title: 'Notifiable Incidents and Safeguarding',
      guidance: 'Review incident reporting, safeguarding logs, and CQC notifications.',
    },
    {
      id: 'medication-oversight',
      title: 'Medication Oversight',
      guidance: 'Assess medication audit completion, MAR charts, controlled drugs, and administration observation.',
    },
    {
      id: 'feedback-external',
      title: 'Feedback and External Actions',
      guidance: 'Document complaints, compliments, and action plans from external bodies.',
    },
    {
      id: 'kitchen-compliance',
      title: 'Kitchen Compliance',
      guidance: 'Review EHO rating, monthly audits, records, cleanliness, and organization.',
    },
    {
      id: 'domestic-environment',
      title: 'Domestic and Environment',
      guidance: 'Assess laundry, environment cleanliness, domestic records, and COSHH compliance.',
    },
    {
      id: 'safety-certificates',
      title: 'Safety Certificates',
      guidance: 'Verify current status of all required safety certificates and maintenance records.',
    },
    {
      id: 'fire-safety',
      title: 'Fire Safety',
      guidance: 'Check fire tests, drills, risk assessments, and related procedures.',
    },
    {
      id: 'improvement-summary',
      title: 'Improvement Plans and Summary',
      guidance: 'Document planned improvements, overall comments, and action plan requirements.',
    },
  ];

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'previous-actions':
        return (
          <div className="space-y-4">
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
          </div>
        );
      case 'resident-discussions':
        return (
          <div className="space-y-4">
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
          </div>
        );
      case 'activities-review':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      case 'resident-presentation':
        return (
          <div>
            {renderTextArea(
              "residentAppearance",
              "Residents' appearance and general presentation",
              "Include observations on hair, nails, clothing, facial hair, jewellery, etc.",
            )}
          </div>
        );
      case 'engagement-meetings':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      case 'professional-visitors':
        return (
          <div className="space-y-6">
            {professionalVisitors.map((visitor, index) => (
              <div key={`visitor-${index}`} className="rounded-lg border bg-white p-4 space-y-4 dark:bg-slate-700 dark:border-slate-600">
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
            <Button type="button" onClick={addVisitor} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add visitor
            </Button>
          </div>
        );
      case 'staff-review':
        return (
          <div className="space-y-6">
            {staffEntries.map((staff, index) => (
              <div key={`staff-${index}`} className="space-y-6 rounded-lg border bg-white p-4 dark:bg-slate-700 dark:border-slate-600">
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
                          <SelectTrigger className="bg-white dark:bg-slate-700">
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
            <Button type="button" onClick={addStaffEntry} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add staff member
            </Button>
          </div>
        );
      case 'staffing-overview':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      case 'monthly-audits':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      case 'quality-records':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
                  <SelectTrigger className="bg-white dark:bg-slate-700">
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
          </div>
        );
      case 'incidents-safeguarding':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      case 'medication-oversight':
        return (
          <div className="space-y-6">
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
                      <SelectTrigger className="bg-white dark:bg-slate-700">
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
          </div>
        );
      case 'feedback-external':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      case 'kitchen-compliance':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      case 'domestic-environment':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      case 'safety-certificates':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {safetyCertificates.map((item) => (
              <div key={item.key} className="space-y-2">
                <Label>{item.label}</Label>
                <Select
                  value={form[item.key] ?? ""}
                  onValueChange={(value) => setField(item.key, value)}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-700">
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
          </div>
        );
      case 'fire-safety':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      case 'improvement-summary':
        return (
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        );
      default:
        return null;
    }
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
        <SelectTrigger id={field} className="bg-white dark:bg-slate-700">
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
    <>
      <AdminPageHeader
        title="RD Compliance Audit"
        subtitle="Conduct a comprehensive audit of RD compliance."
        icon={<ClipboardCheck />}
      />
      <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-3xl shadow-2xl mt-10 border border-slate-200 dark:border-slate-700">
        <Tabs defaultValue="audit" className="w-full">
          <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <TabsTrigger value="audit" className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:text-slate-300 dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white">
              Audit
            </TabsTrigger>
            <TabsTrigger value="action-plan" className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:text-slate-300 dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white">
              Action Plan
            </TabsTrigger>
            <TabsTrigger value="tracker" className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:text-slate-300 dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white">
              Tracker
            </TabsTrigger>
          </TabsList>
          <TabsContent value="audit" className="mt-6">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Left Panel - Audit Information (sticky) */}
              <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-8 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit dark:bg-slate-800 dark:border-slate-700">
                <p className="mb-4 text-slate-500">Complete the Regional Director compliance review for each visit. All sections are required for a comprehensive audit.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Home/Care Facility</label>
                    <Input value={form.home ?? ""} onChange={(e) => setField("home", e.target.value)} className="w-full" placeholder="Enter care home name" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Audit Date</label>
                    <Input type="date" value={form.auditDate ?? ""} onChange={(e) => setField("auditDate", e.target.value)} className="w-full" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Person Completing Audit</label>
                    <Input value={form.personCompletingAudit ?? ""} onChange={(e) => setField("personCompletingAudit", e.target.value)} className="w-full" placeholder="Full name and position" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Registered Manager</label>
                    <Input value={form.registeredManager ?? ""} onChange={(e) => setField("registeredManager", e.target.value)} className="w-full" placeholder="Name" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Responsible Person</label>
                    <Input value={form.responsiblePerson ?? ""} onChange={(e) => setField("responsiblePerson", e.target.value)} className="w-full" placeholder="Name at time of visit" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Occupancy</label>
                    <Input value={form.occupancy ?? ""} onChange={(e) => setField("occupancy", e.target.value)} className="w-full" placeholder="Current occupancy" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Visit Type</label>
                    <Select value={form.announced ?? ""} onValueChange={(value) => setField("announced", value)}>
                      <SelectTrigger className="w-full bg-white dark:bg-slate-700">
                        <SelectValue placeholder="Select visit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announced">Announced</SelectItem>
                        <SelectItem value="unannounced">Unannounced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Duration of Visit</label>
                    <Input value={form.visitDuration ?? ""} onChange={(e) => setField("visitDuration", e.target.value)} className="w-full" placeholder="e.g., 4 hours" />
                  </div>

                  <div className="pt-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Audit Progress</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">
                      {Object.values(openSections).filter(Boolean).length} of {sections.length} sections completed
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2 dark:bg-slate-700">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(Object.values(openSections).filter(Boolean).length / sections.length) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Collapsible Sections */}
              <div className="flex-1 min-w-0 pr-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {sections.map((section) => (
                    <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg dark:bg-slate-800 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors dark:text-blue-100 dark:hover:bg-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <ClipboardCheck className="h-5 w-5 text-gray-600" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                        </div>
                        {openSections[section.id] ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      {openSections[section.id] && (
                        <div className="px-8 pb-6">
                          {section.guidance && (
                            <ul className="mb-4 ml-4 list-disc text-sm text-slate-500 space-y-1">
                              <li>{section.guidance}</li>
                            </ul>
                          )}
                          <div className="space-y-4">
                            {getSectionContent(section.id)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Complete Audit Button */}
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      {isSubmitting ? 'Submitting...' : 'Complete Audit'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="action-plan" className="mt-6">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="dark:bg-slate-800 dark:border-slate-700">
                <CardTitle className="dark:text-white">Action Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Action plan content goes here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tracker" className="mt-6 space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="w-full flex-shrink-0 lg:w-[360px] xl:w-[400px] lg:self-start lg:sticky lg:top-24 lg:h-fit">
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <ClipboardCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Audit History</h2>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">
                          Review past RD Compliance audits organized by month.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-6">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">2024 Tracker</h2>
                        <p className="text-sm text-slate-500">Choose a month to review audit history.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = new Date(2024, i, 1);
                        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
                        const records = trackerData[monthKey] || [];
                        const hasData = records.length > 0;
                        const isSelected = selectedMonth === monthKey;
                        return (
                          <button
                            key={monthKey}
                            type="button"
                            onClick={() => setSelectedMonth(monthKey)}
                            className={`text-left rounded-xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                              hasData
                                ? 'bg-white hover:border-blue-300 hover:shadow-md dark:bg-slate-700 dark:hover:border-blue-400'
                                : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500'
                            } ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 dark:border-blue-400 dark:ring-blue-300' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold ${hasData ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                {month.toLocaleString('default', { month: 'short' })}
                              </span>
                              {hasData ? (
                                <span className="text-xs font-medium text-blue-600">
                                  {records.length === 1 ? '1 audit' : `${records.length} audits`}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500 dark:text-slate-400">No audits</span>
                              )}
                            </div>
                            <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">{month.toLocaleString('default', { month: 'long' })}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {selectedMonth && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                          {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })} Audits
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {trackerData[selectedMonth]?.length || 0} audits saved
                        </p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700">
                      {trackerData[selectedMonth]?.length === 0 ? (
                        <div className="p-10 text-center text-sm text-slate-500">
                          No audits saved for {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long' })} yet.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader className="bg-muted/60">
                            <TableRow className="text-xs uppercase tracking-wide">
                              <TableHead>Date</TableHead>
                              <TableHead>Home</TableHead>
                              <TableHead>Rating</TableHead>
                              <TableHead className="w-32 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trackerData[selectedMonth]?.map((record) => (
                              <TableRow key={record.id} className="transition-colors hover:bg-muted/40">
                                <TableCell className="text-sm font-medium text-foreground">{record.date}</TableCell>
                                <TableCell className="text-sm text-slate-500 dark:text-slate-400">{record.home}</TableCell>
                                <TableCell>
                                  <Badge variant={record.rating === 'Excellent' ? 'default' : record.rating === 'Good' ? 'secondary' : 'destructive'}>
                                    {record.rating}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" onClick={() => setIsTrackerDialogOpen(true)}>
                                    View details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
