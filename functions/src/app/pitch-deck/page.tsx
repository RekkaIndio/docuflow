"use client";

import { useState } from "react";
import { Logo } from "@/components/icons/logo";
import { Button } from "@/components/ui/button";

export default function PitchDeck() {
  const [page, setPage] = useState(0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#0f1021]">
      {/* Animated gradient blobs background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 opacity-30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute right-1/4 bottom-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-indigo-500 opacity-20 rounded-full blur-2xl animate-pulse-slower" />
      </div>
      {/* Card with glow */}
      <div className="z-10 flex flex-col items-center justify-center max-w-2xl w-full bg-white/90 rounded-3xl shadow-2xl p-12 text-center border border-border/30 relative animate-fade-in">
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-purple-400/40 to-blue-400/30 blur-2xl opacity-60 -z-10" />
        {page === 0 && (
          <>
            <Logo className="h-20 w-20 mx-auto mb-8 text-primary drop-shadow-xl animate-fade-in-up" />
            <h1 className="text-5xl md:text-6xl font-extrabold font-headline mb-4 tracking-tight bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 bg-clip-text text-transparent animate-gradient-x">
              Docuflow
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-muted-foreground animate-fade-in-up delay-100">
              AI-Powered Document Intelligence
            </h2>
            <p className="text-lg md:text-xl mb-10 text-muted-foreground animate-fade-in-up delay-200">
              Unlock the full potential of your documents with seamless AI-driven search, chat, and workflow automation.
            </p>
            <Button size="lg" className="text-lg font-semibold px-8 py-4 shadow-md bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 animate-bounce-once" onClick={() => setPage(1)}>
              Get Started
            </Button>
          </>
        )}
        {page === 1 && (
          <>
            {/* Decorative background pattern for depth */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
              <svg width="100%" height="100%" className="opacity-10" style={{position:'absolute',top:0,left:0}}>
                <defs>
                  <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="2" fill="#a21caf" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>
            </div>
            <div className="flex flex-col items-center animate-fade-in-up relative w-full">
              <div className="mb-6 animate-fade-in-up">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mx-auto animate-bounce-once">
                  <circle cx="28" cy="28" r="28" fill="#f472b6" fillOpacity="0.15" />
                  <path d="M18 36c0-4.418 7.163-8 16-8" stroke="#a21caf" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="20" cy="24" r="3" fill="#a21caf" />
                  <circle cx="28" cy="22" r="3" fill="#a21caf" />
                  <circle cx="36" cy="24" r="3" fill="#a21caf" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-headline mb-4 tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-gradient-x relative">
                <span className="inline-block animate-shimmer bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">The Problem</span>
                <span className="absolute left-1/2 -translate-x-1/2 bottom-[-8px] w-16 h-1 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-full blur-sm opacity-70 animate-fade-in-up delay-200" />
              </h1>
              <p className="text-lg md:text-xl mb-8 text-muted-foreground animate-fade-in-up delay-100 max-w-2xl">
                Modern organizations are drowning in documents—PDFs, contracts, reports, and more. Valuable information is locked away, hard to find, and even harder to use. The result? Lost productivity, missed opportunities, and frustrated teams.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mb-10">
                <div className="bg-white/95 rounded-2xl shadow-xl p-6 flex flex-col items-center border border-pink-200 animate-fade-in-up delay-200 hover:scale-105 transition-transform duration-300">
                  <span className="text-pink-500 text-4xl mb-3">🔍</span>
                  <h3 className="font-bold text-lg mb-2 text-pink-700">Wasted Time</h3>
                  <p className="text-sm text-muted-foreground text-center">Employees spend up to 20% of their time searching for information buried in documents, emails, and folders.</p>
                </div>
                <div className="bg-white/95 rounded-2xl shadow-xl p-6 flex flex-col items-center border border-purple-200 animate-fade-in-up delay-300 hover:scale-105 transition-transform duration-300">
                  <span className="text-purple-500 text-4xl mb-3">⌨️</span>
                  <h3 className="font-bold text-lg mb-2 text-purple-700">Manual Work</h3>
                  <p className="text-sm text-muted-foreground text-center">Manual data entry and extraction is slow, error-prone, and demotivating—leading to costly mistakes and burnout.</p>
                </div>
                <div className="bg-white/95 rounded-2xl shadow-xl p-6 flex flex-col items-center border border-indigo-200 animate-fade-in-up delay-400 hover:scale-105 transition-transform duration-300">
                  <span className="text-indigo-500 text-4xl mb-3">🚫</span>
                  <h3 className="font-bold text-lg mb-2 text-indigo-700">Missed Insights</h3>
                  <p className="text-sm text-muted-foreground text-center">Critical insights are missed, collaboration suffers, and business decisions are made with incomplete information.</p>
                </div>
              </div>
              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-6">
                <span className="w-3 h-3 rounded-full bg-purple-400 opacity-60" />
                <span className="w-3 h-3 rounded-full bg-pink-500 shadow-lg" />
                <span className="w-3 h-3 rounded-full bg-gray-300 opacity-30" />
                <span className="w-3 h-3 rounded-full bg-gray-300 opacity-30" />
              </div>
              <div className="flex justify-between w-full max-w-xs mx-auto mt-4">
                <Button variant="outline" size="lg" className="font-semibold px-6 py-3 transition-transform duration-150 hover:scale-105" onClick={() => setPage(0)}>
                  Previous
                </Button>
                <Button size="lg" className="font-semibold px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 hover:scale-105 shadow-lg" onClick={() => setPage(2)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Optional: Scroll down indicator only on cover page */}
      {page === 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-purple-400 opacity-70">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}
      {/* Animations (add to globals.css or tailwind config if not present) */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in { animation: fade-in 1s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-up { animation: fade-in 1.2s cubic-bezier(.4,0,.2,1) both; }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 4s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.35; }
        }
        .animate-pulse-slower { animation: pulse-slower 10s ease-in-out infinite; }
        @keyframes bounce-once {
          0% { transform: translateY(0); }
          20% { transform: translateY(-10px); }
          40% { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
        .animate-bounce-once { animation: bounce-once 1s 1; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background-size: 400% 100%;
          animation: shimmer 2.5s linear infinite;
        }
        .delay-100 { animation-delay: 0.1s !important; }
        .delay-200 { animation-delay: 0.2s !important; }
        .delay-300 { animation-delay: 0.3s !important; }
        .delay-400 { animation-delay: 0.4s !important; }
      `}</style>
    </div>
  );
}
