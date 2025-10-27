// Email template for password reset
// Usage: import and render with { email, resetLink, year }

export default function renderPasswordResetEmail({ email, resetLink, year }: {
  email: string,
  resetLink: string,
  year: number
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Reset Your CG360 Password</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f9f9f9; color: #222; margin: 0; padding: 0; }
          .container { background: #fff; border-radius: 8px; padding: 32px; max-width: 480px; margin: 40px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
          .header { text-align: center; margin-bottom: 32px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; margin-bottom: 8px; }
          .button { display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 24px 0; }
          .footer { margin-top: 32px; font-size: 13px; color: #888; text-align: center; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 20px 0; font-size: 14px; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CG360</div>
            <h2>Reset Your Password</h2>
          </div>

          <p>Hello,</p>
          <p>We received a request to reset your password for your CG360 account (<strong>${email}</strong>).</p>
          <p>Click the button below to create a new password:</p>

          <div style="text-align: center;">
            <a class="button" href="${resetLink}">Reset Password</a>
          </div>

          <div class="warning">
            <strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email.
          </div>

          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; font-size: 12px; color: #666;">${resetLink}</p>

          <p>If you have any questions, please contact our support team.</p>

          <div class="footer">
            &copy; ${year} CG360. All rights reserved.<br>
            This email was sent to ${email}
          </div>
        </div>
      </body>
    </html>
  `;
}