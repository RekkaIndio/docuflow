import React, { useState } from "react";
import { Plus, Trash2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export default function DailyPage({ workspaceId }: { workspaceId?: string }) {
  const { toast } = useToast();

  const [occupancy, setOccupancy] = useState<string>("");
  const [staffDay, setStaffDay] = useState<string>("");
  const [staffNight, setStaffNight] = useState<string>("");

  const [fallsCount, setFallsCount] = useState<number | "">("");
  const [fallsInjuries, setFallsInjuries] = useState<string>("");
  const [fallsWitnessed, setFallsWitnessed] = useState<string>("");
  const [fallsTime, setFallsTime] = useState<string>("");

  // Support multiple fall entries
  const [fallsEntries, setFallsEntries] = useState<Array<{ id: number; count: number; injuries?: string; witnessed?: string; time?: string }>>([]);

  const [cqcNotifications, setCqcNotifications] = useState<number | "">("");
  const [safeguards, setSafeguards] = useState<number | "">("");

  // Pre-admission / Showarounds
  const [preAdmissionsCount, setPreAdmissionsCount] = useState<number | "">("");
  const [showarounds, setShowarounds] = useState<string>("");

  const [woundsDetail, setWoundsDetail] = useState<string>("");
  // wound type counts (numeric) rather than booleans
  const [woundTypes, setWoundTypes] = useState<{ [k: string]: number }>({ pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 });

  const [infectionsUti, setInfectionsUti] = useState<number | "">("");
  const [infectionsChest, setInfectionsChest] = useState<number | "">("");
  const [infectionsWound, setInfectionsWound] = useState<number | "">("");

  const resetForm = () => {
    setOccupancy("");
    // reset staffing to zero-string so numeric conversion on save yields 0
    setStaffDay("0");
    setStaffNight("0");
    setFallsCount(0);
    setFallsInjuries("");
    setFallsWitnessed("");
    setFallsTime("");
    setCqcNotifications(0);
    setSafeguards(0);
    setWoundsDetail("");
    setWoundTypes({ pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 });
    setInfectionsUti(0);
    setInfectionsChest(0);
    setInfectionsWound(0);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentEntry, setCurrentEntry] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);

  const loadWeek = async (weekStart: Date) => {
    if (!workspaceId) return;
    setIsLoadingWeek(true);
    try {
      const from = weekStart;
      const to = endOfWeek(weekStart, { weekStartsOn: 1 });
      const { getDailyCheckinsInRange } = await import('@/lib/firestore');
      // Firestore Timestamp.now() used when saving, so pass Timestamps here
      const fromTs = Timestamp.fromDate(from);
      const toTs = Timestamp.fromDate(to);
      const items = await getDailyCheckinsInRange(workspaceId, fromTs, toTs);
      // We keep only one checkin per week: use the most recent (or first) as the canonical entry
      const latest = (items && items.length > 0) ? items[items.length - 1] : null;
      setCurrentEntry(latest);
      // populate form with latest entry in week if exists
      if (latest) {
        // set fields from latest (best-effort mapping)
        setOccupancy(latest.occupancy || '');
        setStaffDay((latest.staffing && latest.staffing.day) || '');
        setStaffNight((latest.staffing && latest.staffing.night) || '');
        setFallsCount(latest.falls?.count ?? '');
        // populate multi-fall entries if present
        if (latest.falls && Array.isArray(latest.falls.entries)) {
          setFallsEntries(latest.falls.entries.map((e: any, i: number) => ({ id: e.id ?? i, count: Number(e.count) || 0, injuries: e.injuries || '', witnessed: e.witnessed || '', time: e.time || '' })));
        }
        setFallsInjuries(latest.falls?.injuries || '');
        setFallsWitnessed(latest.falls?.witnessed || '');
        setFallsTime(latest.falls?.time || '');
        setCqcNotifications(latest.cqcNotifications ?? '');
        setSafeguards(latest.safeguards ?? '');
        setWoundsDetail((latest.wounds && latest.wounds.detail) || '');
        setWoundTypes({
          pressure: Number((latest.wounds && latest.wounds.types && latest.wounds.types.pressure) ?? 0),
          break: Number((latest.wounds && latest.wounds.types && latest.wounds.types.break) ?? 0),
          fracture: Number((latest.wounds && latest.wounds.types && latest.wounds.types.fracture) ?? 0),
          bruise: Number((latest.wounds && latest.wounds.types && latest.wounds.types.bruise) ?? 0),
          skintear: Number((latest.wounds && latest.wounds.types && latest.wounds.types.skintear) ?? 0),
        });
        setInfectionsUti(latest.infections?.uti ?? '');
        setInfectionsChest(latest.infections?.chest ?? '');
        setInfectionsWound(latest.infections?.wound ?? '');
      } else {
        // new week or no existing entry -> clear form and ensure editingId null
        setCurrentEntry(null);
        setEditingId(null);
        resetForm();
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Load failed', description: 'Could not load weekly entries', variant: 'destructive' });
    } finally {
      setIsLoadingWeek(false);
    }
  };

  const addFallEntry = () => {
    const newEntry = { id: Date.now(), count: 0, injuries: '', witnessed: '', time: '' };
    setFallsEntries(prev => {
      const next = [...prev, newEntry];
      // update aggregated count
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

  const handleEditEntry = (entry: any) => {
    // load entry into form and set editing id
    setEditingId(entry.id || null);
    setOccupancy(entry.occupancy || '');
    setStaffDay((entry.staffing && entry.staffing.day) || '');
    setStaffNight((entry.staffing && entry.staffing.night) || '');
    setFallsCount(entry.falls?.count ?? '');
    setFallsInjuries(entry.falls?.injuries || '');
    setFallsWitnessed(entry.falls?.witnessed || '');
    setFallsTime(entry.falls?.time || '');
    setCqcNotifications(entry.cqcNotifications ?? '');
    setSafeguards(entry.safeguards ?? '');
    setWoundsDetail((entry.wounds && entry.wounds.detail) || '');
    setWoundTypes({
      pressure: Number((entry.wounds && entry.wounds.types && entry.wounds.types.pressure) ?? 0),
      break: Number((entry.wounds && entry.wounds.types && entry.wounds.types.break) ?? 0),
      fracture: Number((entry.wounds && entry.wounds.types && entry.wounds.types.fracture) ?? 0),
      bruise: Number((entry.wounds && entry.wounds.types && entry.wounds.types.bruise) ?? 0),
      skintear: Number((entry.wounds && entry.wounds.types && entry.wounds.types.skintear) ?? 0),
    });
    setInfectionsUti(entry.infections?.uti ?? '');
    setInfectionsChest(entry.infections?.chest ?? '');
    setInfectionsWound(entry.infections?.wound ?? '');
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!workspaceId) return;
    if (!confirm('Delete this check-in? This cannot be undone.')) return;
    try {
      const { deleteDailyCheckin } = await import('@/lib/firestore');
      await deleteDailyCheckin(workspaceId, entryId);
      toast({ title: 'Deleted', description: 'Check-in removed.' });
      // reload week
      await loadWeek(selectedWeekStart);
      // if we were editing this entry, clear form
      if (editingId === entryId) {
        setEditingId(null);
        resetForm();
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Delete failed', description: 'Could not delete entry', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    // Build falls payload from current state (avoid referencing undefined `falls` variable)
    const fallsPayload: any = { count: fallsCount, injuries: fallsInjuries, witnessed: fallsWitnessed, time: fallsTime };
    if (fallsEntries && fallsEntries.length > 0) fallsPayload.entries = fallsEntries;

    const payload = {
      occupancy,
      staffing: { day: staffDay, night: staffNight },
      // analytics aggregates expect staffingDay/staffingNight at top-level
      staffingDay: Number(staffDay) || 0,
      staffingNight: Number(staffNight) || 0,
      falls: fallsPayload,
      preAdmissions: { count: Number(preAdmissionsCount) || 0, scheduled: (showarounds || '').split(',').map(s=>s.trim()).filter(Boolean) },
      cqcNotifications,
      safeguards,
      wounds: { detail: woundsDetail, types: woundTypes },
      infections: { uti: infectionsUti, chest: infectionsChest, wound: infectionsWound },
      recordedAt: new Date().toISOString(),
    };
    
    if (!workspaceId) {
      toast({ title: "Workspace missing", description: "Cannot save without an active workspace.", variant: 'destructive' });
      return;
    }

    try {
      setIsSaving(true);
      // Always upsert a single weekly entry. If editingId exists, update it.
      const { updateDailyCheckin, saveDailyCheckin } = await import('@/lib/firestore');
      if (editingId) {
        await updateDailyCheckin(workspaceId, editingId, payload);
        toast({ title: 'Updated', description: 'Check-in updated.' });
      } else if (currentEntry && currentEntry.id) {
        await updateDailyCheckin(workspaceId, currentEntry.id, payload);
        toast({ title: 'Updated', description: 'Check-in updated.' });
      } else {
        const saved = await saveDailyCheckin(workspaceId, payload);
        // saveDailyCheckin currently returns the created document id (string).
        // Handle both possible shapes (string id or object with .id) defensively.
  const newId = typeof saved === 'string' ? saved : ((saved as any)?.id ?? null);
        if (newId) {
          setCurrentEntry({ ...payload, id: newId });
          setEditingId(newId);
        }
        toast({ title: "Saved", description: "Daily check-in saved." });
      }
      // reload entries for the current selected week
      await loadWeek(selectedWeekStart);
    } catch (e) {
      console.error(e);
      toast({ title: "Save failed", description: "Failed to save check-in.", variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const setWoundCount = (key: string, val: number) => {
    setWoundTypes(prev => ({ ...prev, [key]: val }));
  };

  // Load initial week on mount or when workspace changes
  React.useEffect(() => {
    loadWeek(selectedWeekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const goPrevWeek = () => {
    const prev = addWeeks(selectedWeekStart, -1);
    setSelectedWeekStart(prev);
    loadWeek(prev);
  };

  const goNextWeek = () => {
    const next = addWeeks(selectedWeekStart, 1);
    setSelectedWeekStart(next);
    loadWeek(next);
  };

  const goThisWeek = () => {
    const nowStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    setSelectedWeekStart(nowStart);
    loadWeek(nowStart);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Daily Check-in</h1>
          <p className="text-sm text-muted-foreground mt-1">Quickly record the key metrics for this week. Submissions are saved to your workspace.</p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-3 hidden sm:block">
            {format(selectedWeekStart, 'MMM d')} — {format(endOfWeek(selectedWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </div>
          <Button variant="ghost" onClick={goPrevWeek}>&larr; Prev</Button>
          <Button variant="outline" onClick={goThisWeek}>This Week</Button>
          <Button variant="ghost" onClick={goNextWeek}>Next &rarr;</Button>
        </div>
      </div>


      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          {/* Occupancy, Staffing and Safeguards on a single responsive row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-md">
                <CardTitle>Occupancy</CardTitle>
                <CardDescription>Current occupancy for the home.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1">Occupancy</Label>
                    <Input value={occupancy} onChange={(e) => setOccupancy(e.target.value)} placeholder="e.g. 28/30" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-md">
                <CardTitle>Staffing</CardTitle>
                <CardDescription>Staffing levels for day and night shifts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1">Staffing — Day</Label>
                      <Input type="number" value={staffDay} onChange={(e) => setStaffDay(e.target.value)} placeholder="e.g. 8" />
                    </div>
                    <div>
                      <Label className="mb-1">Staffing — Night</Label>
                      <Input type="number" value={staffNight} onChange={(e) => setStaffNight(e.target.value)} placeholder="e.g. 4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-md">
                <CardTitle>Safeguards & Notifications</CardTitle>
                <CardDescription>Counts for CQC notifications and safeguards raised.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1">CQC Notifications</Label>
                    <Input type="number" value={cqcNotifications as any} onChange={(e) => setCqcNotifications(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="mb-1">Safeguards Raised</Label>
                    <Input type="number" value={safeguards as any} onChange={(e) => setSafeguards(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-md">
                <CardTitle>Pre-admission & Showarounds</CardTitle>
                <CardDescription>Record pre-admission bookings and scheduled showarounds.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1">Pre-admissions (count)</Label>
                    <Input type="number" value={preAdmissionsCount as any} onChange={(e) => setPreAdmissionsCount(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="mb-1">Showarounds (comma separated)</Label>
                    <Textarea value={showarounds} onChange={(e) => setShowarounds(e.target.value)} placeholder="e.g. John Doe, Jane Smith" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-md">
                <CardTitle>Falls</CardTitle>
                <CardDescription>Record falls details. Add multiple entries if needed.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">Total: {fallsCount || 0}</div>
                    <button type="button" className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white" onClick={addFallEntry} aria-label="Add fall">
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Add</span>
                    </button>
                  </div>

                  {fallsEntries.length === 0 && (
                    <div className="text-sm text-muted-foreground">No individual fall entries. Add one or enter an aggregate count.</div>
                  )}

                  <div className="space-y-3">
                    {fallsEntries.map(entry => (
                      <div key={entry.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2">
                          <Label className="mb-1">Count</Label>
                          <Input type="number" value={entry.count} onChange={(e) => updateFallEntry(entry.id, { count: Number(e.target.value || 0) })} />
                        </div>
                        <div className="col-span-4">
                          <Label className="mb-1">Injuries</Label>
                          <Input value={entry.injuries} onChange={(e) => updateFallEntry(entry.id, { injuries: e.target.value })} placeholder="e.g. minor head" />
                        </div>
                        <div className="col-span-3">
                          <Label className="mb-1">Witnessed</Label>
                          <Input value={entry.witnessed} onChange={(e) => updateFallEntry(entry.id, { witnessed: e.target.value })} placeholder="witnessed / unwitnessed" />
                        </div>
                        <div className="col-span-2">
                          <Label className="mb-1">Time</Label>
                          <Input value={entry.time} onChange={(e) => updateFallEntry(entry.id, { time: e.target.value })} placeholder="e.g. 14:30" />
                        </div>
                        <div className="col-span-1 flex items-end">
                          <button type="button" className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700" onClick={() => removeFallEntry(entry.id)} aria-label="Remove fall">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label className="mb-1">Aggregate count (optional)</Label>
                    <Input type="number" value={fallsCount as any} onChange={(e) => setFallsCount(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="mb-1">Injuries (summary)</Label>
                      <Input value={fallsInjuries} onChange={(e) => setFallsInjuries(e.target.value)} placeholder="e.g. minor head" />
                    </div>
                    <div>
                      <Label className="mb-1">Witnessed (summary)</Label>
                      <Input value={fallsWitnessed} onChange={(e) => setFallsWitnessed(e.target.value)} placeholder="witnessed / unwitnessed" />
                    </div>
                    <div>
                      <Label className="mb-1">Time (summary)</Label>
                      <Input value={fallsTime} onChange={(e) => setFallsTime(e.target.value)} placeholder="e.g. 14:30" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-md">
                <CardTitle>Wounds</CardTitle>
                <CardDescription>Select wound types and provide details/counts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div>
                      <Label className="mb-1">Pressure</Label>
                      <Input type="number" value={woundTypes.pressure as any} onChange={(e) => setWoundCount('pressure', e.target.value === '' ? 0 : Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="mb-1">Break</Label>
                      <Input type="number" value={woundTypes.break as any} onChange={(e) => setWoundCount('break', e.target.value === '' ? 0 : Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="mb-1">Fracture</Label>
                      <Input type="number" value={woundTypes.fracture as any} onChange={(e) => setWoundCount('fracture', e.target.value === '' ? 0 : Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="mb-1">Bruise</Label>
                      <Input type="number" value={woundTypes.bruise as any} onChange={(e) => setWoundCount('bruise', e.target.value === '' ? 0 : Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="mb-1">Skin tear</Label>
                      <Input type="number" value={woundTypes.skintear as any} onChange={(e) => setWoundCount('skintear', e.target.value === '' ? 0 : Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <Label className="mb-1">Details / counts</Label>
                  <Textarea value={woundsDetail} onChange={(e) => setWoundsDetail(e.target.value)} placeholder="Describe wound types and counts" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-md">
                <CardTitle>Infections</CardTitle>
                <CardDescription>Counts for common infection types.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="mb-1">UTI</Label>
                    <Input type="number" value={infectionsUti as any} onChange={(e) => setInfectionsUti(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="mb-1">Chest</Label>
                    <Input type="number" value={infectionsChest as any} onChange={(e) => setInfectionsChest(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="mb-1">Wound</Label>
                    <Input type="number" value={infectionsWound as any} onChange={(e) => setInfectionsWound(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <Button variant="secondary" onClick={resetForm}>Reset</Button>
            <Button onClick={handleSave}>{editingId ? 'Update Check-in' : 'Save Check-in'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
