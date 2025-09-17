
'use client';

import { Bot, FileText, Folder, Send, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ConversationalChat() {
    return (
        <Card className="bg-background/30 border-2 border-purple-400/30 shadow-2xl shadow-purple-500/10">
            <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold font-headline">CG-360 AI</h3>
                            <p className="text-sm text-slate-700">Ask anything about your documents</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-sm flex items-start gap-2">
                             <User className="w-5 h-5 flex-shrink-0 mt-1" />
                            <p>"Which of our client contracts mention a renewal date in the next 6 months?"</p>
                        </div>
                    </div>

                    <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg max-w-sm flex items-start gap-2">
                            <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                            <div>
                                <p className="mb-3">"I've scanned all documents and found 2 contracts with renewal dates in the next 6 months:"</p>
                                
                                <div className="space-y-2 text-sm">
                                    <div className="p-3 bg-background/50 rounded-md flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-blue-400 flex-shrink-0"/>
                                        <div>
                                            <p className="font-semibold">Enterprise-ABC-Corp.pdf</p>
                                            <p className="text-xs text-slate-700">Due: March 15, 2025</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-background/50 rounded-md flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-blue-400 flex-shrink-0"/>
                                        <div>
                                            <p className="font-semibold">Startup-XYZ-Inc.pdf</p>
                                            <p className="text-xs text-slate-700">Due: May 22, 2025</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-slate-700">
                                    Source: <span className="font-medium">/Contracts/Active/</span> folder.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-2 p-1 bg-muted rounded-lg">
                    <input
                        type="text"
                        placeholder="e.g., show me all invoices over $5000 from Q2"
                        className="flex-1 bg-transparent focus:outline-none text-sm placeholder:text-slate-500 px-2"
                    />
                     <Button size="sm">
                        <Send className="w-4 h-4"/>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
