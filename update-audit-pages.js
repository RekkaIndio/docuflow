#!/usr/bin/env node
/**
 * Script to update all audit pages to use the new monthly snapshot system
 */

const fs = require('fs');
const path = require('path');

const auditPages = [
  'equipment',
  'fire-safety', 
  'hand-hygiene',
  'health-safety',
  'kitchen',
  'maintenance',
  'managers-weekly',
  'mealtime',
  'night-visit',
  'restrictive-practice',
  'staff-file',
  'weight-monitoring',
  'wound-monitoring',
  'risk-register'
];

const auditsDir = path.join(__dirname, 'src/app/audits');

auditPages.forEach(auditType => {
  const auditPagePath = path.join(auditsDir, auditType, 'page.tsx');
  
  if (fs.existsSync(auditPagePath)) {
    let content = fs.readFileSync(auditPagePath, 'utf8');
    
    // Update import statement
    if (content.includes("import { saveAudit, updateAudit, markAuditCompleted } from '@/lib/firestore';")) {
      content = content.replace(
        "import { saveAudit, updateAudit, markAuditCompleted } from '@/lib/firestore';",
        "import { saveAudit, updateAudit, markAuditCompleted, markAuditCompletedWithSnapshot } from '@/lib/firestore';"
      );
    }
    
    // Update markAuditCompleted calls to use markAuditCompletedWithSnapshot
    const auditTypeRegex = new RegExp(`markAuditCompleted\\(([^,]+),\\s*'${auditType}'([^)]+)\\)`, 'g');
    content = content.replace(auditTypeRegex, (match, workspaceId, rest) => {
      // Extract the data payload - this is a simplified approach
      return `markAuditCompletedWithSnapshot(${workspaceId}, '${auditType}', payload${rest})`;
    });
    
    // Write back the updated content
    fs.writeFileSync(auditPagePath, content, 'utf8');
    console.log(`Updated ${auditType} audit page`);
  } else {
    console.log(`Warning: ${auditPagePath} does not exist`);
  }
});

console.log('All audit pages updated successfully!');