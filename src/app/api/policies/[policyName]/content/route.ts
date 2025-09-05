import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

let matter: any = null;
try {
  // Dynamic import to handle cases where gray-matter might not be available
  matter = require('gray-matter');
} catch (e) {
  matter = null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ policyName: string }> }
) {
  try {
    const resolvedParams = await params;
    const policyName = resolvedParams.policyName;
    
    // Sanitize the policy name to prevent directory traversal
    const sanitizedName = policyName.replace(/[^a-zA-Z0-9-_]/g, '');
    const mdPath = path.join(process.cwd(), 'src', 'policies', `${sanitizedName}.md`);

    // Check if the file exists
    if (!fs.existsSync(mdPath)) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Read the markdown file
    const content = fs.readFileSync(mdPath, 'utf8');
    
    let meta = {};
    let policyContent = content;

    // Parse frontmatter if gray-matter is available
    if (matter) {
      try {
        const parsed = matter(content);
        meta = parsed.data || {};
        policyContent = parsed.content || content;
      } catch (e) {
        console.warn('Failed to parse frontmatter:', e);
        // Fallback to raw content
      }
    }

    return NextResponse.json({
      content: policyContent,
      meta,
      filename: `${sanitizedName}.md`
    });

  } catch (error) {
    console.error('Error loading policy content:', error);
    return NextResponse.json(
      { error: 'Failed to load policy content' },
      { status: 500 }
    );
  }
}