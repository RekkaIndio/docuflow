
'use client';

import { useState } from 'react';
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
  const { signIn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: data.error || 'Failed to send magic link' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

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
          <div className="space-y-2">
            <Label htmlFor="role">Sign in as</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={role === 'user' ? 'default' : 'ghost'}
                onClick={() => setRole('user')}
              >
                User
              </Button>
              <Button
                type="button"
                variant={role === 'admin' ? 'default' : 'ghost'}
                onClick={() => setRole('admin')}
              >
                Admin / Head Office
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log In
          </Button>
          <Button type="button" onClick={handleSendMagicLink} className="w-full mt-2" disabled={loading}>Send magic link</Button>
        </form>
         <div className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
