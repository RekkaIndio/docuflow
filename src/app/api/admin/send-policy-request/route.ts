import { NextRequest, NextResponse } from 'next/server';

// This API route sends a policy request email to support.
// It uses Firebase's Trigger Email extension by adding to the 'mail' collection.

export async function POST(req: NextRequest) {
  try {
    // Import firebase-admin dynamically since this is an Edge runtime route
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin');

    if (!admin.apps.length) {
      try {
        if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
          const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
          admin.initializeApp({ credential: admin.credential.cert(creds) });
        } else {
          admin.initializeApp();
        }
      } catch (e) {
        console.warn('Failed to initialize firebase-admin in send-policy-request:', e?.toString?.() ?? e);
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
    }

    const db = admin.firestore();
    const mailCollectionRef = db.collection('mail');

    const body = await req.json();
    const { title, description, urgency, additionalNotes, requestedBy, organisationId } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    // Get support email from environment or use a default
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@docuflow.com';

    const urgencyEmoji = urgency === 'urgent' ? '🚨' : urgency === 'high' ? '⚠️' : '📋';
    const urgencyText = urgency === 'urgent' ? 'URGENT' : urgency === 'high' ? 'High Priority' : 'Normal Priority';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${urgencyEmoji} New Policy Request</h2>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">Policy Details</h3>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Priority:</strong> ${urgencyText}</p>
          <p><strong>Requested by:</strong> ${requestedBy || 'Unknown'}</p>
          <p><strong>Organisation ID:</strong> ${organisationId || 'N/A'}</p>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">Description</h3>
          <p style="white-space: pre-wrap;">${description}</p>
        </div>

        ${additionalNotes ? `
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">Additional Notes</h3>
          <p style="white-space: pre-wrap;">${additionalNotes}</p>
        </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 14px;">
            This request was submitted through the DocuFlow admin panel.
          </p>
        </div>
      </div>
    `;

    await mailCollectionRef.add({
      to: [supportEmail],
      message: {
        subject: `${urgencyEmoji} Policy Request: ${title}`,
        html: htmlContent,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending policy request email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}