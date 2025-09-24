"use client";

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface CalendlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
}

export function CalendlyModal({ isOpen, onClose, url = 'https://calendly.com/jamiemasonwright/cg-360-demo' }: CalendlyModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen && isClient && typeof window !== 'undefined') {
      // Load Calendly script if not already loaded
      if (!(window as any).Calendly) {
        const script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        document.head.appendChild(script);
      }

      // Set the embed URL with the current hostname
      setEmbedUrl(`${url}?embed_domain=${window.location.hostname}&embed_type=Inline`);
    }
  }, [isOpen, isClient, url]);

  if (!isClient) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">Book a Demo</DialogTitle>
        {embedUrl && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            title="Book a Demo"
            className="w-full h-full"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}