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
  isCompleted?: boolean; // whether this policy has been customized
  lastCustomized?: string | null; // timestamp of last customization
};

function deriveTitleFromFilename(filename: string) {
  const name = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
  return name.replace(/\b(\w)/g, (m) => m.toUpperCase());
}

export async function GET() {
  const publicDir = path.join(process.cwd(), 'public', 'policies');
  const mdDir = path.join(process.cwd(), 'src', 'policies');
  const filledDir = path.join(process.cwd(), 'src', 'policies', 'filled');

  // Get list of all markdown templates to determine available policies
  let mdFiles: string[] = [];
  try {
    mdFiles = fs.readdirSync(mdDir).filter((f) => f.endsWith('.md'));
  } catch (e) {
    mdFiles = [];
  }

  // Get list of completed policies from filled directory
  let filledFiles: string[] = [];
  try {
    filledFiles = fs.readdirSync(filledDir).filter((f) => f.endsWith('.md'));
  } catch (e) {
    filledFiles = [];
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

  // Check each markdown template
  for (const md of mdFiles) {
    const base = md.replace(/\.md$/i, '');
    const pdfName = `${base}.pdf`;
    const mdPath = path.join(mdDir, md);
    
    // Check if this policy has been completed (has files in filled directory)
    const completedFiles = filledFiles.filter(f => f.startsWith(base + '-'));
    const isCompleted = completedFiles.length > 0;
    
    // Get the most recent completion timestamp
    let lastCustomized: string | null = null;
    if (isCompleted) {
      const timestamps = completedFiles.map(f => {
        const match = f.match(/-(\d{4}-\d{2}-\d{2}T[\d:-]+Z)\.md$/);
        return match ? match[1] : null;
      }).filter(Boolean);
      
      if (timestamps.length > 0) {
        timestamps.sort();
        lastCustomized = timestamps[timestamps.length - 1];
      }
    }

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

    const title = meta.title || deriveTitleFromFilename(pdfName);

    policies.push({
      file: pdfName,
      url: `/policies/${encodeURIComponent(pdfName)}`,
      title,
      version: meta.version || null,
      effectiveDate: meta.effectiveDate || null,
      reviewDate: meta.reviewDate || null,
      appliesTo: meta.appliesTo || null,
      isCompleted,
      lastCustomized,
    });
  }

  return NextResponse.json({ files: policies });
}
