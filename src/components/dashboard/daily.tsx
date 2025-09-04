import React, { useState } from "react";
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

  const [cqcNotifications, setCqcNotifications] = useState<number | "">("");
  const [safeguards, setSafeguards] = useState<number | "">("");

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
    const payload = {
      occupancy,
      staffing: { day: staffDay, night: staffNight },
      // analytics aggregates expect staffingDay/staffingNight at top-level
      staffingDay: Number(staffDay) || 0,
      staffingNight: Number(staffNight) || 0,
      falls: { count: fallsCount, injuries: fallsInjuries, witnessed: fallsWitnessed, time: fallsTime },
      cqcNotifications,
      safeguards,
      wounds: { detail: woundsDetail, types: woundTypes },
      infections: { uti: infectionsUti, chest: infectionsChest, wound: infectionsWound },
      recordedAt: new Date().toISOString(),
    };
    console.log("Daily payload:", payload);
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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Weekly Check-in</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={goPrevWeek}>&larr; Prev</Button>
          <Button variant="outline" onClick={goThisWeek}>This Week</Button>
          <Button variant="ghost" onClick={goNextWeek}>Next &rarr;</Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(selectedWeekStart, 'MMM d')} — {format(endOfWeek(selectedWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
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
          <CardHeader>
            <CardTitle>Staffing</CardTitle>
            <CardDescription>Staffing levels for day and night shifts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1">Staffing — Day</Label>
                  <Input value={staffDay} onChange={(e) => setStaffDay(e.target.value)} placeholder="e.g. 8" />
                </div>
                <div>
                  <Label className="mb-1">Staffing — Night</Label>
                  <Input value={staffNight} onChange={(e) => setStaffNight(e.target.value)} placeholder="e.g. 4" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Falls</CardTitle>
            <CardDescription>Record falls details including time and witnessed status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <Label className="mb-1">Count</Label>
                  <Input type="number" value={fallsCount as any} onChange={(e) => setFallsCount(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div>
                  <Label className="mb-1">Injuries</Label>
                  <Input value={fallsInjuries} onChange={(e) => setFallsInjuries(e.target.value)} placeholder="e.g. minor head" />
                </div>
                <div>
                  <Label className="mb-1">Witnessed</Label>
                  <Input value={fallsWitnessed} onChange={(e) => setFallsWitnessed(e.target.value)} placeholder="witnessed / unwitnessed" />
                </div>
              </div>

              <div>
                <Label className="mb-1">Time</Label>
                <Input value={fallsTime} onChange={(e) => setFallsTime(e.target.value)} placeholder="e.g. 14:30" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
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
          <CardHeader>
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

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={resetForm}>Reset</Button>
        <Button onClick={handleSave}>{editingId ? 'Update Check-in' : 'Save Check-in'}</Button>
      </div>

      {/* Current week's single entry (canonical) */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold">This week's check-in</h2>
        {isLoadingWeek ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : currentEntry ? (
          <div className="p-3 border rounded flex items-start justify-between mt-3">
            <div>
              <div className="text-sm font-medium">Last saved: {format((currentEntry.createdAt && currentEntry.createdAt.toDate) ? currentEntry.createdAt.toDate() : new Date(currentEntry.recordedAt || currentEntry.createdAt || Date.now()), 'PPpp')}</div>
              <div className="text-sm text-muted-foreground">Occupancy: {currentEntry.occupancy || '—'} • Falls: {currentEntry.falls?.count ?? 0} • CQC: {currentEntry.cqcNotifications ?? 0}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => handleEditEntry(currentEntry)}>Edit</Button>
              <Button variant="destructive" onClick={() => handleDeleteEntry(currentEntry.id)}>Delete</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mt-3">No saved check-in for this week yet.</div>
        )}
      </div>
    </div>
  );
}
