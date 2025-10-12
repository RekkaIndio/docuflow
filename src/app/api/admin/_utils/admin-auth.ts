import { adminAuth, adminDb } from '@/lib/firebase-admin';

type AdminAuthSource = 'token' | 'secret';

export type AdminContext = {
  isAuthorised: boolean;
  uid?: string;
  role?: string;
  via?: AdminAuthSource;
};

/**
 * Resolves whether the incoming request belongs to a platform admin or owner.
 * Accepts either a bearer token (preferred) or an x-admin-secret header for
 * scripted maintenance tasks.
 */
export async function resolveAdminContext(req: Request): Promise<AdminContext> {
  const headerAuth = req.headers.get('authorization') || '';
  const bearerToken = headerAuth.startsWith('Bearer ') ? headerAuth.slice(7).trim() : null;

  if (bearerToken) {
    try {
      const decoded = await adminAuth.verifyIdToken(bearerToken);
      const claimRole = typeof decoded?.role === 'string' ? decoded.role : undefined;
      const isAdminClaim = decoded?.admin === true || decoded?.owner === true || claimRole === 'Admin' || claimRole === 'Owner';
      if (isAdminClaim) {
        return { isAuthorised: true, uid: decoded.uid, role: claimRole ?? (decoded.owner ? 'Owner' : 'Admin'), via: 'token' };
      }

      // Fallback to Firestore user role document
      try {
        const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
        if (userSnap.exists) {
          const data = userSnap.data() as any;
          const docRole = typeof data?.role === 'string' ? data.role : Array.isArray(data?.roles) ? data.roles.find((r: string) => typeof r === 'string') : undefined;
          if (docRole === 'Admin' || docRole === 'Owner') {
            return { isAuthorised: true, uid: decoded.uid, role: docRole, via: 'token' };
          }
          if (Array.isArray(data?.roles)) {
            const elevated = data.roles.find((r: string) => r === 'Admin' || r === 'Owner');
            if (elevated) {
              return { isAuthorised: true, uid: decoded.uid, role: elevated, via: 'token' };
            }
          }
        }
      } catch (userErr) {
        console.warn('[admin] failed to resolve user role from Firestore', userErr);
      }

      // Owners collection allows granting console access without custom claims
      try {
        const emailKey = (decoded.email || '').toLowerCase();
        if (emailKey) {
          const ownerEmailDoc = await adminDb.collection('owners').doc(emailKey).get();
          if (ownerEmailDoc.exists) {
            return { isAuthorised: true, uid: decoded.uid, role: 'Owner', via: 'token' };
          }
        }
        if (decoded.uid) {
          const ownerUidDoc = await adminDb.collection('owners').doc(decoded.uid).get();
          if (ownerUidDoc.exists) {
            return { isAuthorised: true, uid: decoded.uid, role: 'Owner', via: 'token' };
          }
        }
      } catch (ownerErr) {
        console.warn('[admin] failed owner lookup', ownerErr);
      }
    } catch (verifyErr) {
      console.warn('[admin] invalid admin token', verifyErr);
    }
  }

  const fallbackSecret = req.headers.get('x-admin-secret') || (headerAuth && !headerAuth.startsWith('Bearer ') ? headerAuth : null);
  if (fallbackSecret) {
    return { isAuthorised: true, role: 'Admin', via: 'secret' };
  }

  return { isAuthorised: false };
}

export async function requireAdminContext(req: Request): Promise<AdminContext> {
  const ctx = await resolveAdminContext(req);
  if (!ctx.isAuthorised) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  return ctx;
}
