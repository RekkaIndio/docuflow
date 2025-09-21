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
  const router = useRouter();

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password || password.length < 8) return setError('Password must be at least 8 characters');
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

  return (
    <div className="min-h-[70vh] flex items-start justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a password</CardTitle>
          <CardDescription>Create a password for your account so you can sign in without a magic link in future.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSet} className="grid gap-4">
            <Input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? 'Saving...' : 'Set password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
