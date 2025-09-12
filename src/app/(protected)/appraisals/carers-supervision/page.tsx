"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";

const initialState = {
  supervisee: "",
  role: "",
  supervisor: "",
  date: "",
  location: "",
  nextDue: "",
  previousActions: "",
  carePractice: "",
  careChallenges: "",
  carePride: "",
  trainingStatus: "",
  trainingCompleted: "",
  learningNeeds: "",
  teamwork: "",
  raiseConcerns: "",
  handoverIssues: "",
  residentWellbeing: "",
  residentConcerns: "",
  residentFeedback: "",
  reflection: "",
  workload: "",
  supportNeeded: "",
  actions: "",
  superviseeSignature: "",
  superviseeSignatureDate: "",
  supervisorSignature: "",
  supervisorSignatureDate: "",
};

export default function CarersSupervisionForm({ onSave, workspaceId }: { onSave?: (appraisal: string, formData: any) => void; workspaceId?: string }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("carers-supervision-form");
      return saved ? JSON.parse(saved) : initialState;
    }
    return initialState;
  });
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState(() => Array(8).fill(true));

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev: typeof initialState) => ({ ...prev, [name]: value }));
  }

  const toggleSection = (idx: number) => {
    setOpenSections((prev: boolean[]) => prev.map((open, i) => (i === idx ? !open : open)));
  };

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    localStorage.setItem("carers-supervision-form", JSON.stringify(form));
    let firebaseError = null;
    try {
      if (user) {
        const collectionPath = workspaceId 
          ? `workspaces/${workspaceId}/carersSupervisions` 
          : "carersSupervisions";
        
        await addDoc(collection(db, collectionPath), {
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
        toast({ title: "Saved!", description: "Your supervision record has been saved." });
        // Call the onSave callback if provided
        if (onSave && !firebaseError) {
          onSave("carers-supervision", form);
        }
      }
    }, 500);
  }

  const sections = [
    {
      label: "1. Review of Previous Actions",
      content: (
        <Textarea name="previousActions" value={form.previousActions} onChange={handleChange} required placeholder="List any actions from last supervision and progress updates" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "2. Care Practice & Standards",
      content: (
        <div className="space-y-4">
          <Textarea name="carePractice" value={form.carePractice} onChange={handleChange} required placeholder="How do you feel about your day-to-day care practice?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="careChallenges" value={form.careChallenges} onChange={handleChange} required placeholder="Any challenges with personal care, dignity, communication, or record keeping?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="carePride" value={form.carePride} onChange={handleChange} required placeholder="Examples of good practice you are proud of" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
        </div>
      )
    },
    {
      label: "3. Training & Development",
      content: (
        <div className="space-y-4">
          <Textarea name="trainingStatus" value={form.trainingStatus} onChange={handleChange} required placeholder="Mandatory training status (e.g., moving & handling, safeguarding, medication awareness)" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="trainingCompleted" value={form.trainingCompleted} onChange={handleChange} required placeholder="Any training completed since last supervision?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="learningNeeds" value={form.learningNeeds} onChange={handleChange} required placeholder="Learning needs identified?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
        </div>
      )
    },
    {
      label: "4. Teamwork & Communication",
      content: (
        <div className="space-y-4">
          <Textarea name="teamwork" value={form.teamwork} onChange={handleChange} required placeholder="How do you feel about working with the team?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="raiseConcerns" value={form.raiseConcerns} onChange={handleChange} required placeholder="Are you confident to raise concerns with seniors/nurses?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="handoverIssues" value={form.handoverIssues} onChange={handleChange} required placeholder="Any issues around handovers, documentation, or care planning?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
        </div>
      )
    },
    {
      label: "5. Resident Wellbeing & Outcomes",
      content: (
        <div className="space-y-4">
          <Textarea name="residentWellbeing" value={form.residentWellbeing} onChange={handleChange} required placeholder="Examples where you’ve supported residents’ independence, choice, and dignity" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="residentConcerns" value={form.residentConcerns} onChange={handleChange} required placeholder="Any resident concerns you wish to raise?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="residentFeedback" value={form.residentFeedback} onChange={handleChange} required placeholder="Feedback from residents or families (positive or negative)" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
        </div>
      )
    },
    {
      label: "6. Reflection & Wellbeing",
      content: (
        <div className="space-y-4">
          <Textarea name="reflection" value={form.reflection} onChange={handleChange} required placeholder="How do you feel in your role?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="workload" value={form.workload} onChange={handleChange} required placeholder="Workload and stress management" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
          <Textarea name="supportNeeded" value={form.supportNeeded} onChange={handleChange} required placeholder="Any support you need from the team or management?" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
        </div>
      )
    },
    {
      label: "7. Agreed Actions & Support",
      content: (
        <Textarea name="actions" value={form.actions} onChange={handleChange} required placeholder="Clear, measurable actions with timescales and who is responsible" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "8. Signatures",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Supervisee Signature</label>
            <Input name="superviseeSignature" value={form.superviseeSignature} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Date</label>
            <Input name="superviseeSignatureDate" type="date" value={form.superviseeSignatureDate} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Supervisor Signature</label>
            <Input name="supervisorSignature" value={form.supervisorSignature} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Date</label>
            <Input name="supervisorSignatureDate" type="date" value={form.supervisorSignatureDate} onChange={handleChange} required />
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
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Carer Supervision Record</h1>
          <p className="mb-4 text-slate-500">Complete the form below to record your carer supervision. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Supervisee</label>
              <Input name="supervisee" value={form.supervisee} onChange={handleChange} placeholder="Carer’s Name" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Role</label>
              <Input name="role" value={form.role} onChange={handleChange} placeholder="Care Assistant / Support Worker" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Supervisor</label>
              <Input name="supervisor" value={form.supervisor} onChange={handleChange} placeholder="Senior Carer / Nurse / Care Team Manager" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Date of Supervision</label>
              <Input name="date" type="date" value={form.date} onChange={handleChange} required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Location</label>
              <Input name="location" value={form.location} onChange={handleChange} placeholder="In person / virtual" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Next Supervision Due</label>
              <Input name="nextDue" type="date" value={form.nextDue} onChange={handleChange} required />
            </div>
          </div>
        </div>
        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
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
              {saving ? "Saving..." : "Save Record"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
