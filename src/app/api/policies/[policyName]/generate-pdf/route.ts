import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ policyName: string }> }
) {
  try {
  const { content, meta, workspaceId } = await request.json();
    const resolvedParams = await params;
    const policyName = resolvedParams.policyName;
    
    // Sanitize the policy name to prevent directory traversal
    const sanitizedName = policyName.replace(/[^a-zA-Z0-9-_]/g, '');

    // Import the required modules dynamically
    // @ts-ignore - marked types may not be available
    const { marked } = await import('marked');
    const puppeteer = await import('puppeteer');

    // Convert markdown to HTML
    const htmlBody = marked.parse(content);

    // Load the HTML template
    const templatePath = path.join(process.cwd(), 'scripts', 'policy-template.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    // Inline logo image from assets if available
    const logoPath = path.join(process.cwd(), 'src', 'assets', 'Neurodiversity_Symbol.png');
    let logoDataUri = '';
    try {
      const img = fs.readFileSync(logoPath);
      const b64 = img.toString('base64');
      logoDataUri = `data:image/png;base64,${b64}`;
    } catch (e) {
      // Check public directory as fallback
      try {
  const publicLogoPath = path.join(process.cwd(), 'public', 'Neurodiversity_Symbol.png');
        const svgContent = fs.readFileSync(publicLogoPath, 'utf8');
        logoDataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
      } catch (e2) {
        logoDataUri = '';
      }
    }

    // Replace template placeholders
    template = template.replace('{{logo}}', logoDataUri);
    template = template.replace('{{title}}', meta.title || sanitizedName.replace(/-/g, ' '));
    template = template.replace('{{version}}', meta.version || '1.0');
    template = template.replace('{{effectiveDate}}', meta.effectiveDate || '');
    template = template.replace('{{reviewDate}}', meta.reviewDate || '');

    const html = template.replace('{{content}}', htmlBody);

    // Attempt to generate PDF using Puppeteer. If this fails (for example on serverless
    // production where puppeteer can't launch or file writes are not permitted), we will
    // gracefully fall back to still saving the published policy metadata to Firestore and
    // returning a JSON success so the admin UI can treat the policy as published.
    let pdfBuffer: Buffer | null = null;
    let attemptedPdf = false;

    try {
      attemptedPdf = true;
      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm',
          },
        });

        // Save the PDF to public/policies directory (replacing the original)
        const publicPoliciesDir = path.join(process.cwd(), 'public', 'policies');
        try {
          await fs.promises.mkdir(publicPoliciesDir, { recursive: true });
          const pdfPath = path.join(publicPoliciesDir, `${sanitizedName}.pdf`);
          await fs.promises.writeFile(pdfPath, pdfBuffer);
        } catch (writeErr) {
          // Writing to filesystem may fail on some hosting environments (e.g., Vercel). Log and continue.
          console.warn('Failed to write generated PDF to public/policies, continuing without file write:', writeErr);
        }
      } finally {
        try { await browser.close(); } catch (closeErr) { /* ignore */ }
      }
    } catch (puppeteerErr) {
      // If puppeteer fails (cannot launch in production), log and continue to publish metadata only.
      console.warn('Puppeteer PDF generation failed, will publish metadata without PDF:', puppeteerErr);
      pdfBuffer = null;
    }

    // Save the published policy to Firebase
      const timestamp = new Date().toISOString();
        // Use deterministic id per policy so repeated publishes update same doc
        const documentId = sanitizedName;

      const publishedPolicyDocument = {
  id: documentId,
        policyName: sanitizedName,
        originalPolicyName: policyName,
        content: content,
        meta: meta || {},
        createdAt: timestamp,
        updatedAt: timestamp,
        status: 'published',
        version: meta?.version || '1.0',
        pdfPath: `/policies/${sanitizedName}.pdf`,
        storagePath: undefined as string | undefined
      };

      // Workspace-scoped published document shape including extractedJson
      const workspacePublishedDocument = {
  id: documentId,
        policyName: sanitizedName,
        originalPolicyName: policyName,
        content: content,
        meta: meta || {},
        extractedJson: {
          content: content || '',
          title: meta?.title || sanitizedName.replace(/[-_]/g, ' '),
          effectiveDate: meta?.effectiveDate || null,
          reviewDate: meta?.reviewDate || null,
          version: meta?.version || '1.0',
          appliesTo: meta?.appliesTo || null,
          type: 'policy'
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        status: 'published',
        version: meta?.version || '1.0',
        pdfPath: `/policies/${sanitizedName}.pdf`,
        storagePath: undefined as string | undefined
      };

    try {
  // Use set with merge so repeated publishes update the same document
  await adminDb.collection('published_policies').doc(documentId).set(publishedPolicyDocument, { merge: true });
        console.log('Policy saved to Firebase as published');
      } catch (firebaseError) {
        console.error('Failed to save to published_policies (legacy):', firebaseError);
      }

      if (workspaceId) {
        try {
          await adminDb.collection('workspaces').doc(workspaceId).collection('policies').doc(documentId).set(workspacePublishedDocument, { merge: true });
          console.log(`Saved published policy to workspaces/${workspaceId}/policies/${documentId}`);
        } catch (e) {
          console.error('Failed to write published workspace-scoped policy document:', e);
        }
      }

      // Optionally save the filled policy markdown for future reference and update local template.
      // In production environments where policies are stored in Firebase, we generally don't want to
      // persist local copies (which may end up in git). Control this behavior with an env flag
      // SAVE_POLICIES_LOCALLY. Set to 'true' to keep existing behavior.
      const saveLocally = String(process.env.SAVE_POLICIES_LOCALLY || 'false').toLowerCase() === 'true';

      if (saveLocally) {
        const filledPoliciesDir = path.join(process.cwd(), 'src', 'policies', 'filled');
        await fs.promises.mkdir(filledPoliciesDir, { recursive: true });
        
        const localTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filledMdPath = path.join(filledPoliciesDir, `${sanitizedName}-${localTimestamp}.md`);
        
        // Reconstruct the markdown with filled frontmatter
        let fullContent = '';
        if (meta && Object.keys(meta).length > 0) {
          fullContent += '---\n';
          Object.entries(meta).forEach(([key, value]) => {
            fullContent += `${key}: "${value}"\n`;
          });
          fullContent += '---\n\n';
        }
        fullContent += content;
        
        await fs.promises.writeFile(filledMdPath, fullContent, 'utf8');

        // Update the original policy template with filled metadata if present
        const originalMdPath = path.join(process.cwd(), 'src', 'policies', `${sanitizedName}.md`);
        if (fs.existsSync(originalMdPath)) {
          try {
            // Read the original file
            const originalContent = fs.readFileSync(originalMdPath, 'utf8');
            
            // Parse and update frontmatter
            let matter: any = null;
            try {
              matter = (await import('gray-matter')).default;
            } catch (e) {
              // If gray-matter is not available, do manual frontmatter replacement
              matter = null;
            }

            if (matter) {
              const parsed = matter(originalContent);
              // Update metadata with filled values
              Object.assign(parsed.data, meta);
              
              // Reconstruct the file with updated frontmatter
              const updatedContent = matter.stringify(parsed.content, parsed.data);
              fs.writeFileSync(originalMdPath, updatedContent, 'utf8');
            }
          } catch (e) {
            console.warn('Failed to update original policy metadata:', e);
          }
        }
      } else {
        console.log('Skipping local policy markdown save (SAVE_POLICIES_LOCALLY != true)');
      }

      // Refresh the policies cache so updated metadata appears immediately
      try {
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002'}/api/policies/refresh-cache`, {
          method: 'POST',
        });
        if (!refreshResponse.ok) {
          console.warn('Failed to refresh policies cache');
        }
      } catch (e) {
        console.warn('Failed to refresh policies cache:', e);
      }

  let pdfUrl: string | null = null;
  let storagePath: string | null = null;

      if (pdfBuffer) {
        // If admin.storage is available, upload to configured bucket and attempt to create a signed URL
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const admin = require('@/lib/firebase-admin').default;
          if (admin && admin.storage && typeof admin.storage === 'function') {
            let bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
            if (!bucketName) {
              try {
                // Load web config fallback if present in repository
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const cfg = require('@/lib/firebase-config');
                bucketName = cfg?.firebaseConfig?.storageBucket || bucketName;
              } catch (e) {
                // ignore if not present
              }
            }

            const bucket = bucketName ? admin.storage().bucket(bucketName) : admin.storage().bucket();

            storagePath = `workspaces/${workspaceId || 'global'}/policies/${sanitizedName}.pdf`;
            const file = bucket.file(storagePath);

            // Upload buffer
            try {
              await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
            } catch (uploadErr) {
              console.warn('Failed to upload PDF to Firebase Storage:', uploadErr);
            }

            // Try to create a signed URL valid for 7 days. Retry once if it fails.
            try {
              const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
              pdfUrl = signedUrl;
            } catch (urlErr) {
              console.warn('Failed to create signed URL for uploaded PDF (attempt 1):', urlErr);
              try {
                const [signedUrl2] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
                pdfUrl = signedUrl2;
              } catch (urlErr2) {
                console.warn('Failed to create signed URL for uploaded PDF (attempt 2):', urlErr2);
                // Fall back to the gs:// path so we at least persist storagePath; client code will request a signed URL from the server when needed
                pdfUrl = `gs://${bucket.name}/${storagePath}`;
              }
            }
          }
        } catch (storageErr) {
          console.warn('Storage admin SDK unavailable or errored while uploading PDF:', storageErr);
        }
      } else {
        // No pdfBuffer was generated (Puppeteer failed). If a previously uploaded file exists at the deterministic storage path,
        // attempt to generate a signed URL for it so the client can preview the existing file.
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const admin = require('@/lib/firebase-admin').default;
          if (admin && admin.storage && typeof admin.storage === 'function') {
            let bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
            if (!bucketName) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const cfg = require('@/lib/firebase-config');
                bucketName = cfg?.firebaseConfig?.storageBucket || bucketName;
              } catch (e) {
                // ignore
              }
            }

            const bucket = bucketName ? admin.storage().bucket(bucketName) : admin.storage().bucket();
            storagePath = `workspaces/${workspaceId || 'global'}/policies/${sanitizedName}.pdf`;
            const file = bucket.file(storagePath);
            try {
              const [exists] = await file.exists();
              if (exists) {
                try {
                  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
                  pdfUrl = signedUrl;
                } catch (urlErr) {
                  console.warn('Failed to create signed URL for existing PDF:', urlErr);
                }
              }
            } catch (existsErr) {
              // ignore
            }
          }
        } catch (err) {
          // ignore
        }
      }

      // If pdfUrl is available, set pdfPath on the documents to the signed URL; otherwise fall back to previous path
      const finalPdfPath = pdfUrl || `/policies/${sanitizedName}.pdf`;

      // Update the saved objects with this final path and storagePath if available
      publishedPolicyDocument.pdfPath = finalPdfPath;
      workspacePublishedDocument.pdfPath = finalPdfPath;
      if (storagePath) {
        publishedPolicyDocument.storagePath = storagePath;
        workspacePublishedDocument.storagePath = storagePath;
      }

      // Persist any updated pdfPath/storagePath back to Firestore for the created documents
      try {
        // Use set with merge to avoid errors if the document wasn't created or if there
        // are eventual consistency issues. This will create or merge fields safely.
        // Persist the full published policy document (including content/meta). Ensure the
        // global `published_policies` collection contains the same structured JSON so
        // all workspaces can access it.
        const finalPublishedDoc = {
          ...publishedPolicyDocument,
          // If extractedJson was constructed for the workspace, include it here as well
          extractedJson: workspacePublishedDocument.extractedJson || null,
          updatedAt: new Date().toISOString(),
        };
        await adminDb.collection('published_policies').doc(documentId).set(finalPublishedDoc, { merge: true });
      } catch (updateErr) {
        console.warn('Failed to set published_policies with storage path/pdfPath:', updateErr);
      }

      let workspaceDocSaved: boolean | null = null;
      if (workspaceId) {
        try {
          // Persist the full workspace-scoped document so clients and the chat can read the
          // full policy content (content, meta, extractedJson) even if earlier writes failed.
          const finalWorkspaceDoc = {
            ...workspacePublishedDocument,
            updatedAt: new Date().toISOString(),
          };

          const docRef = adminDb.collection('workspaces').doc(workspaceId).collection('policies').doc(documentId);

          // Write once then verify by reading back. Retry one more time if verification fails.
          try {
            await docRef.set(finalWorkspaceDoc, { merge: true });
          } catch (writeErr) {
            console.warn('Failed initial write of workspace-scoped policy document:', writeErr);
          }

          // Verify the written document contains extractedJson with content
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const snap = await docRef.get();
              const data = snap.exists ? snap.data() : null;
              if (data && data.extractedJson && (data.extractedJson.content || '').length > 10) {
                workspaceDocSaved = true;
                break;
              }
              // Retry writing once if verification failed
              if (attempt === 0) {
                try { await docRef.set(finalWorkspaceDoc, { merge: true }); } catch (e) { /* ignore */ }
              }
            } catch (readErr) {
              console.warn('Failed to read workspace doc during verification attempt', attempt, readErr);
            }
          }

          if (workspaceDocSaved !== true) {
            workspaceDocSaved = false;
            console.warn(`Workspace document verification failed for workspaces/${workspaceId}/policies/${documentId}`);
          }
        } catch (updateErr) {
          workspaceDocSaved = false;
          console.warn('Failed to set workspace-scoped policy document with storage path/pdfPath:', updateErr);
        }
      }

      // Return actual PDF if available; otherwise send JSON success with X-Policy-Updated header and storage URL when available
      // If workspaceId was provided, include a header pointing to the workspace policy path so the client can confirm the saved JSON
      const workspacePolicyPathHeader = workspaceId ? `/workspaces/${workspaceId}/policies/${documentId}` : null;

      if (pdfBuffer) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${sanitizedName}.pdf"`,
          'X-Policy-Updated': 'true',
        };
        if (pdfUrl) headers['X-PDF-URL'] = pdfUrl;
        if (workspacePolicyPathHeader) headers['X-Workspace-Policy-Path'] = workspacePolicyPathHeader;
        if (workspaceDocSaved !== null) headers['X-Workspace-Doc-Saved'] = workspaceDocSaved ? 'true' : 'false';
        return new NextResponse(pdfBuffer as any, { headers });
      }

      // When not returning a PDF (e.g., puppeteer not available), include the workspace document in the JSON response
      const responseBody: any = { ok: true, message: 'Policy published', pdfUrl: pdfUrl || null };
      if (workspaceId) responseBody.workspacePublishedDocument = workspacePublishedDocument;

  const respHeaders: Record<string, string> = { 'X-Policy-Updated': 'true' };
  if (workspacePolicyPathHeader) respHeaders['X-Workspace-Policy-Path'] = workspacePolicyPathHeader;
  if (workspaceDocSaved !== null) respHeaders['X-Workspace-Doc-Saved'] = workspaceDocSaved ? 'true' : 'false';
  return NextResponse.json(responseBody, { headers: respHeaders });

  } catch (error) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: errorMessage },
      { status: 500 }
    );
  }
}