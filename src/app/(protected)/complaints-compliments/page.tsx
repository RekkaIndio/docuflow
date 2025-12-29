'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, ThumbsUp, Loader2, RefreshCcw, Calendar as CalendarIcon, FileText, Heart } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import PageHeader from '@/components/page-header';
import { useWorkspace } from '@/context/workspace';
import { useAuth } from '@/hooks/use-auth';
import { saveComplaintRecord, saveComplimentRecord } from '@/actions/complaints-compliments';
import { workspaceCollectionPath } from '@/lib/paths';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Form Templates
const COMPLAINT_FORM_TEMPLATE = {
    logNumber: '',
    date: '',
    raisedBy: '',
    raisedTo: '',
    acknowledgementSentDate: '',
    responseSentDate: '',
    detailOfComplaint: '',
    detailOfInvestigation: '',
    responseToComplainant: '',
    complainantsResponse: '',
    lessonsLearntRequired: '',
    lessonsLearntCompletionDate: '',
    relationToResident: '',
    method: 'verbal',
    escalationRequired: '',
    complaintCloseDate: '',
};

const COMPLIMENT_FORM_TEMPLATE = {
    logNumber: '',
    date: '',
    receivedFrom: '',
    method: 'verbal',
    acknowledgementSent: '',
    detailsOfCompliment: '',
    sharedWithTeamDate: '',
};

type ComplaintRecord = {
    id: string;
    recordType: 'complaint';
    logNumber: string;
    createdAt: Date;
    form: Record<string, any>;
    createdBy?: {
        id?: string;
        name?: string | null;
        email?: string | null;
    };
};

type ComplimentRecord = {
    id: string;
    recordType: 'compliment';
    logNumber: string;
    createdAt: Date;
    form: Record<string, any>;
    createdBy?: {
        id?: string;
        name?: string | null;
        email?: string | null;
    };
};

const formatInputDate = (value?: string) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    try {
        return parsed.toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
        return parsed.toISOString();
    }
};

const formatDateTime = (value: Date) => {
    try {
        return value.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return value.toISOString();
    }
};

