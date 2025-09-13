import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBOGMIxYo4CghJwuih8Pm4aYtlFHRYFQFI",
  authDomain: "docuflow-9a786.firebaseapp.com",
  projectId: "docuflow-9a786",
  storageBucket: "docuflow-9a786.firebasestorage.app",
  messagingSenderId: "395381702589",
  appId: "1:395381702589:web:605bf757e6116106b59cd4",
  measurementId: "G-HCKFLVYC7Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function clearAuditStatus(workspaceId: string): Promise<void> {
  try {
    const statusRef = doc(db, `workspaces/${workspaceId}/settings`, 'audit_status');
    await deleteDoc(statusRef);
    console.log('✅ Audit status cleared for workspace:', workspaceId);
  } catch (e) {
    console.error('❌ Failed to clear audit status', e);
    throw e;
  }
}

// Get workspace ID from command line arguments
const workspaceId = process.argv[2];

if (!workspaceId) {
  console.error('❌ Please provide a workspace ID as an argument');
  console.log('Usage: npx tsx scripts/clear-audit-status.ts <workspace-id>');
  process.exit(1);
}

clearAuditStatus(workspaceId)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });