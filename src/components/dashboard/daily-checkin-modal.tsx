"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, Briefcase, Clock } from 'lucide-react';

// Simple step indicator component
function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${i === current ? 'bg-blue-600 text-white' : i < current ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {i + 1}
          </div>
          <div className={`text-sm ${i === current ? 'text-blue-800' : 'text-muted-foreground'}`}>{s}</div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  workspaceId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEntryUpdate?: (entry: any) => void;
  trigger?: React.ReactNode;
};

export default function DailyCheckinModal({ workspaceId, open: controlledOpen, onOpenChange, onEntryUpdate, trigger }: Props) {
  const [open, setOpen] = useState<boolean>(false);
  useEffect(() => { if (typeof controlledOpen === 'boolean') setOpen(controlledOpen); }, [controlledOpen]);
  const todayKey = new Date().toISOString().split('T')[0];

  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(false);
  const [staffDay, setStaffDay] = useState<string>('');
  const [staffNight, setStaffNight] = useState<string>('');
  const [occupancy, setOccupancy] = useState<string>('');
  // Steps mirror the sections from the weekly DailyPage
  const steps = ['Occupancy', 'Staffing', 'Safeguards', 'Pre-admissions', 'Falls', 'Wounds', 'Infections', 'Review'];
  const [step, setStep] = useState<number>(0);

  // validation state for each step
  const validateOccupancy = (v: string) => {
    if (!v || v.trim() === '') return false;
    // accept either 'num/num' or percentage or number
    if (v.includes('/')) {
      const parts = v.split('/').map(p => p.trim());
      const a = parseFloat(parts[0]);
      const b = parseFloat(parts[1]);
      return !isNaN(a) && !isNaN(b) && b > 0;
    }
    // try percent '60%' or number
    const asNum = parseFloat(v.replace('%',''));
    return !isNaN(asNum);
  };

  const validateStaffing = (day: string, night: string) => {
    const d = parseInt(day || '0', 10);
    const n = parseInt(night || '0', 10);
    return !isNaN(d) && !isNaN(n) && d >= 0 && n >= 0;
  };

  // Additional fields from DailyPage
  const [fallsCount, setFallsCount] = useState<number | ''>('');
  const [fallsEntries, setFallsEntries] = useState<Array<any>>([]);
  const [fallsInjuries, setFallsInjuries] = useState<string>('');
  const [fallsWitnessed, setFallsWitnessed] = useState<string>('');
  const [fallsTime, setFallsTime] = useState<string>('');

  const [cqcNotifications, setCqcNotifications] = useState<number | ''>('');
  const [safeguards, setSafeguards] = useState<number | ''>('');

  const [preAdmissionsCount, setPreAdmissionsCount] = useState<number | ''>('');
  const [showarounds, setShowarounds] = useState<string>('');

  const [woundsDetail, setWoundsDetail] = useState<string>('');
  const [woundTypes, setWoundTypes] = useState<{ [k:string]: number }>({ pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 });

  const [infectionsUti, setInfectionsUti] = useState<number | ''>('');
  const [infectionsChest, setInfectionsChest] = useState<number | ''>('');
  const [infectionsWound, setInfectionsWound] = useState<number | ''>('');

  const addFallEntry = () => {
    const newEntry = { id: Date.now(), count: 0, injuries: '', witnessed: '', time: '' };
    setFallsEntries(prev => {
      const next = [...prev, newEntry];
      setFallsCount(next.reduce((s, it) => s + (Number(it.count) || 0), 0));
      return next;
    });
  };

  const updateFallEntry = (id: number, changes: Partial<{ count: number; injuries?: string; witnessed?: string; time?: string }>) => {
    setFallsEntries(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...changes } : e);
      setFallsCount(next.reduce((s, it) => s + (Number(it.count) || 0), 0));
      return next;
    });
  };

  const removeFallEntry = (id: number) => {
    setFallsEntries(prev => {
      const next = prev.filter(e => e.id !== id);
      setFallsCount(next.reduce((s, it) => s + (Number(it.count) || 0), 0));
      return next;
    });
  };

  const setWoundCount = (key: string, val: number) => {
    setWoundTypes(prev => ({ ...prev, [key]: val }));
  };

  useEffect(() => {
    if (!workspaceId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const docRef = doc(db, `workspaces/${workspaceId}/daily-checkins`, todayKey);
        const snap = await getDoc(docRef);
        if (!mounted) return;
        if (snap.exists()) {
          const d = snap.data() as any;
          setExists(true);
          setStaffDay(d.staffingDay ? String(d.staffingDay) : '');
          setStaffNight(d.staffingNight ? String(d.staffingNight) : '');
          setOccupancy(d.occupancy ? String(d.occupancy) : '');
          // Load additional fields
          setFallsCount(d.falls?.count ?? '');
          setFallsEntries(Array.isArray(d.falls?.entries) ? d.falls.entries.map((e:any,i:number) => ({ id: e.id ?? i, count: Number(e.count) || 0, injuries: e.injuries || '', witnessed: e.witnessed || '', time: e.time || '' })) : []);
          setFallsInjuries(d.falls?.injuries || '');
          setFallsWitnessed(d.falls?.witnessed || '');
          setFallsTime(d.falls?.time || '');

          setCqcNotifications(d.cqcNotifications ?? '');
          setSafeguards(d.safeguards ?? '');

          setPreAdmissionsCount(d.preAdmissions?.count ?? '');
          setShowarounds(Array.isArray(d.preAdmissions?.scheduled) ? (d.preAdmissions.scheduled || []).join(', ') : (d.showarounds || ''));

          setWoundsDetail(d.wounds?.detail || '');
          setWoundTypes({
            pressure: Number((d.wounds && d.wounds.types && d.wounds.types.pressure) ?? 0),
            break: Number((d.wounds && d.wounds.types && d.wounds.types.break) ?? 0),
            fracture: Number((d.wounds && d.wounds.types && d.wounds.types.fracture) ?? 0),
            bruise: Number((d.wounds && d.wounds.types && d.wounds.types.bruise) ?? 0),
            skintear: Number((d.wounds && d.wounds.types && d.wounds.types.skintear) ?? 0),
          });

          setInfectionsUti(d.infections?.uti ?? '');
          setInfectionsChest(d.infections?.chest ?? '');
          setInfectionsWound(d.infections?.wound ?? '');
          // if loaded and core validations pass, show review step by default
          if (validateOccupancy(d.occupancy ? String(d.occupancy) : '') && validateStaffing(String(d.staffingDay || ''), String(d.staffingNight || ''))) {
            setStep(steps.length - 1);
          }
        } else {
          setExists(false);
          setStaffDay('');
          setStaffNight('');
          setOccupancy('');
        }
      } catch (e) {
        console.error('Failed to load today checkin', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [workspaceId, todayKey]);

  const save = async () => {
    if (!workspaceId) return;
    // Re-validate everything before saving
    if (!validateOccupancy(occupancy)) return;
    if (!validateStaffing(staffDay, staffNight)) return;
    setLoading(true);
    try {
      const now = new Date();
      const docRef = doc(db, `workspaces/${workspaceId}/daily-checkins`, todayKey);
      const fallsPayload: any = { count: fallsCount, injuries: fallsInjuries, witnessed: fallsWitnessed, time: fallsTime };
      if (fallsEntries && fallsEntries.length > 0) fallsPayload.entries = fallsEntries;
      const payload = {
        occupancy,
        staffing: { day: staffDay, night: staffNight },
        staffingDay: Number(staffDay) || 0,
        staffingNight: Number(staffNight) || 0,
        falls: fallsPayload,
        preAdmissions: { count: Number(preAdmissionsCount) || 0, scheduled: (showarounds || '').split(',').map((s:string)=>s.trim()).filter(Boolean) },
        cqcNotifications,
        safeguards,
        wounds: { detail: woundsDetail, types: woundTypes },
        infections: { uti: infectionsUti, chest: infectionsChest, wound: infectionsWound },
        recordedAt: now.toISOString(),
      };

      await setDoc(docRef, { ...payload, updatedAt: now, createdAt: now }, { merge: true });
      setExists(true);
      
      // Call the callback to update parent component
      if (onEntryUpdate) {
        onEntryUpdate({ ...payload, id: todayKey });
      }
      
      setOpen(false);
      onOpenChange?.(false);
    } catch (e) {
      console.error('Failed to save checkin', e);
    } finally {
      setLoading(false);
    }
  };

  const canProceedFromStep = (s: number) => {
    if (s === 0) return validateOccupancy(occupancy);
    if (s === 1) return validateStaffing(staffDay, staffNight);
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); onOpenChange?.(v); }}>
      <DialogTrigger asChild>
        {trigger || <span />}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[960px] p-0 max-h-[90vh] overflow-hidden">
        {/* Accessibility: ensure a DialogTitle exists for screen readers per radix requirements */}
        <DialogHeader className="sr-only">
          <DialogTitle>Daily Check-in — {todayKey}</DialogTitle>
        </DialogHeader>
        {/* Dark hero header to match dashboard style */}
        <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Daily Check-in — {todayKey}</DialogTitle>
                <p className="text-slate-300 text-sm mt-1">Record daily occupancy, staffing, and health metrics</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-b-lg border-0 shadow-none max-h-[calc(90vh-120px)] overflow-y-auto">
          <CardContent className="p-6">
            <div className="space-y-6">
              <StepIndicator steps={steps} current={step} />

            {step === 0 && (
              <div className="space-y-3">
                <div>
                  <Label className="mb-1">Occupancy</Label>
                  <Input value={occupancy} onChange={(e) => setOccupancy(e.target.value)} placeholder="e.g. 12/20 or 60%" />
                </div>
                {!validateOccupancy(occupancy) && <div className="text-xs text-red-500">Please enter occupancy (e.g. 12/20 or 60%).</div>}
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1">Day staff</Label>
                  <Input value={staffDay} onChange={(e) => setStaffDay(e.target.value)} type="number" min={0} />
                </div>
                <div>
                  <Label className="mb-1">Night staff</Label>
                  <Input value={staffNight} onChange={(e) => setStaffNight(e.target.value)} type="number" min={0} />
                </div>
                {!validateStaffing(staffDay, staffNight) && <div className="text-xs text-red-500 col-span-full">Please enter valid non-negative numbers for day and night staff.</div>}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1">CQC Notifications</Label>
                  <Input type="number" value={cqcNotifications as any} onChange={(e) => setCqcNotifications(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div>
                  <Label className="mb-1">Safeguards Raised</Label>
                  <Input type="number" value={safeguards as any} onChange={(e) => setSafeguards(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1">Pre-admissions (count)</Label>
                  <Input type="number" value={preAdmissionsCount as any} onChange={(e) => setPreAdmissionsCount(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div>
                  <Label className="mb-1">Showarounds (comma separated)</Label>
                  <Textarea value={showarounds} onChange={(e) => setShowarounds(e.target.value)} placeholder="e.g. John Doe, Jane Smith" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">Total falls: {fallsCount || 0}</div>
                  <Button variant="ghost" size="sm" onClick={addFallEntry}>Add</Button>
                </div>
                {fallsEntries.length === 0 && <div className="text-sm text-muted-foreground">No individual fall entries. Add one or enter an aggregate count.</div>}
                <div className="space-y-3">
                  {fallsEntries.map(entry => (
                    <div key={entry.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <Label className="mb-1">Count</Label>
                        <Input type="number" value={entry.count} onChange={(e) => updateFallEntry(entry.id, { count: Number(e.target.value || 0) })} />
                      </div>
                      <div className="col-span-4">
                        <Label className="mb-1">Injuries</Label>
                        <Input value={entry.injuries} onChange={(e) => updateFallEntry(entry.id, { injuries: e.target.value })} />
                      </div>
                      <div className="col-span-3">
                        <Label className="mb-1">Witnessed</Label>
                        <Input value={entry.witnessed} onChange={(e) => updateFallEntry(entry.id, { witnessed: e.target.value })} />
                      </div>
                      <div className="col-span-2">
                        <Label className="mb-1">Time</Label>
                        <Input value={entry.time} onChange={(e) => updateFallEntry(entry.id, { time: e.target.value })} />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button variant="destructive" size="sm" onClick={() => removeFallEntry(entry.id)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Aggregate count (optional)</label>
                  <input type="number" value={fallsCount as any} onChange={(e) => setFallsCount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Injuries (summary)</label>
                    <input value={fallsInjuries} onChange={(e) => setFallsInjuries(e.target.value)} className="w-full border rounded px-2 py-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Witnessed (summary)</label>
                    <input value={fallsWitnessed} onChange={(e) => setFallsWitnessed(e.target.value)} className="w-full border rounded px-2 py-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Time (summary)</label>
                    <input value={fallsTime} onChange={(e) => setFallsTime(e.target.value)} className="w-full border rounded px-2 py-1" />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Pressure</label>
                  <input type="number" value={woundTypes.pressure as any} onChange={(e) => setWoundCount('pressure', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Break</label>
                  <input type="number" value={woundTypes.break as any} onChange={(e) => setWoundCount('break', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Fracture</label>
                  <input type="number" value={woundTypes.fracture as any} onChange={(e) => setWoundCount('fracture', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bruise</label>
                  <input type="number" value={woundTypes.bruise as any} onChange={(e) => setWoundCount('bruise', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Skin tear</label>
                  <input type="number" value={woundTypes.skintear as any} onChange={(e) => setWoundCount('skintear', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                </div>
                <div className="col-span-full">
                  <label className="text-xs text-muted-foreground">Details / counts</label>
                  <textarea value={woundsDetail} onChange={(e) => setWoundsDetail(e.target.value)} className="w-full border rounded px-2 py-1" />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">UTI</label>
                  <input type="number" value={infectionsUti as any} onChange={(e) => setInfectionsUti(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Chest</label>
                  <input type="number" value={infectionsChest as any} onChange={(e) => setInfectionsChest(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Wound</label>
                  <input type="number" value={infectionsWound as any} onChange={(e) => setInfectionsWound(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border rounded px-2 py-1" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <h3 className="font-medium">Review</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Occupancy</div>
                    <div className="font-medium">{occupancy || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Day staff</div>
                    <div className="font-medium">{staffDay || '0'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Night staff</div>
                    <div className="font-medium">{staffNight || '0'}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-between">
              <div className="flex items-center gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))}>Back</Button>
                )}
                {step < steps.length - 1 ? (
                  <Button onClick={() => { if (canProceedFromStep(step)) setStep(s => s + 1); }} disabled={!canProceedFromStep(step)}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={save} disabled={loading || !validateOccupancy(occupancy) || !validateStaffing(staffDay, staffNight)}>
                    {loading ? 'Saving...' : exists ? 'Save changes' : 'Save today'}
                  </Button>
                )}
              </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
