"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { workspaceCollectionPath } from '@/lib/paths';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export default function SeniorCarerSupervisionForm({ onSave, workspaceId }: { onSave?: (appraisal: string, formData: any) => void; workspaceId?: string }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    supervisee: "",
    role: "Senior Carer / Care Team Manager",
    supervisor: "",
    date: "",
    location: "",
    nextDue: "",
    previousActions: "",
    leadership: "",
    carePractice: "",
    residentWellbeing: "",
    training: "",
    communication: "",
    wellbeing: "",
    agreedActions: "",
    superviseeSignature: "",
    superviseeSignatureDate: "",
    supervisorSignature: "",
    supervisorSignatureDate: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const targetCollection = workspaceId
        ? collection(db, workspaceCollectionPath(workspaceId, 'seniorCarerSupervisions', (user as any).organisationId))
        : collection(db, 'appraisals-senior-carer-supervision');
      await addDoc(targetCollection, {
        ...form,
        userId: user?.id || null,
        createdBy: user?.id || null,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Saved!", description: "Supervision record saved successfully." });
      onSave?.("senior-carer-supervision", form);
      setForm({
        supervisee: "",
        role: "Senior Carer / Care Team Manager",
        supervisor: "",
        date: "",
        location: "",
        nextDue: "",
        previousActions: "",
        leadership: "",
        carePractice: "",
        residentWellbeing: "",
        training: "",
        communication: "",
        wellbeing: "",
        agreedActions: "",
        superviseeSignature: "",
        superviseeSignatureDate: "",
        supervisorSignature: "",
        supervisorSignatureDate: "",
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to save record." });
    } finally {
      setLoading(false);
    }
  };
  const sections = [
    {
      label: "1. Review of Previous Actions",
      content: (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Actions from last supervision and updates</p>
          <Textarea name="previousActions" value={form.previousActions} onChange={handleChange} rows={3} required />
        </div>
      )
    },
    {
      label: "2. Leadership & Team Oversight",
      content: (
        <div>
          <ul className="list-disc ml-6 text-sm text-muted-foreground mb-3">
            <li>How are you leading shifts and delegating tasks to care staff?</li>
            <li>Are supervisions, spot checks, and mentoring of carers being completed?</li>
            <li>Handling of staff concerns, absence, or performance issues.</li>
            <li>Team morale and culture on your shifts.</li>
          </ul>
          <Textarea name="leadership" value={form.leadership} onChange={handleChange} rows={3} required />
        </div>
      )
    },
    {
      label: "3. Care Practice & Compliance",
      content: (
        <div>
          <ul className="list-disc ml-6 text-sm text-muted-foreground mb-3">
            <li>Standards of personal care, dignity, and communication with residents.</li>
            <li>Accuracy and timeliness of care documentation (care notes, handovers, risk assessments).</li>
            <li>Compliance with policies (medication support, infection control, safeguarding).</li>
            <li>Any safeguarding incidents or concerns since last supervision.</li>
          </ul>
          <Textarea name="carePractice" value={form.carePractice} onChange={handleChange} rows={3} required />
        </div>
      )
    },
    {
      label: "4. Resident Wellbeing & Outcomes",
      content: (
        <div>
          <ul className="list-disc ml-6 text-sm text-muted-foreground mb-3">
            <li>How do you ensure residents’ care is person-centred?</li>
            <li>Feedback from residents and families.</li>
            <li>Examples of positive outcomes achieved for residents.</li>
            <li>Any concerns about residents’ health, safety, or emotional wellbeing?</li>
          </ul>
          <Textarea name="residentWellbeing" value={form.residentWellbeing} onChange={handleChange} rows={3} required />
        </div>
      )
    },
    {
      label: "5. Training & Development",
      content: (
        <div>
          <ul className="list-disc ml-6 text-sm text-muted-foreground mb-3">
            <li>Mandatory training status (safeguarding, medication, moving & handling, MCA/DoLS, dementia awareness).</li>
            <li>Additional training completed since last supervision.</li>
            <li>Development needs (e.g., leadership, clinical skills, documentation).</li>
          </ul>
          <Textarea name="training" value={form.training} onChange={handleChange} rows={3} required />
        </div>
      )
    },
    {
      label: "6. Communication & Professionalism",
      content: (
        <div>
          <ul className="list-disc ml-6 text-sm text-muted-foreground mb-3">
            <li>Communication with care team, nurses, and management.</li>
            <li>Confidence in escalating concerns or giving feedback to colleagues.</li>
            <li>Example of good teamwork or conflict management since last supervision.</li>
          </ul>
          <Textarea name="communication" value={form.communication} onChange={handleChange} rows={3} required />
        </div>
      )
    },
    {
      label: "7. Wellbeing & Support",
      content: (
        <div>
          <ul className="list-disc ml-6 text-sm text-muted-foreground mb-3">
            <li>How do you feel in your role?</li>
            <li>Workload and stress management.</li>
            <li>Do you feel supported by management?</li>
            <li>Any adjustments or support needed?</li>
          </ul>
          <Textarea name="wellbeing" value={form.wellbeing} onChange={handleChange} rows={3} required />
        </div>
      )
    },
    {
      label: "8. Agreed Actions & Support",
      content: (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Clear, measurable actions with timescales and responsible person</p>
          <Textarea name="agreedActions" value={form.agreedActions} onChange={handleChange} rows={3} required />
        </div>
      )
    },
    {
      label: "9. Signatures",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="superviseeSignature">Supervisee Signature</label>
            <Input id="superviseeSignature" name="superviseeSignature" value={form.superviseeSignature} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="superviseeSignatureDate">Date</label>
            <Input id="superviseeSignatureDate" name="superviseeSignatureDate" type="date" value={form.superviseeSignatureDate} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="supervisorSignature">Supervisor Signature</label>
            <Input id="supervisorSignature" name="supervisorSignature" value={form.supervisorSignature} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="supervisorSignatureDate">Date</label>
            <Input id="supervisorSignatureDate" name="supervisorSignatureDate" type="date" value={form.supervisorSignatureDate} onChange={handleChange} required />
          </div>
        </div>
      )
    }
  ];

  const [openSections, setOpenSections] = useState(() => Array(sections.length).fill(true));

  const toggleSection = (idx: number) => {
    setOpenSections((prev: boolean[]) => prev.map((open, i) => (i === idx ? !open : open)));
  };

  return (
    <div className="w-full max-w-none p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Senior Carer / Care Team Manager Supervision Record</h1>
          <p className="mb-4 text-slate-500">Complete the form below to record your supervision session. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Supervisee</label>
              <Input name="supervisee" value={form.supervisee} onChange={handleChange} placeholder="Supervisee Name" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Role</label>
              <Input name="role" value={form.role} onChange={handleChange} placeholder="Role" disabled />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Supervisor</label>
              <Input name="supervisor" value={form.supervisor} onChange={handleChange} placeholder="Supervisor Name" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Date of Supervision</label>
              <Input name="date" type="date" value={form.date} onChange={handleChange} required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Location</label>
              <Input name="location" value={form.location} onChange={handleChange} placeholder="Location" required />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Next Supervision Due</label>
              <Input name="nextDue" type="date" value={form.nextDue} onChange={handleChange} />
            </div>
          </div>
        </div>
        {/* Main form right column */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {sections.map((section, idx) => (
              <div key={section.label} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(idx)}
                >
                  <span>{section.label}</span>
                  {openSections[idx] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[idx] && (
                  <div className="px-8 pb-8">{section.content}</div>
                )}
              </div>
            ))}
            <Button type="submit" className="w-full h-14 text-lg font-bold mt-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 disabled:opacity-60" disabled={loading}>
              {loading ? "Saving..." : "Save Supervision Record"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
