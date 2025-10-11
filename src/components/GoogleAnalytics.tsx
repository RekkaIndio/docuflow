"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { pageview, GA_MEASUREMENT_ID } from '@/lib/gtag';
import { useCookieConsent } from '@/context/cookie-consent';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { analytics } = useCookieConsent();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    if (!analytics) return; // only send pageviews when analytics consent granted
    const page_path = `${pathname}${searchParams ? `?${searchParams.toString()}` : ''}`;
    pageview(page_path);
  }, [pathname, searchParams, analytics]);

  return null;
}
