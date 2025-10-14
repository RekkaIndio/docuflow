"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { workspaceCollectionPath } from "@/lib/paths";
import { useAuth } from "@/hooks/use-auth";

const initialState = {
  employeeName: "",
  role: "",
  appraiser: "",
  date: "",
  period: "",
  objectives: [
    { text: "", status: "", comments: "" },
    { text: "", status: "", comments: "" },
    { text: "", status: "", comments: "" },
  ],
  qualityOfWork: "",
  teamwork: "",
  residentFocus: "",
  reliability: "",
  strengths: "",
  development: "",
  nextObjectives: [
    { text: "" },
    { text: "" },
    { text: "" },
  ],
  training: "",
  wellbeing: "",
  overallRating: "",
  appraiserComments: "",
  appraiseeComments: "",
  employeeSignature: "",
  employeeSignatureDate: "",
  appraiserSignature: "",
  appraiserSignatureDate: "",
};

const objectiveStatuses = ["Achieved", "Partially Achieved", "Not Achieved"];
const overallRatings = [
  "Exceeds Expectations",
  "Meets Expectations",
  "Requires Improvement",
  "Unsatisfactory"
];

export default function StaffAppraisalForm({ onSave, workspaceId }: { onSave?: (appraisal: string, formData: any) => void; workspaceId?: string }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("staff-appraisal-form");
      return saved ? JSON.parse(saved) : initialState;
    }
    return initialState;
  });
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState(() => Array(10).fill(true));

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev: typeof initialState) => ({ ...prev, [name]: value }));
  }

  function handleObjectiveChange(
    idx: number,
    field: "text" | "status" | "comments",
    value: string
  ) {
    setForm((prev: typeof initialState) => {
      const newObjectives = [...prev.objectives];
      newObjectives[idx][field] = value;
      return { ...prev, objectives: newObjectives };
    });
  }

  function handleNextObjectiveChange(idx: number, value: string) {
    setForm((prev: typeof initialState) => {
      const newNextObjectives = [...prev.nextObjectives];
      newNextObjectives[idx].text = value;
      return { ...prev, nextObjectives: newNextObjectives };
    });
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    localStorage.setItem("staff-appraisal-form", JSON.stringify(form));
    let firebaseError = null;
    try {
      if (user) {
        const targetCollection = workspaceId
          ? collection(db, workspaceCollectionPath(workspaceId, "staffAppraisals", (user as any).organisationId))
          : collection(db, "staffAppraisals");

        await addDoc(targetCollection, {
          ...form,
          userId: user.id,
          userEmail: user.email,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      firebaseError = err;
    }
    setTimeout(() => {
      setSaving(false);
      if (firebaseError) {
        toast({ title: "Error", description: "Failed to save to Firebase." });
      } else {
        toast({ title: "Saved!", description: "Your appraisal has been saved." });
        onSave?.("staff-appraisal", form);
      }
    }, 500);
  }

  const sections = [
    {
      label: "1. Review of Previous Objectives (if applicable)",
      content: (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Input
                placeholder={`Objective ${i + 1}`}
                value={form.objectives[i].text}
                onChange={e => handleObjectiveChange(i, "text", e.target.value)}
                className="col-span-1"
              />
              <select
                value={form.objectives[i].status}
                onChange={e => handleObjectiveChange(i, "status", e.target.value)}
                className="col-span-1 border rounded-lg px-2 py-2"
              >
                <option value="">Status</option>
                {objectiveStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <Input
                placeholder="Comments"
                value={form.objectives[i].comments}
                onChange={e => handleObjectiveChange(i, "comments", e.target.value)}
                className="col-span-1"
              />
            </div>
          ))}
          <Textarea name="objectivesComments" value={form.objectivesComments || ""} onChange={handleChange} placeholder="Comments" className="mt-2" />
        </div>
      )
    },
    {
      label: "2. Performance Review",
      content: (
        <div className="space-y-6">
          <div>
            <div className="font-semibold mb-1">a. Quality of Work</div>
            <ul className="mb-2 ml-4 list-disc text-sm text-slate-500 space-y-1">
              <li>Is work completed to the required standard?</li>
              <li>Compliance with policies, procedures, and best practice.</li>
            </ul>
            <Textarea name="qualityOfWork" value={form.qualityOfWork} onChange={handleChange} required className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <div className="font-semibold mb-1">b. Teamwork & Communication</div>
            <ul className="mb-2 ml-4 list-disc text-sm text-slate-500 space-y-1">
              <li>Works effectively with colleagues, residents, families, and professionals.</li>
              <li>Contributes to a positive and supportive workplace.</li>
            </ul>
            <Textarea name="teamwork" value={form.teamwork} onChange={handleChange} required className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <div className="font-semibold mb-1">c. Resident / Service User Focus</div>
            <ul className="mb-2 ml-4 list-disc text-sm text-slate-500 space-y-1">
              <li>Promotes dignity, respect, and person-centred care.</li>
              <li>Responds positively to feedback from residents and families.</li>
            </ul>
            <Textarea name="residentFocus" value={form.residentFocus} onChange={handleChange} required className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <div className="font-semibold mb-1">d. Reliability & Professionalism</div>
            <ul className="mb-2 ml-4 list-disc text-sm text-slate-500 space-y-1">
              <li>Timekeeping, attendance, flexibility.</li>
              <li>Professional conduct and role modelling.</li>
            </ul>
            <Textarea name="reliability" value={form.reliability} onChange={handleChange} required className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
      )
    },
    {
      label: "3. Strengths & Achievements",
      content: (
        <Textarea name="strengths" value={form.strengths} onChange={handleChange} required className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" placeholder="Comments" />
      )
    },
    {
      label: "4. Development Needs",
      content: (
        <Textarea name="development" value={form.development} onChange={handleChange} required className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" placeholder="List areas requiring improvement, training, or additional support" />
      )
    },
    {
      label: "5. Objectives for the Next Year (SMART)",
      content: (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Input
              key={i}
              placeholder={`Objective ${i + 1} (SMART)`}
              value={form.nextObjectives[i].text}
              onChange={e => handleNextObjectiveChange(i, e.target.value)}
              className="mb-2"
            />
          ))}
          <Textarea name="nextObjectivesComments" value={form.nextObjectivesComments || ""} onChange={handleChange} placeholder="Comments" className="mt-2" />
        </div>
      )
    },
    {
      label: "6. Training & Career Development",
      content: (
        <Textarea name="training" value={form.training} onChange={handleChange} required className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" placeholder="Training completed, required, and career aspirations" />
      )
    },
    {
      label: "7. Wellbeing & Support",
      content: (
        <Textarea name="wellbeing" value={form.wellbeing} onChange={handleChange} required className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" placeholder="How are you managing workload and responsibilities?" />
      )
    },
    {
      label: "8. Overall Appraisal Rating (tick one)",
      content: (
        <div className="flex flex-col gap-2">
          {overallRatings.map((rating) => (
            <label key={rating} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="overallRating"
                value={rating}
                checked={form.overallRating === rating}
                onChange={handleChange}
                className="accent-blue-700"
              />
              <span>{rating}</span>
            </label>
          ))}
        </div>
      )
    },
    {
      label: "9. Comments",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Appraiser Comments</label>
            <Textarea name="appraiserComments" value={form.appraiserComments} onChange={handleChange} className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Appraisee Comments</label>
            <Textarea name="appraiseeComments" value={form.appraiseeComments} onChange={handleChange} className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
      )
    },
    {
      label: "10. Signatures",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Employee (Appraisee)</label>
            <Input name="employeeSignature" value={form.employeeSignature} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Date</label>
            <Input name="employeeSignatureDate" type="date" value={form.employeeSignatureDate} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Appraiser</label>
            <Input name="appraiserSignature" value={form.appraiserSignature} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Date</label>
            <Input name="appraiserSignatureDate" type="date" value={form.appraiserSignatureDate} onChange={handleChange} required />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Staff Appraisal Form</h1>
          <p className="mb-4 text-slate-500">Complete the form below to record your staff appraisal. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Employee Name</label>
              <Input name="employeeName" value={form.employeeName} onChange={handleChange} placeholder="Staff Member’s Name" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Role</label>
              <Input name="role" value={form.role} onChange={handleChange} placeholder="Job Title" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Appraiser</label>
              <Input name="appraiser" value={form.appraiser} onChange={handleChange} placeholder="Manager / Supervisor" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Date of Appraisal</label>
              <Input name="date" type="date" value={form.date} onChange={handleChange} required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Period Covered</label>
              <Input name="period" value={form.period} onChange={handleChange} placeholder="From – To" required />
            </div>
          </div>
        </div>
  {/* Main form right column (no internal scroll) - page should scroll externally so the left panel can stay sticky like the audits */}
  <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={handleSave} className="flex flex-col gap-8">
            {sections.map((section, idx) => (
              <div key={section.label} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => setOpenSections(prev => prev.map((open, i) => (i === idx ? !open : open)))}
                >
                  <span>{section.label}</span>
                  {openSections[idx] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[idx] && (
                  <div className="px-8 pb-8">{section.content}</div>
                )}
              </div>
            ))}
            <Button type="submit" className="w-full h-14 text-lg font-bold mt-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 disabled:opacity-60" disabled={saving}>
              {saving ? "Saving..." : "Save Appraisal"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
