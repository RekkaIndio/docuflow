"use client";
import { useState } from 'react';
import Image from 'next/image';
import { Bot, User, UploadCloud, Cpu, Tag, Share2, FileText } from 'lucide-react';

const slides = [
  {
    title: 'Upload Documents Instantly',
    description: 'Drag & drop or browse to upload PDFs, Word, Excel, and more. See your files appear in real time.',
    visual: (
      <div className="relative w-full h-[340px] md:h-[420px] flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-pink-400/10 to-transparent rounded-2xl blur-sm" />
        <div className="relative z-10 w-[90%] max-w-2xl bg-background/90 border border-primary/20 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <UploadCloud className="w-12 h-12 text-primary mb-4 animate-bounce" />
          <div className="w-full h-32 border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center bg-muted/40">
            <span className="text-lg font-semibold text-primary">Drop files here</span>
            <span className="text-xs text-muted-foreground mt-1">or click to browse</span>
          </div>
          <div className="flex gap-3 mt-6">
            <div className="bg-background border border-border/30 rounded-lg px-4 py-2 text-sm font-semibold shadow">invoice.pdf</div>
            <div className="bg-background border border-border/30 rounded-lg px-4 py-2 text-sm font-semibold shadow">contract.docx</div>
            <div className="bg-background border border-border/30 rounded-lg px-4 py-2 text-sm font-semibold shadow">report.xlsx</div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: 'AI Reads & Tags Your Docs',
  description: 'Watch as CG-360 extracts key data and auto-tags your files for instant search and organisation.',
    visual: (
      <div className="relative w-full h-[340px] md:h-[420px] flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-pink-400/10 to-transparent rounded-2xl blur-sm" />
        <div className="relative z-10 w-[90%] max-w-2xl bg-background/90 border border-primary/20 rounded-2xl shadow-2xl p-8">
          <Cpu className="w-10 h-10 text-primary animate-spin-slow mb-4" />
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-background/80 border border-primary/20 rounded-lg px-4 py-3 shadow">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="font-semibold">contract.docx</span>
              <Tag className="w-5 h-5 text-green-500 ml-2" />
              <span className="text-xs text-green-600">#Legal</span>
            </div>
            <div className="flex items-center gap-3 bg-background/80 border border-primary/20 rounded-lg px-4 py-3 shadow">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="font-semibold">invoice.pdf</span>
              <Tag className="w-5 h-5 text-yellow-500 ml-2" />
              <span className="text-xs text-yellow-600">#Finance</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">AI tags: #Legal, #Finance, #HR, #Project, ...</div>
        </div>
      </div>
    )
  },
  {
  title: 'Chat with CG-360 AI',
    description: 'Ask questions, get instant summaries, and discover insights—all in a beautiful chat interface.',
    visual: (
      <div className="relative w-full h-[340px] md:h-[420px] flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-pink-400/10 to-transparent rounded-2xl blur-sm" />
        <div className="relative z-10 w-[90%] max-w-lg bg-background/90 border border-primary/20 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-semibold text-primary text-sm">CG-360 AI</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg max-w-[80%] text-sm shadow-md">Show me all contracts expiring this year</div>
              <User className="w-5 h-5 text-muted-foreground ml-2 mt-1" />
            </div>
            <div className="flex justify-start">
              <Bot className="w-5 h-5 text-primary mr-2 mt-1" />
              <div className="bg-muted px-4 py-2 rounded-lg max-w-[80%] text-sm shadow">Found 3 contracts expiring in 2025. Would you like a summary?</div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: 'Share & Collaborate Instantly',
    description: 'Share docs with your team, set permissions, and collaborate in real time. See who’s viewing and commenting.',
    visual: (
      <div className="relative w-full h-[340px] md:h-[420px] flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-pink-400/10 to-transparent rounded-2xl blur-sm" />
        <div className="relative z-10 w-[90%] max-w-2xl bg-background/90 border border-primary/20 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <Share2 className="w-10 h-10 text-primary animate-pulse mb-4" />
          <div className="flex gap-3 mb-4">
            <Image src="https://i.pravatar.cc/100?u=alex" alt="Alex" width={40} height={40} className="rounded-full border-2 border-primary" />
            <Image src="https://i.pravatar.cc/100?u=priya" alt="Priya" width={40} height={40} className="rounded-full border-2 border-primary" />
            <Image src="https://i.pravatar.cc/100?u=sam" alt="Sam" width={40} height={40} className="rounded-full border-2 border-primary" />
          </div>
          <div className="w-full h-16 bg-muted/40 rounded-lg flex items-center justify-center text-muted-foreground text-sm">Live comments, version history, and more…</div>
        </div>
      </div>
    )
  }
];

export function PlatformShowcaseCarousel() {
  const [index, setIndex] = useState(0);

  return (
    <section className="w-full py-20 md:py-32 lg:py-40 bg-background flex flex-col items-center">
      <div className="container px-4 md:px-6 flex flex-col items-center">
        <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">A Look Inside</div>
  {/* Title removed per request */}
        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed text-center mb-10">
          Explore how CG-360 transforms your workflow from upload to insight. Watch the platform in action, step by step.
        </p>
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-4xl min-h-[420px] flex flex-col items-center justify-center">
            <div className="w-full flex flex-col items-center">
          <div className="text-primary font-semibold text-xl md:text-2xl mb-2 text-center">{slides[index].title}</div>
            <div className="text-slate-700 text-base md:text-lg mb-6 text-center">{slides[index].description}</div>
              {slides[index].visual}
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`w-4 h-4 rounded-full border-2 border-primary transition-all duration-200 ${i === index ? 'bg-primary scale-125' : 'bg-background'}`}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
