"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, X } from 'lucide-react';
import { getDoc, setDoc } from 'firebase/firestore';
import { useWorkspace } from '@/context/workspace';
import { getWorkspaceDocRef } from '@/lib/firestore';

// Lightweight wrapper that keeps each modal section visually consistent
function SectionCard({
  title,
  subtitle,
  children,
  footer,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm ${className}`}>
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {footer ? <div className="text-xs text-slate-500">{footer}</div> : null}
      </div>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </div>
  );
}

type FallEntry = {
  id: number;
  count: number;
  injuries: string;
  witnessed: string;
  time: string;
};

type WoundTypes = {
  pressure: number;
  break: number;
  fracture: number;
  bruise: number;
  skintear: number;
};

type Props = {
  workspaceId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEntryUpdate?: (entry: any) => void;
  trigger?: React.ReactNode;
};

export default function DailyCheckinModal({ workspaceId, open: controlledOpen, onOpenChange, onEntryUpdate, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const workspaceContext = useWorkspace() as any;
  const effectiveWorkspaceId = workspaceId || workspaceContext?.id || '';
  const organisationId = workspaceContext?.organisationId ?? null;

  const steps = useMemo(
    () => [
      { title: 'Occupancy & staffing', description: "Capture today's cover and bed use" },
      { title: 'Incidents & pipeline', description: 'Safeguards, CQC notifications and admissions' },
      { title: 'Falls', description: 'Log individual falls and summaries' },
      { title: 'Wounds', description: 'Update wound counts and notes' },
      { title: 'Infections', description: 'Record infections by type' },
      { title: 'Other updates', description: 'Capture any extra notes for today' },
      { title: 'Review & submit', description: 'Confirm details before saving' },
    ],
    [],
  );

  useEffect(() => {
    if (typeof controlledOpen === 'boolean') {
      setOpen(controlledOpen);
      if (controlledOpen) {
        setCurrentStep(0);
      }
    }
  }, [controlledOpen]);

  const todayKey = new Date().toISOString().split('T')[0];

  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(false);
  const [staffDay, setStaffDay] = useState('');
  const [staffNight, setStaffNight] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [fallsCount, setFallsCount] = useState<number | ''>('');
  const [fallsEntries, setFallsEntries] = useState<FallEntry[]>([]);
  const [fallsInjuries, setFallsInjuries] = useState('');
  const [fallsWitnessed, setFallsWitnessed] = useState('');
  const [fallsUnwitnessed, setFallsUnwitnessed] = useState('');
  const [cqcNotifications, setCqcNotifications] = useState<number | ''>('');
  const [safeguards, setSafeguards] = useState<number | ''>('');
  const [preAdmissionsCount, setPreAdmissionsCount] = useState<number | ''>('');
  const [showarounds, setShowarounds] = useState('');
  const [woundsDetail, setWoundsDetail] = useState('');
  const [woundTypes, setWoundTypes] = useState<WoundTypes>({ pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 });
  const [infectionsUti, setInfectionsUti] = useState<number | ''>('');
  const [infectionsChest, setInfectionsChest] = useState<number | ''>('');
  const [infectionsWound, setInfectionsWound] = useState<number | ''>('');
  const [infectionsOther, setInfectionsOther] = useState<number | ''>('');
  const [infectionsOtherDetail, setInfectionsOtherDetail] = useState('');
  const [otherUpdates, setOtherUpdates] = useState('');

  const parsedShowarounds = useMemo(
    () =>
      (showarounds || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    [showarounds],
  );

  const validateOccupancy = (value: string) => {
    if (!value.trim()) return false;
    if (value.includes('/')) {
      const [currentStr, totalStr] = value.split('/');
      const current = Number(currentStr.trim());
      const total = Number(totalStr.trim());
      return Number.isFinite(current) && Number.isFinite(total) && total > 0;
    }
    const percent = Number(value.replace('%', '').trim());
    return Number.isFinite(percent);
  };

  const validateStaffing = (day: string, night: string) => {
    const dayCount = Number(day.trim() || 0);
    const nightCount = Number(night.trim() || 0);
    return Number.isFinite(dayCount) && Number.isFinite(nightCount) && dayCount >= 0 && nightCount >= 0;
  };

  const dataCompletion = useMemo(() => {
    const checkpoints = [
      validateOccupancy(occupancy),
      validateStaffing(staffDay, staffNight),
      Boolean(cqcNotifications !== '' || safeguards !== ''),
      Boolean(preAdmissionsCount !== '' || parsedShowarounds.length > 0),
      Boolean((fallsCount !== '' && Number(fallsCount) > 0) || fallsEntries.length > 0),
      Boolean(Object.values(woundTypes).some((value) => Number(value) > 0) || woundsDetail.trim()),
      Boolean(
        (infectionsUti !== '' && Number(infectionsUti) > 0) ||
          (infectionsChest !== '' && Number(infectionsChest) > 0) ||
          (infectionsWound !== '' && Number(infectionsWound) > 0) ||
          (infectionsOther !== '' && Number(infectionsOther) > 0) ||
          infectionsOtherDetail.trim(),
      ),
    ];

    const completed = checkpoints.filter(Boolean).length;
    return Math.round((completed / checkpoints.length) * 100);
  }, [
    occupancy,
    staffDay,
    staffNight,
    cqcNotifications,
    safeguards,
    preAdmissionsCount,
    parsedShowarounds,
    fallsCount,
    fallsEntries,
    woundTypes,
    woundsDetail,
    infectionsUti,
    infectionsChest,
    infectionsWound,
    infectionsOther,
    infectionsOtherDetail,
  ]);

  const totalSteps = steps.length;
  const stepProgress = Math.round(((currentStep + 1) / totalSteps) * 100);
  const currentStepMeta = steps[currentStep] ?? steps[0];
  const coreInfoComplete = validateOccupancy(occupancy) && validateStaffing(staffDay, staffNight);

  const canProceedFromStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      return coreInfoComplete;
    }
    return true;
  };

  const goToNextStep = () => {
    if (!canProceedFromStep(currentStep)) {
      return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep((previous) => Math.min(previous + 1, totalSteps - 1));
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((previous) => Math.max(previous - 1, 0));
    }
  };

  const dashIfEmpty = (value: string | number | null | undefined) => {
    const asString = value === null || typeof value === 'undefined' ? '' : String(value);
    return asString.trim() === '' ? '—' : asString;
  };

  const renderReviewSummary = (title = 'Review', subtitle = 'Confirm the key details before saving') => (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Occupancy</p>
          <p className="text-sm text-slate-800">{dashIfEmpty(occupancy)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Staffing (day / night)</p>
          <p className="text-sm text-slate-800">
            {dashIfEmpty(staffDay)} / {dashIfEmpty(staffNight)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">CQC notifications</p>
          <p className="text-sm text-slate-800">{dashIfEmpty(cqcNotifications)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Safeguards</p>
          <p className="text-sm text-slate-800">{dashIfEmpty(safeguards)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Pre-admissions</p>
          <p className="text-sm text-slate-800">{dashIfEmpty(preAdmissionsCount)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Showarounds</p>
          <p className="text-sm text-slate-800">{parsedShowarounds.length > 0 ? parsedShowarounds.join(', ') : '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Falls summary</p>
          <p className="text-sm text-slate-800">{dashIfEmpty(fallsCount)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Wound detail</p>
          <p className="text-sm text-slate-800">{dashIfEmpty(woundsDetail)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Infections (UTI / Chest)</p>
          <p className="text-sm text-slate-800">
            {dashIfEmpty(infectionsUti)} / {dashIfEmpty(infectionsChest)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Infections (Wound / Other)</p>
          <p className="text-sm text-slate-800">
            {dashIfEmpty(infectionsWound)} / {dashIfEmpty(infectionsOther)}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Other infection detail</p>
        <p className="text-sm text-slate-800">{dashIfEmpty(infectionsOtherDetail)}</p>
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Others notes</p>
        <p className="text-sm text-slate-800">{dashIfEmpty(otherUpdates)}</p>
      </div>
    </SectionCard>
  );

  const renderCompletionCard = () => (
    <SectionCard title="Completion" subtitle="Optional data completeness">
      <p className="text-sm text-slate-600">{dataCompletion}% of tracked fields completed.</p>
    </SectionCard>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <SectionCard title="Occupancy" subtitle="Bed count or percentage capacity">
              <Input className="h-10 text-sm" value={occupancy} onChange={(event) => setOccupancy(event.target.value)} placeholder="e.g. 12/20 or 60%" />
              {!validateOccupancy(occupancy) && <div className="text-xs text-red-500">Please enter occupancy (e.g. 12/20 or 60%).</div>}
            </SectionCard>

            <SectionCard title="Staffing" subtitle="Headcount on duty">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1">Day staff</Label>
                  <Input type="number" min={0} className="h-10 text-sm" value={staffDay} onChange={(event) => setStaffDay(event.target.value)} />
                </div>
                <div>
                  <Label className="mb-1">Night staff</Label>
                  <Input type="number" min={0} className="h-10 text-sm" value={staffNight} onChange={(event) => setStaffNight(event.target.value)} />
                </div>
              </div>
            </SectionCard>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <SectionCard title="Safeguards & CQC" subtitle="Incidents raised in last 24h">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1">CQC notifications</Label>
                  <Input
                    type="number"
                    className="h-10 text-sm"
                    value={cqcNotifications === '' ? '' : Number(cqcNotifications)}
                    onChange={(event) => setCqcNotifications(event.target.value === '' ? '' : Number(event.target.value))}
                  />
                </div>
                <div>
                  <Label className="mb-1">Safeguards raised</Label>
                  <Input
                    type="number"
                    className="h-10 text-sm"
                    value={safeguards === '' ? '' : Number(safeguards)}
                    onChange={(event) => setSafeguards(event.target.value === '' ? '' : Number(event.target.value))}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Admissions & showarounds" subtitle="Pipeline visibility">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1">Pre-admissions (count)</Label>
                  <Input
                    type="number"
                    className="h-10 text-sm"
                    value={preAdmissionsCount === '' ? '' : Number(preAdmissionsCount)}
                    onChange={(event) => setPreAdmissionsCount(event.target.value === '' ? '' : Number(event.target.value))}
                  />
                </div>
                <div>
                  <Label className="mb-1">Showarounds (comma separated)</Label>
                  <div className="flex flex-wrap gap-2">
                    {parsedShowarounds.length === 0 && <div className="text-sm text-slate-500">No showarounds</div>}
                    {parsedShowarounds.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setShowarounds(parsedShowarounds.filter((value) => value !== name).join(', '))}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <span>{name}</span>
                        <span className="text-xs">✕</span>
                      </button>
                    ))}
                  </div>
                  <Textarea className="text-sm" rows={2} value={showarounds} onChange={(event) => setShowarounds(event.target.value)} placeholder="e.g. John Doe, Jane Smith" />
                </div>
              </div>
            </SectionCard>
          </div>
        );
      case 2:
        return (
          <SectionCard title="Falls" subtitle="Individual incidents and summaries" footer={`Total: ${fallsCount || 0}`}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Track each fall so patterns surface quickly.</p>
                <Button size="sm" variant="outline" onClick={addFallEntry} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  Add entry
                </Button>
              </div>
              {fallsEntries.length === 0 && <div className="text-sm text-slate-500">No fall entries yet. Add one or capture a summary below.</div>}
              <div className="space-y-3">
                {fallsEntries.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-12 gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3">
                    <div className="col-span-12 sm:col-span-2">
                      <Label className="mb-1">Count</Label>
                      <Input
                        type="number"
                        className="h-10 text-sm"
                        value={entry.count}
                        onChange={(event) => updateFallEntry(entry.id, { count: Number(event.target.value || 0) })}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="mb-1">Injuries</Label>
                      <Input className="h-10 text-sm" value={entry.injuries} onChange={(event) => updateFallEntry(entry.id, { injuries: event.target.value })} />
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <Label className="mb-1">Witnessed by</Label>
                      <Input className="h-10 text-sm" value={entry.witnessed} onChange={(event) => updateFallEntry(entry.id, { witnessed: event.target.value })} />
                    </div>
                    <div className="col-span-12 sm:col-span-2">
                      <Label className="mb-1">Time</Label>
                      <Input className="h-10 text-sm" value={entry.time} onChange={(event) => updateFallEntry(entry.id, { time: event.target.value })} />
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex items-end">
                      <Button variant="destructive" size="sm" className="w-full" onClick={() => removeFallEntry(entry.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div>
                  <Label className="mb-1">Aggregate count</Label>
                  <Input
                    type="number"
                    className="h-10 text-sm"
                    value={fallsCount === '' ? '' : Number(fallsCount)}
                    onChange={(event) => setFallsCount(event.target.value === '' ? '' : Number(event.target.value))}
                  />
                </div>
                <div>
                  <Label className="mb-1">Injuries summary</Label>
                  <Input className="h-10 text-sm" value={fallsInjuries} onChange={(event) => setFallsInjuries(event.target.value)} />
                </div>
                <div>
                  <Label className="mb-1">Witnessed</Label>
                  <Input className="h-10 text-sm" value={fallsWitnessed} onChange={(event) => setFallsWitnessed(event.target.value)} />
                </div>
                <div>
                  <Label className="mb-1">Unwitnessed</Label>
                  <Input className="h-10 text-sm" value={fallsUnwitnessed} onChange={(event) => setFallsUnwitnessed(event.target.value)} />
                </div>
              </div>
            </div>
          </SectionCard>
        );
      case 3:
        return (
          <SectionCard title="Wounds" subtitle="Types recorded in the last 24h">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label className="mb-1">Pressure</Label>
                <Input
                  type="number"
                  className="h-10 text-sm"
                  value={woundTypes.pressure}
                  onChange={(event) => setWoundCount('pressure', event.target.value === '' ? 0 : Number(event.target.value))}
                />
              </div>
              <div>
                <Label className="mb-1">Break</Label>
                <Input
                  type="number"
                  className="h-10 text-sm"
                  value={woundTypes.break}
                  onChange={(event) => setWoundCount('break', event.target.value === '' ? 0 : Number(event.target.value))}
                />
              </div>
              <div>
                <Label className="mb-1">Fracture</Label>
                <Input
                  type="number"
                  className="h-10 text-sm"
                  value={woundTypes.fracture}
                  onChange={(event) => setWoundCount('fracture', event.target.value === '' ? 0 : Number(event.target.value))}
                />
              </div>
              <div>
                <Label className="mb-1">Bruise</Label>
                <Input
                  type="number"
                  className="h-10 text-sm"
                  value={woundTypes.bruise}
                  onChange={(event) => setWoundCount('bruise', event.target.value === '' ? 0 : Number(event.target.value))}
                />
              </div>
              <div>
                <Label className="mb-1">Skin tear</Label>
                <Input
                  type="number"
                  className="h-10 text-sm"
                  value={woundTypes.skintear}
                  onChange={(event) => setWoundCount('skintear', event.target.value === '' ? 0 : Number(event.target.value))}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1">Details / counts</Label>
              <Textarea className="text-sm" rows={3} value={woundsDetail} onChange={(event) => setWoundsDetail(event.target.value)} />
            </div>
          </SectionCard>
        );
      case 4:
        return (
          <SectionCard title="Infections" subtitle="Cases reported in the last 24h">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <Label className="mb-1">UTI</Label>
                <Input
                  type="number"
                  className="h-10 text-sm"
                  value={infectionsUti === '' ? '' : Number(infectionsUti)}
                  onChange={(event) => setInfectionsUti(event.target.value === '' ? '' : Number(event.target.value))}
                />
              </div>
              <div>
                <Label className="mb-1">Chest</Label>
                <Input
                  type="number"
                  className="h-10 text-sm"
                  value={infectionsChest === '' ? '' : Number(infectionsChest)}
                  onChange={(event) => setInfectionsChest(event.target.value === '' ? '' : Number(event.target.value))}
                />
              </div>
              <div>
                <Label className="mb-1">Wound</Label>
                <Input
                  type="number"
                  className="h-10 text-sm"
                  value={infectionsWound === '' ? '' : Number(infectionsWound)}
                  onChange={(event) => setInfectionsWound(event.target.value === '' ? '' : Number(event.target.value))}
                />
              </div>
              <div>
                <Label className="mb-1">Other</Label>
                <Input
                  type="number"
                  className="h-10 text-sm"
                  value={infectionsOther === '' ? '' : Number(infectionsOther)}
                  onChange={(event) => setInfectionsOther(event.target.value === '' ? '' : Number(event.target.value))}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1">Other infections detail</Label>
              <Textarea className="text-sm" rows={3} value={infectionsOtherDetail} onChange={(event) => setInfectionsOtherDetail(event.target.value)} />
            </div>
          </SectionCard>
        );
      case 5:
        return (
          <div className="space-y-4">
            <SectionCard title="Others" subtitle="Optional notes, reminders or context">
              <Textarea
                className="text-sm"
                rows={4}
                value={otherUpdates}
                onChange={(event) => setOtherUpdates(event.target.value)}
                placeholder="Share anything else worth noting for today"
              />
              <p className="mt-2 text-xs text-slate-500">You can add any final context here. The next step lets you review everything before saving.</p>
            </SectionCard>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            {renderReviewSummary('Review & submit', 'Confirm the key details before saving')}
            {renderCompletionCard()}
          </div>
        );
      default:
        return null;
    }
  };

  const addFallEntry = () => {
    const entry: FallEntry = { id: Date.now(), count: 0, injuries: '', witnessed: '', time: '' };
    setFallsEntries((previous) => [...previous, entry]);
  };

  const updateFallEntry = (id: number, changes: Partial<FallEntry>) => {
    setFallsEntries((previous) => {
      const next = previous.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry));
      const total = next.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
      setFallsCount(total);
      return next;
    });
  };

  const removeFallEntry = (id: number) => {
    setFallsEntries((previous) => {
      const next = previous.filter((entry) => entry.id !== id);
      const total = next.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
      setFallsCount(next.length === 0 ? '' : total);
      return next;
    });
  };

  const setWoundCount = (key: keyof WoundTypes, value: number) => {
    setWoundTypes((previous) => ({ ...previous, [key]: value }));
  };

  useEffect(() => {
    if (!effectiveWorkspaceId) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const docRef = getWorkspaceDocRef(effectiveWorkspaceId, 'daily-checkins', todayKey, organisationId);
        const snapshot = docRef ? await getDoc(docRef) : null;

        if (!active) return;

        if (snapshot?.exists()) {
          const data = snapshot.data() as any;
          setExists(true);

          setStaffDay(data.staffingDay ? String(data.staffingDay) : String(data.staffing?.day ?? ''));
          setStaffNight(data.staffingNight ? String(data.staffingNight) : String(data.staffing?.night ?? ''));
          setOccupancy(data.occupancy ? String(data.occupancy) : '');

          const loadedFallsEntries: FallEntry[] = Array.isArray(data.falls?.entries)
            ? data.falls.entries.map((entry: any, index: number) => ({
                id: entry.id ?? index,
                count: Number(entry.count) || 0,
                injuries: entry.injuries || '',
                witnessed: entry.witnessed || '',
                time: entry.time || '',
              }))
            : [];

          setFallsEntries(loadedFallsEntries);
          setFallsCount(
            loadedFallsEntries.length
              ? loadedFallsEntries.reduce((sum, item) => sum + (Number(item.count) || 0), 0)
              : data.falls?.count ?? '',
          );
          setFallsInjuries(data.falls?.injuries || '');
          setFallsWitnessed(data.falls?.witnessed || '');
          setFallsUnwitnessed(data.falls?.unwitnessed ?? data.falls?.time ?? '');

          setCqcNotifications(data.cqcNotifications ?? '');
          setSafeguards(data.safeguards ?? '');

          setPreAdmissionsCount(data.preAdmissions?.count ?? '');
          setShowarounds(
            Array.isArray(data.preAdmissions?.scheduled)
              ? (data.preAdmissions.scheduled as string[]).join(', ')
              : data.showarounds || '',
          );

          setWoundsDetail(data.wounds?.detail || '');
          setWoundTypes({
            pressure: Number(data.wounds?.types?.pressure ?? 0),
            break: Number(data.wounds?.types?.break ?? 0),
            fracture: Number(data.wounds?.types?.fracture ?? 0),
            bruise: Number(data.wounds?.types?.bruise ?? 0),
            skintear: Number(data.wounds?.types?.skintear ?? 0),
          });

          setInfectionsUti(data.infections?.uti ?? '');
          setInfectionsChest(data.infections?.chest ?? '');
          setInfectionsWound(data.infections?.wound ?? '');
          setInfectionsOther(data.infections?.other ?? '');
          setInfectionsOtherDetail(data.infections?.otherDetail ?? '');
          const loadedOther = data.otherUpdates ?? data.otherNotes ?? data.other ?? '';
          setOtherUpdates(typeof loadedOther === 'string' ? loadedOther : '');
        } else {
          setExists(false);
          setStaffDay('');
          setStaffNight('');
          setOccupancy('');
          setFallsEntries([]);
          setFallsCount('');
          setFallsInjuries('');
          setFallsWitnessed('');
          setFallsUnwitnessed('');
          setCqcNotifications('');
          setSafeguards('');
          setPreAdmissionsCount('');
          setShowarounds('');
          setWoundsDetail('');
          setWoundTypes({ pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 });
          setInfectionsUti('');
          setInfectionsChest('');
          setInfectionsWound('');
          setInfectionsOther('');
          setInfectionsOtherDetail('');
          setOtherUpdates('');
        }
      } catch (error) {
        console.error('Failed to load daily check-in', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [effectiveWorkspaceId, organisationId, todayKey]);

  const save = async () => {
    if (!effectiveWorkspaceId) return;
    if (!validateOccupancy(occupancy)) return;
    if (!validateStaffing(staffDay, staffNight)) return;

    setLoading(true);
    try {
      const docRef = getWorkspaceDocRef(effectiveWorkspaceId, 'daily-checkins', todayKey, organisationId);
      if (!docRef) {
        console.error('Unable to resolve daily check-in path');
        return;
      }

      const now = new Date();

      const fallsPayload: any = {
        count: fallsCount === '' ? 0 : Number(fallsCount),
        injuries: fallsInjuries,
        witnessed: fallsWitnessed,
        time: fallsUnwitnessed,
        unwitnessed: fallsUnwitnessed,
      };

      if (fallsEntries.length > 0) {
        fallsPayload.entries = fallsEntries.map((entry) => ({
          id: entry.id,
          count: Number(entry.count) || 0,
          injuries: entry.injuries,
          witnessed: entry.witnessed,
          time: entry.time,
        }));
      }

      const payload = {
        occupancy,
        staffing: { day: Number(staffDay) || 0, night: Number(staffNight) || 0 },
        staffingDay: Number(staffDay) || 0,
        staffingNight: Number(staffNight) || 0,
        falls: fallsPayload,
        preAdmissions: {
          count: preAdmissionsCount === '' ? 0 : Number(preAdmissionsCount),
          scheduled: parsedShowarounds,
        },
        showarounds: parsedShowarounds,
        cqcNotifications: cqcNotifications === '' ? 0 : Number(cqcNotifications),
        safeguards: safeguards === '' ? 0 : Number(safeguards),
        wounds: {
          detail: woundsDetail,
          types: {
            pressure: Number(woundTypes.pressure) || 0,
            break: Number(woundTypes.break) || 0,
            fracture: Number(woundTypes.fracture) || 0,
            bruise: Number(woundTypes.bruise) || 0,
            skintear: Number(woundTypes.skintear) || 0,
          },
        },
        infections: {
          uti: infectionsUti === '' ? 0 : Number(infectionsUti),
          chest: infectionsChest === '' ? 0 : Number(infectionsChest),
          wound: infectionsWound === '' ? 0 : Number(infectionsWound),
          other: infectionsOther === '' ? 0 : Number(infectionsOther),
          otherDetail: infectionsOtherDetail.trim(),
        },
        otherUpdates: otherUpdates.trim(),
        recordedAt: now.toISOString(),
      };

      const docData = {
        ...payload,
        updatedAt: now,
        ...(exists ? {} : { createdAt: now }),
      };

      await setDoc(docRef, docData, { merge: true });

      setExists(true);
      onEntryUpdate?.({ ...payload, id: todayKey });
      setOpen(false);
      onOpenChange?.(false);
    } catch (error) {
      console.error('Failed to save daily check-in', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (value) {
      setCurrentStep(0);
    }
    onOpenChange?.(value);
  };

  const handleTriggerClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
    setCurrentStep(0);
    onOpenChange?.(true);
  };

  return (
    <>
      <div onClick={handleTriggerClick} onMouseDown={(event) => event.stopPropagation()} style={{ position: 'relative', zIndex: 10 }}>
        {trigger || (
          <Button className="w-full" type="button">
            {exists ? 'Update check-in' : 'Complete check-in'}
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent hideClose className="mx-auto my-6 flex h-[80vh] w-full max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-0 shadow-xl sm:h-[72vh] sm:max-h-[72vh] sm:max-w-5xl">
          <div className="flex-shrink-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-white/25 bg-white/15 p-2 backdrop-blur-sm">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Daily check-in</DialogTitle>
                  <p className="mt-1 text-sm text-white/90">Step {currentStep + 1} of {totalSteps} · {currentStepMeta.title}</p>
                  <p className="mt-1 text-xs text-white/80">{currentStepMeta.description}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
                    aria-label="Close daily check-in"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
                <div className="w-48">
                  <div className="mb-1 text-right text-xs text-white/85">Step progress</div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
                    <div className="h-2 bg-white" style={{ width: `${stepProgress}%` }} />
                  </div>
                </div>
                <div className="text-xs text-white/80">Data completion {dataCompletion}%</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">{renderStepContent()}</div>

          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={goToPreviousStep} disabled={loading}>
                  Back
                </Button>
              )}
              <Button
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                onClick={currentStep === totalSteps - 1 ? save : goToNextStep}
                disabled={currentStep === totalSteps - 1 ? loading || !coreInfoComplete : loading || !canProceedFromStep(currentStep)}
              >
                {currentStep === totalSteps - 1 ? (loading ? 'Saving...' : exists ? 'Save changes' : 'Save today') : 'Next'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
