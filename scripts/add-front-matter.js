#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const policiesDir = path.join(__dirname, '..', 'src', 'policies');

function hasFrontMatter(content) {
  return content.trim().startsWith('---');
}

const files = fs.readdirSync(policiesDir).filter(f => f.endsWith('.md'));
files.forEach(file => {
  const fp = path.join(policiesDir, file);
  const content = fs.readFileSync(fp, 'utf8');
  if (hasFrontMatter(content)) {
    console.log('Skipping (has front-matter):', file);
    return;
  }

  const title = path.basename(file, '.md').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const fm = `---\ntitle: "${title}"\neffectiveDate: ""\nreviewDate: ""\nversion: "1.0"\n---\n\n`;
  fs.writeFileSync(fp, fm + content, 'utf8');
  console.log('Prepended front-matter to', file);
});

console.log('Done.');
