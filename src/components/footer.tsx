"use client";

import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { Linkedin } from 'lucide-react';
import { useCalendly } from '@/context/calendly-context';
import { useCookieConsent } from '@/context/cookie-consent';

export function Footer() {
  const { openCalendlyModal } = useCalendly();
  const { openPreferences } = useCookieConsent();

  return (
    <footer className="w-full bg-white border-t border-border/50 text-slate-700">
      <div className="container px-6 py-12 mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between gap-8">
          <div className="flex items-start gap-4">
            <Logo className="w-8 h-8 text-primary" />
            <div>
              <div className="text-lg font-semibold">CG-360</div>
              <div className="text-sm text-muted-foreground">Complete governance for care homes</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <div className="font-medium mb-2">Product</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:underline">Features</Link></li>
                <li><Link href="#compliance" className="hover:underline">Compliance</Link></li>
                <li>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openCalendlyModal();
                    }}
                    className="hover:underline text-left"
                  >
                    Demo
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-2">Company</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:underline">About</Link></li>
                <li><Link href="/contact" className="hover:underline">Contact</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-2">Resources</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/help" className="hover:underline">Help Centre</Link></li>
                <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
                <li><Link href="/terms" className="hover:underline">Terms</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-2">Contact</div>
              <ul className="space-y-2 text-sm">
                <li>support@cg360.co.uk</li>
                <li className="flex items-center gap-3 mt-2">
                  <a href="https://www.linkedin.com/company/cg-360/" aria-label="LinkedIn" className="hover:text-primary"><Linkedin className="w-5 h-5" /></a>
                </li>
              </ul>
            </div>
          </div>
        </div>

          <div className="border-t border-border/20 mt-8 pt-6 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} CG-360. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <div>Registered in the UK • Data processed in accordance with applicable laws.</div>
            <button onClick={() => openPreferences()} className="text-sm underline">Cookie preferences</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
