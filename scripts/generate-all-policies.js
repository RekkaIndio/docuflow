#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const policiesDir = path.join(__dirname, '..', 'src', 'policies');
const files = fs.readdirSync(policiesDir).filter(f => f.endsWith('.md'));

files.forEach(file => {
  const basename = path.basename(file, '.md');
  console.log('Generating', basename);
  const res = spawnSync('node', [path.join(__dirname, 'generate-policy-pdf.js'), basename], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error('Failed to generate', basename);
    process.exit(res.status);
  }
});

console.log('All policies generated.');
