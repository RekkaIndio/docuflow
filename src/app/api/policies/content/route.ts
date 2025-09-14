import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const policyName = searchParams.get('name');

  if (!policyName) {
    return NextResponse.json({ error: 'Policy name is required' }, { status: 400 });
  }

  try {
    const filledDir = path.join(process.cwd(), 'src', 'policies', 'filled');
    const templateDir = path.join(process.cwd(), 'src', 'policies');

    // Remove .pdf extension if present and create base name
    const baseName = policyName.replace('.pdf', '');

    // Look for completed policy files (with timestamp)
    let policyFile = null;
    try {
      const files = fs.readdirSync(filledDir);
      // Find files that start with the base name
      const matchingFiles = files.filter(f =>
        f.startsWith(baseName + '-') && f.endsWith('.md')
      );

      if (matchingFiles.length > 0) {
        // Get the most recent one
        matchingFiles.sort().reverse();
        policyFile = path.join(filledDir, matchingFiles[0]);
      }
    } catch (e) {
      // Filled directory not accessible
    }

    // If not found in filled, try template directory
    if (!policyFile) {
      const templateFile = path.join(templateDir, `${baseName}.md`);
      if (fs.existsSync(templateFile)) {
        policyFile = templateFile;
      }
    }

    if (!policyFile || !fs.existsSync(policyFile)) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Read the policy content
    const content = fs.readFileSync(policyFile, 'utf8');

    // Extract text content (remove frontmatter if present)
    let extractedText = content;
    if (content.startsWith('---')) {
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd !== -1) {
        extractedText = content.substring(frontmatterEnd + 3).trim();
      }
    }

    return NextResponse.json({
      content: extractedText,
      title: baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      fileName: path.basename(policyFile)
    });

  } catch (error) {
    console.error('Error reading policy:', error);
    return NextResponse.json({ error: 'Failed to read policy' }, { status: 500 });
  }
}