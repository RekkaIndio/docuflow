
import { Bot, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export function Hero() {
    return (
        <Card className="bg-background/30 border-2 border-blue-400/30 shadow-2xl shadow-blue-500/10 relative overflow-hidden">
            {/* Elegant SVG logo as a subtle background */}
            <div className="absolute right-2 bottom-2 md:right-6 md:bottom-6 pointer-events-none select-none opacity-30 md:opacity-20 z-0">
                <Image
                    src="/Neurodiversity_Symbol.svg"
                    alt="Neurodiversity Symbol"
                    width={90}
                    height={45}
                    className="w-24 md:w-36 h-auto"
                    style={{ filter: 'blur(0.5px) drop-shadow(0 2px 8px #3b82f6)' }}
                    priority
                />
            </div>
            <CardContent className="p-4 md:p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <Image
                                src="/Neurodiversity_Symbol.svg"
                                alt="Neurodiversity Symbol"
                                width={28}
                                height={28}
                                className="w-7 h-7 object-contain"
                                priority
                            />
                        </div>
                        <div>
                            <h3 className="font-bold font-headline">Doc - Your AI Assistant</h3>
                            <p className="text-sm text-muted-foreground">Ask me anything about your documents</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* User message */}
                    <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-sm">
                            <p>"Hey Doc, can you tell me about any contracts that need renewal this year?"</p>
                        </div>
                    </div>

                    {/* Doc's response */}
                    <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg max-w-sm">
                            <p className="font-bold text-sm mb-2">Doc is typing...</p>
                            <p className="mb-4">"I found 3 contracts requiring renewal in 2025. Let me break this down for you:"</p>
                            <div className="space-y-2 text-sm">
                                <div className="p-3 bg-background/50 rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">Microsoft Office 365</p>
                                        <p className="text-muted-foreground">Annual subscription - £15,000</p>
                                    </div>
                                    <Badge variant="outline" className="text-amber-400 border-amber-400/50">Due March 2025</Badge>
                                </div>
                                <div className="p-3 bg-background/50 rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">AWS Cloud Services</p>
                                        <p className="text-muted-foreground">3-year contract - £45,000</p>
                                    </div>
                                    <Badge variant="outline" className="text-amber-400 border-amber-400/50">Due June 2025</Badge>
                                </div>
                            </div>
                            <p className="mt-4 text-muted-foreground text-sm">Would you like me to set reminders for these renewals?</p>
                        </div>
                    </div>

                    {/* Agentic action: Grant access */}
                    <div className="flex justify-end">
                        <div className="bg-primary/90 text-primary-foreground p-3 rounded-lg max-w-sm border border-primary/40">
                            <p>"Grant access to the Finance team for Q2 reports."</p>
                        </div>
                    </div>
                    <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg max-w-sm border border-primary/20">
                            <p className="text-sm">✅ Access granted to <span className="font-semibold text-primary">Finance team</span> for <span className="font-semibold text-primary">Q2 reports</span>.</p>
                        </div>
                    </div>

                    {/* Agentic action: Send document */}
                    <div className="flex justify-end">
                        <div className="bg-primary/90 text-primary-foreground p-3 rounded-lg max-w-sm border border-primary/40">
                            <p>"Send the latest contract to Priya."</p>
                        </div>
                    </div>
                    <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg max-w-sm border border-primary/20">
                            <p className="text-sm">📄 <span className="font-semibold text-primary">Latest contract</span> sent to <span className="font-semibold text-primary">Priya</span>.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4 p-2 bg-muted rounded-lg">
                    <input
                        type="text"
                        placeholder="Type your message to Doc..."
                        className="flex-1 bg-transparent focus:outline-none text-sm placeholder:text-muted-foreground"
                    />
                     <Button size="icon">
                        <Send className="w-5 h-5"/>
                    </Button>
                </div>
                 <p className="text-xs text-center text-muted-foreground mt-2">Send a message to start the conversation</p>

            </CardContent>
        </Card>
    );
}
