'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface SendFolderAccessEmailProps {
  teamName: string;
  folderNames: string[];
  workspaceName: string;
  grantedBy: string;
  recipientEmails: string[];
}

/**
 * This function sends an email notification to users when they are granted access to a folder.
 * It assumes you have the "Trigger Email" Firebase Extension installed and configured.
 * It works by creating a new document in a "mail" collection in Firestore.
 */
export async function sendFolderAccessEmail({
  teamName,
  folderNames,
  workspaceName,
  grantedBy,
  recipientEmails,
}: SendFolderAccessEmailProps): Promise<void> {
  if (recipientEmails.length === 0) {
    return;
  }

  const mailCollectionRef = collection(db, 'mail');

  const folderListHtml = folderNames.map(name => `<li><b>${name}</b></li>`).join('');

  try {
    // The "Trigger Email" extension listens for new documents in this collection.
    await addDoc(mailCollectionRef, {
      to: recipientEmails,
      message: {
        subject: `New folder access granted in ${workspaceName}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Hello,</h2>
            <p>You have been granted access to new folders as part of the <b>${teamName}</b> team in the <b>${workspaceName}</b> workspace.</p>
            <p>Access was granted by: <b>${grantedBy}</b>.</p>
            <p>You can now access the following folders:</p>
            <ul>
              ${folderListHtml}
            </ul>
            <p>You can view these folders by logging into your CG360 account.</p>
            <p>Thanks,<br/>The CG360 Team</p>
          </div>
        `,
      },
    });
  } catch (error) {
    console.error('Error creating email trigger document:', error);
    // Depending on requirements, you might want to throw this error
    // to be handled by the calling function.
    throw new Error('Failed to trigger email notification.');
  }
}

/**
 * This function sends a welcome email to new organization owners.
 * It assumes you have the "Trigger Email" Firebase Extension installed and configured.
 * It works by creating a new document in a "mail" collection in Firestore.
 */
export async function sendWelcomeEmail({
  recipientEmail,
  organisationName,
  passwordResetLink,
}: {
  recipientEmail: string;
  organisationName: string;
  passwordResetLink: string;
}): Promise<void> {
  const mailCollectionRef = collection(db, 'mail');

  try {
    // The "Trigger Email" extension listens for new documents in this collection.
    await addDoc(mailCollectionRef, {
      to: [recipientEmail],
      message: {
        subject: `Welcome to CG360 - Your ${organisationName} Organization is Ready`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Welcome to CG360!</h2>
            <p>Hello,</p>
            <p>Your organisation <b>${organisationName}</b> has been successfully set up on CG360.</p>
            <p>To get started, please set your password by clicking the link below:</p>
            <p><a href="${passwordResetLink}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">Set Your Password</a></p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>If you have any questions or need help getting started, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br/>The CG360 Team</p>
          </div>
        `,
      },
    });
  } catch (error) {
    console.error('Error creating welcome email trigger document:', error);
    // Depending on requirements, you might want to throw this error
    // to be handled by the calling function.
    throw new Error('Failed to send welcome email.');
  }
}

/**
 * This function sends an invitation email to new organization members.
 * It assumes you have the "Trigger Email" Firebase Extension installed and configured.
 * It works by creating a new document in a "mail" collection in Firestore.
 */
export async function sendInvitationEmail({
  recipientEmail,
  organisationName,
  workspaceName,
  inviterName,
  passwordResetLink,
  role,
}: {
  recipientEmail: string;
  organisationName: string;
  workspaceName?: string;
  inviterName: string;
  passwordResetLink: string;
  role: string;
}): Promise<void> {
  const mailCollectionRef = collection(db, 'mail');

  const workspaceText = workspaceName ? ` the ${workspaceName} workspace in` : '';
  const roleText = role === 'owner' ? 'Organization Owner' : role === 'admin' ? 'Administrator' : 'Member';

  try {
    // The "Trigger Email" extension listens for new documents in this collection.
    await addDoc(mailCollectionRef, {
      to: [recipientEmail],
      message: {
        subject: `You've been invited to join ${organisationName} on CG360`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>You've been invited!</h2>
            <p>Hello,</p>
            <p><b>${inviterName}</b> has invited you to join${workspaceText} the <b>${organisationName}</b> organisation on CG360 as a <b>${roleText}</b>.</p>
            <p>To accept your invitation and set up your account, please click the link below:</p>
            <p><a href="${passwordResetLink}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">Accept Invitation & Set Password</a></p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>If you were not expecting this invitation, you can safely ignore this email.</p>
            <p>Best regards,<br/>The CG360 Team</p>
          </div>
        `,
      },
    });
  } catch (error) {
    console.error('Error creating invitation email trigger document:', error);
    // Depending on requirements, you might want to throw this error
    // to be handled by the calling function.
    throw new Error('Failed to send invitation email.');
  }
}
