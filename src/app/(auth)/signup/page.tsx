"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mb-4 flex items-center justify-center">
          <Logo className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="font-headline">Account provisioning handled by Docuflow</CardTitle>
        <CardDescription>We create tenant workspaces and user accounts for you — self sign-up is no longer required.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          If your organisation is onboarding with Docuflow, our implementation team will provision your workspace, invite your team, and email sign-in instructions once everything is ready.
        </p>
        <p>
          Already expecting access? Check your inbox for a password setup link or reach out to your Docuflow representative for support.
        </p>
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/login">Return to login</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
