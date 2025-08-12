import { renameDocument, renameFolder } from "@/lib/rename";

export async function handleRename(item: { id: string; type: 'document' | 'folder'; workspaceId: string }, newName: string) {
  if (item.type === 'document') {
    await renameDocument(item.workspaceId, item.id, newName);
  } else if (item.type === 'folder') {
    await renameFolder(item.workspaceId, item.id, newName);
  }
}
