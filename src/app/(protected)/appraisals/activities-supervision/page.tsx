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
  planning: "",
  engagement: "",
  teamwork: "",
  compliance: "",
  training: "",
  wellbeing: "",
  actions: "",
  superviseeSignature: "",
  superviseeSignatureDate: "",
  supervisorSignature: "",
  supervisorSignatureDate: "",
};

export default function ActivitiesSupervisionForm({ onSave, workspaceId }: { onSave?: (appraisal: string, formData: any) => void; workspaceId?: string }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("activities-supervision-form");
      return saved ? JSON.parse(saved) : initialState;
    }
    return initialState;
  });
  const [saving, setSaving] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev: typeof initialState) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    localStorage.setItem("activities-supervision-form", JSON.stringify(form));
    let firebaseError = null;
    try {
      if (user) {
        const collectionPath = workspaceId 
          ? `workspaces/${workspaceId}/activitiesSupervisions` 
          : "appraisals";
        
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
          onSave("activities-supervision", form);
        }
      }
    }, 500);
  }

  // Collapsible state for each section
  const [openSections, setOpenSections] = useState(() => Array(8).fill(true));

  const toggleSection = (idx: number) => {
    setOpenSections((prev: boolean[]) => prev.map((open, i) => (i === idx ? !open : open)));
  };

  // Section definitions for collapsible form
  const sections = [
    {
      label: "1. Review of Previous Actions",
      name: "previousActions",
      guidance: ["Actions from last supervision and updates."]
    },
    {
      label: "2. Planning & Delivery of Activities",
      name: "planning",
      guidance: [
        "Are activities varied, inclusive, and person-centred?",
        "Do activity plans reflect residents’ life histories, hobbies, and cultural preferences?",
        "Evidence of structured planning (monthly/weekly schedules).",
        "Examples of successful activities delivered since last supervision."
      ]
    },
    {
      label: "3. Resident Engagement & Outcomes",
      name: "engagement",
      guidance: [
        "Are residents actively engaged and enjoying activities?",
        "How do you encourage quieter or less mobile residents to participate?",
        "Feedback from residents and families.",
        "Impact of activities on wellbeing, mood, and quality of life."
      ]
    },
    {
      label: "4. Teamwork & Communication",
      name: "teamwork",
      guidance: [
        "Collaboration with carers, nurses, and other departments.",
        "Communication of activity plans to residents, staff, and families.",
        "Confidence in reporting resident concerns/needs noticed during activities."
      ]
    },
    {
      label: "5. Compliance & Record Keeping",
      name: "compliance",
      guidance: [
        "Accuracy of activity participation records.",
        "Evidence for CQC (wellbeing outcomes, inclusion, meaningful activity).",
        "Awareness of safeguarding, confidentiality, and risk assessments for outings."
      ]
    },
    {
      label: "6. Training & Development",
      name: "training",
      guidance: [
        "Mandatory training completed (Safeguarding, Dementia Awareness, Health & Safety, First Aid if required).",
        "Specialist training (e.g., sensory stimulation, music therapy, reminiscence work).",
        "Further training needs identified."
      ]
    },
    {
      label: "7. Wellbeing & Support",
      name: "wellbeing",
      guidance: [
        "How do you feel in your role?",
        "Are you confident you have the resources and time to deliver activities effectively?",
        "Do you feel supported by the wider team and management?",
        "Any support or adjustments needed?"
      ]
    },
    {
      label: "8. Agreed Actions & Support",
      name: "actions",
      guidance: ["Clear, measurable actions with timescales and responsible person."]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Activities Staff Supervision Record</h1>
          <p className="mb-4 text-slate-500">Complete the form below to record your supervision session. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Supervisee</label>
              <Input name="supervisee" value={form.supervisee} onChange={handleChange} placeholder="Activities Coordinator / Assistant Name" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Role</label>
              <Input name="role" value={form.role} onChange={handleChange} placeholder="Activities / Wellbeing Staff" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Supervisor</label>
              <Input name="supervisor" value={form.supervisor} onChange={handleChange} placeholder="Manager / Deputy / Wellbeing Lead" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Date of Supervision</label>
              <Input name="date" type="date" value={form.date} onChange={handleChange} required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Location</label>
              <Input name="location" value={form.location} onChange={handleChange} placeholder="Office / Activities Room" required />
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
              <div key={section.name} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(idx)}
                >
                  <span>{section.label}</span>
                  {openSections[idx] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[idx] && (
                  <div className="px-8 pb-8">
                    {section.guidance && (
                      <ul className="mb-2 ml-4 list-disc text-sm text-slate-500 space-y-1">
                        {section.guidance.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    )}
                    <Textarea name={section.name} value={form[section.name]} onChange={handleChange} required className="bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200" />
                  </div>
                )}
              </div>
            ))}
            {/* Signatures section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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
            <Button type="submit" className="w-full h-14 text-lg font-bold mt-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 disabled:opacity-60" disabled={saving}>
              {saving ? "Saving..." : "Save Record"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

