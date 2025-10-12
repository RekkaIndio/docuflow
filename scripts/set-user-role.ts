import admin, { adminAuth, adminDb } from '../src/lib/firebase-admin';

const [,, emailArg, roleArg] = process.argv;

if (!emailArg || !roleArg) {
  console.error('Usage: npx ts-node scripts/set-user-role.ts <email> <owner|admin|member>');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const role = roleArg.trim().toLowerCase();

type RoleKey = 'owner' | 'admin' | 'member';
const roles: Record<RoleKey, { ownerClaim: boolean; adminClaim: boolean; firestoreRole: string }> = {
  owner: { ownerClaim: true, adminClaim: true, firestoreRole: 'Owner' },
  admin: { ownerClaim: false, adminClaim: true, firestoreRole: 'Admin' },
  member: { ownerClaim: false, adminClaim: false, firestoreRole: 'Member' },
};

if (!(role in roles)) {
  console.error('Role must be one of: owner, admin, member');
  process.exit(1);
}

async function main() {
  const config = roles[role as RoleKey];
  const record = await adminAuth.getUserByEmail(email);

  await adminAuth.setCustomUserClaims(record.uid, {
    ...(record.customClaims || {}),
    owner: config.ownerClaim,
    admin: config.adminClaim,
  });

  await adminDb.collection('users').doc(record.uid).set({
    role: config.firestoreRole,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  const ownersCollection = adminDb.collection('owners');
  const ownerDocId = email;
  if (config.ownerClaim) {
    await ownersCollection.doc(ownerDocId).set({
      email,
      uid: record.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } else {
    await ownersCollection.doc(ownerDocId).delete().catch(() => {});
  }

  console.log(`Updated ${email} → owner:${config.ownerClaim} admin:${config.adminClaim}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
