// Email template for workspace invitation
// Usage: import and render with { inviterName, workspaceName, inviteLink, year }

export default function renderInviteEmail({ inviterName, workspaceName, inviteLink, year }: {
  inviterName: string,
  workspaceName: string,
  inviteLink: string,
  year: number
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>You're Invited to Join a Workspace</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f9f9f9; color: #222; }
          .container { background: #fff; border-radius: 8px; padding: 32px; max-width: 480px; margin: 40px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
          .button { display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 24px; }
          .footer { margin-top: 32px; font-size: 13px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>You've been invited!</h2>
          <p>Hello,</p>
          <p><b>${inviterName}</b> has invited you to join the workspace <b>${workspaceName}</b> on CG360.</p>
          <p>Click the button below to accept your invitation and get started:</p>
          <a class="button" href="${inviteLink}">Accept Invitation</a>
          <p>If you did not expect this invitation, you can safely ignore this email.</p>
          <div class="footer">
            &copy; ${year} CG360. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;
}
