import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface ExtendedUser {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role?: string;
  status?: string;
  createdAt: string;
  lastLoginAt?: string;
  organisations?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  organisationCount?: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search')?.toLowerCase() || '';
    const organisationId = searchParams.get('organisationId');

    // Require admin secret header to perform global listing
    const headers = (globalThis as any)?.headers?.() || {};
    const adminSecret = (headers['x-admin-secret'] || headers['authorization'] || null);
    if (!adminSecret) return NextResponse.json({ error: 'Missing admin authorization' }, { status: 403 });

    let usersSnap;

    if (organisationId) {
      // If filtering by organisation, get users from org-scoped memberships
      const membershipsSnap = await adminDb
        .collectionGroup('memberships')
        .where('organisationId', '==', organisationId)
        .get();

      const userIds = membershipsSnap.docs.map((doc: any) => doc.data().userId);
      if (userIds.length === 0) {
        return NextResponse.json({ users: [], total: 0 });
      }

      // Get users by IDs
      usersSnap = await adminDb.collection('users').where('__name__', 'in', userIds.slice(0, 10)).get();
    } else {
      // Fetch all users using Firebase Admin SDK
      usersSnap = await adminDb.collection('users').orderBy('createdAt', 'desc').get();
    }

    let users: ExtendedUser[] = [];
    usersSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      // Handle Firebase Admin SDK timestamp objects
      const createdAt = data.createdAt && data.createdAt.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || new Date().toISOString();
      const lastLoginAt = data.lastLoginAt && data.lastLoginAt.toDate
        ? data.lastLoginAt.toDate().toISOString()
        : data.lastLoginAt;

      users.push({
        id: docSnap.id,
        name: data.name || null,
        email: data.email || null,
        avatarUrl: data.avatarUrl || null,
        role: data.role || 'user',
        status: data.status || 'active',
        createdAt,
        lastLoginAt,
      });
    });

    // Apply search filter
    if (search) {
      users = users.filter(user =>
        user.email?.toLowerCase().includes(search) ||
        user.name?.toLowerCase().includes(search) ||
        user.id?.toLowerCase().includes(search)
      );
    }

    // Get organisation info for each user
    const usersWithOrgs = await Promise.all(
      users.map(async (user) => {
        try {
          const membershipsSnap = await adminDb
            .collectionGroup('memberships')
            .where('userId', '==', user.id)
            .limit(5)
            .get();

          const organisations = membershipsSnap.docs.map((doc: any) => ({
            id: doc.data().organisationId,
            name: doc.data().organisationName || 'Unknown',
            role: doc.data().role || 'member',
          }));

          return {
            ...user,
            organisations,
            organisationCount: organisations.length,
          };
        } catch (error) {
          console.warn(`Failed to get organisations for user ${user.id}:`, error);
          return {
            ...user,
            organisations: [],
            organisationCount: 0,
          };
        }
      })
    );

    // Apply pagination
    const total = usersWithOrgs.length;
    const paginatedUsers = usersWithOrgs.slice(offset, offset + limit);

    // Calculate statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalUsers = usersWithOrgs.length;
    const newUsersLast30Days = usersWithOrgs.filter(user =>
      new Date(user.createdAt) >= thirtyDaysAgo
    ).length;
    const newUsersLast7Days = usersWithOrgs.filter(user =>
      new Date(user.createdAt) >= sevenDaysAgo
    ).length;

    const activeUsersLast30Days = usersWithOrgs.filter(user =>
      user.lastLoginAt && new Date(user.lastLoginAt) >= thirtyDaysAgo
    ).length;
    const activeUsersLast7Days = usersWithOrgs.filter(user =>
      user.lastLoginAt && new Date(user.lastLoginAt) >= sevenDaysAgo
    ).length;

    // User role distribution
    const roleDistribution: Record<string, number> = {};
    usersWithOrgs.forEach(user => {
      const role = user.role || 'user';
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    });

    return NextResponse.json({
      users: paginatedUsers,
      total,
      limit,
      offset,
      statistics: {
        totalUsers,
        newUsersLast30Days,
        newUsersLast7Days,
        activeUsersLast30Days,
        activeUsersLast7Days,
        roleDistribution,
      }
    });

  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, updates } = await req.json();

    if (!userId || !updates) {
      return NextResponse.json({ error: 'userId and updates required' }, { status: 400 });
    }

    // Require admin secret header
    const headers = (globalThis as any)?.headers?.() || {};
    const adminSecret = (headers['x-admin-secret'] || headers['authorization'] || null);
    if (!adminSecret) return NextResponse.json({ error: 'Missing admin authorization' }, { status: 403 });

    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      ...updates,
      updatedAt: new Date(),
    });

    // If updating role/status, also update in memberships
    if (updates.role || updates.status) {
      const membershipsSnap = await adminDb
        .collectionGroup('memberships')
        .where('userId', '==', userId)
        .get();

      const batch = adminDb.batch();
      membershipsSnap.docs.forEach((doc: any) => {
        batch.update(doc.ref, {
          ...(updates.role && { role: updates.role }),
          ...(updates.status && { status: updates.status }),
          updatedAt: new Date(),
        });
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('/api/admin/users PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}