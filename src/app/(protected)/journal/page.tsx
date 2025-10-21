'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '@/context/workspace';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { submitJournalEntry, respondToJournalEntry, closeJournalEntry } from '@/actions/journal';
import type { JournalEntry, JournalEntryAnswer, JournalMood } from '@/lib/types';
import { getWorkspaceCollectionRef } from '@/lib/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ShieldCheck, ShieldOff, UserCheck, NotebookPen } from 'lucide-react';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import PageHeader from '@/components/page-header';

type MoodKey = JournalMood;

type MoodDefinition = {
  id: MoodKey;
  label: string;
  emoji: string;
  description: string;
  badgeClass: string;
  questions: string[];
};

const MOOD_DEFINITIONS: MoodDefinition[] = [
  {
    id: 'happy',
    label: 'Positive',
    emoji: '😊',
    description: 'Feeling energised, proud or grateful today.',
    badgeClass: 'bg-emerald-100/80 text-emerald-700 border border-emerald-200',
    questions: [
      'What made you feel positive or proud today?',
      'Who helped create this positive moment?',
      'How did this affect residents, families or colleagues?',
      'What habits or actions contributed to this feeling?',
      'What should we keep doing because of this?',
      'Anything else leadership should know while it is fresh?',
    ],
  },
  {
    id: 'neutral',
    label: 'Balanced',
    emoji: '🙂',
    description: 'Steady mood, nothing major but worth capturing.',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    questions: [
      'Describe the overall tone of your day in one or two sentences.',
      'What tasks or routines felt steady or typical?',
      'Did anything small stand out, either positive or negative?',
      'Where could extra support have made things smoother?',
      'What would make tomorrow feel easier or more energising?',
      'Any reflections you want recorded while they are top of mind?',
    ],
  },
  {
    id: 'sad',
    label: 'Low',
    emoji: '😔',
    description: 'Feeling low or in need of extra support.',
    badgeClass: 'bg-sky-100/80 text-sky-700 border border-sky-200',
    questions: [
      'What happened that has left you feeling low?',
      'Who else was involved or affected by this?',
      'How did it impact the people you support or work with?',
      'What support do you need right now?',
      'What follow-up actions would help resolve things?',
      'Anything you want leadership to understand in your own words?',
    ],
  },
  {
    id: 'angry',
    label: 'Frustrated',
    emoji: '😠',
    description: 'Something has caused frustration or a blocker.',
    badgeClass: 'bg-rose-100/80 text-rose-700 border border-rose-200',
    questions: [
      'What triggered your frustration or anger?',
      'Did any processes or policies contribute to it?',
      'How did it affect residents, families or the team?',
      'What actions did you take in the moment?',
      'What support or change do you need next?',
      'How urgent is this and what should happen now?',
    ],
  },
];

const MOOD_LOOKUP = MOOD_DEFINITIONS.reduce<Record<MoodKey, MoodDefinition>>((acc, def) => {
  acc[def.id] = def;
  return acc;
}, {} as Record<MoodKey, MoodDefinition>);

const getMoodDefinition = (mood?: JournalMood | null) => (mood ? MOOD_LOOKUP[mood] : undefined);

const normaliseMood = (value: unknown): JournalMood | null => {
  if (typeof value !== 'string') return null;
  return value in MOOD_LOOKUP ? (value as MoodKey) : null;
};

const parseAnswers = (value: unknown): JournalEntryAnswer[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const answers = (value as Array<Record<string, unknown>>)
    .map((item) => {
      const question = typeof item?.question === 'string' ? item.question : '';
      const answer = typeof item?.answer === 'string' ? item.answer : '';
      if (!question && !answer) {
        return null;
      }
      return { question, answer } as JournalEntryAnswer;
    })
    .filter((item): item is JournalEntryAnswer => Boolean(item));
  return answers.length > 0 ? answers : undefined;
};

