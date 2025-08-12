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
            src="/Neurodiversity_Symbol.svg"
            alt="Neurodiversity Symbol"
            width={20}
            height={20}
            className="w-5 h-5 object-contain"
            priority
          />
          <span className="font-semibold text-primary text-sm">Docuflow AI</span>
        </div>
        {/* Chat body */}
        <div className="p-4 space-y-4">
          {/* User message */}
          <div className="flex justify-end items-end">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg max-w-[80%] text-sm shadow-md animate-fade-in-up">
              Which of our client contracts mention a renewal date in the next 6 months?
            </div>
            <Image
              src="https://i.pravatar.cc/100?u=hero-human"
              alt="User avatar"
              width={28}
              height={28}
              className="rounded-full border-2 border-primary ml-2"
            />
          </div>
          {/* Doc's response */}
          <div className="flex justify-start">
            <Image
              src="/Neurodiversity_Symbol.svg"
              alt="Neurodiversity Symbol"
              width={20}
              height={20}
              className="w-5 h-5 object-contain mr-2 mt-1"
              priority
            />
            <div className="bg-muted px-4 py-2 rounded-lg max-w-[80%] text-sm shadow animate-fade-in-up">
              <div className="mb-2">I've scanned all documents and found 2 contracts with renewal dates in the next 6 months:</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-background/60 rounded p-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold">Enterprise-ABC-Corp.pdf</span>
                  <span className="ml-auto text-xs text-muted-foreground">Due: March 15, 2025</span>
                </div>
                <div className="flex items-center gap-2 bg-background/60 rounded p-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold">Startup-XYZ-Inc.pdf</span>
                  <span className="ml-auto text-xs text-muted-foreground">Due: May 22, 2025</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Source: <span className="font-medium">/Contracts/Active/</span> folder.</div>
            </div>
          </div>

          {/* Agentic action: Grant access */}
          <div className="flex justify-end items-end">
            <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg max-w-[80%] text-sm border border-primary/40">
              Grant access to the Finance team for Q2 reports.
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
              src="/Neurodiversity_Symbol.svg"
              alt="Neurodiversity Symbol"
              width={20}
              height={20}
              className="w-5 h-5 object-contain mr-2 mt-1"
              priority
            />
            <div className="bg-muted px-4 py-2 rounded-lg max-w-[80%] text-sm border border-primary/20">
              ✅ Access granted to <span className="font-semibold text-primary">Finance team</span> for <span className="font-semibold text-primary">Q2 reports</span>.
            </div>
          </div>

          {/* Agentic action: Send document */}
          <div className="flex justify-end items-end">
            <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg max-w-[80%] text-sm border border-primary/40">
              Send the latest contract to Priya.
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
              📄 <span className="font-semibold text-primary">Latest contract</span> sent to <span className="font-semibold text-primary">Priya</span>.
            </div>
          </div>
        </div>
        {/* Chat input (disabled look) */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/20 bg-muted/40">
          <input
            type="text"
            disabled
            value="e.g., show me all invoices over $5000 from Q2"
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
