'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';
import { db } from '@/lib/firebase';
import { workspaceCollectionPath } from '@/lib/paths';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { getWorkspaceCollectionRef, getWorkspaceDocRef } from '@/lib/firestore';

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  type?: string;
  createdAt?: any;
  read?: boolean;
  meta?: any;
}

export function NotificationsView({ workspaceId, onBack }: { workspaceId: string; onBack?: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!workspaceId) return;
  const notificationsColRef = getWorkspaceCollectionRef(workspaceId, 'notifications', null);
  if (!notificationsColRef) return;
  const q = query(notificationsColRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap: any) => {
      const notifs: NotificationItem[] = [];
      snap.forEach((docSnap: any) => {
        const data = docSnap.data();
        notifs.push({ id: docSnap.id, ...data } as NotificationItem);
      });
      setItems(notifs);
      setLoading(false);
    }, err => {
      console.error('Failed to listen to notifications', err);
      setLoading(false);
    });

    return () => unsub();
  }, [workspaceId]);

  const markRead = async (id: string) => {
    try {
  const d = getWorkspaceDocRef(workspaceId, 'notifications', id, null);
      if (d) await updateDoc(d, { read: true });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  }

  const markAllRead = async () => {
    try {
  const notificationsColRef = getWorkspaceCollectionRef(workspaceId, 'notifications', null);
      if (!notificationsColRef) return;
      const q = query(notificationsColRef, where('read', '==', false));
      const snap = await getDocs(q);
      const updates = snap.docs.map((d: any) => {
        const docRef = getWorkspaceDocRef(workspaceId, 'notifications', d.id, null);
        return docRef ? updateDoc(docRef, { read: true }) : Promise.resolve();
      });
      await Promise.all(updates);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack}>Back</Button>
          <Button onClick={markAllRead}>Mark all read</Button>
        </div>
      </div>

      {loading && <div>Loading...</div>}

      {!loading && items.length === 0 && (
        <Card className="p-6">You're all caught up — no notifications.</Card>
      )}

      <div className="space-y-3">
        {items.map(item => (
          <Card key={item.id} className={`p-4 ${item.read ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{item.title}</div>
                {item.body && <div className="text-sm text-muted-foreground mt-1">{item.body}</div>}
                <div className="text-xs text-muted-foreground mt-2">{item.createdAt ? formatDistanceToNow(item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt), { addSuffix: true }) : ''}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {!item.read && <Button size="sm" onClick={() => markRead(item.id)}>Mark read</Button>}
                {item.meta && <pre className="text-xs text-muted-foreground">{JSON.stringify(item.meta)}</pre>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
