'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validCode, setValidCode] = useState(false);
  const [reset, setReset] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const oobCode = searchParams?.get('oobCode');
  const email = searchParams?.get('email');

  useEffect(() => {
    if (!oobCode) {
      toast({ variant: 'destructive', title: 'Invalid reset link', description: 'This password reset link is invalid or has expired.' });
      router.push('/login');
      return;
    }

    // Verify the reset code
    verifyPasswordResetCode(auth, oobCode)
      .then(() => {
        setValidCode(true);
      })
      .catch((error) => {
        console.error('Invalid reset code:', error);
        toast({ variant: 'destructive', title: 'Invalid reset link', description: 'This password reset link is invalid or has expired.' });
        router.push('/login');
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [oobCode, router, toast]);

  const validatePassword = (p: string) => ({
    length: p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    number: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  });

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({ title: 'Missing fields', description: 'Please fill in both password fields.' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Passwords don\'t match', description: 'Please make sure both passwords are the same.' });
      return;
    }

    const checks = validatePassword(password);
    const allValid = Object.values(checks).every(Boolean);
    if (!allValid) {
      toast({ title: 'Password requirements not met', description: 'Please ensure your password meets all requirements.' });
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode!, password);
      setReset(true);
      toast({ title: 'Password reset successful', description: 'Your password has been updated. You can now sign in with your new password.' });
    } catch (error: any) {
      console.error('Password reset failed:', error);
      toast({ variant: 'destructive', title: 'Reset failed', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Logo className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="font-headline">Verifying reset link...</CardTitle>
          <CardDescription>Please wait while we verify your reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validCode) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Logo className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="font-headline">Invalid reset link</CardTitle>
          <CardDescription>This password reset link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={() => router.push('/forgot-password')} className="w-full">
              Request new reset link
            </Button>
            <Button variant="outline" onClick={() => router.push('/login')} className="w-full">
              Back to sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reset) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Logo className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="font-headline">Password reset successful</CardTitle>
          <CardDescription>Your password has been updated successfully.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              You can now sign in with your new password.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full">
              Sign in now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const checks = validatePassword(password);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <Logo className="w-12 h-12 text-primary" />
        </div>
        <CardTitle className="font-headline">Set new password</CardTitle>
        <CardDescription>Create a new password for your CG360 account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 gap-1 text-sm">
              <Requirement label="At least 8 characters" passed={checks.length} />
              <Requirement label="Uppercase letter (A-Z)" passed={checks.uppercase} />
              <Requirement label="Number (0-9)" passed={checks.number} />
              <Requirement label="Special character (!@#... )" passed={checks.special} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset password
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

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

function Requirement({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={passed ? 'text-green-600' : 'text-gray-400'} aria-hidden>
        {passed ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="6" strokeWidth={2} />
          </svg>
        )}
      </div>
      <div className={passed ? 'text-sm text-gray-700' : 'text-sm text-gray-500'}>{label}</div>
    </div>
  );
}