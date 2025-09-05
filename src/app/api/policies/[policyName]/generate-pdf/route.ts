import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ policyName: string }> }
) {
  try {
    const { content, meta } = await request.json();
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
        const publicLogoPath = path.join(process.cwd(), 'public', 'Neurodiversity_Symbol.svg');
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

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });

      // Save the PDF to public/policies directory (replacing the original)
      const publicPoliciesDir = path.join(process.cwd(), 'public', 'policies');
      await fs.promises.mkdir(publicPoliciesDir, { recursive: true });
      
      const pdfPath = path.join(publicPoliciesDir, `${sanitizedName}.pdf`);
      await fs.promises.writeFile(pdfPath, pdfBuffer);

      // Save the published policy to Firebase
      const timestamp = new Date().toISOString();
      const documentId = `${sanitizedName}-published-${Date.now()}`;

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
        pdfPath: `/policies/${sanitizedName}.pdf`
      };

      try {
        await adminDb.collection('published_policies').doc(documentId).set(publishedPolicyDocument);
        console.log('Policy saved to Firebase as published');
      } catch (firebaseError) {
        console.error('Failed to save to Firebase:', firebaseError);
        // Continue with local saving even if Firebase fails
      }

      // Also save the filled policy markdown for future reference
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

      // Update the original policy template with filled metadata
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

      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${sanitizedName}.pdf"`,
          'X-Policy-Updated': 'true', // Signal that the policy was updated
        },
      });

    } finally {
      await browser.close();
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: errorMessage },
      { status: 500 }
    );
  }
}