const MoodBadge = ({ mood }: { mood?: JournalMood | null }) => {
  const def = getMoodDefinition(mood);
  if (!def) return null;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${def.badgeClass}`}>
      <span className="text-lg" aria-hidden="true">{def.emoji}</span>
      <span>{def.label}</span>
    </span>
  );
};

const JournalEntryNarrative = ({ entry, textSize = 'base' }: { entry: JournalEntry; textSize?: 'base' | 'sm'; }) => {
  const answers = Array.isArray(entry.answers)
    ? (entry.answers as JournalEntryAnswer[])
        .map((item) => ({
          question: typeof item?.question === 'string' ? item.question : '',
          answer: typeof item?.answer === 'string' ? item.answer : '',
        }))
        .filter((item) => item.question || item.answer)
    : [];

  if (answers.length > 0) {
    return (
      <div className="space-y-3">
        {answers.map((item, index) => (
          <div key={`${item.question}-${index}`} className="space-y-1">
            <p className={`font-medium text-muted-foreground ${textSize === 'sm' ? 'text-xs' : 'text-sm'}`}>{item.question}</p>
            <p className={`whitespace-pre-line leading-relaxed ${textSize === 'sm' ? 'text-sm' : 'text-base'} text-foreground`}>{item.answer}</p>
          </div>
        ))}
      </div>
    );
  }

  if (entry.content) {
    return (
      <p className={`whitespace-pre-line leading-relaxed ${textSize === 'sm' ? 'text-sm' : 'text-base'} text-foreground`}>
        {entry.content}
      </p>
    );
  }

  return null;
};

const MANAGER_ROLE_KEYS = ['manager', 'clinical lead', 'deputy', 'operations manager', 'admin', 'owner', 'head office', 'head-office'];
const HEAD_OFFICE_ROLE_KEYS = ['admin', 'owner', 'head office', 'head-office'];

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (error) {
    return iso;
  }
};

const formatMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map((part) => parseInt(part, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  } catch (error) {
    return monthKey;
  }
};

const toIsoString = (value: unknown): string => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value && typeof (value as any).toDate === 'function') {
    return ((value as any).toDate() as Date).toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
};

type TabsValue = string;

export default function JournalPage() {
  const workspace = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const organisationId = (workspace as any)?.organisationId ?? null;
  const { isEnabled } = useFeatureFlags(organisationId, workspace?.id ?? null);

  const [staffEntries, setStaffEntries] = useState<JournalEntry[]>([]);
  const [managerEntries, setManagerEntries] = useState<JournalEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [newEntryAnonymous, setNewEntryAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managerEntryContent, setManagerEntryContent] = useState('');
  const [isManagerSubmitting, setIsManagerSubmitting] = useState(false);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [headOfficeDrafts, setHeadOfficeDrafts] = useState<Record<string, string>>({});
  const [entryLoading, setEntryLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<TabsValue>('my');

  const roleRaw = (user as any)?.role ?? '';
  const role = typeof roleRaw === 'string' ? roleRaw.toLowerCase() : '';
  const isManager = MANAGER_ROLE_KEYS.includes(role);
  const isHeadOffice = HEAD_OFFICE_ROLE_KEYS.includes(role);
  const managerFeatureEnabled = isEnabled('managerJournal');

  useEffect(() => {
    if (!workspace?.id) {
      setStaffEntries([]);
      return;
    }
    const ref = getWorkspaceCollectionRef(workspace.id, 'journal-entries', organisationId);
    if (!ref) {
      setStaffEntries([]);
      return;
    }
    const q = query(ref, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const entries: JournalEntry[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const responseData = data?.response as Record<string, unknown> | undefined;
        return {
          id: docSnap.id,
          workspaceId: workspace.id,
          organisationId,
          entryType: 'staff',
          status: (data?.status as 'open' | 'closed') ?? 'open',
          content: (data?.content as string) ?? '',
          isAnonymous: Boolean(data?.isAnonymous),
          mood: normaliseMood((data as any)?.mood),
          answers: parseAnswers((data as any)?.answers),
          author: {
            id: (data?.author as any)?.id ?? null,
            name: (data?.author as any)?.name ?? null,
            role: (data?.author as any)?.role ?? null,
          },
          createdAt: toIsoString(data?.createdAt),
          monthKey: (data?.monthKey as string) ?? '',
          response: responseData
            ? {
                text: (responseData?.text as string) ?? '',
                responderId: (responseData?.responderId as string) ?? null,
                responderName: (responseData?.responderName as string) ?? null,
                responderRole: (responseData?.responderRole as string) ?? null,
                respondedAt: toIsoString(responseData?.respondedAt),
              }
            : undefined,
          closedAt: data?.closedAt ? toIsoString(data?.closedAt) : null,
          closedBy: data?.closedBy
            ? {
                id: ((data?.closedBy as any)?.id as string) ?? null,
                name: ((data?.closedBy as any)?.name as string) ?? null,
                role: ((data?.closedBy as any)?.role as string) ?? null,
              }
            : undefined,
          resolvedMonthKey: (data?.resolvedMonthKey as string) ?? null,
        };
      });
      setStaffEntries(entries);
    }, (error) => {
      console.error('Failed to load journal entries', error);
    });

    return () => unsub();
  }, [workspace?.id, organisationId]);

  useEffect(() => {
    if (!workspace?.id || !(isManager || isHeadOffice) || !managerFeatureEnabled) {
      setManagerEntries([]);
      return;
    }
    const ref = getWorkspaceCollectionRef(workspace.id, 'manager-journal-entries', organisationId);
    if (!ref) {
      setManagerEntries([]);
      return;
    }
    const q = query(ref, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const entries: JournalEntry[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const responseData = data?.response as Record<string, unknown> | undefined;
        return {
          id: docSnap.id,
          workspaceId: workspace.id,
          organisationId,
          entryType: 'manager',
          status: (data?.status as 'open' | 'closed') ?? 'open',
          content: (data?.content as string) ?? '',
          isAnonymous: Boolean(data?.isAnonymous),
          mood: normaliseMood((data as any)?.mood),
          answers: parseAnswers((data as any)?.answers),
          author: {
            id: (data?.author as any)?.id ?? null,
            name: (data?.author as any)?.name ?? null,
            role: (data?.author as any)?.role ?? null,
          },
          createdAt: toIsoString(data?.createdAt),
          monthKey: (data?.monthKey as string) ?? '',
          response: responseData
            ? {
                text: (responseData?.text as string) ?? '',
                responderId: (responseData?.responderId as string) ?? null,
                responderName: (responseData?.responderName as string) ?? null,
                responderRole: (responseData?.responderRole as string) ?? null,
                respondedAt: toIsoString(responseData?.respondedAt),
              }
            : undefined,
          closedAt: data?.closedAt ? toIsoString(data?.closedAt) : null,
          closedBy: data?.closedBy
            ? {
                id: ((data?.closedBy as any)?.id as string) ?? null,
                name: ((data?.closedBy as any)?.name as string) ?? null,
                role: ((data?.closedBy as any)?.role as string) ?? null,
              }
            : undefined,
          resolvedMonthKey: (data?.resolvedMonthKey as string) ?? null,
        };
      });
      setManagerEntries(entries);
    }, (error) => {
      console.error('Failed to load manager journal entries', error);
    });

    return () => unsub();
  }, [workspace?.id, organisationId, managerFeatureEnabled, isManager, isHeadOffice]);

  useEffect(() => {
    if (!workspace?.id) {
      setActiveTab('my');
      return;
    }
    if (isManager && staffEntries.length > 0 && activeTab === 'my') {
      setActiveTab('my');
    }
  }, [workspace?.id, isManager, staffEntries.length, activeTab]);

  useEffect(() => {
    if (!selectedMood) {
      setAnswerDrafts({});
      return;
    }
    const questions = MOOD_LOOKUP[selectedMood]?.questions ?? [];
    setAnswerDrafts((prev) => {
      const next: Record<string, string> = {};
      questions.forEach((question) => {
        next[question] = prev[question] ?? '';
      });
      return next;
    });
  }, [selectedMood]);

  const myEntries = useMemo(
    () => staffEntries.filter((entry) => entry.author?.id && entry.author.id === user?.id),
    [staffEntries, user?.id],
  );

  const currentQuestions = useMemo(() => {
    if (!selectedMood) return [] as string[];
    return [...(MOOD_LOOKUP[selectedMood]?.questions ?? [])];
  }, [selectedMood]);

  const allAnswersCompleted = useMemo(() => {
    if (!selectedMood) return false;
    if (currentQuestions.length === 0) return false;
    return currentQuestions.every((question) => (answerDrafts[question] ?? '').trim().length > 0);
  }, [selectedMood, currentQuestions, answerDrafts]);

  const closedStaffEntries = useMemo(
    () => staffEntries.filter((entry) => entry.status === 'closed'),
    [staffEntries],
  );

  const staffMonths = useMemo(() => {
    const keys = new Set<string>();
    closedStaffEntries.forEach((entry) => {
      const key = entry.resolvedMonthKey || entry.monthKey;
      if (key) keys.add(key);
    });
    return Array.from(keys).sort((a, b) => (a > b ? -1 : 1));
  }, [closedStaffEntries]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  useEffect(() => {
    if (staffMonths.length === 0) {
      setSelectedMonth(null);
      return;
    }
    if (!selectedMonth || !staffMonths.includes(selectedMonth)) {
      setSelectedMonth(staffMonths[0]);
    }
  }, [staffMonths, selectedMonth]);

  const trackerEntries = useMemo(() => {
    if (!selectedMonth) return closedStaffEntries;
    return closedStaffEntries.filter((entry) => (entry.resolvedMonthKey || entry.monthKey) === selectedMonth);
  }, [closedStaffEntries, selectedMonth]);

  const closedManagerEntries = useMemo(
    () => managerEntries.filter((entry) => entry.status === 'closed'),
    [managerEntries],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspace?.id || !user?.id) return;
    if (!selectedMood) {
      toast({ title: 'Choose how you are feeling', description: 'Select the mood that best matches today to unlock the tailored prompts.', variant: 'destructive' });
      return;
    }

    if (currentQuestions.length === 0) {
      toast({ title: 'Mood setup incomplete', description: 'Refresh the page and try again.', variant: 'destructive' });
      return;
    }

    if (!allAnswersCompleted) {
      toast({ title: 'Answer each prompt', description: 'Please respond to all six reflections before submitting.', variant: 'destructive' });
      return;
    }

    const preparedAnswers: JournalEntryAnswer[] = currentQuestions.map((question) => ({
      question,
      answer: (answerDrafts[question] ?? '').trim(),
    }));

    const compiledContent = preparedAnswers
      .map((item) => `${item.question}\n${item.answer}`)
      .join('\n\n');

    setIsSubmitting(true);
    try {
      await submitJournalEntry({
        workspaceId: workspace.id,
        organisationId,
        actor: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user as any)?.role ?? null,
        },
        content: compiledContent,
        answers: preparedAnswers,
        mood: selectedMood,
        isAnonymous: newEntryAnonymous,
        entryType: 'staff',
      });
      setSelectedMood(null);
      setAnswerDrafts({});
      setNewEntryAnonymous(false);
      toast({ title: 'Journal entry submitted', description: 'We have emailed you a copy for your records.' });
    } catch (error) {
      console.error('submitJournalEntry failed', error);
      toast({ title: 'Could not submit entry', description: 'Please try again or contact your manager.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManagerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspace?.id || !user?.id) return;
    if (!managerEntryContent.trim()) {
      toast({ title: 'Add context first', description: 'Describe the concern before sending to head office.', variant: 'destructive' });
      return;
    }
    setIsManagerSubmitting(true);
    try {
      await submitJournalEntry({
        workspaceId: workspace.id,
        organisationId,
        actor: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user as any)?.role ?? null,
        },
        content: managerEntryContent,
        isAnonymous: false,
        entryType: 'manager',
      });
      setManagerEntryContent('');
      toast({ title: 'Concern sent to head office', description: 'Head office has been notified and will respond here.' });
    } catch (error) {
      console.error('submit manager journal failed', error);
      toast({ title: 'Could not submit concern', description: 'Please try again shortly.', variant: 'destructive' });
    } finally {
      setIsManagerSubmitting(false);
    }
  };

  const updateEntryLoading = (entryId: string, isLoading: boolean) => {
    setEntryLoading((prev) => ({ ...prev, [entryId]: isLoading }));
  };

  const handleRespond = async (entry: JournalEntry, text: string, kind: 'staff' | 'manager') => {
    if (!workspace?.id || !user?.id || !entry.id) return;
    if (!text.trim()) {
      toast({ title: 'Response needed', description: 'Add a response before sending.', variant: 'destructive' });
      return;
    }
    updateEntryLoading(entry.id, true);
    try {
      await respondToJournalEntry({
        workspaceId: workspace.id,
        organisationId,
        entryId: entry.id,
        response: text,
        actor: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user as any)?.role ?? null,
        },
        entryType: kind,
      });
      toast({ title: 'Response sent', description: 'The team member has been notified.' });
      if (kind === 'staff') {
        setResponseDrafts((prev) => ({ ...prev, [entry.id!]: '' }));
      } else {
        setHeadOfficeDrafts((prev) => ({ ...prev, [entry.id!]: '' }));
      }
    } catch (error) {
      console.error('respondToJournalEntry failed', error);
      toast({ title: 'Could not send response', description: 'Please try again.', variant: 'destructive' });
    } finally {
      updateEntryLoading(entry.id!, false);
    }
  };

  const handleClose = async (entry: JournalEntry, kind: 'staff' | 'manager') => {
    if (!workspace?.id || !user?.id || !entry.id) return;
    updateEntryLoading(entry.id, true);
    try {
      await closeJournalEntry({
        workspaceId: workspace.id,
        organisationId,
        entryId: entry.id,
        actor: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user as any)?.role ?? null,
        },
        entryType: kind,
      });
      toast({ title: 'Entry closed', description: 'This entry now appears in the monthly tracker.' });
    } catch (error) {
      console.error('closeJournalEntry failed', error);
      toast({ title: 'Could not close entry', description: 'Please try again.', variant: 'destructive' });
    } finally {
      updateEntryLoading(entry.id!, false);
    }
  };

  if (!workspace?.id) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          title="Reflective journal"
          subtitle="Share how you and your team are feeling. Entries stay within your organisation and managers respond here so everything is captured as evidence."
          leading={<NotebookPen className="h-6 w-6" />}
        />
        <div className="px-4 sm:px-6 lg:px-8 pb-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Select a workspace to use the journal.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Reflective journal"
        subtitle="Share how you and your team are feeling. Entries stay within your organisation and managers respond here so everything is captured as evidence."
        leading={<NotebookPen className="h-6 w-6" />}
      />
      <div className="px-4 sm:px-6 lg:px-8 pb-12 space-y-6">

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabsValue)}>
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="my">My journal</TabsTrigger>
          {isManager && (
            <TabsTrigger value="team">Team journal</TabsTrigger>
          )}
          {(isManager || isHeadOffice) && (
            <TabsTrigger value="tracker">Monthly tracker</TabsTrigger>
          )}
          {isManager && managerFeatureEnabled && (
            <TabsTrigger value="manager-submit">Manager → Head office</TabsTrigger>
          )}
          {isHeadOffice && managerFeatureEnabled && (
            <TabsTrigger value="head-office">Head office queue</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How are you feeling today?</CardTitle>
              <CardDescription>Capture reflections, wins, challenges or anything headspace-related. You can choose to stay anonymous.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How are you arriving today?</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {MOOD_DEFINITIONS.map((mood) => {
                      const isActive = selectedMood === mood.id;
                      return (
                        <button
                          type="button"
                          key={mood.id}
                          onClick={() => setSelectedMood(mood.id)}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isActive ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20 ring-offset-white' : 'border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm'}`}
                        >
                          <span className="text-2xl" aria-hidden="true">{mood.emoji}</span>
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-foreground">{mood.label}</p>
                            <p className="text-sm text-muted-foreground">{mood.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedMood ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your prompts</h3>
                        <MoodBadge mood={selectedMood} />
                      </div>
                      <div className="space-y-4">
                        {(MOOD_LOOKUP[selectedMood]?.questions ?? []).map((question, index) => (
                          <div key={question} className="space-y-2">
                            <Label htmlFor={`journal-question-${index}`} className="text-sm font-medium text-muted-foreground">
                              {question}
                            </Label>
                            <Textarea
                              id={`journal-question-${index}`}
                              value={answerDrafts[question] ?? ''}
                              onChange={(event) => setAnswerDrafts((prev) => ({ ...prev, [question]: event.target.value }))}
                              rows={3}
                              placeholder="Type your reflection..."
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Select the emoji that best captures your mood to unlock tailored journal prompts.</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2">
                    <Switch id="journal-anonymous" checked={newEntryAnonymous} onCheckedChange={setNewEntryAnonymous} />
                    <Label htmlFor="journal-anonymous" className="font-normal">Submit anonymously</Label>
                  </label>
                  <Button type="submit" disabled={isSubmitting || !selectedMood || !allAnswersCompleted}>
                    {isSubmitting ? 'Submitting...' : 'Submit entry'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Your recent entries</h2>
            </div>
            {myEntries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Your non-anonymous entries will appear here once submitted.
                </CardContent>
              </Card>
            ) : (
              myEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={entry.status === 'closed' ? 'secondary' : 'outline'}>{entry.status === 'closed' ? 'Closed' : 'Awaiting response'}</Badge>
                        <MoodBadge mood={entry.mood} />
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 border-t pt-4">
                    <JournalEntryNarrative entry={entry} />
                    {entry.response && (
                      <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
                        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Response from {entry.response.responderName || 'manager'}</span>
                          <span>· {formatDateTime(entry.response.respondedAt)}</span>
                        </div>
                        <p className="whitespace-pre-line leading-relaxed">{entry.response.text}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {isManager && (
          <TabsContent value="team" className="space-y-4">
            {staffEntries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No journal entries yet. Encourage your team to share reflections.
                </CardContent>
              </Card>
            ) : (
              staffEntries.map((entry) => {
                const draft = responseDrafts[entry.id!] ?? entry.response?.text ?? '';
                const loading = entryLoading[entry.id!] || false;
                return (
                  <Card key={entry.id} className={entry.status === 'closed' ? 'opacity-75' : ''}>
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {entry.isAnonymous ? (
                            <>
                              <ShieldOff className="h-4 w-4" />
                              <span>Anonymous</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4" />
                              <span>{entry.author?.name || 'Team member'}</span>
                            </>
                          )}
                          <span>· {formatDateTime(entry.createdAt)}</span>
                        </div>
                        <Badge variant={entry.status === 'closed' ? 'secondary' : 'outline'}>{entry.status === 'closed' ? 'Closed' : 'Open'}</Badge>
                      </div>
                      <MoodBadge mood={entry.mood} />
                    </CardHeader>
                    <CardContent className="space-y-4 border-t pt-4">
                      <JournalEntryNarrative entry={entry} />
                      {entry.response && (
                        <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Response from {entry.response.responderName || 'manager'}</span>
                            <span>{formatDateTime(entry.response.respondedAt)}</span>
                          </div>
                          <p className="whitespace-pre-line leading-relaxed">{entry.response.text}</p>
                        </div>
                      )}
                      {entry.status !== 'closed' && (
                        <div className="space-y-3">
                          <Textarea
                            value={draft}
                            onChange={(event) => setResponseDrafts((prev) => ({ ...prev, [entry.id!]: event.target.value }))}
                            placeholder="Write a response for the team member..."
                            rows={4}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleRespond(entry, draft, 'staff')} disabled={loading}>
                              {loading ? 'Sending...' : 'Send response'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleClose(entry, 'staff')} disabled={loading}>
                              {loading ? 'Closing...' : 'Close entry'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        )}

        {(isManager || isHeadOffice) && (
          <TabsContent value="tracker" className="space-y-4">
            <Card>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>Monthly tracker</CardTitle>
                    <CardDescription>Closed entries and responses for evidence reviews.</CardDescription>
                  </div>
                  {staffMonths.length > 0 && (
                    <Select value={selectedMonth ?? undefined} onValueChange={(value) => setSelectedMonth(value)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Choose month" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMonths.map((month) => (
                          <SelectItem key={month} value={month}>
                            {formatMonthKey(month)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {trackerEntries.length === 0 ? (
                  <div className="rounded-md border border-dashed border-muted/60 p-6 text-center text-muted-foreground">
                    No closed entries for the selected month yet.
                  </div>
                ) : (
                  trackerEntries.map((entry) => (
                    <div key={entry.id} className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span>{entry.isAnonymous ? 'Anonymous' : entry.author?.name || 'Team member'}</span>
                        <span>{formatDateTime(entry.closedAt || entry.createdAt)}</span>
                      </div>
                      <MoodBadge mood={entry.mood} />
                      <JournalEntryNarrative entry={entry} textSize="sm" />
                      {entry.response && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Manager response</span>
                            <span>{formatDateTime(entry.response.respondedAt)}</span>
                          </div>
                          <Separator className="my-2" />
                          <p className="whitespace-pre-line leading-relaxed">{entry.response.text}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {managerFeatureEnabled && closedManagerEntries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Manager escalations (closed)</CardTitle>
                  <CardDescription>Head office responses captured for audit trails.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {closedManagerEntries.map((entry) => (
                    <div key={entry.id} className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span>{entry.author?.name || 'Manager'}</span>
                        <span>{formatDateTime(entry.closedAt || entry.createdAt)}</span>
                      </div>
                      <JournalEntryNarrative entry={entry} textSize="sm" />
                      {entry.response && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Head office response</span>
                            <span>{formatDateTime(entry.response.respondedAt)}</span>
                          </div>
                          <Separator className="my-2" />
                          <p className="whitespace-pre-line leading-relaxed">{entry.response.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {isManager && managerFeatureEnabled && (
          <TabsContent value="manager-submit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Escalate to head office</CardTitle>
                <CardDescription>Share concerns, support needs or risks that require head office action.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleManagerSubmit}>
                  <Textarea
                    value={managerEntryContent}
                    onChange={(event) => setManagerEntryContent(event.target.value)}
                    rows={5}
                    placeholder="Describe the concern, impact and the support you need..."
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isManagerSubmitting}>
                      {isManagerSubmitting ? 'Sending...' : 'Send to head office'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {managerEntries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recently escalated</CardTitle>
                  <CardDescription>Your open escalations and head office responses.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {managerEntries.map((entry) => (
                    <div key={entry.id} className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span>{entry.author?.name || 'Manager'}</span>
                        <span>{formatDateTime(entry.createdAt)}</span>
                        <Badge variant={entry.status === 'closed' ? 'secondary' : 'outline'}>{entry.status === 'closed' ? 'Closed' : 'Open'}</Badge>
                      </div>
                      <JournalEntryNarrative entry={entry} textSize="sm" />
                      {entry.response && (
                        <div className="rounded-md bg-muted/40 p-3 text-sm">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Head office response</span>
                            <span>{formatDateTime(entry.response.respondedAt)}</span>
                          </div>
                          <Separator className="my-2" />
                          <p className="whitespace-pre-line leading-relaxed">{entry.response.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {isHeadOffice && managerFeatureEnabled && (
          <TabsContent value="head-office" className="space-y-4">
            {managerEntries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No escalations waiting. Managers will appear here when they raise concerns.
                </CardContent>
              </Card>
            ) : (
              managerEntries.map((entry) => {
                const draft = headOfficeDrafts[entry.id!] ?? entry.response?.text ?? '';
                const loading = entryLoading[entry.id!] || false;
                return (
                  <Card key={entry.id} className={entry.status === 'closed' ? 'opacity-75' : ''}>
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ShieldCheck className="h-4 w-4" />
                          <span>{entry.author?.name || 'Manager'}</span>
                          <span>· {formatDateTime(entry.createdAt)}</span>
                        </div>
                        <Badge variant={entry.status === 'closed' ? 'secondary' : 'outline'}>{entry.status === 'closed' ? 'Closed' : 'Open'}</Badge>
                      </div>
                      <JournalEntryNarrative entry={entry} />
                    </CardHeader>
                    <CardContent className="space-y-4 border-t pt-4">
                      {entry.response && (
                        <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Head office response</span>
                            <span>{formatDateTime(entry.response.respondedAt)}</span>
                          </div>
                          <p className="whitespace-pre-line leading-relaxed">{entry.response.text}</p>
                        </div>
                      )}
                      {entry.status !== 'closed' && (
                        <div className="space-y-3">
                          <Textarea
                            value={draft}
                            onChange={(event) => setHeadOfficeDrafts((prev) => ({ ...prev, [entry.id!]: event.target.value }))}
                            rows={4}
                            placeholder="Respond to the manager..."
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleRespond(entry, draft, 'manager')} disabled={loading}>
                              {loading ? 'Sending...' : 'Send response'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleClose(entry, 'manager')} disabled={loading}>
                              {loading ? 'Closing...' : 'Close entry'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  </div>
  );
}
