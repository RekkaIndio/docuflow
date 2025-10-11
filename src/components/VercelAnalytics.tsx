"use client";

import dynamic from 'next/dynamic';
import { useCookieConsent } from '@/context/cookie-consent';

// Dynamically import the Analytics component so it only loads on the client
const Analytics = dynamic(() => import('@vercel/analytics/next').then((m) => m.Analytics), { ssr: false });

export default function VercelAnalytics() {
  const { analytics } = useCookieConsent();
  if (!analytics) return null;
  return <Analytics />;
}
