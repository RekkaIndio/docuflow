
"use client";

import { Bot, Send, FileText, CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentCard } from '@/components/ui/document-card';
import Image from 'next/image';

export function Hero() {
    return (
        <Card className="bg-background/30 border-2 border-blue-400/30 shadow-2xl shadow-blue-500/10 relative overflow-hidden">
            {/* Elegant SVG logo as a subtle background */}
            <div className="absolute right-2 bottom-2 md:right-6 md:bottom-6 pointer-events-none select-none opacity-30 md:opacity-20 z-0">
                <Image
                    src="/Neurodiversity_Symbol.png"
                    alt="Neurodiversity Symbol"
                    width={90}
                    height={45}
                    className="w-24 md:w-36 h-auto"
                    style={{ filter: 'blur(0.5px) drop-shadow(0 2px 8px #3b82f6)' }}
                    priority
                />
            </div>
            
            {/* Header matching the CareBot design */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white rounded-t-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white/20">
                        <Image
                            src="/Neurodiversity_Symbol.png"
                            alt="Neurodiversity Symbol"
                            width={20}
                            height={20}
                            className="w-5 h-5 object-contain"
                            priority
                        />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">CareBot AI - Policy Assistant</h3>
                    </div>
                </div>
            </div>

            <CardContent className="p-4 md:p-6 relative z-10 bg-gray-50/30">
                <div className="space-y-4">
                    {/* User message */}
                    <div className="flex justify-end">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-2xl rounded-br-md max-w-sm shadow-sm">
                            <p>When is our Medicine Policy due for renewal?</p>
                        </div>
                    </div>

                    {/* AI response */}
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 p-4 rounded-2xl max-w-sm shadow-sm">
                            <p className="mb-3">The Medicine Policy is due for renewal on <span className="text-blue-600 font-semibold">March 15, 2025</span> (in 2 months).</p>
                            
                            <DocumentCard 
                                id="medicine-policy-v3-2"
                                name="Medicine-Policy-v3.2.pdf"
                                status="due-soon"
                                lastReviewed="March 2024"
                                nextReviewRequired="by CQC standards"
                            />
                        </div>
                    </div>

                    {/* Second user message */}
                    <div className="flex justify-end">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-2xl rounded-br-md max-w-sm shadow-sm">
                            <p>Search for the Safeguarding Policy</p>
                        </div>
                    </div>

                    {/* AI response with document results */}
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 p-4 rounded-2xl max-w-sm shadow-sm">
                            <p className="mb-3 font-medium">Found 3 Safeguarding documents:</p>
                            
                            <div className="space-y-2">
                                <DocumentCard 
                                    id="safeguarding-adults-policy"
                                    name="Safeguarding-Adults-Policy.pdf"
                                    status="current"
                                />
                                
                                <DocumentCard 
                                    id="safeguarding-procedures"
                                    name="Safeguarding-Procedures.pdf"
                                    status="updated"
                                    statusText="Updated Dec 2024"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Third user message */}
                    <div className="flex justify-end">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-2xl rounded-br-md max-w-sm shadow-sm">
                            <p>What are the visiting hours according to our policies?</p>
                        </div>
                    </div>

                    {/* AI response with visiting hours */}
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 p-4 rounded-2xl max-w-sm shadow-sm">
                            <div className="flex items-start gap-2 mb-3">
                                <CalendarClock className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-blue-600 mb-2">Visiting Hours Policy:</p>
                                    <ul className="space-y-1 text-sm">
                                        <li>• General visits: 9:00 AM - 7:00 PM daily</li>
                                        <li>• Family members: 24/7 access with prior arrangement</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Source: Visitor-Policy-2024.pdf, Section 3.2</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-xl">
                    <input
                        type="text"
                        placeholder="e.g., show me all care plans due for review this month"
                        className="flex-1 bg-transparent focus:outline-none text-sm placeholder:text-gray-400"
                    />
                     <Button size="icon" className="bg-blue-500 hover:bg-blue-600">
                        <Send className="w-4 h-4 text-white"/>
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
}
