#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const puppeteer = require('puppeteer');
let matter;
try {
  matter = require('gray-matter');
} catch (e) {
  matter = null;
}

async function generate(mdPath, outPath) {
  const md = fs.readFileSync(mdPath, 'utf8');
  let front = {};
  let content = md;
  if (matter) {
    const parsed = matter(md);
    front = parsed.data || {};
    content = parsed.content || md;
  }
  const htmlBody = marked.parse(content);

  const templatePath = path.join(__dirname, 'policy-template.html');
  let template = fs.readFileSync(templatePath, 'utf8');

  // Inline logo image from assets if available
  const logoPath = path.join(__dirname, '..', 'src', 'assets', 'Neurodiversity_Symbol.png');
  let logoDataUri = '';
  try {
    const img = fs.readFileSync(logoPath);
    const b64 = img.toString('base64');
    logoDataUri = `data:image/png;base64,${b64}`;
  } catch (e) {
    // If not found, use empty src so template still works
    logoDataUri = '';
  }

  template = template.replace('{{logo}}', logoDataUri);
  // inject metadata placeholders with defaults
  template = template.replace('{{title}}', front.title || path.basename(mdPath, '.md').replace(/-/g, ' '));
  template = template.replace('{{version}}', front.version || '1.0');
  template = template.replace('{{effectiveDate}}', front.effectiveDate || '');
  template = template.replace('{{reviewDate}}', front.reviewDate || '');

  const html = template.replace('{{content}}', htmlBody);

  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: outPath, format: 'A4', printBackground: true });
    console.log('PDF written to', outPath);
  } finally {
    await browser.close();
  }
}

// Allow passing a basename (without extension) to generate other policies
const basename = process.argv[2] || 'activities-and-social-engagement-policy';
const md = path.join(__dirname, '..', 'src', 'policies', `${basename}.md`);
const out = path.join(__dirname, '..', 'public', 'policies', `${basename}.pdf`);

generate(md, out).catch(err => {
  console.error(err);
  process.exit(1);
});
