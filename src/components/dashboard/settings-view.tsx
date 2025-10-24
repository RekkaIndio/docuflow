
"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, User, Users, Bell, Trash2, ShieldCheck, FileKey, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { Workspace } from "@/lib/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { mockUser } from "@/lib/data";
import { SidebarTrigger } from "../ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileInput } from "@/components/ui/file-input";
import { uploadProfilePicture, saveProfilePictureUrl } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Adjust the import based on your project structure
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { workspaceCollectionPath, workspaceDocPath } from '@/lib/paths';


interface SettingsViewProps {
    workspace: Workspace;
}

const mockTeamMembers = [
    mockUser,
    { id: 'user-2', name: 'Jane Doe', email: 'jane.d@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=jane', role: 'Admin' },
    { id: 'user-3', name: 'Peter Jones', email: 'peter.j@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=peter', role: 'Member' },
]


export function SettingsView({ workspace }: SettingsViewProps) {
    const { user } = useAuth();
    const normalisedRole = (user?.role || '').toLowerCase();
    const managerRoleKeys = ['owner', 'admin', 'manager', 'clinical lead', 'clinical_lead', 'deputy', 'operations manager', 'head office', 'head-office'];
    const isManager = managerRoleKeys.includes(normalisedRole);
    const [workspaceName, setWorkspaceName] = useState(workspace.name);
    const [displayName, setDisplayName] = useState<string>("");
    const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
    const [inviteEmail, setInviteEmail] = useState<string>("");
    const [totalBedsInput, setTotalBedsInput] = useState<string>("");
    const [isBedsLoading, setIsBedsLoading] = useState<boolean>(true);
    const [isBedsSaving, setIsBedsSaving] = useState<boolean>(false);
    const [bedsError, setBedsError] = useState<string | null>(null);
    const settingsOrgId = workspace.organisationId ?? user?.organisationId ?? null;

    // ...existing logic for handleInviteMember, useEffect, handleProfilePictureChange...
    // (Unchanged, omitted for brevity)

    // --- Begin: handleInviteMember, useEffect, handleProfilePictureChange ---
    const handleInviteMember = async () => {
        if (!inviteEmail || !workspace?.id) {
            toast({ title: "Missing info", description: "Please enter an email to invite." });
            return;
        }
        try {
            await addDoc(collection(db, "workspace_invitations"), {
                email: inviteEmail,
                workspaceId: workspace.id,
                invitedBy: user?.id || null,
                status: "pending",
                createdAt: serverTimestamp(),
            });
            const inviterName = user?.name || user?.email || "Someone";
            const workspaceName = workspace.name || "a workspace";
            const inviteLink = `${window.location.origin}/accept-invite?email=${encodeURIComponent(inviteEmail)}&workspace=${encodeURIComponent(workspace.id)}`;
            await fetch("/api/send-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: inviteEmail,
                    inviterName,
                    workspaceName,
                    inviteLink
                })
            });
            setInviteEmail("");
            toast({ title: "Invitation sent!", description: `Invite sent to ${inviteEmail}` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to send invite." });
            console.error("Error inviting member:", error);
        }
    };

    useEffect(() => {
        async function fetchUserProfile() {
            try {
                const userIdToUse = user?.id;
                if (!userIdToUse) return;
                const userDocRef = doc(db, "users", userIdToUse);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data?.profilePicture) {
                        setProfilePicture((data.profilePicture as string) ?? undefined);
                    }
                    if (data?.displayName) {
                        setDisplayName(data.displayName);
                    } else if (data?.name) {
                        setDisplayName(data.name);
                    }
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        }
        fetchUserProfile();
    }, [user?.id]);

    useEffect(() => {
        if (!workspace?.id) {
            setTotalBedsInput("");
            setIsBedsLoading(false);
            return () => undefined;
        }

        setIsBedsLoading(true);
        const settingsPath = workspaceCollectionPath(workspace.id, 'settings', settingsOrgId);
        if (!settingsPath) {
            setTotalBedsInput("");
            setIsBedsLoading(false);
            return () => undefined;
        }

        const settingsCol = collection(db, settingsPath);
        const occupancyDoc = doc(settingsCol, 'occupancy');
        const unsubscribe = onSnapshot(occupancyDoc, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as { totalBeds?: number };
                if (typeof data.totalBeds === 'number' && Number.isFinite(data.totalBeds)) {
                    setTotalBedsInput(String(Math.round(data.totalBeds)));
                } else {
                    setTotalBedsInput("");
                }
            } else {
                setTotalBedsInput("");
            }
            setIsBedsLoading(false);
        }, (error) => {
            console.error('Failed to subscribe to total beds setting:', error);
            setIsBedsLoading(false);
        });

        return unsubscribe;
    }, [workspace?.id, settingsOrgId]);

    const saveTotalBeds = async () => {
        if (!workspace?.id) return;
        const trimmed = totalBedsInput.trim();
        if (trimmed === '') {
            setBedsError('Enter the number of beds for this workspace');
            return;
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed < 0) {
            setBedsError('Please enter a non-negative whole number');
            return;
        }

        setBedsError(null);
        const value = Math.round(parsed);
        try {
            setIsBedsSaving(true);
            const now = new Date();
            const settingsPath = workspaceCollectionPath(workspace.id, 'settings', settingsOrgId);
            if (settingsPath) {
                const occupancyRef = doc(collection(db, settingsPath), 'occupancy');
                await setDoc(occupancyRef, {
                    totalBeds: value,
                    updatedAt: now,
                }, { merge: true });
            }

            const workspacePath = workspaceDocPath(workspace.id, undefined, settingsOrgId);
            if (workspacePath) {
                const workspaceRef = doc(db, workspacePath);
                await setDoc(workspaceRef, {
                    totalBeds: value,
                    updatedAt: now,
                }, { merge: true });
            }
            setTotalBedsInput(String(value));
            toast({ title: 'Saved', description: 'Total beds updated for occupancy calculations' });
        } catch (error) {
            console.error('Failed to save total beds setting:', error);
            toast({ title: 'Error', description: 'Failed to update total beds', variant: 'destructive' });
        } finally {
            setIsBedsSaving(false);
        }
    };

    const handleProfilePictureChange = async (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const res = reader.result;
            if (typeof res === 'string') setProfilePicture(res);
        };
        reader.readAsDataURL(file);
        try {
            if (!user?.id) throw new Error('No user id available to save profile picture');

            // Read existing user doc to obtain previous profile picture URL (if any)
            const userDocRef = doc(db, 'users', user.id);
            const userSnap = await getDoc(userDocRef);
            const prevUrl = userSnap.exists() ? (userSnap.data() as any).profilePicture : undefined;

            // uploadProfilePicture will delete previous file if prevUrl is provided
            const downloadUrl = await uploadProfilePicture(file, user.id, prevUrl);
            await saveProfilePictureUrl(user.id, downloadUrl);
            setProfilePicture(downloadUrl);
        } catch (error) {
            console.error("Error uploading or saving profile picture:", error);
        }
    };

    // Chatbot avatar removed — assistant will use user's profile picture
    // --- End: handleInviteMember, useEffect, handleProfilePictureChange ---

    return (
        <div className="space-y-6 px-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <User className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-semibold">Settings</h1>
                        <p className="text-sm text-muted-foreground">Manage your profile, workspace preferences and assistant behaviour</p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="general">General</TabsTrigger>
                </TabsList>

                    {/* Members tab removed — replaced by richer General settings sections */}
                    {/* General Settings expanded with Privacy, Integrations, Appearance, Chatbot */}
                    <TabsContent value="general">
                        <section className="space-y-8">
                            <Card className="shadow-none border-none bg-transparent">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Workspace</CardTitle>
                                    <CardDescription>Update your workspace name and preferences.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex flex-col gap-2 max-w-md">
                                        <Label>Workspace Name</Label>
                                        <div className="rounded-md border bg-background py-2 px-3 text-sm font-medium">{workspaceName}</div>
                                        <p className="text-sm text-muted-foreground">Workspace name is managed by workspace administrators and cannot be changed here.</p>
                                    </div>
                                    <div className="flex flex-col gap-4 max-w-md mt-6">
                                        <Label htmlFor="displayName">Display Name</Label>
                                        <Input
                                            id="displayName"
                                            value={displayName}
                                            onChange={e => setDisplayName(e.target.value)}
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 max-w-md mt-6">
                                        <Label htmlFor="totalBeds">Total Beds</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="totalBeds"
                                                type="number"
                                                min={0}
                                                value={totalBedsInput}
                                                onChange={e => {
                                                    setTotalBedsInput(e.target.value);
                                                    if (bedsError) setBedsError(null);
                                                }}
                                                placeholder={isBedsLoading ? 'Loading...' : '0'}
                                                disabled={isBedsSaving || isBedsLoading}
                                            />
                                            <Button
                                                onClick={saveTotalBeds}
                                                disabled={isBedsSaving || isBedsLoading}
                                            >
                                                {isBedsSaving ? 'Saving...' : 'Save'}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Used for dashboard occupancy calculations.</p>
                                        {bedsError && <p className="text-xs text-destructive">{bedsError}</p>}
                                    </div>
                                    <div className="space-y-2 mt-4 max-w-md">
                                        <Label htmlFor="profilePicture">Profile Picture</Label>
                                        <div className="flex items-center gap-4">
                                            <Avatar>
                                                <AvatarImage src={profilePicture} alt="Profile Picture" />
                                                <AvatarFallback>PP</AvatarFallback>
                                            </Avatar>
                                            {isManager ? (
                                                <input
                                                    id="profilePicture"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => handleProfilePictureChange(e.target.files?.[0] || null)}
                                                    className="block"
                                                />
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Only workspace management can change the profile picture.</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <Button
                                            onClick={async () => {
                                                if (!user?.id) return;
                                                try {
                                                    const userDocRef = doc(db, 'users', user.id);
                                                    const payload: any = { displayName };
                                                    if (isManager) payload.profilePicture = profilePicture;
                                                    // Try to update existing doc, fall back to set with merge
                                                    try {
                                                        await updateDoc(userDocRef, payload);
                                                    } catch (err: any) {
                                                        // If the document doesn't exist yet, create/merge it
                                                        await setDoc(userDocRef, payload, { merge: true });
                                                    }

                                                    toast({ title: 'Saved', description: 'Settings updated' });
                                                } catch (error) {
                                                    console.error('Error saving settings:', error);
                                                    toast({ title: 'Error', description: 'Failed to save settings' });
                                                }
                                            }}
                                        >
                                            Save changes
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Separator />
                        </section>
                    </TabsContent>
                </Tabs>
        </div>
    );
}
