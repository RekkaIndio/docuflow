"use client";

import React from 'react';
import { auth } from '@/lib/firebase';
import { updatePassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SetPasswordPage() {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const router = useRouter();

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Validate password meets requirements
    const checks = validatePassword(password);
    const allValid = Object.values(checks).every(Boolean);
    if (!allValid) return setError('Password does not meet security requirements');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');
      await updatePassword(user, password);
      // Optionally mark user doc as passwordSet: true via API
      router.push('/');
    } catch (e: any) {
      console.error('Failed to set password', e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (p: string) => ({
    length: p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    number: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  });

  const checks = validatePassword(password);

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a password</CardTitle>
          <CardDescription>Create a password for your account so you can sign in without a magic link in future.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSet} className="grid gap-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="pr-10"
                aria-describedby="password-requirements"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-5.523 0-10-4.477-10-10a9.96 9.96 0 0 1 1.175-4.125M21 21l-4.35-4.35" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            <div id="password-requirements" className="grid grid-cols-1 gap-1 text-sm">
              <Requirement label="At least 8 characters" passed={checks.length} />
              <Requirement label="Uppercase letter (A-Z)" passed={checks.uppercase} />
              <Requirement label="Number (0-9)" passed={checks.number} />
              <Requirement label="Special character (!@#... )" passed={checks.special} />
            </div>

            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(s => !s)}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirm ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-5.523 0-10-4.477-10-10a9.96 9.96 0 0 1 1.175-4.125M21 21l-4.35-4.35" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700" aria-disabled={loading || password !== confirm}>
                {loading ? 'Saving...' : 'Set password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
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
