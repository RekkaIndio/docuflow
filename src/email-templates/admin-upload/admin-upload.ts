import fs from 'fs';
import path from 'path';

export function renderAdminUploadEmail(vars: { managerName: string, uploadedBy: string, documentName: string, uploadedAt: string }) {
  const templatePath = path.join(process.cwd(), 'src/email-templates/admin-upload/admin-upload.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace(/{{managerName}}/g, vars.managerName || 'Manager');
  html = html.replace(/{{uploadedBy}}/g, vars.uploadedBy || '');
  html = html.replace(/{{documentName}}/g, vars.documentName || '');
  html = html.replace(/{{uploadedAt}}/g, vars.uploadedAt || '');
  return html;
}
