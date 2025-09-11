
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
            <p>You can view these folders by logging into your Docuflow account.</p>
            <p>Thanks,<br/>The Docuflow Team</p>
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
