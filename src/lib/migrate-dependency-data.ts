/**
 * Migration Helper for Dependency Calculator Data
 * 
 * This script helps migrate dependency calculator data from the old user-scoped
 * Firebase path to the new workspace-scoped path.
 * 
 * OLD: users/{userId}/dependency_calculator/default
 * NEW: workspaces/{workspaceId}/dependency_calculator/default
 */

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function migrateDependencyDataToWorkspace(
  userId: string, 
  workspaceId: string,
  deleteOldData: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`🔄 Starting migration from users/${userId} to workspaces/${workspaceId}`);

    // Read old data from user-scoped path
    const oldRef = doc(db, "users", userId, "dependency_calculator", "default");
    const oldSnap = await getDoc(oldRef);

    if (!oldSnap.exists()) {
      return {
        success: true,
        message: "No data found in old location - nothing to migrate"
      };
    }

    const oldData = oldSnap.data();
    console.log(`📊 Found data in old location:`, {
      residentsCount: oldData.residents?.length || 0,
      communitiesCount: oldData.communities?.length || 0,
      hasStaffActual: !!oldData.staffActual
    });

    // Check if new location already has data
    const newRef = doc(db, "workspaces", workspaceId, "dependency_calculator", "default");
    const newSnap = await getDoc(newRef);

    if (newSnap.exists()) {
      const newData = newSnap.data();
      const newResidentsCount = newData.residents?.length || 0;
      
      if (newResidentsCount > 0) {
        return {
          success: false,
          message: `Workspace already has ${newResidentsCount} residents. Migration cancelled to prevent data loss.`
        };
      }
    }

    // Migrate data to new workspace-scoped path
    const migratedData = {
      ...oldData,
      migratedAt: serverTimestamp(),
      migratedFrom: `users/${userId}/dependency_calculator/default`,
      schemaVersion: 2 // Bump version to indicate workspace-scoped data
    };

    await setDoc(newRef, migratedData, { merge: true });
    console.log(`✅ Successfully migrated data to workspaces/${workspaceId}`);

    // Optionally delete old data
    if (deleteOldData) {
      await deleteDoc(oldRef);
      console.log(`🗑️ Deleted old data from users/${userId}`);
    }

    return {
      success: true,
      message: `Successfully migrated ${oldData.residents?.length || 0} residents and ${oldData.communities?.length || 0} communities to workspace ${workspaceId}`
    };

  } catch (error) {
    console.error("❌ Migration failed:", error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Browser-compatible migration function that can be called from console
export function runMigrationInBrowser(userId: string, workspaceId: string) {
  if (typeof window === 'undefined') {
    console.error('This function must be run in a browser environment');
    return;
  }

  console.log('🔧 Starting browser migration...');
  console.log(`👤 User ID: ${userId}`);
  console.log(`🏢 Workspace ID: ${workspaceId}`);
  
  // Note: This would need to be adapted based on how your Firebase is initialized in the browser
  console.log('⚠️ This is a template - you need to adapt it with your actual Firebase instance');
  
  // Example of what the migration command would look like:
  console.log(`
To run migration, execute this in your browser console after loading your app:

// 1. Get current user and workspace IDs from your app context
// 2. Run migration
migrateDependencyDataToWorkspace('${userId}', '${workspaceId}', false)
  .then(result => console.log('Migration result:', result))
  .catch(error => console.error('Migration error:', error));
  `);
}