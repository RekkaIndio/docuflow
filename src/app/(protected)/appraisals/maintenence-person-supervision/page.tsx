"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { workspaceCollectionPath } from '@/lib/paths';
import { useAuth } from "@/hooks/use-auth";

const initialState = {
  supervisee: "",
  role: "",
  supervisor: "",
  date: "",
  location: "",
  nextDue: "",
  previousActions: "",
  workPractice: "",
  healthSafety: "",
  regulatory: "",
  teamwork: "",
  training: "",
  wellbeing: "",
  actions: "",
  superviseeSignature: "",
  superviseeSignatureDate: "",
  supervisorSignature: "",
  supervisorSignatureDate: "",
};

export default function MaintenencePersonSupervisionForm({ onSave, workspaceId }: { onSave?: (appraisal: string, formData: any) => void; workspaceId?: string }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("maintenence-person-supervision-form");
      return saved ? JSON.parse(saved) : initialState;
    }
    return initialState;
  });
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState(() => Array(9).fill(true));

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev: typeof initialState) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    
    localStorage.setItem("maintenence-person-supervision-form", JSON.stringify(form));
    
    let firebaseError = null;
    try {
      if (user) {
        const targetCollection = workspaceId
          ? collection(db, workspaceCollectionPath(workspaceId, 'maintenencePersonSupervisions', (user as any).organisationId))
          : collection(db, 'maintenencePersonSupervisions');
        await addDoc(targetCollection, {
          ...form,
          userId: user.id,
          userEmail: user.email,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      firebaseError = err;
      console.error('Firebase error:', err);
    }
    setTimeout(() => {
      setSaving(false);
      if (firebaseError) {
        toast({ title: "Error", description: "Failed to save to Firebase." });
      } else {
        toast({ title: "Saved!", description: "Your supervision record has been saved." });
        // Call the onSave callback if provided
        if (onSave && !firebaseError) {
          onSave("maintenence-person-supervision", form);
        }
      }
    }, 500);
  }

  const sections = [
    {
      label: "1. Review of Previous Actions",
      content: (
        <Textarea name="previousActions" value={form.previousActions} onChange={handleChange} required placeholder="Actions from last supervision and progress updates" className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "2. Work Practice & Standards",
      content: (
        <Textarea name="workPractice" value={form.workPractice} onChange={handleChange} required placeholder="Maintenance schedules, repair standards, responsiveness, good practice." className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "3. Health & Safety Compliance",
      content: (
        <Textarea name="healthSafety" value={form.healthSafety} onChange={handleChange} required placeholder="Fire safety, water checks, tool safety, hazard reporting." className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "4. Regulatory & Audit Readiness",
      content: (
        <Textarea name="regulatory" value={form.regulatory} onChange={handleChange} required placeholder="Records, CQC/HSE/local authority, audit actions." className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "5. Teamwork & Communication",
      content: (
        <Textarea name="teamwork" value={form.teamwork} onChange={handleChange} required placeholder="Relationships, communication, coordination difficulties." className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "6. Training & Development",
      content: (
        <Textarea name="training" value={form.training} onChange={handleChange} required placeholder="Mandatory/specialist training, development opportunities." className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "7. Wellbeing & Support",
      content: (
        <Textarea name="wellbeing" value={form.wellbeing} onChange={handleChange} required placeholder="How do you feel in your role? Workload, support, time pressures." className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "8. Agreed Actions & Support",
      content: (
        <Textarea name="actions" value={form.actions} onChange={handleChange} required placeholder="Clear, measurable actions with timescales and responsible person." className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
      )
    },
    {
      label: "9. Signatures",
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
    <div className="w-full max-w-none p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Maintenance Person Supervision Record</h1>
          <p className="mb-4 text-slate-500">Complete the form below to record your maintenance person supervision. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Supervisee</label>
              <Input name="supervisee" value={form.supervisee} onChange={handleChange} placeholder="Name" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Role</label>
              <Input name="role" value={form.role} onChange={handleChange} placeholder="Maintenance Person" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Supervisor</label>
              <Input name="supervisor" value={form.supervisor} onChange={handleChange} placeholder="Manager / Deputy / Facilities Lead" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Date of Supervision</label>
              <Input name="date" type="date" value={form.date} onChange={handleChange} required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Location</label>
              <Input name="location" value={form.location} onChange={handleChange} placeholder="Office / Maintenance Workshop / On-site" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Next Supervision Due</label>
              <Input name="nextDue" type="date" value={form.nextDue} onChange={handleChange} required />
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
              {saving ? "Saving..." : "Save Record"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
