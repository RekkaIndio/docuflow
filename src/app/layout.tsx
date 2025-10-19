import type { Metadata } from 'next';
import './globals.css';
// Google Analytics removed in favour of Vercel Analytics
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/hooks/use-auth';
import { ThemeProvider } from '@/components/theme-provider';
import { CalendlyProvider } from '@/context/calendly-context';
import { CookieConsentProvider } from '@/context/cookie-consent';
import { CookieBanner } from '@/components/cookie-banner';
import VercelAnalytics from '@/components/VercelAnalytics';
import { AccessibilityProfileManager } from '@/components/accessibility/adhd-focus-manager';

export const metadata: Metadata = {
  title: 'CG-360',
  description: 'Complete governance and management solution for care homes.',
  icons: {
    icon: '/Neurodiversity_Symbol.png',
    shortcut: '/Neurodiversity_Symbol.png',
    apple: '/Neurodiversity_Symbol.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/Neurodiversity_Symbol.png" type="image/png" />
        <link rel="shortcut icon" href="/Neurodiversity_Symbol.png" type="image/png" />
        <link rel="apple-touch-icon" href="/Neurodiversity_Symbol.png" />
        {/* Google Analytics will be injected client-side once the user grants consent via the cookie banner. */}
      </head>
    <body className="font-body antialiased">
      <ThemeProvider>
        <AccessibilityProfileManager />
      <AuthProvider>
        <CookieConsentProvider>
                <CalendlyProvider>
                      {children}
                  </CalendlyProvider>
                  <CookieBanner />
                  <VercelAnalytics />
        </CookieConsentProvider>
      </AuthProvider>
  <Toaster />
  </ThemeProvider>
      </body>
    </html>
  );
}
