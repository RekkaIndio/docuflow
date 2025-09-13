// Test script to verify audit functionality
// This can be run in the browser console or as a Node.js script

import { getMonthlyAuditCompletionStatus, getLatestAuditData, getMonthlyAuditSnapshots } from './lib/firestore';

// Test function to verify audit data access
export async function testAuditFunctionality(workspaceId: string) {
  console.log('Testing audit functionality for workspace:', workspaceId);

  try {
    // Test 1: Get monthly audit completion status
    console.log('1. Testing getMonthlyAuditCompletionStatus...');
    const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId);
    console.log('Completion status:', completionStatus);

    // Test 2: Get monthly audit snapshots
    console.log('2. Testing getMonthlyAuditSnapshots...');
    const snapshots = await getMonthlyAuditSnapshots(workspaceId);
    console.log('Monthly snapshots:', Object.keys(snapshots).length, 'audit types found');

    // Test 3: Get latest audit data for a specific type (if any exist)
    const auditTypes = Object.keys(completionStatus);
    if (auditTypes.length > 0) {
      const testAuditType = auditTypes[0];
      console.log(`3. Testing getLatestAuditData for ${testAuditType}...`);
      const latestData = await getLatestAuditData(workspaceId, testAuditType);
      console.log('Latest data:', latestData ? 'Found' : 'Not found');
      if (latestData) {
        console.log('Score:', latestData.scorePercent, 'Comments:', latestData.comments);
      }
    }

    console.log('✅ Audit functionality test completed successfully!');
    return { completionStatus, snapshots };

  } catch (error) {
    console.error('❌ Audit functionality test failed:', error);
    throw error;
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testAuditFunctionality = testAuditFunctionality;
}