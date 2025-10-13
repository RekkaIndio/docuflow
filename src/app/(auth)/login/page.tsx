'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  // Sign-in method: 'password' shows password input; 'magic' hides password input and sends a magic link.
  const [method, setMethod] = useState<'password' | 'magic'>('password');
  // Magic link sent state and resend cooldown (seconds)
  const [magicSent, setMagicSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { signIn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // If user chose magic link, send that instead of attempting password sign-in
    if (method === 'magic') {
      return await handleSendMagicLink();
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // Route based on selected role
      if (role === 'admin') {
        // set a dev cookie so middleware recognizes admin requests
        if (typeof document !== 'undefined') {
          // 1 day expiry
          document.cookie = 'isAdmin=1; Path=/; Max-Age=86400';
        }
        // existing admin page is at src/app/(protected)/admin/page.tsx which maps to /admin
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email) return toast({ title: 'Missing email', description: 'Please enter an email to send magic link.' });
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/send-magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await resp.json();
      if (data.ok) {
        toast({ title: 'Magic link sent', description: `Check ${email} for a sign-in link.` });
        setMagicSent(true);
        // start a short cooldown before allowing resends
        setCooldown(30);
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: data.error || 'Failed to send magic link' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  // Decrease cooldown every second when active and clear when finished
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
            <Logo className="w-12 h-12 text-primary" />
        </div>
        <CardTitle className="font-headline">Welcome Back to CG360</CardTitle>
        <CardDescription>Sign in to continue to your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Sign-in method selector */}
          <div className="space-y-2">
            <Label htmlFor="method">Sign in method</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={method === 'password' ? 'default' : 'ghost'}
                onClick={() => setMethod('password')}
              >
                Password
              </Button>
              <Button
                type="button"
                variant={method === 'magic' ? 'default' : 'ghost'}
                onClick={() => setMethod('magic')}
              >
                Magic link
              </Button>
            </div>
            {/* Helper text to clarify what each method does */}
            <p className="text-sm text-muted-foreground">
              {method === 'magic'
                ? "We'll email a one-time sign-in link — no password required."
                : 'Enter your password to sign in.'}
            </p>
          </div>

          {/* Only show password when using password sign-in */}
          {method === 'password' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Sign in as</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={role === 'user' ? 'default' : 'ghost'}
                onClick={() => setRole('user')}
                className="h-8 px-3 text-sm"
              >
                User
              </Button>
              <Button
                type="button"
                variant={role === 'admin' ? 'default' : 'ghost'}
                onClick={() => setRole('admin')}
                className="h-8 px-3 text-sm"
              >
                Admin / Head Office
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email || (method === 'magic' && cooldown > 0)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {method === 'password' ? 'Log In' : (cooldown > 0 ? `Resend link (${cooldown}s)` : 'Send magic link')}
          </Button>

          {/* Inline confirmation and optional resend control for magic link */}
          {method === 'magic' && magicSent && (
            <div className="mt-2 text-center text-sm text-muted-foreground">
              <p>Check {email} for a sign-in link. You can resend after the cooldown.</p>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSendMagicLink}
                  disabled={loading || cooldown > 0}
                  className="text-sm"
                >
                  Resend link
                </Button>
              </div>
            </div>
          )}
        </form>
         <div className="mt-4 text-center text-sm text-muted-foreground">
          Accounts are provisioned by CG360. Contact your onboarding representative if you need access.
        </div>
      </CardContent>
    </Card>
  );
}
