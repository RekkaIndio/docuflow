"use client";

import { useState } from "react";
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

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-2">Senior Carer / Care Team Manager Supervision Record</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="supervisee">Supervisee</label>
          <Input id="supervisee" name="supervisee" value={form.supervisee} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="role">Role</label>
          <Input id="role" name="role" value={form.role} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="supervisor">Supervisor</label>
          <Input id="supervisor" name="supervisor" value={form.supervisor} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="date">Date of Supervision</label>
          <Input id="date" name="date" type="date" value={form.date} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="location">Location</label>
          <Input id="location" name="location" value={form.location} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="nextDue">Next Supervision Due</label>
          <Input id="nextDue" name="nextDue" type="date" value={form.nextDue} onChange={handleChange} />
        </div>
      </div>
      <section>
        <h2 className="font-semibold">1. Review of Previous Actions</h2>
        <p className="text-sm text-muted-foreground mb-1">Actions from last supervision and updates</p>
        <Textarea name="previousActions" value={form.previousActions} onChange={handleChange} rows={3} required />
      </section>
      <section>
        <h2 className="font-semibold">2. Leadership & Team Oversight</h2>
        <ul className="list-disc ml-6 text-sm text-muted-foreground">
          <li>How are you leading shifts and delegating tasks to care staff?</li>
          <li>Are supervisions, spot checks, and mentoring of carers being completed?</li>
          <li>Handling of staff concerns, absence, or performance issues.</li>
          <li>Team morale and culture on your shifts.</li>
        </ul>
        <Textarea name="leadership" value={form.leadership} onChange={handleChange} rows={3} required />
      </section>
      <section>
        <h2 className="font-semibold">3. Care Practice & Compliance</h2>
        <ul className="list-disc ml-6 text-sm text-muted-foreground">
          <li>Standards of personal care, dignity, and communication with residents.</li>
          <li>Accuracy and timeliness of care documentation (care notes, handovers, risk assessments).</li>
          <li>Compliance with policies (medication support, infection control, safeguarding).</li>
          <li>Any safeguarding incidents or concerns since last supervision.</li>
        </ul>
        <Textarea name="carePractice" value={form.carePractice} onChange={handleChange} rows={3} required />
      </section>
      <section>
        <h2 className="font-semibold">4. Resident Wellbeing & Outcomes</h2>
        <ul className="list-disc ml-6 text-sm text-muted-foreground">
          <li>How do you ensure residents’ care is person-centred?</li>
          <li>Feedback from residents and families.</li>
          <li>Examples of positive outcomes achieved for residents.</li>
          <li>Any concerns about residents’ health, safety, or emotional wellbeing?</li>
        </ul>
        <Textarea name="residentWellbeing" value={form.residentWellbeing} onChange={handleChange} rows={3} required />
      </section>
      <section>
        <h2 className="font-semibold">5. Training & Development</h2>
        <ul className="list-disc ml-6 text-sm text-muted-foreground">
          <li>Mandatory training status (safeguarding, medication, moving & handling, MCA/DoLS, dementia awareness).</li>
          <li>Additional training completed since last supervision.</li>
          <li>Development needs (e.g., leadership, clinical skills, documentation).</li>
        </ul>
        <Textarea name="training" value={form.training} onChange={handleChange} rows={3} required />
      </section>
      <section>
        <h2 className="font-semibold">6. Communication & Professionalism</h2>
        <ul className="list-disc ml-6 text-sm text-muted-foreground">
          <li>Communication with care team, nurses, and management.</li>
          <li>Confidence in escalating concerns or giving feedback to colleagues.</li>
          <li>Example of good teamwork or conflict management since last supervision.</li>
        </ul>
        <Textarea name="communication" value={form.communication} onChange={handleChange} rows={3} required />
      </section>
      <section>
        <h2 className="font-semibold">7. Wellbeing & Support</h2>
        <ul className="list-disc ml-6 text-sm text-muted-foreground">
          <li>How do you feel in your role?</li>
          <li>Workload and stress management.</li>
          <li>Do you feel supported by management?</li>
          <li>Any adjustments or support needed?</li>
        </ul>
        <Textarea name="wellbeing" value={form.wellbeing} onChange={handleChange} rows={3} required />
      </section>
      <section>
        <h2 className="font-semibold">8. Agreed Actions & Support</h2>
        <p className="text-sm text-muted-foreground mb-1">Clear, measurable actions with timescales and responsible person</p>
        <Textarea name="agreedActions" value={form.agreedActions} onChange={handleChange} rows={3} required />
      </section>
      <section>
        <h2 className="font-semibold">9. Signatures</h2>
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
      </section>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Save Supervision Record"}
      </Button>
    </form>
  );
}
