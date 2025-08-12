
"use client";

import { useState } from "react";
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


interface SettingsViewProps {
    workspace: Workspace;
}

const mockBillingHistory = [
    { id: 'inv-1', date: 'June 1, 2024', amount: '$49.00', status: 'Paid', link: '#' },
    { id: 'inv-2', date: 'May 1, 2024', amount: '$49.00', status: 'Paid', link: '#' },
    { id: 'inv-3', date: 'April 1, 2024', amount: '$49.00', status: 'Paid', link: '#' },
]

const mockTeamMembers = [
    mockUser,
    { id: 'user-2', name: 'Jane Doe', email: 'jane.d@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=jane', role: 'Admin' },
    { id: 'user-3', name: 'Peter Jones', email: 'peter.j@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=peter', role: 'Member' },
]


export function SettingsView({ workspace }: SettingsViewProps) {
    const [workspaceName, setWorkspaceName] = useState(workspace.name);

  return (
    <div className="flex flex-col h-full bg-muted/20">
       <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
         <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <h1 className="text-2xl font-headline font-semibold">Settings</h1>
          </div>
         <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Workspace Settings</CardTitle>
                            <CardDescription>Update your workspace name and preferences.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="space-y-2">
                                <Label htmlFor="workspaceName">Workspace Name</Label>
                                <Input id="workspaceName" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
                           </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Notifications</CardTitle>
                            <CardDescription>Manage how you receive notifications.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Receive emails about new folder access and mentions.</p>
                                </div>
                                <Switch id="email-notifications" defaultChecked />
                           </div>
                           <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label htmlFor="smart-alerts" className="font-medium">Smart Alerts</Label>
                                    <p className="text-sm text-muted-foreground">Get notified about upcoming deadlines from your documents.</p>
                                </div>
                                <Switch id="smart-alerts" />
                           </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-destructive">Delete Workspace</h3>
                                    <p className="text-sm text-muted-foreground">This will permanently delete your workspace, including all documents and teams.</p>
                                </div>
                                <Button variant="destructive">Delete Workspace</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="billing">
                 <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Plan</CardTitle>
                            <CardDescription>You are currently on the <span className="font-semibold text-primary">Professional</span> plan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                                 <div>
                                    <h3 className="font-semibold text-primary">Professional Plan</h3>
                                    <p className="text-sm text-muted-foreground">Includes up to 5,000 documents/month and API access.</p>
                                 </div>
                                 <Button variant="outline">Manage Subscription</Button>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Billing History</CardTitle>
                            <CardDescription>View and download your past invoices.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Invoice</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockBillingHistory.map(invoice => (
                                        <TableRow key={invoice.id}>
                                            <TableCell>{invoice.date}</TableCell>
                                            <TableCell>{invoice.amount}</TableCell>
                                            <TableCell>{invoice.status}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="link" asChild><a href={invoice.link}>Download</a></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="members">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Team Members</CardTitle>
                                <CardDescription>Manage who has access to this workspace.</CardDescription>
                            </div>
                            <Button>Invite Member</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {mockTeamMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src={member.avatarUrl ?? ''} alt={member.name ?? ''} className="w-10 h-10 rounded-full" />
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
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
