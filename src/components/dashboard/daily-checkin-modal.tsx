"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWorkspace } from '@/context/workspace';
import { workspaceCollectionPath } from '@/lib/paths';
import { Users, Briefcase, Clock } from 'lucide-react';
import { getWorkspaceCollectionRef, getWorkspaceDocRef } from '@/lib/firestore';

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
  const activeWorkspace = useWorkspace();
  // If the caller didn't pass a workspaceId (or passed empty string), prefer the
  // workspace from context so saving/loading still works when the parent
  // doesn't have a stable id at mount time.
  const effectiveWorkspaceId = workspaceId || (activeWorkspace as any)?.id || '';
  const effectiveOrgId = (activeWorkspace as any)?.organisationId ?? null;
  useEffect(() => { if (typeof controlledOpen === 'boolean') setOpen(controlledOpen); }, [controlledOpen]);
  const todayKey = new Date().toISOString().split('T')[0];

  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(false);
  const [staffDay, setStaffDay] = useState<string>('');
  const [staffNight, setStaffNight] = useState<string>('');
  const [occupancy, setOccupancy] = useState<string>('');
  // validation helpers
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

  // parsed pills for showarounds (comma-separated)
  const parsedShowarounds = (showarounds || '').split(',').map(s => s.trim()).filter(Boolean);

  const removeShowaround = (name: string) => {
    const next = parsedShowarounds.filter(s => s !== name);
    setShowarounds(next.join(', '));
  };

  const [woundsDetail, setWoundsDetail] = useState<string>('');
  const [woundTypes, setWoundTypes] = useState<{ [k:string]: number }>({ pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 });

  const [infectionsUti, setInfectionsUti] = useState<number | ''>('');
  const [infectionsChest, setInfectionsChest] = useState<number | ''>('');
  const [infectionsWound, setInfectionsWound] = useState<number | ''>('');

  // Controlled accordion state: only one section open at a time
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (name: string) => {
    setOpenSection((prev) => (prev === name ? null : name));
  };

  // Progress calculation: consider key top-level sections as completed when they have meaningful values
  const progress = useMemo(() => {
    const checks = [
      validateOccupancy(occupancy), // occupancy
      validateStaffing(staffDay, staffNight), // staffing
      Boolean((cqcNotifications !== '' && cqcNotifications !== null) || (safeguards !== '' && safeguards !== null)), // safeguards/CQC
      Boolean((preAdmissionsCount !== '' && preAdmissionsCount !== null) || (showarounds && showarounds.trim() !== '')), // pre-admissions/showarounds
      Boolean((fallsCount !== '' && Number(fallsCount) > 0) || (fallsEntries && fallsEntries.length > 0)), // falls
      Boolean(Object.values(woundTypes || {}).reduce((s, v) => s + (Number(v) || 0), 0) > 0 || (woundsDetail && woundsDetail.trim() !== '')), // wounds
      Boolean((infectionsUti !== '' && Number(infectionsUti) > 0) || (infectionsChest !== '' && Number(infectionsChest) > 0) || (infectionsWound !== '' && Number(infectionsWound) > 0)), // infections
    ];
    const completed = checks.filter(Boolean).length;
    const total = checks.length || 1;
    return Math.round((completed / total) * 100);
  }, [occupancy, staffDay, staffNight, cqcNotifications, safeguards, preAdmissionsCount, showarounds, fallsCount, fallsEntries, woundTypes, woundsDetail, infectionsUti, infectionsChest, infectionsWound]);

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
    if (!effectiveWorkspaceId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
  const orgId = effectiveOrgId;
  const docRef = getWorkspaceDocRef(effectiveWorkspaceId, 'daily-checkins', todayKey, orgId || null);
    console.debug('[DailyCheckinModal] loading from', workspaceCollectionPath(effectiveWorkspaceId, 'daily-checkins', orgId || null), todayKey);
    const snap = docRef ? await getDoc(docRef) : null;
        if (!mounted) return;
        if (snap?.exists()) {
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
          // no step navigation in single-modal view; we simply load values
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
  }, [workspaceId, todayKey, (activeWorkspace as any)?.id]);

  const save = async () => {
    // Require an effective workspace id (either prop or context)
    if (!effectiveWorkspaceId) return;
    // Re-validate everything before saving
    if (!validateOccupancy(occupancy)) return;
    if (!validateStaffing(staffDay, staffNight)) return;
    setLoading(true);
    try {
      const now = new Date();
  const orgId = effectiveOrgId;
  const docRef = getWorkspaceDocRef(effectiveWorkspaceId, 'daily-checkins', todayKey, orgId || null);
      console.debug('[DailyCheckinModal] saving to', workspaceCollectionPath(effectiveWorkspaceId, 'daily-checkins', orgId || null), todayKey);
      if (!docRef) {
        console.error('Cannot determine daily-checkins path');
        setLoading(false);
        return;
      }
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

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    onOpenChange?.(v);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[DailyCheckinModal] Trigger clicked!');
    setOpen(true);
    onOpenChange?.(true);
  };

  return (
    <>
      <div 
        onClick={handleTriggerClick}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 10 }}
      >
        {trigger || (
          <Button className="w-full" type="button">
            {exists ? "Update check-in" : "Complete check-in"}
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-full sm:max-w-6xl p-0 max-h-[calc(100vh-3.5rem)] mx-auto my-6">
        {/* Visually prominent header inspired by ResidentAssessmentEditModal */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 rounded-t-2xl text-white relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Daily Check-in — {todayKey}</DialogTitle>
                <p className="text-white/90 text-sm mt-1">Record occupancy, staffing, safeguards and clinical metrics</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="w-48">
                <div className="text-right text-xs text-white/90 mb-1">{progress}% Complete</div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-2 bg-white/90" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-white/90">{exists ? 'Entry exists for today' : 'New entry'}</div>
                <DialogClose asChild>
                  <Button variant="ghost" className="text-white/90">Close</Button>
                </DialogClose>
              </div>
            </div>
          </div>
          
        </div>

        <div className="bg-transparent rounded-b-2xl max-h-[calc(100vh-12rem)] overflow-hidden flex flex-col">
          <div className="p-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Occupancy card */}
              <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                </div>
                <div>
                  <Label className="mb-1">Occupancy</Label>
                  <input className="w-full bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm text-sm h-10" value={occupancy} onChange={(e) => setOccupancy(e.target.value)} placeholder="e.g. 12/20 or 60%" />
                  {!validateOccupancy(occupancy) && <div className="text-xs text-red-500 mt-1">Please enter occupancy (e.g. 12/20 or 60%).</div>}
                </div>
              </div>

              {/* Staffing & operational metrics in a compact grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 col-span-2">
                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Staffing</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <Label className="mb-1">Day staff</Label>
                      <Input value={staffDay} onChange={(e) => setStaffDay(e.target.value)} type="number" min={0} className="text-sm h-10" />
                    </div>
                    <div>
                      <Label className="mb-1">Night staff</Label>
                      <Input value={staffNight} onChange={(e) => setStaffNight(e.target.value)} type="number" min={0} className="text-sm h-10" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Safeguards & CQC</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <Label className="mb-1">CQC Notifications</Label>
                      <input className="w-full bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm text-sm h-10" type="number" value={cqcNotifications as any} onChange={(e) => setCqcNotifications(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="mb-1">Safeguards Raised</Label>
                      <input className="w-full bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm text-sm h-10" type="number" value={safeguards as any} onChange={(e) => setSafeguards(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Admissions & Showarounds</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <Label className="mb-1">Pre-admissions (count)</Label>
                      <input className="w-full bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm text-sm h-10" type="number" value={preAdmissionsCount as any} onChange={(e) => setPreAdmissionsCount(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="mb-1">Showarounds (comma separated)</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {parsedShowarounds.length === 0 && <div className="text-sm text-gray-500">No showarounds</div>}
                        {parsedShowarounds.map(name => (
                          <div key={name} className="inline-flex items-center bg-white/90 border border-gray-200 rounded-full px-3 py-1 text-sm">
                            <span className="mr-2">{name}</span>
                            <button type="button" onClick={() => removeShowaround(name)} className="text-xs text-gray-500 hover:text-gray-700">✕</button>
                          </div>
                        ))}
                      </div>
                      <textarea className="w-full bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm text-sm h-10" value={showarounds} onChange={(e) => setShowarounds(e.target.value)} placeholder="e.g. John Doe, Jane Smith" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <div role="button" tabIndex={0} aria-expanded={openSection === 'falls'} onClick={() => toggleSection('falls')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('falls'); } }} className="cursor-pointer bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center justify-between"><span className="font-medium text-sm">Falls</span><span className="text-sm text-gray-600">Total: {fallsCount || 0}</span></div>
                </div>
                {openSection === 'falls' && (
                  <div className="bg-slate-50 rounded-b-xl p-3 border border-slate-100 mt-0">
                  <div className="mb-3">
                      <Button variant="ghost" size="sm" onClick={addFallEntry}>Add entry</Button>
                  </div>
                  {fallsEntries.length === 0 && <div className="text-sm text-gray-500 mb-2">No individual fall entries. Add one or enter an aggregate count.</div>}
                  <div className="space-y-3">
                    {fallsEntries.map(entry => (
                      <div key={entry.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2">
                          <Label className="mb-1">Count</Label>
                  <Input type="number" value={entry.count} onChange={(e) => updateFallEntry(entry.id, { count: Number(e.target.value || 0) })} className="text-sm h-10" />
                        </div>
                        <div className="col-span-4">
                          <Label className="mb-1">Injuries</Label>
                          <Input value={entry.injuries} onChange={(e) => updateFallEntry(entry.id, { injuries: e.target.value })} className="text-sm h-10" />
                        </div>
                        <div className="col-span-3">
                          <Label className="mb-1">Witnessed</Label>
                          <Input value={entry.witnessed} onChange={(e) => updateFallEntry(entry.id, { witnessed: e.target.value })} className="text-sm h-10" />
                        </div>
                        <div className="col-span-2">
                          <Label className="mb-1">Time</Label>
                          <Input value={entry.time} onChange={(e) => updateFallEntry(entry.id, { time: e.target.value })} className="text-sm h-10" />
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button variant="destructive" size="sm" onClick={() => removeFallEntry(entry.id)}>Remove</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
                    <div>
                      <label className="text-xs text-gray-600">Aggregate count (optional)</label>
                      <input type="number" value={fallsCount as any} onChange={(e) => setFallsCount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm h-10" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Injuries (summary)</label>
                      <input value={fallsInjuries} onChange={(e) => setFallsInjuries(e.target.value)} className="w-full border rounded px-3 py-2 text-sm h-10" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Witnessed (summary)</label>
                      <input value={fallsWitnessed} onChange={(e) => setFallsWitnessed(e.target.value)} className="w-full border rounded px-3 py-2 text-sm h-10" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Time (summary)</label>
                      <input value={fallsTime} onChange={(e) => setFallsTime(e.target.value)} className="w-full border rounded px-3 py-2 text-sm h-10" />
                    </div>
                  </div>
                  </div>
                )}
              </div>

              {/* Wounds */}
              <div className="col-span-2">
                <div role="button" tabIndex={0} aria-expanded={openSection === 'wounds'} onClick={() => toggleSection('wounds')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('wounds'); } }} className="cursor-pointer bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="font-medium text-sm">Wounds</div>
                </div>
                {openSection === 'wounds' && (
                  <div className="bg-slate-50 rounded-b-xl p-3 border border-slate-100 mt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Pressure</label>
                      <input type="number" value={woundTypes.pressure as any} onChange={(e) => setWoundCount('pressure', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm h-10" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Break</label>
                      <input type="number" value={woundTypes.break as any} onChange={(e) => setWoundCount('break', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm h-10" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Fracture</label>
                      <input type="number" value={woundTypes.fracture as any} onChange={(e) => setWoundCount('fracture', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm h-10" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Bruise</label>
                      <input type="number" value={woundTypes.bruise as any} onChange={(e) => setWoundCount('bruise', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm h-10" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Skin tear</label>
                      <input type="number" value={woundTypes.skintear as any} onChange={(e) => setWoundCount('skintear', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm h-10" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-gray-600">Details / counts</label>
                    <textarea className="w-full bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm text-sm h-10" value={woundsDetail} onChange={(e) => setWoundsDetail(e.target.value)} />
                  </div>
                </div>
              )}
              </div>

              {/* Infections */}
              <div className="col-span-2">
                <div role="button" tabIndex={0} aria-expanded={openSection === 'infections'} onClick={() => toggleSection('infections')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('infections'); } }} className="cursor-pointer bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="font-medium text-sm">Infections</div>
                </div>
                {openSection === 'infections' && (
                  <div className="bg-slate-50 rounded-b-xl p-3 border border-slate-100 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">UTI</label>
                      <input className="w-full bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm text-sm h-10" type="number" value={infectionsUti as any} onChange={(e) => setInfectionsUti(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Chest</label>
                      <input className="w-full bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm text-sm h-10" type="number" value={infectionsChest as any} onChange={(e) => setInfectionsChest(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Wound</label>
                      <input className="w-full bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm text-sm h-10" type="number" value={infectionsWound as any} onChange={(e) => setInfectionsWound(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Review removed per request */}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end items-center gap-3 flex-shrink-0">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={save} disabled={loading || !validateOccupancy(occupancy) || !validateStaffing(staffDay, staffNight)} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              {loading ? 'Saving...' : exists ? 'Save changes' : 'Save today'}
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
