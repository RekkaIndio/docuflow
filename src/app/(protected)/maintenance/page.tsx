'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Loader2, RefreshCcw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import PageHeader from '@/components/page-header';
import { useWorkspace } from '@/context/workspace';
import { useAuth } from '@/hooks/use-auth';
import { saveMaintenanceRecord } from '@/actions/maintenance';
import { workspaceCollectionPath } from '@/lib/paths';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Form Template
const MAINTENANCE_FORM_TEMPLATE = {
    logNumber: '',
    date: new Date().toISOString().split('T')[0],
    reportedBy: '',
    location: '',
    item: '',
    priority: 'medium',
    description: '',
    status: 'open',
};

type MaintenanceRecord = {
    id: string;
    recordType: 'maintenance';
    logNumber: string;
    createdAt: Date;
    status: string;
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

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'open':
            return 'secondary';
        case 'in-progress':
            return 'warning'; // If you have a warning variant, otherwise default/secondary
        case 'completed':
            return 'success'; // Or make green manually
        case 'contractor-required':
            return 'destructive';
        default:
            return 'outline';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'open': return 'Open';
        case 'in-progress': return 'In Progress';
        case 'completed': return 'Completed';
        case 'contractor-required': return 'Contractor Required';
        default: return status;
    }
};

const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
        case 'low': return 'bg-slate-100 text-slate-800 border-slate-200';
        case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
        default: return '';
    }
};

