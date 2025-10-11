import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ policyName: string }> }
) {
  try {
  const { content, meta, workspaceId, organisationId: bodyOrganisationId } = await request.json();
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

    // Normalize meta.reviewDate (accept common formats like MM/YYYY, Month YYYY)
    function normalizeDateStringServer(s?: any): string | null {
      if (!s) return null;
      const str = String(s).trim();
      const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})(?:[-\/](\d{1,2}))?$/);
      if (isoMatch) {
        const y = isoMatch[1];
        const m = String(isoMatch[2]).padStart(2, '0');
        const d = isoMatch[3] ? String(isoMatch[3]).padStart(2, '0') : '01';
        return `${y}-${m}-${d}`;
      }
      const mmYYYY = str.match(/^(\d{1,2})[\/](\d{4})$/);
      if (mmYYYY) {
        const m = String(mmYYYY[1]).padStart(2, '0');
        const y = mmYYYY[2];
        return `${y}-${m}-01`;
      }
      const monthName = str.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
      if (monthName) {
        const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const m = months[monthName[1].slice(0, 3).toLowerCase()];
        return `${monthName[2]}-${m}-01`;
      }
      const attempted = new Date(str);
      if (!isNaN(attempted.getTime())) {
        const y = attempted.getFullYear();
        const m = String(attempted.getMonth() + 1).padStart(2, '0');
        const d = String(attempted.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return null;
    }

    if (meta && meta.reviewDate) {
      const norm = normalizeDateStringServer(meta.reviewDate);
      if (norm) meta.reviewDate = norm;
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

  // Persist published policy metadata at organisation level when we can derive an orgId.
  // We'll track and log derivation attempts and results so the dev server terminal shows what happened.
  try {
    // Log initial derivation attempts context
    try { /* debug logging removed: initial derive context */ } catch (e) {}
  } catch (e) {}
  // Track any discovered organisation id in one place so we can return it to the client
  // (some writes happen early in this function, others later). This helps the UI
  // locate the saved document regardless of where the write occurred.
  let foundOrgId: string | undefined = undefined;
    // Do NOT write to the legacy top-level `published_policies` collection.
    try {
      // Attempt to derive an organisationId early so we can persist the published doc under the org
      let orgIdForPublish: string | undefined = bodyOrganisationId;
      if (!orgIdForPublish && workspaceId) {
        const wsSnap = await adminDb.collection('workspaces').doc(workspaceId).get();
        orgIdForPublish = wsSnap.exists ? (wsSnap.data() as any)?.organisationId : undefined;
      }

      if (!orgIdForPublish && workspaceId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const admin = require('@/lib/firebase-admin').default;
          const FieldPath = admin.firestore.FieldPath;
          const cgSnap = await adminDb.collectionGroup('workspaces').where(FieldPath.documentId(), '==', workspaceId).limit(1).get();
          if (!cgSnap.empty) {
            const foundRef = cgSnap.docs[0].ref;
            const parts = foundRef.path.split('/');
            const orgIndex = parts.indexOf('organisations');
            if (orgIndex !== -1 && parts.length > orgIndex + 1) orgIdForPublish = parts[orgIndex + 1];
          }
        } catch (e) {
          // ignore fallback errors
        }
      }

      if (orgIdForPublish) {
        try {
          await adminDb
            .collection('organisations')
            .doc(orgIdForPublish)
            .collection('policies')
            .doc(documentId)
            .set(publishedPolicyDocument, { merge: true });
          foundOrgId = orgIdForPublish;
          // debug logging removed: early publishedPolicyDocument saved
        } catch (e) {
          console.warn('[GENERATE] failed early org-scoped write:', e);
        }
      } else {
        console.warn('[GENERATE] No organisationId available for early publish; skipping org-scoped write.');
      }
    } catch (firebaseError) {
      console.error('Failed to save published policy to organisation-scoped policies collection:', firebaseError);
    }

      if (workspaceId) {
        try {
          // Prefer an explicit organisationId from the request body
          let orgId = bodyOrganisationId;
          if (!orgId) {
            const wsSnap = await adminDb.collection('workspaces').doc(workspaceId).get();
            orgId = wsSnap.exists ? (wsSnap.data() as any)?.organisationId : undefined;
          }

          // If still not found, try a collectionGroup lookup to find an organisations/{orgId}/workspaces/{workspaceId}
          if (!orgId) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const admin = require('@/lib/firebase-admin').default;
              const FieldPath = admin.firestore.FieldPath;
              const cgSnap = await adminDb.collectionGroup('workspaces').where(FieldPath.documentId(), '==', workspaceId).limit(1).get();
              if (!cgSnap.empty) {
                const foundRef = cgSnap.docs[0].ref;
                const parts = foundRef.path.split('/');
                const orgIndex = parts.indexOf('organisations');
                if (orgIndex !== -1 && parts.length > orgIndex + 1) orgId = parts[orgIndex + 1];
              }
            } catch (e) {
              // ignore
            }
          }

          if (orgId) {
                  try {
                  // Persist the policy at the organisation level so it's available to all workspaces in the org
                  await adminDb
                    .collection('organisations')
                    .doc(orgId)
                    .collection('policies')
                    .doc(documentId)
                    .set(workspacePublishedDocument, { merge: true });
                  foundOrgId = orgId;
                  // debug logging removed: saved published workspace document to org path
                } catch (e) {
                  console.warn('[GENERATE] failed to write published policy into organisation-scoped policies path:', e);
                }
          } else {
            console.warn(`No organisationId found for workspace ${workspaceId}; skipping organisation-scoped write to avoid auto-creating legacy workspace doc.`);
          }
        } catch (e) {
          console.warn('Failed to derive organisationId or write organisation-scoped published policy for workspace:', workspaceId, e);
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
        // debug logging removed: skipping local policy markdown save by flag
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

            // Determine organisation-aware storage path. Prefer explicit organisationId sent in the
            // request body (`bodyOrganisationId`) if present, otherwise derive from workspace hints.
            let orgIdForStorage: string | undefined = bodyOrganisationId || undefined;
            if (!orgIdForStorage && workspaceId) {
              try {
                // Try legacy workspace doc first to find an organisationId hint
                const legacySnap = await adminDb.collection('workspaces').doc(workspaceId).get();
                const candidateOrgId = legacySnap.exists ? (legacySnap.data() as any)?.organisationId : undefined;
                if (candidateOrgId) {
                  // If an organisations/{candidate}/workspaces/{workspaceId} doc exists, prefer that orgId
                  try {
                    const orgWsSnap = await adminDb.doc(`organisations/${candidateOrgId}/workspaces/${workspaceId}`).get();
                    if (orgWsSnap.exists) {
                      orgIdForStorage = candidateOrgId;
                    } else {
                      // If org-scoped doc not present, still use candidateOrgId as a best-effort mapping
                      orgIdForStorage = candidateOrgId;
                    }
                  } catch (e) {
                    orgIdForStorage = candidateOrgId;
                  }
                }
              } catch (e) {
                // ignore - fallback to legacy path
              }
            }

            // Prefer organisation-level storage so policies are accessible at org scope.
            // Fall back to workspace-scoped path only when no orgId could be determined.
            try { console.log('[GENERATE] orgIdForStorage (upload):', orgIdForStorage); } catch (e) {}
            storagePath = orgIdForStorage
              ? `organisations/${orgIdForStorage}/policies/${sanitizedName}.pdf`
              : `workspaces/${workspaceId || 'global'}/policies/${sanitizedName}.pdf`;
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
            // Compute organisation-aware storage path for existing file lookup (prefer explicit
            // bodyOrganisationId, then org-scoped workspace doc)
            let orgIdForStorage: string | undefined = bodyOrganisationId || undefined;
            if (!orgIdForStorage && workspaceId) {
              try {
                const legacySnap = await adminDb.collection('workspaces').doc(workspaceId).get();
                let candidateOrgId = legacySnap.exists ? (legacySnap.data() as any)?.organisationId : undefined;
                if (candidateOrgId) {
                  try {
                    const orgSnap = await adminDb.collection('organisations').doc(candidateOrgId).collection('workspaces').doc(workspaceId).get();
                    if (orgSnap.exists) orgIdForStorage = candidateOrgId;
                    else orgIdForStorage = candidateOrgId;
                  } catch (e) {
                    orgIdForStorage = candidateOrgId;
                  }
                }
              } catch (e) {
                // ignore
              }
            }

            try { console.log('[GENERATE] orgIdForStorage (lookup):', orgIdForStorage); } catch (e) {}
            // Prefer organisation-level storage for lookups as well.
            storagePath = orgIdForStorage
              ? `organisations/${orgIdForStorage}/policies/${sanitizedName}.pdf`
              : `workspaces/${workspaceId || 'global'}/policies/${sanitizedName}.pdf`;
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
  // Persist updated published doc under organisation when possible. Do NOT write to global published_policies.
        const finalPublishedDoc = {
          ...publishedPolicyDocument,
          extractedJson: workspacePublishedDocument.extractedJson || null,
          updatedAt: new Date().toISOString(),
        };

  // Prefer bodyOrganisationId or workspace-derived org. headerOrgId isn't available yet in this scope.
  let orgForFinalWrite: string | undefined = bodyOrganisationId;
        if (!orgForFinalWrite && workspaceId) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const admin = require('@/lib/firebase-admin').default;
            const FieldPath = admin.firestore.FieldPath;
            const cgSnap = await adminDb.collectionGroup('workspaces').where(FieldPath.documentId(), '==', workspaceId).limit(1).get();
            if (!cgSnap.empty) {
              const foundRef = cgSnap.docs[0].ref;
              const parts = foundRef.path.split('/');
              const orgIndex = parts.indexOf('organisations');
              if (orgIndex !== -1 && parts.length > orgIndex + 1) orgForFinalWrite = parts[orgIndex + 1];
            }
          } catch (e) {
            // ignore
          }
        }

        if (orgForFinalWrite) {
          await adminDb
            .collection('organisations')
            .doc(orgForFinalWrite)
            .collection('policies')
            .doc(documentId)
            .set(finalPublishedDoc, { merge: true });
          foundOrgId = orgForFinalWrite;
        } else {
          console.warn('No organisationId found; skipping final write of published policy (global published_policies suppressed).');
        }
      } catch (updateErr) {
        console.warn('Failed to set org-scoped policies document with storage path/pdfPath:', updateErr);
      }

      let workspaceDocSaved: boolean | null = null;
      // headerOrgId will be set when we can derive an authoritative organisation id for this workspace
      let headerOrgId: string | undefined = undefined;
      if (workspaceId) {
        try {
          // Try to derive organisationId hint from legacy workspace doc (read-only). If present,
          // prefer writing into organisations/{orgId}/workspaces/{workspaceId}/policies/{documentId}.
          // Prefer explicit organisationId from the request body
          let candidateOrgId = bodyOrganisationId;
          if (!candidateOrgId) {
            const legacySnap = await adminDb.collection('workspaces').doc(workspaceId).get();
            candidateOrgId = legacySnap.exists ? (legacySnap.data() as any)?.organisationId : undefined;
          }
          if (!candidateOrgId) {
            try {
              // Try collectionGroup lookup to find an organisations/{orgId}/workspaces/{workspaceId} doc
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const admin = require('@/lib/firebase-admin').default;
              const FieldPath = admin.firestore.FieldPath;
              const cgSnap = await adminDb.collectionGroup('workspaces').where(FieldPath.documentId(), '==', workspaceId).limit(1).get();
              if (!cgSnap.empty) {
                const foundRef = cgSnap.docs[0].ref;
                const parts = foundRef.path.split('/');
                const orgIndex = parts.indexOf('organisations');
                if (orgIndex !== -1 && parts.length > orgIndex + 1) candidateOrgId = parts[orgIndex + 1];
              }
            } catch (e) {
              // ignore
            }
          }
          if (candidateOrgId) {
            try {
              const orgWsSnap = await adminDb.doc(`organisations/${candidateOrgId}/workspaces/${workspaceId}`).get();
              headerOrgId = candidateOrgId;
            } catch (e) {
              headerOrgId = candidateOrgId;
            }
          }

          // If we set headerOrgId here, record it as foundOrgId so the client can find the org-scoped doc
          if (headerOrgId) foundOrgId = headerOrgId;

          if (headerOrgId) {
            // Persist the full workspace-scoped document into organisations/{orgId}/workspaces/{workspaceId}/policies
            const finalWorkspaceDoc = {
              ...workspacePublishedDocument,
              updatedAt: new Date().toISOString(),
            };

            const docRef = adminDb.doc(`organisations/${headerOrgId}/workspaces/${workspaceId}/policies/${documentId}`);

            // Write once then verify by reading back. Retry one more time if verification fails.
            try {
              await docRef.set(finalWorkspaceDoc, { merge: true });
            } catch (writeErr) {
              console.warn('Failed initial write of workspace-scoped policy document (org-scoped):', writeErr);
            }

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
              console.warn(`Workspace document verification failed for organisations/${headerOrgId}/workspaces/${workspaceId}/policies/${documentId}`);
            }
            console.log(`org-scoped write attempted for workspace ${workspaceId} under org ${headerOrgId}; saved=${workspaceDocSaved}`);
          } else {
            // No orgId available - avoid creating or writing to legacy top-level workspace doc.
            workspaceDocSaved = null;
            console.warn(`No organisationId found for workspace ${workspaceId}; skipping persistence of workspace-scoped published document to avoid auto-creating legacy workspace doc.`);
          }
        } catch (updateErr) {
          workspaceDocSaved = false;
          console.warn('Failed to set workspace-scoped policy document with storage path/pdfPath:', updateErr);
        }
      }

  // Return actual PDF if available; otherwise send JSON success with X-Policy-Updated header and storage URL when available
      // If workspaceId was provided, include a header pointing to the workspace policy path so the client can confirm the saved JSON
      // Prefer returning an organisation-scoped path in header when possible
      // Only return a workspace policy path header when we can determine an organisation-scoped path.
      // Avoid returning legacy /workspaces/... paths which clients may attempt to fetch and which are likely
      // protected by Firestore rules. The client will consume workspacePublishedDocument in the response body
      // as a fallback when this header is not present.
      let workspacePolicyPathHeader = null;
      // Prefer any discovered organisation id (foundOrgId) when returning the path/header
      const orgForHeader = foundOrgId || headerOrgId;
      if (workspaceId && orgForHeader) {
        // Return an organisation-level policy path so the UI can find the saved doc under the org
        workspacePolicyPathHeader = `/organisations/${orgForHeader}/policies/${documentId}`;
      }

      if (pdfBuffer) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${sanitizedName}.pdf"`,
          'X-Policy-Updated': 'true',
        };
        if (pdfUrl) headers['X-PDF-URL'] = pdfUrl;
        if (workspacePolicyPathHeader) headers['X-Workspace-Policy-Path'] = workspacePolicyPathHeader;
        if (workspaceDocSaved !== null) headers['X-Workspace-Doc-Saved'] = workspaceDocSaved ? 'true' : 'false';
        if (orgForHeader) headers['X-Org-Used'] = orgForHeader;
        return new NextResponse(pdfBuffer as any, { headers });
      }

  // When not returning a PDF (e.g., puppeteer not available), include the workspace document in the JSON response
  const responseBody: any = { ok: true, message: 'Policy published', pdfUrl: pdfUrl || null };
      if (workspaceId) responseBody.workspacePublishedDocument = workspacePublishedDocument;

  const respHeaders: Record<string, string> = { 'X-Policy-Updated': 'true' };
  if (workspacePolicyPathHeader) respHeaders['X-Workspace-Policy-Path'] = workspacePolicyPathHeader;
  if (workspaceDocSaved !== null) respHeaders['X-Workspace-Doc-Saved'] = workspaceDocSaved ? 'true' : 'false';
  if (orgForHeader) respHeaders['X-Org-Used'] = orgForHeader;

  // Also include the discovered organisation-scoped published path in the JSON body for easier debugging
  if (workspacePolicyPathHeader) responseBody.publishedPath = workspacePolicyPathHeader;
  if (orgForHeader) responseBody.orgId = orgForHeader;

  // Attach small debug info describing candidate org derivation attempts and any write errors
  responseBody.debug = {
    foundOrgId,
    headerOrgId,
    workspaceDocSaved,
  };

  // Dev debug: log the debug summary so it's visible in the server terminal when requests are made
  try {
    console.log('[GENERATE] response debug', { publishedPath: responseBody.publishedPath || null, orgForHeader: orgForHeader || null, foundOrgId: foundOrgId || null, headerOrgId: headerOrgId || null, workspaceDocSaved });
  } catch (e) {}

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