import fs from 'fs';
import path from 'path';

export function renderMissingDocsEmail(vars: { managerName: string, homeName: string, month: string, missingList: string }) {
  const templatePath = path.join(process.cwd(), 'src/email-templates/missing-docs/missing-docs.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace(/{{managerName}}/g, vars.managerName || 'Manager');
  html = html.replace(/{{homeName}}/g, vars.homeName || '');
  html = html.replace(/{{month}}/g, vars.month || '');
  html = html.replace(/{{missingList}}/g, vars.missingList || '');
  return html;
}
