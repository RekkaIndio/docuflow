"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function AcceptInvitePage() {
  // Read the token from the URL on the client to avoid server-side prerender
  // issues with `useSearchParams()` (which can cause a CSR bailout during
  // prerender). We keep the component as a client component and populate
  // `token` inside useEffect so this logic only runs in the browser.
  const [token, setToken] = React.useState('');
  const router = useRouter();
  const auth = useAuth();

  const [status, setStatus] = React.useState<'loading' | 'signed-in' | 'signup' | 'error' | 'idle'>('loading');
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [name, setName] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Populate token from window.location on mount (client-only)
    if (typeof window !== 'undefined') {
      try {
        const p = new URL(window.location.href).searchParams;
        const t = p.get('token') || '';
        setToken(t);
      } catch (e) {
        // ignore
      }
    }

    // If token is still empty, don't immediately mark as error — wait until
    // the effect re-runs after token state is updated to avoid a brief flash
    // of "Missing invite token" while the browser populates the value.
    if (!token) return;

    (async () => {
      try {
        const resp = await fetch('/api/auth/consume-login-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await resp.json();
        if (!data.ok) {
          setError(data.error || 'Invalid token');
          setStatus('error');
          return;
        }

        if (data.customToken) {
          // Magic link path: sign in with custom token
          if (auth?.signInWithCustomToken) {
            try {
                await auth.signInWithCustomToken(data.customToken);
                setStatus('signed-in');
                // Mark that we've just completed a magic-link sign-in so the dashboard
                // can wait briefly for workspace membership to replicate.
                try {
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem('awaitingWorkspace', '1');
                    // Persist assigned workspace id so the dashboard can deterministically
                    // select the workspace without relying solely on replication timing.
                    if (data.assignedWorkspace && data.assignedWorkspace.id) {
                      window.localStorage.setItem('assignedWorkspaceId', data.assignedWorkspace.id);
                    }
                  }
                } catch (e) {}
                // After magic-link sign-in, require user to set password for account security
                router.push('/set-password');
                return;
              } catch (e: any) {
                console.error('Failed to sign in with custom token', e);
                setError('Failed to sign in automatically. Please use the signup form.');
              }
          } else {
            setError('Sign-in method unavailable');
          }
        }

        // No customToken: show signup form prefilled with email
        if (data.email) {
          setEmail(data.email);
          setStatus('signup');
          return;
        }

        setStatus('error');
        setError('Unexpected response from server');
      } catch (e: any) {
        console.error('Failed to consume invite token', e);
        setStatus('error');
        setError(e?.message || String(e));
      }
    })();
  }, [token]);

  const handleSignup = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    try {
      if (!auth?.signUp) throw new Error('Signup not available');
      await auth.signUp(email, password, name || '');
      // After sign up, do NOT automatically send the user to the dashboard.
      // The workspace admin needs to assign the user to a workspace first.
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('awaitingWorkspace', '1');
        }
      } catch (e) {}
      // Redirect to the public landing page and show instructions.
      router.push('/');
    } catch (e: any) {
      console.error('Signup failed', e);
      setError(e?.message || String(e));
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 20 }}>
      <h1>Accept Invitation</h1>

      {(status === 'loading' || status === 'signed-in') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div aria-hidden style={{ width: 20, height: 20, borderRadius: 10, border: '3px solid #ddd', borderTopColor: '#333', animation: 'df-spin 1s linear infinite' }} />
          <p style={{ margin: 0 }}>{status === 'loading' ? 'Validating invite…' : 'Signed in — redirecting…'}</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ color: 'red' }}>{error || 'Invalid invite'}</div>
      )}

      {status === 'signup' && (
        <form onSubmit={handleSignup} style={{ display: 'grid', gap: 12 }}>
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>
            Full name
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          <button type="submit">Create account</button>
        </form>
      )}

      <style>{`@keyframes df-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
