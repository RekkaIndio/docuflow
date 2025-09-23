import { NextResponse } from 'next/server';
import { sendWithMailgun } from '@/lib/mailgun';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body || {};
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const html = `
      <p><strong>From:</strong> ${String(name)} &lt;${String(email)}&gt;</p>
      <p><strong>Subject:</strong> ${String(subject)}</p>
      <hr />
      <div>${String(message).replace(/\n/g, '<br/>')}</div>
    `;

    // Send to Jamie's support address
    const to = ['jamie@cg360.co.uk'];
    const sendResp = await sendWithMailgun({ to, subject: `[Help Centre] ${String(subject)}`, html });

    return NextResponse.json({ ok: true, resp: sendResp }, { status: 200 });
  } catch (err: any) {
    console.error('Help contact send failed', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
