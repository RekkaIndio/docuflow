import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

export async function listWorkspaces(): Promise<void> {
  try {
    const workspacesRef = collection(db, 'workspaces');
    const snapshot = await getDocs(workspacesRef);

    console.log('📋 Available workspaces:');
    console.log('─'.repeat(50));

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Name: ${data.name || 'Unnamed'}`);
      console.log(`Owner: ${data.ownerId || 'Unknown'}`);
      console.log('─'.repeat(50));
    });

    if (snapshot.empty) {
      console.log('No workspaces found.');
    }
  } catch (e) {
    console.error('❌ Failed to list workspaces', e);
    throw e;
  }
}

listWorkspaces()
  .then(() => {
    console.log('✅ Script completed successfully');
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });