
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
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Adjust the import based on your project structure
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';


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
    const [workspaceName, setWorkspaceName] = useState(workspace.name);
    const [displayName, setDisplayName] = useState<string>("");
    const [profilePicture, setProfilePicture] = useState<string>("");
    const [inviteEmail, setInviteEmail] = useState<string>("");

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
                        setProfilePicture(data.profilePicture);
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

    const handleProfilePictureChange = async (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setProfilePicture(reader.result as string);
        reader.readAsDataURL(file);
        try {
            if (!user?.id) throw new Error('No user id available to save profile picture');
            const downloadUrl = await uploadProfilePicture(file, user.id);
            await saveProfilePictureUrl(user.id, downloadUrl);
            setProfilePicture(downloadUrl);
        } catch (error) {
            console.error("Error uploading or saving profile picture:", error);
        }
    };
    // --- End: handleInviteMember, useEffect, handleProfilePictureChange ---

    return (
        <div className="flex flex-col h-full bg-muted/20">
            <main className="flex-1 p-4 sm:p-8 max-w-3xl mx-auto w-full overflow-y-auto">
                <div className="flex items-center gap-4 mb-8">
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Settings</h1>
                </div>
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="flex w-full gap-2 mb-8 bg-background p-1 rounded-lg shadow-sm">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="members">Members</TabsTrigger>
                    </TabsList>

                    {/* General Settings */}
                    <TabsContent value="general">
                        <section className="space-y-8">
                            <Card className="shadow-none border-none bg-transparent">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Workspace</CardTitle>
                                    <CardDescription>Update your workspace name and preferences.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex flex-col gap-4 max-w-md">
                                        <Label htmlFor="workspaceName">Workspace Name</Label>
                                        <Input id="workspaceName" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
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
                                    <div className="space-y-2 mt-4 max-w-md">
                                        <Label htmlFor="profilePicture">Profile Picture</Label>
                                        <div className="flex items-center gap-4">
                                            <Avatar>
                                                <AvatarImage src={profilePicture} alt="Profile Picture" />
                                                <AvatarFallback>PP</AvatarFallback>
                                            </Avatar>
                                            <input
                                                id="profilePicture"
                                                type="file"
                                                accept="image/*"
                                                onChange={e => handleProfilePictureChange(e.target.files?.[0] || null)}
                                                className="block"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <Button
                                            onClick={async () => {
                                                if (!user?.id) return;
                                                try {
                                                    const userDocRef = doc(db, "users", user.id);
                                                    const { updateDoc, setDoc } = await import("firebase/firestore");
                                                    try {
                                                        await updateDoc(userDocRef, {
                                                            displayName,
                                                            profilePicture,
                                                        });
                                                    } catch (err: any) {
                                                        const errorCode = typeof err === 'object' && err !== null && 'code' in err ? (err as any).code : undefined;
                                                        const errorMsg = typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : '';
                                                        if (errorCode === 'not-found' || (typeof errorMsg === 'string' && errorMsg.includes('No document to update'))) {
                                                            await setDoc(userDocRef, {
                                                                displayName,
                                                                profilePicture,
                                                            }, { merge: true });
                                                        } else {
                                                            throw err;
                                                        }
                                                    }
                                                    toast({
                                                        title: "Profile updated!",
                                                        description: "Your profile has been saved successfully.",
                                                    });
                                                } catch (error) {
                                                    toast({
                                                        title: "Error",
                                                        description: "There was a problem saving your profile.",
                                                    });
                                                    console.error("Error saving profile:", error);
                                                }
                                            }}
                                        >
                                            Save Profile
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                            <Separator />
                            <Card className="shadow-none border-none bg-transparent">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Notifications</CardTitle>
                                    <CardDescription>Manage how you receive notifications.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex flex-col gap-4 max-w-md">
                                        <div className="flex items-center justify-between p-0">
                                            <div>
                                                <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                                                <p className="text-sm text-muted-foreground">Receive emails about new folder access and mentions.</p>
                                            </div>
                                            <Switch id="email-notifications" defaultChecked />
                                        </div>
                                        <div className="flex items-center justify-between p-0">
                                            <div>
                                                <Label htmlFor="smart-alerts" className="font-medium">Smart Alerts</Label>
                                                <p className="text-sm text-muted-foreground">Get notified about upcoming deadlines from your documents.</p>
                                            </div>
                                            <Switch id="smart-alerts" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </TabsContent>

                    {/* Members Settings */}
                    <TabsContent value="members">
                        <section className="space-y-8">
                            <Card className="shadow-none border-none bg-transparent">
                                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">Team Members</CardTitle>
                                        <CardDescription>Manage who has access to this workspace.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            type="email"
                                            placeholder="Enter email to invite"
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            className="w-64"
                                        />
                                        <Button onClick={handleInviteMember}>Invite Member</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-4">
                                        {mockTeamMembers.map(member => (
                                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition">
                                                <div className="flex items-center gap-3">
                                                    <img src={member.avatarUrl ?? ''} alt={member.name ?? ''} className="w-10 h-10 rounded-full border" />
                                                    <div>
                                                        <p className="font-semibold">{member.name} {member.id === mockUser.id && '(You)'}</p>
                                                        <p className="text-sm text-muted-foreground">{member.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">{member.id === mockUser.id ? 'Owner' : (member as any).role}</span>
                                                    {member.id !== mockUser.id && (
                                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
