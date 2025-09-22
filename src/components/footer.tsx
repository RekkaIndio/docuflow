"use client";

import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { Twitter, Github, Linkedin } from 'lucide-react';

export function Footer() {
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
                <li><Link href="#pricing" className="hover:underline">Pricing</Link></li>
                <li>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      const url = 'https://calendly.com/jamiemasonwright/cg-360-demo';
                      try {
                        if ((window as any).Calendly && typeof (window as any).Calendly.initPopupWidget === 'function') {
                          (window as any).Calendly.initPopupWidget({ url });
                          return;
                        }

                        await new Promise<void>((resolve, reject) => {
                          const script = document.createElement('script');
                          script.src = 'https://assets.calendly.com/assets/external/widget.js';
                          script.async = true;
                          script.onload = () => resolve();
                          script.onerror = () => reject();
                          document.head.appendChild(script);
                        });

                        if ((window as any).Calendly && typeof (window as any).Calendly.initPopupWidget === 'function') {
                          (window as any).Calendly.initPopupWidget({ url });
                        } else {
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }
                      } catch (err) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }
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
                <li><Link href="/careers" className="hover:underline">Careers</Link></li>
                <li><Link href="/blog" className="hover:underline">Blog</Link></li>
                <li><Link href="/contact" className="hover:underline">Contact</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-2">Resources</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/docs" className="hover:underline">Docs</Link></li>
                <li><Link href="/help" className="hover:underline">Help Center</Link></li>
                <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
                <li><Link href="/terms" className="hover:underline">Terms</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-2">Contact</div>
              <ul className="space-y-2 text-sm">
                <li>support@cg-360.com</li>
                <li className="flex items-center gap-3 mt-2">
                  <a href="https://twitter.com" aria-label="Twitter" className="hover:text-primary"><Twitter className="w-5 h-5" /></a>
                  <a href="https://github.com" aria-label="Github" className="hover:text-primary"><Github className="w-5 h-5" /></a>
                  <a href="https://linkedin.com" aria-label="LinkedIn" className="hover:text-primary"><Linkedin className="w-5 h-5" /></a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-border/20 mt-8 pt-6 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} CG-360. All rights reserved.</div>
          <div>Registered in the UK • Data processed in accordance with applicable laws.</div>
        </div>
      </div>
    </footer>
  );
}
