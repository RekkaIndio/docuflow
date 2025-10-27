'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast({ title: 'Missing email', description: 'Please enter your email address.' });

    setLoading(true);
    try {
      const resp = await fetch('/api/auth/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await resp.json();
      if (data.ok) {
        setSent(true);
        toast({ title: 'Password reset email sent', description: `Check ${email} for instructions to reset your password.` });
      } else {
        toast({ variant: 'destructive', title: 'Failed to send reset email', description: data.error || 'Something went wrong' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to send reset email', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Logo className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="font-headline">Check your email</CardTitle>
          <CardDescription>We've sent password reset instructions to {email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to reset your password. If you don't see it, check your spam folder.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full">
              Back to sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <Logo className="w-12 h-12 text-primary" />
        </div>
        <CardTitle className="font-headline">Reset your password</CardTitle>
        <CardDescription>Enter your email address and we'll send you a link to reset your password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendReset} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}