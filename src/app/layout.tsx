import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/hooks/use-auth';
import { ThemeProvider } from '@/components/theme-provider';
import { CalendlyProvider } from '@/context/calendly-context';

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
      </head>
      <body className="font-body antialiased">
  <ThemeProvider>
            <AuthProvider>
                <CalendlyProvider>
                    {children}
                </CalendlyProvider>
            </AuthProvider>
            <Toaster />
  </ThemeProvider>
      </body>
    </html>
  );
}
