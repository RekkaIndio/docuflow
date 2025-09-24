export default function renderActionPlanAssignmentEmail({ monthKey, assignedBy, itemsSummaryHtml, loginToken, recipientEmail, workspaceId }: { monthKey: string; assignedBy: string; itemsSummaryHtml: string; loginToken?: string | null; recipientEmail?: string | null; workspaceId?: string | null }) {
  const subject = `You have been assigned action items for ${monthKey}`;

  const appUrl = process.env.APP_URL || 'http://localhost:9002/';
  // Always include the recipient email in the link so the client can filter by email
  // even if token creation failed. Include loginToken when available for auto sign-in.
  const workspaceParam = workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : '';
  const baseUrl = `${appUrl}/action-plans?monthKey=${encodeURIComponent(monthKey)}&email=${encodeURIComponent(recipientEmail || '')}&onlyAssigned=1${workspaceParam}`;
  const loginUrl = loginToken ? `${appUrl}/action-plans?loginToken=${encodeURIComponent(loginToken)}&email=${encodeURIComponent(recipientEmail || '')}&monthKey=${encodeURIComponent(monthKey)}&onlyAssigned=1${workspaceParam}` : baseUrl;

  // Use the hosted SVG as a reliable external source, but attempt to inline the project's PNG
  // when running server-side so the image renders even if external fetching is blocked.
  const hostedLogo = 'https://docuflow.ai/assets/Neurodiversity_Symbol.png';

  let inlineLogoDataUri: string | null = null;
  try {
    if (typeof window === 'undefined') {
      // Server-side: try to read the local PNG and convert to base64 data URI
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const p = path.join(process.cwd(), 'src', 'assets', 'Neurodiversity_Symbol.png');
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        inlineLogoDataUri = 'data:image/png;base64,' + buf.toString('base64');
      }
    }
  } catch (e) {
    inlineLogoDataUri = null;
  }

  const logoUrl = inlineLogoDataUri || hostedLogo;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color:#111;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background:#f6f9fc; padding:28px 16px; text-align:center;">
            <img src="${logoUrl}" alt="CG-360" width="160" style="max-width:160px; height:auto; display:block; margin:0 auto 8px;" />
            <div style="font-size:13px; color:#6b7280;">Action Plan Assignment</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px; background:#ffffff;">
            <h2 style="margin:0 0 12px; font-size:20px; color:#0f172a;">You have new action items for ${monthKey}</h2>
            <p style="margin:0 0 8px; color:#334155;">Assigned by <strong>${assignedBy}</strong>.</p>
            <p style="margin:0 0 18px; color:#334155;">Please review and complete the actions assigned to you. Only the items that are assigned to your account will be shown when you use the button below.</p>

            <div style="margin:18px 0;">
              <a href="${loginUrl}" style="background:#2563eb; color:#fff; text-decoration:none; padding:12px 18px; border-radius:8px; display:inline-block; font-weight:600;">Open your assigned actions</a>
            </div>

            <div style="border-top:1px solid #eef2ff; padding-top:14px;">
              <h3 style="font-size:15px; margin:0 0 8px; color:#0f172a;">Assigned items</h3>
              <div style="color:#334155; font-size:14px;">
                ${itemsSummaryHtml}
              </div>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:16px; text-align:center; font-size:12px; color:#94a3b8;">
            <div>Thank you — CG360</div>
            <div style="margin-top:6px;">If you did not expect this email, you can ignore it.</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, html };
}
