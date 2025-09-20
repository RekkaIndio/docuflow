import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface ExtendedUser {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export async function GET() {
  try {
    // Require admin secret header to perform global listing
    const headers = (globalThis as any)?.headers?.() || {};
    const adminSecret = (headers['x-admin-secret'] || headers['authorization'] || null);
    if (!adminSecret) return NextResponse.json({ error: 'Missing admin authorization' }, { status: 403 });

    // Fetch all users using Firebase Admin SDK
    const usersSnap = await adminDb.collection('users').get();
    
    const users: ExtendedUser[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
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
        createdAt,
        lastLoginAt,
      });
    });

    // Calculate statistics
    const totalUsers = users.length;
    const newUsersLast30Days = users.filter(user => 
      new Date(user.createdAt) >= thirtyDaysAgo
    ).length;
    const newUsersLast7Days = users.filter(user => 
      new Date(user.createdAt) >= sevenDaysAgo
    ).length;
    
    const activeUsersLast30Days = users.filter(user => 
      user.lastLoginAt && new Date(user.lastLoginAt) >= thirtyDaysAgo
    ).length;
    const activeUsersLast7Days = users.filter(user => 
      user.lastLoginAt && new Date(user.lastLoginAt) >= sevenDaysAgo
    ).length;

    // Calculate daily registration trends for last 30 days
    const registrationTrends: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = users.filter(user => 
        user.createdAt.split('T')[0] === dateStr
      ).length;
      registrationTrends.push({ date: dateStr, count });
    }

    // Calculate daily activity trends for last 30 days
    const activityTrends: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = users.filter(user => 
        user.lastLoginAt && user.lastLoginAt.split('T')[0] === dateStr
      ).length;
      activityTrends.push({ date: dateStr, count });
    }

    // User role distribution
    const roleDistribution: Record<string, number> = {};
    users.forEach(user => {
      const role = user.role || 'user';
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    });

    // Recent users (last 10)
    const recentUsers = users.slice(0, 10).map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }));

    return NextResponse.json({
      users: recentUsers,
      statistics: {
        totalUsers,
        newUsersLast30Days,
        newUsersLast7Days,
        activeUsersLast30Days,
        activeUsersLast7Days,
        registrationTrends,
        activityTrends,
        roleDistribution,
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch user statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch user statistics' }, { status: 500 });
  }
}