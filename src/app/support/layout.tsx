import React from 'react';
import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/icons/logo';

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900">
      <header className="px-4 lg:px-6 h-16 flex items-center sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur-sm">
        <Link href="/" className="flex items-center justify-center gap-3">
          <Logo className="h-7 w-7 text-primary" />
          <span className="text-2xl font-extrabold font-headline tracking-tight">CG-360</span>
        </Link>
        <nav className="ml-auto hidden lg:flex gap-4 sm:gap-6 items-center">
          <Link href="/" className="text-sm font-medium hover:underline">Home</Link>
          <Link href="/contact" className="text-sm font-medium hover:underline">Contact</Link>
          <Link href="/login" className="text-sm font-medium hover:underline">Sign In</Link>
        </nav>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">{children}</main>

      <Footer />
    </div>
  );
}
