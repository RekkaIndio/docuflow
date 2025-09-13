'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LifeBuoy, LogOut, Settings, User as UserIcon, Bell } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useEffect, useState } from 'react';
import { collection, query as fsQuery, orderBy, limit as fsLimit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface TopNavProps {
  onSettingsClick: () => void;
  onNotificationsClick?: () => void;
  unreadCount?: number;
  workspaceId?: string | null;
}

export function TopNav({ onSettingsClick, onNotificationsClick, unreadCount = 0, workspaceId }: TopNavProps) {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [recent, setRecent] = useState<any[]>([]);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const q = fsQuery(collection(db, `workspaces/${workspaceId}/notifications`), orderBy('createdAt', 'desc'), fsLimit(10));
    const unsub = onSnapshot(q, (snap) => {
      const items: any[] = [];
      snap.forEach(d => items.push({ id: d.id, ...(d.data() as any) }));
      setRecent(items);
    });
    return () => unsub();
  }, [workspaceId]);

  useEffect(() => {
    let unsubscribeFromUser: (() => void) | undefined;

    // One-off check: if workspaceId is present and different from user id, try to read any previously-saved profilePicture there
    (async () => {
      try {
        if (workspaceId && workspaceId !== user?.id) {
          const wsDocRef = doc(db, 'users', workspaceId);
          const wsSnap = await getDoc(wsDocRef);
          if (wsSnap.exists()) {
            const data = wsSnap.data();
            if (data?.profilePicture) {
              setProfilePicture(data.profilePicture);
              return; // prefer workspace-saved image until user doc subscription overrides it
            } else if (data?.uploadedLogo) {
              setProfilePicture(data.uploadedLogo);
              return;
            }
          }
        }
      } catch (err) {
        console.error('workspace fallback profile fetch failed', err);
      }
    })();

    // Live subscribe to the authenticated user's doc (this should be the source of truth)
    if (user?.id) {
      const userDocRef = doc(db, 'users', user.id);
      unsubscribeFromUser = onSnapshot(userDocRef, (d) => {
        const data = d.data();
        if (data?.profilePicture) {
          setProfilePicture(data.profilePicture);
        } else if (data?.uploadedLogo) {
          setProfilePicture(data.uploadedLogo);
        }
      });
    }

    return () => {
      if (unsubscribeFromUser) unsubscribeFromUser();
    };
  }, [user?.id, workspaceId]);

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 rounded-bl-lg rounded-br-lg relative z-[9999]">
      {/* Mobile hamburger menu */}
      {isMobile && (
        <div className="flex items-center">
          <SidebarTrigger className="h-8 w-8" />
        </div>
      )}
      
      {/* Right side items */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications bell + popover */}
        <div className="relative">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">{unreadCount}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="z-[100]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Notifications</h4>
                <button
                  className="text-xs text-muted-foreground"
                  onClick={async () => {
                    if (!workspaceId) return;
                    // mark all read
                    try {
                      const qAll = fsQuery(collection(db, `workspaces/${workspaceId}/notifications`), orderBy('createdAt', 'desc'), fsLimit(50));
                      const snap = await (await import('firebase/firestore')).getDocs(qAll);
                      const updates: Promise<any>[] = [];
                      snap.forEach(d => {
                        if (!(d.data() as any).read) {
                          updates.push(updateDoc(doc(db, `workspaces/${workspaceId}/notifications`, d.id), { read: true } as any));
                        }
                      });
                      await Promise.all(updates);
                    } catch (err) {
                      console.error('mark all read failed', err);
                    }
                  }}
                >
                  Mark all
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {recent.length === 0 && <div className="text-sm text-muted-foreground">No notifications</div>}
                {recent.map(n => (
                  <div key={n.id} className={`p-2 rounded-md hover:bg-accent/50 ${n.read ? 'opacity-70' : 'bg-surface'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-muted-foreground">{n.body}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">{n.createdAt ? formatDistanceToNow(n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt), { addSuffix: true }) : ''}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        {!n.read && (
                          <Button size="sm" variant="ghost" onClick={async () => {
                            try {
                              await updateDoc(doc(db, `workspaces/${workspaceId}/notifications`, n.id), { read: true } as any);
                            } catch (err) {
                              console.error('mark read failed', err);
                            }
                          }}>Mark</Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profilePicture ?? user?.avatarUrl ?? undefined} alt={user?.name ?? undefined} />
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
             <DropdownMenuItem onClick={onSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LifeBuoy className="mr-2 h-4 w-4" />
              <span>Help Center</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