export default function MaintenancePage() {
    const { toast } = useToast();
    const workspace = useWorkspace();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'request' | 'tracker'>('request');

    const workspaceId = workspace?.id ?? '';
    const organisationId = workspace?.organisationId ?? null;
    const isWorkspaceSelected = Boolean(workspaceId);

    const [form, setForm] = useState({ ...MAINTENANCE_FORM_TEMPLATE });
    const [savingInstance, setSavingInstance] = useState(false);
    const [trackerLoading, setTrackerLoading] = useState(false);
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);

    useEffect(() => {
        if (user?.name) {
            setForm(prev => ({ ...prev, reportedBy: user.name || '' }));
        }
    }, [user]);

    const loadRecords = useCallback(async () => {
        if (!workspaceId) {
            setRecords([]);
            return;
        }

        setTrackerLoading(true);
        try {
            const collectionPath = workspaceCollectionPath(workspaceId, 'maintenance', organisationId ?? undefined);
            if (collectionPath) {
                const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(docSnap => {
                    const docData = docSnap.data() as any;
                    const createdAt = docData.createdAt?.toDate ? docData.createdAt.toDate() : new Date();
                    return {
                        id: docSnap.id,
                        recordType: 'maintenance' as const,
                        logNumber: docData.logNumber ?? '',
                        status: docData.status ?? 'open',
                        createdAt,
                        form: docData.form ?? {},
                        createdBy: docData.createdBy ?? null,
                    };
                });
                setRecords(data);
            }
        } catch (error) {
            console.error('Failed to load maintenance records', error);
            toast({ title: 'Unable to load records', description: 'Please refresh and try again.', variant: 'destructive' });
        } finally {
            setTrackerLoading(false);
        }
    }, [workspaceId, organisationId, toast]);

    useEffect(() => {
        if (!workspaceId) {
            setRecords([]);
            return;
        }
        void loadRecords();
    }, [workspaceId, organisationId, loadRecords]);

    const updateField = (field: keyof typeof form, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
            setSavingInstance(true);
            await saveMaintenanceRecord({
                workspaceId,
                organisationId,
                actor: { id: user.id, name: user.name, email: user.email },
                payload: { form },
            });

            setForm({ ...MAINTENANCE_FORM_TEMPLATE, reportedBy: user.name || '' });
            await loadRecords();
            toast({ title: 'Maintenance request saved', description: 'The maintenance request has been logged successfully.' });
            setActiveTab('tracker');
        } catch (error) {
            console.error('Failed to save maintenance record', error);
            toast({ title: 'Unable to save', description: 'Please try again or contact an administrator.', variant: 'destructive' });
        } finally {
            setSavingInstance(false);
        }
    };

    return (
        <>
            <div className="space-y-6 pb-12">
                <PageHeader
                    title="Maintenance Log"
                    subtitle="Track and manage facility maintenance requests."
                    leading={<Wrench className="h-6 w-6" />}
                />

                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-[1800px]">
                        {!isWorkspaceSelected ? (
                            <Card className="border-dashed">
                                <CardHeader>
                                    <CardTitle>Select a workspace</CardTitle>
                                    <CardDescription>
                                        Choose a workspace from the sidebar to manage maintenance requests.
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        ) : (
                            <Tabs value={activeTab} onValueChange={val => setActiveTab(val as any)} className="space-y-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <TabsList className="grid h-auto w-full max-w-md grid-cols-2 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                                        <TabsTrigger
                                            className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                            value="request"
                                        >
                                            New Request
                                        </TabsTrigger>
                                        <TabsTrigger
                                            className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                            value="tracker"
                                        >
                                            Maintenance Log
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Request Form Tab */}
                                <TabsContent value="request" className="mt-6 space-y-6">
                                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                                        <div className="w-full flex-shrink-0 lg:w-[360px] xl:w-[400px] lg:self-start lg:sticky lg:top-24 lg:h-fit">
                                            <div className="flex flex-col gap-4">
                                                <Card className="rounded-2xl border border-slate-200 bg-white shadow-md">
                                                    <CardHeader className="space-y-1 border-b border-slate-200 bg-slate-50/60">
                                                        <CardTitle className="text-lg text-amber-900">Quick Info</CardTitle>
                                                        <CardDescription>Basic request details.</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4 p-6">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="quick-date">Date</Label>
                                                            <Input
                                                                id="quick-date"
                                                                type="date"
                                                                value={form.date}
                                                                onChange={e => updateField('date', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="quick-reportedBy">Reported By</Label>
                                                            <Input
                                                                id="quick-reportedBy"
                                                                value={form.reportedBy}
                                                                onChange={e => updateField('reportedBy', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="quick-priority">Priority</Label>
                                                            <Select value={form.priority} onValueChange={val => updateField('priority', val)}>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select priority" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="low">Low</SelectItem>
                                                                    <SelectItem value="medium">Medium</SelectItem>
                                                                    <SelectItem value="high">High</SelectItem>
                                                                    <SelectItem value="emergency">Emergency</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                                <CardHeader className="space-y-2 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                                                    <CardTitle className="text-2xl font-semibold text-amber-900">Maintenance Request</CardTitle>
                                                    <CardDescription className="text-base text-slate-500">
                                                        Log a new maintenance issue or repair request.
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-6 sm:p-8">
                                                    <form className="space-y-8" onSubmit={handleSubmit}>
                                                        {/* Location & Item */}
                                                        <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                                            <div className="space-y-2">
                                                                <h3 className="text-lg font-semibold text-amber-900">Issue Location</h3>
                                                                <p className="text-sm text-slate-500">Where is the maintenance issue?</p>
                                                            </div>
                                                            <div className="grid gap-6 md:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="location">Location / Room</Label>
                                                                    <Input
                                                                        id="location"
                                                                        placeholder="e.g. Room 101, Kitchen, Lounge"
                                                                        value={form.location}
                                                                        onChange={e => updateField('location', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="item">Item / Equipment</Label>
                                                                    <Input
                                                                        id="item"
                                                                        placeholder="e.g. Radiator, Light fitting, Bed"
                                                                        value={form.item}
                                                                        onChange={e => updateField('item', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Details */}
                                                        <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                                            <div className="space-y-2">
                                                                <h3 className="text-lg font-semibold text-amber-900">Description</h3>
                                                                <p className="text-sm text-slate-500">Please provide details about the issue.</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="description">Description of Issue</Label>
                                                                <Textarea
                                                                    id="description"
                                                                    rows={6}
                                                                    placeholder="Describe the fault or maintenance required..."
                                                                    value={form.description}
                                                                    onChange={e => updateField('description', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end gap-3">
                                                            <Button type="submit" disabled={savingInstance} className="min-w-[160px] bg-amber-700 hover:bg-amber-800 text-white rounded-xl shadow-md px-4 py-2 disabled:opacity-60">
                                                                {savingInstance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                {savingInstance ? 'Saving…' : 'Submit Request'}
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Tracker Log Tab */}
                                <TabsContent value="tracker" className="mt-6 space-y-6">
                                    <div className="flex flex-col gap-6">
                                        <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl">
                                            <CardHeader className="space-y-2 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <CardTitle className="text-2xl font-semibold text-amber-900 flex items-center gap-3">
                                                            <Wrench className="h-6 w-6" />
                                                            Maintenance Log
                                                        </CardTitle>
                                                        <CardDescription className="text-base text-slate-500 mt-1">
                                                            View all maintenance requests ({records.length} total)
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
                                                ) : records.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                                        <Wrench className="h-12 w-12 text-slate-300 mb-4" />
                                                        <p className="text-slate-500">No maintenance requests recorded yet.</p>
                                                        <Button variant="outline" className="mt-4" onClick={() => setActiveTab('request')}>
                                                            Log First Request
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Log Number</TableHead>
                                                                    <TableHead>Date</TableHead>
                                                                    <TableHead>Location</TableHead>
                                                                    <TableHead>Item</TableHead>
                                                                    <TableHead>Priority</TableHead>
                                                                    <TableHead>Status</TableHead>
                                                                    <TableHead>Reported By</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {records.map(record => (
                                                                    <TableRow
                                                                        key={record.id}
                                                                        className="cursor-pointer hover:bg-slate-50"
                                                                        onClick={() => setSelectedRecord(record)}
                                                                    >
                                                                        <TableCell className="font-medium">{record.logNumber || '—'}</TableCell>
                                                                        <TableCell>{formatInputDate(record.form.date)}</TableCell>
                                                                        <TableCell>{record.form.location || '—'}</TableCell>
                                                                        <TableCell>{record.form.item || '—'}</TableCell>
                                                                        <TableCell>
                                                                            <Badge className={`capitalize font-normal border ${getPriorityBadgeColor(record.form.priority)}`}>
                                                                                {record.form.priority}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge variant={getStatusBadgeVariant(record.status) as any}>
                                                                                {getStatusLabel(record.status)}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>{record.form.reportedBy || '—'}</TableCell>
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

            {/* Record Detail Dialog */}
            <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <Wrench className="h-5 w-5 text-amber-600" />
                            Maintenance Details
                        </DialogTitle>
                        <DialogDescription>
                            Log Number: {selectedRecord?.logNumber}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        {selectedRecord && (
                            <div className="space-y-4 p-4">
                                <div className="flex items-center justify-between border-b pb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-500">Status:</span>
                                        <Badge variant={getStatusBadgeVariant(selectedRecord.status) as any}>
                                            {getStatusLabel(selectedRecord.status)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-500">Priority:</span>
                                        <Badge className={`capitalize font-normal border ${getPriorityBadgeColor(selectedRecord.form.priority)}`}>
                                            {selectedRecord.form.priority}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Date Reported</p>
                                        <p className="text-sm">{formatInputDate(selectedRecord.form.date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Reported By</p>
                                        <p className="text-sm">{selectedRecord.form.reportedBy || '—'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Location</p>
                                        <p className="text-sm font-medium">{selectedRecord.form.location || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">Item / Equipment</p>
                                        <p className="text-sm font-medium">{selectedRecord.form.item || '—'}</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <p className="text-xs font-semibold uppercase text-slate-500">Description of Issue</p>
                                    <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm whitespace-pre-wrap border border-slate-100">
                                        {selectedRecord.form.description || 'No description provided.'}
                                    </div>
                                </div>

                                <div className="text-xs text-slate-400 pt-4 border-t flex justify-between">
                                    <span>Created: {formatDateTime(selectedRecord.createdAt)}</span>
                                    <span>ID: {selectedRecord.id}</span>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
}
