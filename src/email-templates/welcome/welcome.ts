import fs from 'fs';
import path from 'path';

export function renderWelcomeEmail(vars: { name: string }) {
  const templatePath = path.join(process.cwd(), 'src/email-templates/welcome/welcome.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace(/{{name}}/g, vars.name || '');
  return html;
}
