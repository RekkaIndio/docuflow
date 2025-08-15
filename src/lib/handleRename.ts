import { renameDocument, renameFolder } from "@/lib/rename";

export async function handleRename(item: { id: string; type: 'document' | 'folder'; workspaceId: string }, newName: string) {
  // Protect certain folder ids from being renamed
  const protectedFolderIds = [
    'audits', 'audits-managers-monthly-audit', 'audits-audits',
    'complaints-and-compliments', 'complaints', 'compliments',
    'surveys', 'surveys-staff', 'surveys-residents', 'surveys-professional', 'surveys-relatives',
    'rd-compliance-report', 'action-plans', 'action-plans-external', 'action-plans-internal',
    'cqc-notifications', 'safeguards', 'riddor', 'hdp', 'sip', 'pr-submissions', 'business-continuity-plan',
    'service-user-guide', 'statement-of-purpose', 'lessons-learnt', 'rcas'
  ];

  if (item.type === 'document') {
    await renameDocument(item.workspaceId, item.id, newName);
  } else if (item.type === 'folder') {
    if (protectedFolderIds.includes(item.id)) {
      throw new Error(`Cannot rename protected folder: ${item.id}`);
    }
    await renameFolder(item.workspaceId, item.id, newName);
  }
}
