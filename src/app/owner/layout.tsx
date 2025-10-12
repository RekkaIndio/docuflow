"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [ownerStatus, setOwnerStatus] = React.useState<'unknown' | 'allowed' | 'denied'>('unknown');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setOwnerStatus('unknown');
        return;
      }
      try {
        const token = await auth.currentUser?.getIdToken(true);
        if (!token) {
          if (!cancelled) setOwnerStatus('unknown');
          return;
        }
        const resp = await fetch('/api/admin/verify', {
          headers: { authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!resp.ok) {
          setOwnerStatus('denied');
          return;
        }
        const data = await resp.json();
        setOwnerStatus(data?.isOwner ? 'allowed' : 'denied');
      } catch (err) {
        console.warn('[owner layout] owner verification failed', err);
        if (!cancelled) setOwnerStatus('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (ownerStatus === 'denied') {
      router.replace('/');
    }
  }, [user, ownerStatus, loading, router]);

  if (loading || !user || ownerStatus !== 'allowed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading owner console…</span>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const authedUser = user!;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">CG360 owner</p>
            <h1 className="text-lg font-semibold text-slate-800">Platform Control Centre</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-700">{authedUser.name || 'Owner'}</div>
              <div className="text-xs text-slate-500">{authedUser.email}</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
