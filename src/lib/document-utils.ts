import type { Folder, Document } from './types';

// Find the immediate parent folder that directly contains a document with the provided id.
export function findParentFolderByDocumentId(items: (Folder | Document)[], childId: string): Folder | null {
  for (const item of items) {
    if (item.type === 'folder') {
      if (item.items.some(child => child.id === childId)) return item;
      const found = findParentFolderByDocumentId(item.items, childId);
      if (found) return found;
    }
  }
  return null;
}

export default findParentFolderByDocumentId;
// Utility functions for handling document navigation and actions

export function openDocument(documentId: string, documentName?: string) {
  // For demo purposes, we'll dispatch a custom event that the dashboard can listen to
  // In a real app with proper routing, this would use Next.js router
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('navigate-to-document', { 
      detail: { documentId, documentName } 
    }));
  }
}

export function getDocumentUrl(documentId: string): string {
  // In a real app, this would return the actual document URL
  return `/documents/${documentId}`;
}

export function handleDocumentClick(documentId: string, documentName?: string, url?: string) {
  if (url && url.startsWith('http')) {
    // External URL - open in new tab
    window.open(url, '_blank');
  } else {
    // Internal document - navigate to document view
    openDocument(documentId, documentName);
  }
}