export default function ComplaintsComplimentsPage() {
    const { toast } = useToast();
    const workspace = useWorkspace();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'complaint' | 'compliment' | 'complaint-tracker' | 'compliment-tracker'>('complaint');

    const workspaceId = workspace?.id ?? '';
    const organisationId = workspace?.organisationId ?? null;
    const workspaceName = workspace?.name ?? '';
    const isWorkspaceSelected = Boolean(workspaceId);

    const [complaintForm, setComplaintForm] = useState({ ...COMPLAINT_FORM_TEMPLATE });
    const [complimentForm, setComplimentForm] = useState({ ...COMPLIMENT_FORM_TEMPLATE });
    const [savingComplaint, setSavingComplaint] = useState(false);
    const [savingCompliment, setSavingCompliment] = useState(false);
    const [trackerLoading, setTrackerLoading] = useState(false);
    const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
    const [compliments, setCompliments] = useState<ComplimentRecord[]>([]);
    const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);
    const [selectedCompliment, setSelectedCompliment] = useState<ComplimentRecord | null>(null);

    const loadRecords = useCallback(async () => {
        if (!workspaceId) {
            setComplaints([]);
            setCompliments([]);
            return;
        }

        setTrackerLoading(true);
        try {
            // Load complaints
            const complaintsPath = workspaceCollectionPath(workspaceId, 'complaints', organisationId ?? undefined);
            if (complaintsPath) {
                const complaintsQuery = query(collection(db, complaintsPath), orderBy('createdAt', 'desc'));
                const complaintsSnapshot = await getDocs(complaintsQuery);
                const complaintsData = complaintsSnapshot.docs.map(docSnap => {
                    const data = docSnap.data() as any;
                    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                    return {
                        id: docSnap.id,
                        recordType: 'complaint' as const,
                        logNumber: data.logNumber ?? '',
                        createdAt,
                        form: data.form ?? {},
                        createdBy: data.createdBy ?? null,
                    };
                });
                setComplaints(complaintsData);
            }

            // Load compliments
            const complimentsPath = workspaceCollectionPath(workspaceId, 'compliments', organisationId ?? undefined);
            if (complimentsPath) {
                const complimentsQuery = query(collection(db, complimentsPath), orderBy('createdAt', 'desc'));
                const complimentsSnapshot = await getDocs(complimentsQuery);
                const complimentsData = complimentsSnapshot.docs.map(docSnap => {
                    const data = docSnap.data() as any;
                    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                    return {
                        id: docSnap.id,
                        recordType: 'compliment' as const,
                        logNumber: data.logNumber ?? '',
                        createdAt,
                        form: data.form ?? {},
                        createdBy: data.createdBy ?? null,
                    };
                });
                setCompliments(complimentsData);
            }
        } catch (error) {
            console.error('Failed to load records', error);
            toast({ title: 'Unable to load records', description: 'Please refresh and try again.', variant: 'destructive' });
        } finally {
            setTrackerLoading(false);
        }
    }, [workspaceId, organisationId, toast]);

    useEffect(() => {
        if (!workspaceId) {
            setComplaints([]);
            setCompliments([]);
            return;
        }
        void loadRecords();
    }, [workspaceId, organisationId, loadRecords]);

    const updateComplaintField = (field: keyof typeof complaintForm, value: any) => {
        setComplaintForm(prev => ({ ...prev, [field]: value }));
    };

    const updateComplimentField = (field: keyof typeof complimentForm, value: any) => {
        setComplimentForm(prev => ({ ...prev, [field]: value }));
    };

    const handleComplaintSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!workspaceId) {
            toast({ title: 'No workspace selected', description: 'Select a workspace before saving.', variant: 'destructive' });
            return;
        }

        if (!user?.id) {
            toast({ title: 'Sign in required', description: 'You need to be signed in to save records.', variant: 'destructive' });
            return;
        }

        try {
            setSavingComplaint(true);
            await saveComplaintRecord({
                workspaceId,
                organisationId,
                actor: { id: user.id, name: user.name, email: user.email },
                payload: { form: complaintForm },
            });

            setComplaintForm({ ...COMPLAINT_FORM_TEMPLATE });
            await loadRecords();
            toast({ title: 'Complaint saved', description: 'The complaint record has been saved successfully.' });
        } catch (error) {
            console.error('Failed to save complaint record', error);
            toast({ title: 'Unable to save', description: 'Please try again or contact an administrator.', variant: 'destructive' });
        } finally {
            setSavingComplaint(false);
        }
    };

    const handleComplimentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!workspaceId) {
            toast({ title: 'No workspace selected', description: 'Select a workspace before saving.', variant: 'destructive' });
            return;
        }

        if (!user?.id) {
            toast({ title: 'Sign in required', description: 'You need to be signed in to save records.', variant: 'destructive' });
            return;
        }

        try {
            setSavingCompliment(true);
            await saveComplimentRecord({
                workspaceId,
                organisationId,
                actor: { id: user.id, name: user.name, email: user.email },
                payload: { form: complimentForm },
            });

            setComplimentForm({ ...COMPLIMENT_FORM_TEMPLATE });
            await loadRecords();
            toast({ title: 'Compliment saved', description: 'The compliment record has been saved successfully.' });
        } catch (error) {
            console.error('Failed to save compliment record', error);
            toast({ title: 'Unable to save', description: 'Please try again or contact an administrator.', variant: 'destructive' });
        } finally {
            setSavingCompliment(false);
        }
    };

    return (
        <>
            <div className="space-y-6 pb-12">
                <PageHeader
                    title="Complaints & Compliments"
                    subtitle="Track and manage complaints and compliments for your care home."
                    leading={<MessageSquare className="h-6 w-6" />}
                />

                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-[1800px]">
                        {!isWorkspaceSelected ? (
                            <Card className="border-dashed">
                                <CardHeader>
                                    <CardTitle>Select a workspace</CardTitle>
                                    <CardDescription>
                                        Choose a workspace from the sidebar to manage complaints and compliments.
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        ) : (
                            <Tabs value={activeTab} onValueChange={val => setActiveTab(val as any)} className="space-y-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <TabsList className="grid h-auto w-full max-w-2xl grid-cols-4 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                                        <TabsTrigger
                                            className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                            value="complaint"
                                        >
                                            Complaint Form
                                        </TabsTrigger>
                                        <TabsTrigger
                                            className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                            value="compliment"
                                        >
                                            Compliment Form
                                        </TabsTrigger>
                                        <TabsTrigger
                                            className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                            value="complaint-tracker"
                                        >
                                            Complaint Log
                                        </TabsTrigger>
                                        <TabsTrigger
                                            className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                            value="compliment-tracker"
                                        >
                                            Compliment Log
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Complaint Form Tab */}
                                <TabsContent value="complaint" className="mt-6 space-y-6">
                                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                                        <div className="w-full flex-shrink-0 lg:w-[360px] xl:w-[400px] lg:self-start lg:sticky lg:top-24 lg:h-fit">
                                            <div className="flex flex-col gap-4">
                                                <Card className="rounded-2xl border border-slate-200 bg-white shadow-md">
                                                    <CardHeader className="space-y-1 border-b border-slate-200 bg-slate-50/60">
                                                        <CardTitle className="text-lg text-purple-900">Quick Info</CardTitle>
                                                        <CardDescription>Basic complaint information.</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4 p-6">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="quick-date">Date</Label>
                                                            <Input
                                                                id="quick-date"
                                                                type="date"
                                                                value={complaintForm.date}
                                                                onChange={e => updateComplaintField('date', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="quick-raisedBy">Raised By</Label>
                                                            <Input
                                                                id="quick-raisedBy"
                                                                value={complaintForm.raisedBy}
                                                                onChange={e => updateComplaintField('raisedBy', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="quick-raisedTo">Raised To</Label>
                                                            <Input
                                                                id="quick-raisedTo"
                                                                value={complaintForm.raisedTo}
                                                                onChange={e => updateComplaintField('raisedTo', e.target.value)}
                                                            />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                                <CardHeader className="space-y-2 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                                                    <CardTitle className="text-2xl font-semibold text-purple-900">Complaint Form</CardTitle>
                                                    <CardDescription className="text-base text-slate-500">
                                                        Record and track complaints with full investigation details.
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-6 sm:p-8">
                                                    <form className="space-y-8" onSubmit={handleComplaintSubmit}>
                                                        {/* Dates Section */}
                                                        <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                                            <div className="space-y-2">
                                                                <h3 className="text-lg font-semibold text-purple-900">Acknowledgement & Response</h3>
                                                                <p className="text-sm text-slate-500">Track when acknowledgement and response were sent.</p>
                                                            </div>
                                                            <div className="grid gap-6 md:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="acknowledgementSentDate">Acknowledgement Sent Date</Label>
                                                                    <Input
                                                                        id="acknowledgementSentDate"
                                                                        type="date"
                                                                        value={complaintForm.acknowledgementSentDate}
                                                                        onChange={e => updateComplaintField('acknowledgementSentDate', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="responseSentDate">Response Sent Date</Label>
                                                                    <Input
                                                                        id="responseSentDate"
                                                                        type="date"
                                                                        value={complaintForm.responseSentDate}
                                                                        onChange={e => updateComplaintField('responseSentDate', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Complaint Details Section */}
                                                        <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                                            <div className="space-y-2">
                                                                <h3 className="text-lg font-semibold text-purple-900">Complaint Details</h3>
                                                                <p className="text-sm text-slate-500">Provide full details of the complaint and investigation.</p>
                                                            </div>
                                                            <div className="space-y-6">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="detailOfComplaint">Detail of the Complaint</Label>
                                                                    <Textarea
                                                                        id="detailOfComplaint"
                                                                        rows={4}
                                                                        value={complaintForm.detailOfComplaint}
                                                                        onChange={e => updateComplaintField('detailOfComplaint', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="detailOfInvestigation">Detail of Investigation</Label>
                                                                    <Textarea
                                                                        id="detailOfInvestigation"
                                                                        rows={4}
                                                                        value={complaintForm.detailOfInvestigation}
                                                                        onChange={e => updateComplaintField('detailOfInvestigation', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="responseToComplainant">Response to Complainant</Label>
                                                                    <Textarea
                                                                        id="responseToComplainant"
                                                                        rows={4}
                                                                        value={complaintForm.responseToComplainant}
                                                                        onChange={e => updateComplaintField('responseToComplainant', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="complainantsResponse">Complainant's Response</Label>
                                                                    <Textarea
                                                                        id="complainantsResponse"
                                                                        rows={4}
                                                                        value={complaintForm.complainantsResponse}
                                                                        onChange={e => updateComplaintField('complainantsResponse', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Additional Info Section */}
                                                        <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                                            <div className="space-y-2">
                                                                <h3 className="text-lg font-semibold text-purple-900">Additional Information</h3>
                                                                <p className="text-sm text-slate-500">Track escalation and lessons learnt.</p>
                                                            </div>
                                                            <div className="grid gap-6 md:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="relationToResident">Relation to Resident</Label>
                                                                    <Input
                                                                        id="relationToResident"
                                                                        placeholder="Name or N/A"
                                                                        value={complaintForm.relationToResident}
                                                                        onChange={e => updateComplaintField('relationToResident', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Method</Label>
                                                                    <RadioGroup value={complaintForm.method} onValueChange={value => updateComplaintField('method', value)}>
                                                                        <div className="flex gap-4">
                                                                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
                                                                                <RadioGroupItem value="written" />
                                                                                <span>Written</span>
                                                                            </label>
                                                                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
                                                                                <RadioGroupItem value="verbal" />
                                                                                <span>Verbal</span>
                                                                            </label>
                                                                        </div>
                                                                    </RadioGroup>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Escalation Required</Label>
                                                                    <RadioGroup value={complaintForm.escalationRequired} onValueChange={value => updateComplaintField('escalationRequired', value)}>
                                                                        <div className="flex gap-4">
                                                                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
                                                                                <RadioGroupItem value="yes" />
                                                                                <span>Yes</span>
                                                                            </label>
                                                                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
                                                                                <RadioGroupItem value="no" />
                                                                                <span>No</span>
                                                                            </label>
                                                                        </div>
                                                                    </RadioGroup>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Lessons Learnt Required</Label>
                                                                    <RadioGroup value={complaintForm.lessonsLearntRequired} onValueChange={value => updateComplaintField('lessonsLearntRequired', value)}>
                                                                        <div className="flex gap-4">
                                                                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
                                                                                <RadioGroupItem value="yes" />
                                                                                <span>Yes</span>
                                                                            </label>
                                                                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
                                                                                <RadioGroupItem value="no" />
                                                                                <span>No</span>
                                                                            </label>
                                                                        </div>
                                                                    </RadioGroup>
                                                                </div>
                                                                {complaintForm.lessonsLearntRequired === 'yes' && (
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="lessonsLearntCompletionDate">Lessons Learnt Completion Date</Label>
                                                                        <Input
                                                                            id="lessonsLearntCompletionDate"
                                                                            type="date"
                                                                            value={complaintForm.lessonsLearntCompletionDate}
                                                                            onChange={e => updateComplaintField('lessonsLearntCompletionDate', e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="complaintCloseDate">Complaint Close Date</Label>
                                                                    <Input
                                                                        id="complaintCloseDate"
                                                                        type="date"
                                                                        value={complaintForm.complaintCloseDate}
                                                                        onChange={e => updateComplaintField('complaintCloseDate', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end gap-3">
                                                            <Button type="submit" disabled={savingComplaint} className="min-w-[160px] bg-purple-800 hover:bg-purple-900 text-white rounded-xl shadow-md px-4 py-2 disabled:opacity-60">
                                                                {savingComplaint ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                {savingComplaint ? 'Saving…' : 'Save Complaint'}
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Compliment Form Tab */}
                                <TabsContent value="compliment" className="mt-6 space-y-6">
                                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                                        <div className="w-full flex-shrink-0 lg:w-[360px] xl:w-[400px] lg:self-start lg:sticky lg:top-24 lg:h-fit">
                                            <div className="flex flex-col gap-4">
                                                <Card className="rounded-2xl border border-slate-200 bg-white shadow-md">
                                                    <CardHeader className="space-y-1 border-b border-slate-200 bg-slate-50/60">
                                                        <CardTitle className="text-lg text-pink-900">Quick Info</CardTitle>
                                                        <CardDescription>Basic compliment information.</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4 p-6">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="compliment-date">Date</Label>
                                                            <Input
                                                                id="compliment-date"
                                                                type="date"
                                                                value={complimentForm.date}
                                                                onChange={e => updateComplimentField('date', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="compliment-receivedFrom">Received From</Label>
                                                            <Input
                                                                id="compliment-receivedFrom"
                                                                value={complimentForm.receivedFrom}
                                                                onChange={e => updateComplimentField('receivedFrom', e.target.value)}
                                                            />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                                <CardHeader className="space-y-2 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                                                    <CardTitle className="text-2xl font-semibold text-pink-900">Compliment Form</CardTitle>
                                                    <CardDescription className="text-base text-slate-500">
                                                        Record compliments received for your care home.
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-6 sm:p-8">
                                                    <form className="space-y-8" onSubmit={handleComplimentSubmit}>
                                                        {/* Method Selection */}
                                                        <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                                            <div className="space-y-2">
                                                                <h3 className="text-lg font-semibold text-pink-900">Method of Receipt</h3>
                                                                <p className="text-sm text-slate-500">How was the compliment received?</p>
                                                            </div>
                                                            <RadioGroup value={complimentForm.method} onValueChange={value => updateComplimentField('method', value)}>
                                                                <div className="grid gap-2 md:grid-cols-3">
                                                                    {[
                                                                        { value: 'verbal', label: 'Verbal' },
                                                                        { value: 'written', label: 'Written' },
                                                                        { value: 'social-media', label: 'Social Media' },
                                                                        { value: 'carehome-co-uk', label: 'carehome.co.uk' },
                                                                        { value: 'other', label: 'Other' },
                                                                    ].map(option => (
                                                                        <label key={option.value} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                                                            <RadioGroupItem value={option.value} />
                                                                            <span className="leading-snug text-slate-500">{option.label}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </RadioGroup>
                                                        </div>

                                                        {/* Acknowledgement */}
                                                        <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                                            <div className="space-y-2">
                                                                <h3 className="text-lg font-semibold text-pink-900">Acknowledgement</h3>
                                                                <p className="text-sm text-slate-500">Track when acknowledgement was sent.</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="acknowledgementSent">Acknowledgement Sent Date</Label>
                                                                <Input
                                                                    id="acknowledgementSent"
                                                                    type="date"
                                                                    value={complimentForm.acknowledgementSent}
                                                                    onChange={e => updateComplimentField('acknowledgementSent', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Details */}
                                                        <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                                            <div className="space-y-2">
                                                                <h3 className="text-lg font-semibold text-pink-900">Compliment Details</h3>
                                                                <p className="text-sm text-slate-500">Record the full details of the compliment.</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="detailsOfCompliment">Details of Compliment</Label>
                                                                <Textarea
                                                                    id="detailsOfCompliment"
                                                                    rows={6}
                                                                    value={complimentForm.detailsOfCompliment}
                                                                    onChange={e => updateComplimentField('detailsOfCompliment', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Shared with Team */}
                                                        <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                                            <div className="space-y-2">
                                                                <h3 className="text-lg font-semibold text-pink-900">Team Sharing</h3>
                                                                <p className="text-sm text-slate-500">Record when the compliment was shared with the team.</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="sharedWithTeamDate">Shared with Team Date</Label>
                                                                <Input
                                                                    id="sharedWithTeamDate"
                                                                    type="date"
                                                                    value={complimentForm.sharedWithTeamDate}
                                                                    onChange={e => updateComplimentField('sharedWithTeamDate', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end gap-3">
                                                            <Button type="submit" disabled={savingCompliment} className="min-w-[160px] bg-pink-700 hover:bg-pink-800 text-white rounded-xl shadow-md px-4 py-2 disabled:opacity-60">
                                                                {savingCompliment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                {savingCompliment ? 'Saving…' : 'Save Compliment'}
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Complaint Tracker Log Tab */}
                                <TabsContent value="complaint-tracker" className="mt-6 space-y-6">
                                    <div className="flex flex-col gap-6">
                                        <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl">
                                            <CardHeader className="space-y-2 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <CardTitle className="text-2xl font-semibold text-purple-900 flex items-center gap-3">
                                                            <FileText className="h-6 w-6" />
                                                            Complaint Tracker Log
                                                        </CardTitle>
                                                        <CardDescription className="text-base text-slate-500 mt-1">
                                                            View all complaint records ({complaints.length} total)
                                                        </CardDescription>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => void loadRecords()}
                                                        disabled={trackerLoading}
                                                    >
                                                        <RefreshCcw className={`h-4 w-4 mr-2 ${trackerLoading ? 'animate-spin' : ''}`} />
                                                        Refresh
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                {trackerLoading ? (
                                                    <div className="flex items-center justify-center py-12">
                                                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                                    </div>
                                                ) : complaints.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                                        <MessageSquare className="h-12 w-12 text-slate-300 mb-4" />
                                                        <p className="text-slate-500">No complaints recorded yet.</p>
                                                        <Button variant="outline" className="mt-4" onClick={() => setActiveTab('complaint')}>
                                                            Add First Complaint
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Log Number</TableHead>
                                                                    <TableHead>Date</TableHead>
                                                                    <TableHead>Complainant</TableHead>
                                                                    <TableHead>Relation</TableHead>
                                                                    <TableHead>Method</TableHead>
                                                                    <TableHead>Ack. Sent</TableHead>
                                                                    <TableHead>Response Sent</TableHead>
                                                                    <TableHead>Escalation</TableHead>
                                                                    <TableHead>Lessons Learnt</TableHead>
                                                                    <TableHead>Close Date</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {complaints.map(record => (
                                                                    <TableRow
                                                                        key={record.id}
                                                                        className="cursor-pointer hover:bg-slate-50"
                                                                        onClick={() => setSelectedComplaint(record)}
                                                                    >
                                                                        <TableCell className="font-medium">{record.logNumber || '—'}</TableCell>
                                                                        <TableCell>{formatInputDate(record.form.date)}</TableCell>
                                                                        <TableCell>{record.form.raisedBy || '—'}</TableCell>
                                                                        <TableCell>{record.form.relationToResident || 'N/A'}</TableCell>
                                                                        <TableCell>
                                                                            <Badge variant="outline" className="capitalize">
                                                                                {record.form.method || 'verbal'}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>{formatInputDate(record.form.acknowledgementSentDate)}</TableCell>
                                                                        <TableCell>{formatInputDate(record.form.responseSentDate)}</TableCell>
                                                                        <TableCell>
                                                                            <Badge variant={record.form.escalationRequired === 'yes' ? 'destructive' : 'secondary'}>
                                                                                {record.form.escalationRequired === 'yes' ? 'Yes' : 'No'}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {record.form.lessonsLearntRequired === 'yes'
                                                                                ? formatInputDate(record.form.lessonsLearntCompletionDate)
                                                                                : 'N/A'}
                                                                        </TableCell>
                                                                        <TableCell>{formatInputDate(record.form.complaintCloseDate)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>

                                {/* Compliment Tracker Log Tab */}
                                <TabsContent value="compliment-tracker" className="mt-6 space-y-6">
                                    <div className="flex flex-col gap-6">
                                        <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl">
                                            <CardHeader className="space-y-2 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <CardTitle className="text-2xl font-semibold text-pink-900 flex items-center gap-3">
                                                            <Heart className="h-6 w-6" />
                                                            Compliment Tracker Log
                                                        </CardTitle>
                                                        <CardDescription className="text-base text-slate-500 mt-1">
                                                            View all compliment records ({compliments.length} total)
                                                        </CardDescription>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => void loadRecords()}
                                                        disabled={trackerLoading}
                                                    >
                                                        <RefreshCcw className={`h-4 w-4 mr-2 ${trackerLoading ? 'animate-spin' : ''}`} />
                                                        Refresh
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                {trackerLoading ? (
                                                    <div className="flex items-center justify-center py-12">
                                                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                                    </div>
                                                ) : compliments.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                                        <Heart className="h-12 w-12 text-slate-300 mb-4" />
                                                        <p className="text-slate-500">No compliments recorded yet.</p>
                                                        <Button variant="outline" className="mt-4" onClick={() => setActiveTab('compliment')}>
                                                            Add First Compliment
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Log Number</TableHead>
                                                                    <TableHead>Date</TableHead>
                                                                    <TableHead>Received From</TableHead>
                                                                    <TableHead>Method</TableHead>
                                                                    <TableHead>Acknowledgement Sent</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {compliments.map(record => (
                                                                    <TableRow
                                                                        key={record.id}
                                                                        className="cursor-pointer hover:bg-slate-50"
                                                                        onClick={() => setSelectedCompliment(record)}
                                                                    >
                                                                        <TableCell className="font-medium">{record.logNumber || '—'}</TableCell>
                                                                        <TableCell>{formatInputDate(record.form.date)}</TableCell>
                                                                        <TableCell>{record.form.receivedFrom || '—'}</TableCell>
                                                                        <TableCell>
                                                                            <Badge variant="outline" className="capitalize">
                                                                                {record.form.method?.replace(/-/g, ' ') || 'verbal'}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>{formatInputDate(record.form.acknowledgementSent)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                </div>
            </div>

            {/* Complaint Detail Dialog */}
            <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <MessageSquare className="h-5 w-5 text-purple-600" />
                            Complaint Details
                        </DialogTitle>
                        <DialogDescription>
                            Log Number: {selectedComplaint?.logNumber}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        {selectedComplaint && (
                            <div className="space-y-4 p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Date</p>
                                        <p className="text-sm">{formatInputDate(selectedComplaint.form.date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Raised By</p>
                                        <p className="text-sm">{selectedComplaint.form.raisedBy || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Raised To</p>
                                        <p className="text-sm">{selectedComplaint.form.raisedTo || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Method</p>
                                        <Badge variant="outline" className="capitalize">{selectedComplaint.form.method || 'verbal'}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-slate-500">Detail of Complaint</p>
                                    <p className="text-sm whitespace-pre-wrap mt-1">{selectedComplaint.form.detailOfComplaint || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-slate-500">Detail of Investigation</p>
                                    <p className="text-sm whitespace-pre-wrap mt-1">{selectedComplaint.form.detailOfInvestigation || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-slate-500">Response to Complainant</p>
                                    <p className="text-sm whitespace-pre-wrap mt-1">{selectedComplaint.form.responseToComplainant || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-slate-500">Complainant's Response</p>
                                    <p className="text-sm whitespace-pre-wrap mt-1">{selectedComplaint.form.complainantsResponse || '—'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Escalation Required</p>
                                        <Badge variant={selectedComplaint.form.escalationRequired === 'yes' ? 'destructive' : 'secondary'}>
                                            {selectedComplaint.form.escalationRequired === 'yes' ? 'Yes' : 'No'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Lessons Learnt Required</p>
                                        <Badge variant={selectedComplaint.form.lessonsLearntRequired === 'yes' ? 'default' : 'secondary'}>
                                            {selectedComplaint.form.lessonsLearntRequired === 'yes' ? 'Yes' : 'No'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Compliment Detail Dialog */}
            <Dialog open={!!selectedCompliment} onOpenChange={() => setSelectedCompliment(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <Heart className="h-5 w-5 text-pink-600" />
                            Compliment Details
                        </DialogTitle>
                        <DialogDescription>
                            Log Number: {selectedCompliment?.logNumber}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        {selectedCompliment && (
                            <div className="space-y-4 p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Date</p>
                                        <p className="text-sm">{formatInputDate(selectedCompliment.form.date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Received From</p>
                                        <p className="text-sm">{selectedCompliment.form.receivedFrom || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Method</p>
                                        <Badge variant="outline" className="capitalize">{selectedCompliment.form.method?.replace(/-/g, ' ') || 'verbal'}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Acknowledgement Sent</p>
                                        <p className="text-sm">{formatInputDate(selectedCompliment.form.acknowledgementSent)}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-slate-500">Details of Compliment</p>
                                    <p className="text-sm whitespace-pre-wrap mt-1">{selectedCompliment.form.detailsOfCompliment || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-slate-500">Shared with Team</p>
                                    <p className="text-sm">{formatInputDate(selectedCompliment.form.sharedWithTeamDate)}</p>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
}
