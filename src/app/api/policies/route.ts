import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

type PolicyMeta = {
  file: string; // filename in public/policies, e.g. 'lone-working-policy.pdf'
  url: string; // public url to open the pdf
  title: string | null;
  version?: string | null;
  effectiveDate?: string | null;
  reviewDate?: string | null;
  appliesTo?: string | null;
};

function deriveTitleFromFilename(filename: string) {
  const name = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
  return name.replace(/\b(\w)/g, (m) => m.toUpperCase());
}

export async function GET() {
  const publicDir = path.join(process.cwd(), 'public', 'policies');
  const mdDir = path.join(process.cwd(), 'src', 'policies');

  let pdfFiles: string[] = [];
  try {
    pdfFiles = fs.readdirSync(publicDir).filter((f) => f.endsWith('.pdf'));
  } catch (e) {
    // no pdfs yet
    pdfFiles = [];
  }

  const policies: PolicyMeta[] = [];

  // attempt to load gray-matter dynamically; if unavailable, we'll fallback
  let matter: any = null;
  try {
    // dynamic import so the route still works even if gray-matter isn't installed
    // (the build may include it; this avoids a hard dependency at runtime)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    matter = (await import('gray-matter')).default || (await import('gray-matter'));
  } catch (err) {
    matter = null;
  }

  for (const f of pdfFiles) {
    const base = f.replace(/\.pdf$/i, '');
    const mdPath = path.join(mdDir, `${base}.md`);

    let meta: any = {};
    if (fs.existsSync(mdPath)) {
      try {
        const content = fs.readFileSync(mdPath, 'utf8');
        if (matter) {
          const parsed = matter(content);
          meta = parsed && parsed.data ? parsed.data : {};
        }
      } catch (e) {
        // ignore and fallback to filename-derived metadata
        meta = {};
      }
    }

    const title = meta.title || deriveTitleFromFilename(f);

    policies.push({
      file: f,
      url: `/policies/${encodeURIComponent(f)}`,
      title,
      version: meta.version || null,
      effectiveDate: meta.effectiveDate || null,
      reviewDate: meta.reviewDate || null,
      appliesTo: meta.appliesTo || null,
    });
  }

  // If there are no PDFs in public yet, fall back to scanning src/policies for .md files
  if (policies.length === 0) {
    try {
      const mdFiles = fs.readdirSync(mdDir).filter((f) => f.endsWith('.md'));
      for (const md of mdFiles) {
        const base = md.replace(/\.md$/i, '');
        const pdfName = `${base}.pdf`;
        const mdPath = path.join(mdDir, md);
        let meta: any = {};
        try {
          const content = fs.readFileSync(mdPath, 'utf8');
          if (matter) {
            const parsed = matter(content);
            meta = parsed && parsed.data ? parsed.data : {};
          }
        } catch (e) {
          meta = {};
        }
        const title = meta.title || deriveTitleFromFilename(pdfName);
        policies.push({
          file: pdfName,
          url: `/policies/${encodeURIComponent(pdfName)}`,
          title,
          version: meta.version || null,
          effectiveDate: meta.effectiveDate || null,
          reviewDate: meta.reviewDate || null,
          appliesTo: meta.appliesTo || null,
        });
      }
    } catch (e) {
      // ignore
    }
  }

  return NextResponse.json({ files: policies });
}
