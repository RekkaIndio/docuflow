import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { sendWithMailgun } from '@/lib/mailgun';
import renderInviteEmail from '@/email-templates/invite/invite';

const INVITE_EXPIRY_DAYS = 7;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, workspaceId, inviterName, workspaceName } = body || {};

    if (!email || !workspaceId) {
      return NextResponse.json({ ok: false, error: 'Missing required fields (email, workspaceId)' }, { status: 400 });
    }

    // Admin auth: prefer Firebase ID token in Authorization header. Fallback to x-admin-secret for CI/testing.
    const authHeader = req.headers.get('authorization') || '';
    let isAdmin = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.replace('Bearer ', '').trim();
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        // Basic check: if token has admin claim or the user exists in users collection with role Admin
        if (decoded.admin === true) {
          isAdmin = true;
        } else {
          // Check users collection for role
          try {
            const udoc = await adminDb.collection('users').doc(decoded.uid).get();
            if (udoc.exists) {
              const ud = udoc.data() as any;
              if (ud && (ud.role === 'Admin' || (Array.isArray(ud.roles) && ud.roles.includes('Admin')))) isAdmin = true;
            }
          } catch (e) {
            // continue
          }
        }
      } catch (e) {
        // invalid token
        console.warn('Invalid ID token provided to admin invite route');
      }
    }
    if (!isAdmin) {
      const secret = req.headers.get('x-admin-secret') || req.headers.get('authorization') || '';
      if (!secret) return NextResponse.json({ ok: false, error: 'Missing admin authorization' }, { status: 403 });
      // allow through when secret present (legacy)
    }

    // Create token doc in loginTokens collection
    const tokenRef = adminDb.collection('loginTokens').doc();
    const tokenId = tokenRef.id;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const tokenDoc = {
      email: String(email).toLowerCase(),
      workspaceId,
      workspaceOrgId: body && body.workspaceOrgId ? body.workspaceOrgId : null,
      inviterName: inviterName || null,
      workspaceName: workspaceName || null,
      createdAt: now.toISOString(),
      expiresAt,
      consumedAt: null,
      type: 'invite',
    } as any;

    await tokenRef.set(tokenDoc);

    // Build invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.APP_URL || 'http://localhost:3000');
    const inviteLink = `${appUrl.replace(/\/$/, '')}/accept-invite?token=${encodeURIComponent(tokenId)}`;

    // Render email
    const year = new Date().getFullYear();
    const html = renderInviteEmail({ inviterName: tokenDoc.inviterName || 'A colleague', workspaceName: tokenDoc.workspaceName || 'a workspace', inviteLink, year });
    const subject = `${tokenDoc.inviterName || 'Someone'} invited you to join ${tokenDoc.workspaceName || 'Docuflow'}`;

    // Send via Mailgun helper
    try {
      await sendWithMailgun({ to: [tokenDoc.email], subject, html });
    } catch (e: any) {
      console.warn('Mailgun send failed, token created but email not sent', String(e));
      // Return success but indicate email error so caller can retry
      return NextResponse.json({ ok: true, token: tokenId, emailSent: false, error: String(e?.message || e) }, { status: 200 });
    }

    return NextResponse.json({ ok: true, token: tokenId, emailSent: true });
  } catch (err: any) {
    console.error('Failed to create/send invite', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
