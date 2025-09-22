export default function renderSharedDocumentEmail(vars: { sharerName?: string; teamName?: string; documentName?: string; documentUrl?: string; message?: string; year?: number }) {
  const { sharerName = 'A colleague', teamName = 'team', documentName = 'a document', documentUrl = '#', message = '', year = new Date().getFullYear() } = vars || {};
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Document shared</title>
  </head>
  <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #111;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 8px 0;">${sharerName} shared a document with ${teamName}</h2>
      <p style="margin:0 0 12px 0;">Hi ${teamName},</p>
      <p style="margin:0 0 12px 0;">${sharerName} has shared <strong>${documentName}</strong> with your team.</p>
      ${message ? `<p style="margin:0 0 12px 0;">${message}</p>` : ''}
      <p style="margin:0 0 12px 0;"><a href="${documentUrl}">Open ${documentName}</a></p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
      <p style="font-size:12px;color:#666;margin:0;">&copy; ${year} CG360</p>
    </div>
  </body>
</html>`;
}
