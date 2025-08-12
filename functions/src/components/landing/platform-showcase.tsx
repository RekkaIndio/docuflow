
'use client';
import { useState } from 'react';
import { Bot, User, FileText, UploadCloud, Share2, Tag, Cpu } from 'lucide-react';
import Image from 'next/image';

const steps = [
  {
    title: '1. Upload Documents',
    description: 'Drag & drop or upload PDFs, Word, Excel, and more. Docuflow instantly ingests your files.',
    visual: (
      <div className="flex flex-col items-center gap-4">
        <UploadCloud className="w-10 h-10 text-primary animate-bounce" />
        <div className="flex gap-2">
          <div className="bg-muted/40 rounded-lg px-4 py-2 text-sm font-semibold">invoice.pdf</div>
          <div className="bg-muted/40 rounded-lg px-4 py-2 text-sm font-semibold">contract.docx</div>
          <div className="bg-muted/40 rounded-lg px-4 py-2 text-sm font-semibold">report.xlsx</div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Supported: PDF, DOCX, XLSX, CSV, TXT</div>
      </div>
    )
  },
  {
    title: '2. AI Extracts & Tags Data',
    description: 'Our AI engine reads your documents, extracts key data, and auto-tags them for easy search.',
    visual: (
      <div className="flex flex-col items-center gap-3">
        <Cpu className="w-10 h-10 text-primary animate-spin-slow" />
        <div className="flex gap-2">
          <div className="bg-background/80 border border-primary/30 rounded px-3 py-1 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>contract.docx</span>
            <Tag className="w-4 h-4 text-green-500 ml-2" />
            <span className="text-xs text-green-600">#Legal</span>
          </div>
          <div className="bg-background/80 border border-primary/30 rounded px-3 py-1 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>invoice.pdf</span>
            <Tag className="w-4 h-4 text-yellow-500 ml-2" />
            <span className="text-xs text-yellow-600">#Finance</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">AI tags: #Legal, #Finance, #HR, #Project, ...</div>
      </div>
    )
  },
  {
    title: '3. Chat & Get Insights',
    description: 'Ask Docuflow anything about your documents. Get instant answers, summaries, and analytics.',
    visual: (
      <div className="w-full max-w-xs mx-auto bg-background/90 border border-primary/20 rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-semibold text-primary text-xs">Docuflow AI</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-xs">Show me all contracts expiring this year</div>
            <User className="w-4 h-4 text-muted-foreground ml-1 mt-1" />
          </div>
          <div className="flex justify-start">
            <Bot className="w-4 h-4 text-primary mr-1 mt-1" />
            <div className="bg-muted px-3 py-1 rounded-lg text-xs">Found 3 contracts expiring in 2025. Would you like a summary?</div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: '4. Share & Collaborate',
    description: 'Securely share docs with your team, set permissions, and collaborate in real time.',
    visual: (
      <div className="flex flex-col items-center gap-3">
        <Share2 className="w-10 h-10 text-primary animate-pulse" />
        <div className="flex gap-2">
          <Image src="https://i.pravatar.cc/100?u=alex" alt="Alex" width={32} height={32} className="rounded-full border-2 border-primary" />
          <Image src="https://i.pravatar.cc/100?u=priya" alt="Priya" width={32} height={32} className="rounded-full border-2 border-primary" />
          <Image src="https://i.pravatar.cc/100?u=sam" alt="Sam" width={32} height={32} className="rounded-full border-2 border-primary" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Granular permissions, audit logs, and more</div>
      </div>
    )
  }
];

export function PlatformShowcase() {
  const [step, setStep] = useState(0);

  return (
    <section className="w-full py-20 md:py-32 lg:py-40 bg-background">
      <div className="container px-4 md:px-6 flex flex-col items-center">
        <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">A Look Inside</div>
        <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl text-center mb-2">See Docuflow in Action</h2>
        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed text-center mb-10">
          Explore how Docuflow transforms your workflow from upload to insight. Watch the platform in action, step by step.
        </p>
        <div className="relative w-full max-w-2xl bg-background/80 border border-border/30 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="mb-6">
            <span className="text-primary font-semibold text-lg">{steps[step].title}</span>
            <p className="text-muted-foreground text-sm mt-1">{steps[step].description}</p>
          </div>
          <div className="mb-8 min-h-[120px] flex items-center justify-center">
            {steps[step].visual}
          </div>
          <div className="flex gap-2 mt-4">
            {steps.map((_, i) => (
              <button
                key={i}
                className={`w-3 h-3 rounded-full border border-primary transition ${i === step ? 'bg-primary' : 'bg-background'}`}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
