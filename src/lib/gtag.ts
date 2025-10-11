import { firebaseConfig } from './firebase-config';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || firebaseConfig.measurementId || '';

type EventParams = {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
};

export function pageview(path: string) {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window === 'undefined') return;
  // ensure dataLayer and gtag fallback exist so events are queued until the script loads
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function() { window.dataLayer!.push(arguments); } as any;
  }
  const gtagFn = window.gtag as ((...args: any[]) => void) | undefined;
  if (typeof gtagFn === 'function') {
    gtagFn('event', 'page_view', { page_path: path });
  }
}

export function initGA() {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window === 'undefined') return;
  try {
    // Inject the gtag script if it's not already present
    const scriptId = `ga-gtag-${GA_MEASUREMENT_ID}`;
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      script.id = scriptId;
      document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function() { window.dataLayer!.push(arguments); } as any;
    }
    const gtagInit = window.gtag as ((...args: any[]) => void) | undefined;
    if (typeof gtagInit === 'function') {
      gtagInit('js', new Date());
      // Disable automatic page view so we control when to send it after consent
      gtagInit('config', GA_MEASUREMENT_ID, { anonymize_ip: true, send_page_view: false });
    }
    // default consent to granted when initializing explicitly
    try {
      (window as any).gtag('consent', 'update', { analytics_storage: 'granted' });
    } catch (e) {
      // ignore
    }
  } catch (err) {
    // ignore
  }
}

export function event({ action, category, label, value, ...rest }: EventParams) {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window === 'undefined' || typeof (window as any).gtag !== 'function') return;
  (window as any).gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
    ...rest,
  });
}
