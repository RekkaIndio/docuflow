"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, PlusCircle, Calendar } from 'lucide-react';
import DailyCheckinModal from './daily-checkin-modal';
import { doc, getDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getWorkspaceDocRef } from '@/lib/firestore';

export default function DailyCheckinTaskCard({ workspaceId }: { workspaceId: string }) {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const todayKey = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!workspaceId) return;
    let mounted = true;
    (async () => {
      try {
        const docRef = getWorkspaceDocRef(workspaceId, 'daily-checkins', todayKey, null);
        if (!docRef) {
          setCompleted(false);
          return;
        }
        const snap = await getDoc(docRef);
        if (!mounted) return;
        setCompleted(snap.exists());
      } catch (e) {
        console.error('Failed to check daily completion', e);
      }
    })();
    return () => { mounted = false; };
  }, [workspaceId, todayKey]);

  // Debug the glow/class application so we can verify the state in the console
  useEffect(() => {
    if (!cardRef.current) return;
    console.debug('DailyCheckinTaskCard: completed=', completed, 'has glow class=', cardRef.current.classList.contains('glow-red'));
  }, [completed]);

  return (
    <>
      <Card
        ref={cardRef}
        className={`relative h-full flex flex-col hover:shadow-lg transition-shadow border border-blue-200 bg-white/80 backdrop-blur-md rounded-xl ${completed === false ? 'glow-red border-l-4 border-red-500' : ''}`}
        {...(completed === false ? { 'data-pending': 'true' } : {})}
      >
        <CardHeader className="pb-2 border-b border-blue-100 bg-gradient-to-r from-blue-50/60 to-transparent rounded-t-xl">
          <div className="flex items-center justify-between">
            {completed === false && (
              <span className="absolute right-4 top-4 h-3 w-3 rounded-full bg-red-500 shadow-md animate-pulse" aria-hidden="true" />
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium text-blue-900">Daily Check-in</CardTitle>
                  {completed === false && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">Pending</span>
                  )}
                </div>
                <CardDescription className="text-xs text-muted-foreground">Complete a short daily check-in for {todayKey}</CardDescription>
              </div>
            </div>
            <div>
              {completed ? (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <Check className="h-4 w-4" />
                  Completed
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Not done</div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3 flex-1 flex flex-col justify-between">
          <div className="text-sm text-muted-foreground">A quick guided form for today's essentials</div>
          {completed === false && (
            <span className="sr-only" aria-live="polite">Daily check-in is pending</span>
          )}
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={() => setOpen(true)}>
              {completed ? 'Edit' : 'Start'}
            </Button>
          </div>
        </CardContent>
      </Card>
      {open && (
        <DailyCheckinModal workspaceId={workspaceId} open={open} onOpenChange={(v) => setOpen(v)} />
      )}
    </>
  );
}
