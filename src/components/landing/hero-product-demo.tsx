import { Bot, FileText } from 'lucide-react';
import Image from 'next/image';

export function HeroProductDemo() {
  return (
    <div className="relative w-full h-[600px] md:h-[700px] flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-100/10 via-pink-100/10 to-transparent rounded-3xl animate-gradient-move w-[420px] md:w-[500px] h-[600px] md:h-[700px] left-1/2 -translate-x-1/2" />
      <div className="relative z-10 w-[380px] md:w-[440px] bg-background/90 border border-primary/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-primary/10">
          <Image
            src="/Neurodiversity_Symbol.png"
            alt="Neurodiversity Symbol"
            width={20}
            height={20}
            className="w-5 h-5 object-contain"
            priority
          />
          <span className="font-semibold text-primary text-sm">CareBot AI - Policy Assistant</span>
        </div>
        {/* Chat body */}
        <div className="p-4 space-y-4">
          {/* User message */}
          <div className="flex justify-end items-end">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg max-w-[80%] text-sm shadow-md animate-fade-in-up">
              When is our Medicine Policy due for renewal?
            </div>
            <Image
              src="https://i.pravatar.cc/100?u=hero-human"
              alt="User avatar"
              width={28}
              height={28}
              className="rounded-full border-2 border-primary ml-2"
            />
          </div>
          {/* CareBot's response */}
          <div className="flex justify-start">
            <Image
              src="/Neurodiversity_Symbol.png"
              alt="Neurodiversity Symbol"
              width={20}
              height={20}
              className="w-5 h-5 object-contain mr-2 mt-1"
              priority
            />
            <div className="bg-muted px-4 py-2 rounded-lg max-w-[80%] text-sm shadow animate-fade-in-up">
              <div className="mb-2">The Medicine Policy is due for renewal on <span className="font-semibold text-primary">March 15, 2025</span> (in 2 months).</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-background/60 rounded p-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold">Medicine-Policy-v3.2.pdf</span>
                  <span className="ml-auto text-xs text-orange-600">⚠️ Due Soon</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Last reviewed: March 2024 • Next review required by CQC standards</div>
            </div>
          </div>

          {/* Search for policy */}
          <div className="flex justify-end items-end">
            <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg max-w-[80%] text-sm border border-primary/40">
              Search for the Safeguarding Policy
            </div>
            <Image
              src="https://i.pravatar.cc/100?u=hero-human"
              alt="User avatar"
              width={28}
              height={28}
              className="rounded-full border-2 border-primary ml-2"
            />
          </div>
          <div className="flex justify-start">
            <Image
              src="/Neurodiversity_Symbol.png"
              alt="Neurodiversity Symbol"
              width={20}
              height={20}
              className="w-5 h-5 object-contain mr-2 mt-1"
              priority
            />
            <div className="bg-muted px-4 py-2 rounded-lg max-w-[80%] text-sm border border-primary/20">
              <div className="mb-2">Found 3 Safeguarding documents:</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-background/60 rounded p-2">
                  <FileText className="w-4 h-4 text-green-400" />
                  <span className="font-semibold">Safeguarding-Adults-Policy.pdf</span>
                  <span className="ml-auto text-xs text-green-600">✅ Current</span>
                </div>
                <div className="flex items-center gap-2 bg-background/60 rounded p-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold">Safeguarding-Procedures.pdf</span>
                  <span className="ml-auto text-xs text-muted-foreground">Updated Dec 2024</span>
                </div>
              </div>
            </div>
          </div>

          {/* Care plan question */}
          <div className="flex justify-end items-end">
            <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg max-w-[80%] text-sm border border-primary/40">
              What are the visiting hours according to our policies?
            </div>
            <Image
              src="https://i.pravatar.cc/100?u=hero-human"
              alt="User avatar"
              width={28}
              height={28}
              className="rounded-full border-2 border-primary ml-2"
            />
          </div>
          <div className="flex justify-start">
            <Bot className="w-5 h-5 text-primary mr-2 mt-1" />
            <div className="bg-muted px-4 py-2 rounded-lg max-w-[80%] text-sm border border-primary/20">
              <div className="font-semibold text-primary mb-1">Visiting Hours Policy:</div>
              <div>• General visits: <span className="font-medium">9:00 AM - 7:00 PM daily</span></div>
              <div>• Family members: <span className="font-medium">24/7 access with prior arrangement</span></div>
              <div className="mt-1 text-xs text-muted-foreground">Source: Visitor-Policy-2024.pdf, Section 3.2</div>
            </div>
          </div>
        </div>
        {/* Chat input (disabled look) */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/20 bg-muted/40">
          <input
            type="text"
            disabled
            value="e.g., show me all care plans due for review this month"
            className="flex-1 bg-transparent text-sm text-muted-foreground outline-none cursor-not-allowed"
            readOnly
          />
          <button className="bg-primary text-primary-foreground rounded-full p-2 opacity-60 cursor-not-allowed">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
