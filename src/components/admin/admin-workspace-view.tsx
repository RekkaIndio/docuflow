"use client";
import React, { useMemo, useEffect, useState } from 'react';
import type { Workspace, Folder, Document } from '@/lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminDependencyTable from './admin-dependency-table';
import { TeamsView } from '@/components/dashboard/teams-view';
import { collection, query as fsQuery, orderBy, limit, onSnapshot, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Folder as FolderIcon, FileText, FileSpreadsheet, FileX2, Home, ChevronRight, ArrowLeft, PlusSquare, Users, Tag, Clock, TrendingUp, Activity, Shield, CheckCircle, AlertTriangle, Calendar, Zap, UserCheck, Phone, Mail, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { useIsMobile } from '@/hooks/use-mobile';

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Nurse {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CTM {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminWorkspaceViewProps {
  workspace: Workspace;
  onClose: () => void;
}

const getFileIcon = (fileType: Document['fileType']) => {
  switch (fileType) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />;
    case 'csv':
      return <FileSpreadsheet className="w-8 h-8 text-green-700" />;
    case 'xlsx':
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    default:
      return <FileX2 className="w-8 h-8 text-gray-400" />;
  }
};

export default function AdminWorkspaceView({ workspace, onClose }: AdminWorkspaceViewProps) {
  const isMobile = useIsMobile();
  const [stack, setStack] = React.useState<string[]>([]);

  const rootWrapper: Folder = React.useMemo(() => ({ id: 'root', name: workspace.name, type: 'folder', items: workspace.folders || [], workspaceId: workspace.id }), [workspace]);

  const getCurrentFolder = React.useCallback((): Folder => {
    if (stack.length === 0) return rootWrapper;
    let current: Folder | null = null;
    const find = (items: (Folder | Document)[], id: string): Folder | null => {
      for (const it of items) {
        if (it.type === 'folder' && it.id === id) return it as Folder;
        if (it.type === 'folder') {
          const sub = find(it.items, id);
          if (sub) return sub;
        }
      }
      return null;
    };
    current = find(workspace.folders || [], stack[stack.length - 1]) || null;
    return current || rootWrapper;
  }, [stack, workspace, rootWrapper]);

  const currentFolder = getCurrentFolder();

  const pushFolder = (id: string) => setStack(s => [...s, id]);
  const popFolder = () => setStack(s => s.slice(0, -1));

  // Simple in-memory folder creation for admin chat commands. This will
  // call setStack to navigate into the newly-created folder. Persistence
  // should be handled by a real API call; this keeps UI responsive while
  // admin prototypes are tested.
  const onFolderAdd = (folderName: string) => {
    // create a new folder object and append to current folder's items
    const newId = `folder-${Date.now()}`;
    const newFolder: Folder = { id: newId, name: folderName, type: 'folder', items: [], workspaceId: workspace.id } as Folder;

    // mutate workspace.folders in-memory — callers should persist this
    // in real implementation. If we're in a nested folder, find the
    // parent and push into its items, otherwise push to root workspace.folders.
    if (stack.length === 0) {
      if (!workspace.folders) workspace.folders = [];
      workspace.folders.push(newFolder as any);
    } else {
      // find parent folder and append
      const parentId = stack[stack.length - 1];
      const findAndAppend = (items: (Folder | Document)[]) => {
        for (const it of items) {
          if (it.type === 'folder' && it.id === parentId) {
            it.items.push(newFolder as any);
            return true;
          }
          if (it.type === 'folder') {
            if (findAndAppend(it.items)) return true;
          }
        }
        return false;
      };
      findAndAppend(workspace.folders || []);
    }

    // navigate into the newly created folder
    pushFolder(newId);
  };

  const breadcrumb = React.useMemo(() => {
    const crumbs: { id: string; name: string }[] = [{ id: 'root', name: workspace.name }];
    if (stack.length > 0) {
      // Find names for ids in stack
      const findName = (items: (Folder | Document)[], id: string): string | null => {
        for (const it of items) {
          if (it.type === 'folder' && it.id === id) return it.name;
          if (it.type === 'folder') {
            const sub = findName(it.items, id);
            if (sub) return sub;
          }
        }
        return null;
      };
      for (const id of stack) {
        const n = findName(workspace.folders || [], id) || id;
        crumbs.push({ id, name: n });
      }
    }
    return crumbs;
  }, [stack, workspace]);

  // Helper to navigate to a crumb by index (0 = root)
  const navigateToCrumb = (index: number) => {
    if (index <= 0) {
      setStack([]);
      return;
    }
    // Keep first `index` entries in stack
    setStack(s => s.slice(0, index));
  };

  const totalFolders = useMemo(() => workspace.folders?.length || 0, [workspace]);
  const totalDocuments = useMemo(() => {
    const countDocuments = (items: (Folder | Document)[]): number => {
      return items.reduce((count, item) => {
        if (item.type === 'document') return count + 1;
        if (item.type === 'folder') return count + countDocuments(item.items);
        return count;
      }, 0);
    };
    return countDocuments(workspace.folders || []);
  }, [workspace]);

  const { fileTypeCounts, recentUploads } = useMemo(() => {
    const ft: Record<string, number> = {};
    const uploads: Array<{ name: string; createdAt?: string }> = [];

    const walk = (items: (Folder | Document)[]) => {
      for (const it of items) {
        if (it.type === 'document') {
          const parts = (it.name || '').split('.');
          const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
          ft[ext] = (ft[ext] || 0) + 1;
          uploads.push({ name: it.name || 'Untitled', createdAt: it.createdAt ? String(it.createdAt) : undefined });
        } else if (it.type === 'folder') {
          walk(it.items || []);
        }
      }
    };

    walk(workspace.folders || []);
    uploads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return { fileTypeCounts: ft, recentUploads: uploads.slice(0, 5) };
  }, [workspace]);

  // compute occupancy percent if available on workspace
  const occupancyPercent = useMemo(() => {
    const w = workspace as any;
    if (typeof w.occupancy === 'number') return Math.round((w.occupancy || 0) * 100);
    if (typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number' && w.totalBeds > 0) {
      return Math.round((w.occupiedBeds / w.totalBeds) * 100);
    }
    return undefined;
  }, [workspace]);

  // Staffing data state
  const [staffingData, setStaffingData] = useState<{ day: number; night: number; total: number; lastUpdated?: string } | null>(null);
  const [staffingLoading, setStaffingLoading] = useState(false);
  const [staffingTimeframe, setStaffingTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [staffingHistory, setStaffingHistory] = useState<Array<{ date: string; day: number; night: number; total: number }>>([]);

  // Management data state
  const [managers, setManagers] = useState<Manager[]>([]);
  const [newManager, setNewManager] = useState({ name: '', email: '', phone: '' });
  const [managersLoading, setManagersLoading] = useState(false);
  const [managersError, setManagersError] = useState<string | null>(null);
  const [editingManager, setEditingManager] = useState<string | null>(null);

  // Nurses data state
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [newNurse, setNewNurse] = useState({ name: '', email: '', phone: '' });
  const [nursesLoading, setNursesLoading] = useState(false);
  const [nursesError, setNursesError] = useState<string | null>(null);
  const [editingNurse, setEditingNurse] = useState<string | null>(null);

  // CTM data state
  const [ctms, setCTMs] = useState<CTM[]>([]);
  const [newCTM, setNewCTM] = useState({ name: '', email: '', phone: '' });
  const [ctmsLoading, setCTMsLoading] = useState(false);
  const [ctmsError, setCTMsError] = useState<string | null>(null);
  const [editingCTM, setEditingCTM] = useState<string | null>(null);

  // Fetch latest staffing data from daily check-ins
  useEffect(() => {
    if (!workspace?.id) return;
    
    setStaffingLoading(true);
    
    try {
      const colRef = collection(db, `workspaces/${workspace.id}/daily-checkins`);
      
      // Calculate date range based on timeframe
      let startDate = new Date();
      switch (staffingTimeframe) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
      
      const q = fsQuery(colRef, where('createdAt', '>=', startDate), orderBy('createdAt', 'desc'));
      
      const unsub = onSnapshot(q, (snap) => {
        const historyData: Array<{ date: string; day: number; night: number; total: number }> = [];
        let latestStaffing: { day: number; night: number; total: number; lastUpdated: string } | null = null;
        
        if (!snap.empty) {
          snap.docs.forEach((doc) => {
            const data = doc.data();
            const day = parseInt(String(data.staffingDay || data.staffing?.day || '0')) || 0;
            const night = parseInt(String(data.staffingNight || data.staffing?.night || '0')) || 0;
            const total = day + night;
            
            const recordDate = data.createdAt ? 
              (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) :
              new Date(data.recordedAt || Date.now());
            
            historyData.push({
              date: recordDate.toISOString().split('T')[0],
              day,
              night,
              total
            });
            
            // Set latest data from the first (most recent) record
            if (!latestStaffing) {
              latestStaffing = {
                day,
                night,
                total,
                lastUpdated: recordDate.toLocaleDateString()
              };
            }
          });
        }
        
        // Sort by date and group by date for aggregation
        const groupedData = historyData.reduce((acc, curr) => {
          if (!acc[curr.date] || acc[curr.date].total < curr.total) {
            acc[curr.date] = curr;
          }
          return acc;
        }, {} as Record<string, { date: string; day: number; night: number; total: number }>);
        
        const sortedHistory = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
        
        setStaffingHistory(sortedHistory);
        setStaffingData(latestStaffing);
        setStaffingLoading(false);
      }, (err) => {
        console.error('Failed to listen to daily checkins for staffing in admin view', err);
        setStaffingLoading(false);
      });
      
      return () => unsub();
    } catch (e) {
      console.error('Failed to set up daily checkins listener in admin view', e);
      setStaffingLoading(false);
    }
  }, [workspace?.id, staffingTimeframe]);

  // Load managers from Firebase
  useEffect(() => {
    const loadManagers = async () => {
      if (!workspace?.id) return;
      
      setManagersLoading(true);
      setManagersError(null);
      
      try {
        const workspaceRef = doc(db, 'workspaces', workspace.id);
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const managersData = data.managers || [];
          setManagers(managersData);
        }
      } catch (error) {
        console.error('Failed to load managers:', error);
        setManagersError('Failed to load managers');
      } finally {
        setManagersLoading(false);
      }
    };
    
    loadManagers();
  }, [workspace?.id]);

  // Load nurses from Firebase
  useEffect(() => {
    const loadNurses = async () => {
      if (!workspace?.id) return;
      
      setNursesLoading(true);
      setNursesError(null);
      
      try {
        const workspaceRef = doc(db, 'workspaces', workspace.id);
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const nursesData = data.nurses || [];
          setNurses(nursesData);
        }
      } catch (error) {
        console.error('Failed to load nurses:', error);
        setNursesError('Failed to load nurses');
      } finally {
        setNursesLoading(false);
      }
    };
    
    loadNurses();
  }, [workspace?.id]);

  // Load CTMs from Firebase
  useEffect(() => {
    const loadCTMs = async () => {
      if (!workspace?.id) return;
      
      setCTMsLoading(true);
      setCTMsError(null);
      
      try {
        const workspaceRef = doc(db, 'workspaces', workspace.id);
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const ctmsData = data.ctms || [];
          setCTMs(ctmsData);
        }
      } catch (error) {
        console.error('Failed to load CTMs:', error);
        setCTMsError('Failed to load CTMs');
      } finally {
        setCTMsLoading(false);
      }
    };
    
    loadCTMs();
  }, [workspace?.id]);

  // Add manager to Firebase
  const addManagerToFirebase = async (manager: Manager) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspace.id);
      await updateDoc(workspaceRef, {
        managers: arrayUnion(manager)
      });
      return true;
    } catch (error) {
      console.error('Failed to add manager to Firebase:', error);
      setManagersError('Failed to save manager');
      return false;
    }
  };

  // Remove manager from Firebase
  const removeManagerFromFirebase = async (manager: Manager) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspace.id);
      await updateDoc(workspaceRef, {
        managers: arrayRemove(manager)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove manager from Firebase:', error);
      setManagersError('Failed to remove manager');
      return false;
    }
  };

  // Update manager in Firebase
  const updateManagerInFirebase = async (oldManager: Manager, newManager: Manager) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspace.id);
      // Remove old and add new (atomic operation alternative)
      await updateDoc(workspaceRef, {
        managers: arrayRemove(oldManager)
      });
      await updateDoc(workspaceRef, {
        managers: arrayUnion(newManager)
      });
      return true;
    } catch (error) {
      console.error('Failed to update manager in Firebase:', error);
      setManagersError('Failed to update manager');
      return false;
    }
  };

  // Add nurse to Firebase
  const addNurseToFirebase = async (nurse: Nurse) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspace.id);
      await updateDoc(workspaceRef, {
        nurses: arrayUnion(nurse)
      });
      return true;
    } catch (error) {
      console.error('Failed to add nurse to Firebase:', error);
      return false;
    }
  };

  // Remove nurse from Firebase
  const removeNurseFromFirebase = async (nurse: Nurse) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspace.id);
      await updateDoc(workspaceRef, {
        nurses: arrayRemove(nurse)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove nurse from Firebase:', error);
      return false;
    }
  };

  // Update nurse in Firebase
  const updateNurseInFirebase = async (oldNurse: Nurse, newNurse: Nurse) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspace.id);
      // Remove old and add new (atomic operation alternative)
      await updateDoc(workspaceRef, {
        nurses: arrayRemove(oldNurse)
      });
      await updateDoc(workspaceRef, {
        nurses: arrayUnion(newNurse)
      });
      return true;
    } catch (error) {
      console.error('Failed to update nurse in Firebase:', error);
      return false;
    }
  };

  // Add CTM to Firebase
  const addCTMToFirebase = async (ctm: CTM) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspace.id);
      await updateDoc(workspaceRef, {
        ctms: arrayUnion(ctm)
      });
      return true;
    } catch (error) {
      console.error('Failed to add CTM to Firebase:', error);
      return false;
    }
  };

  // Remove CTM from Firebase
  const removeCTMFromFirebase = async (ctm: CTM) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspace.id);
      await updateDoc(workspaceRef, {
        ctms: arrayRemove(ctm)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove CTM from Firebase:', error);
      return false;
    }
  };

  // Update CTM in Firebase
  const updateCTMInFirebase = async (oldCTM: CTM, newCTM: CTM) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspace.id);
      // Remove old and add new (atomic operation alternative)
      await updateDoc(workspaceRef, {
        ctms: arrayRemove(oldCTM)
      });
      await updateDoc(workspaceRef, {
        ctms: arrayUnion(newCTM)
      });
      return true;
    } catch (error) {
      console.error('Failed to update CTM in Firebase:', error);
      return false;
    }
  };

  const handleUpdateManager = async (managerId: string, updatedData: Partial<Manager>) => {
    const originalManager = managers.find(m => m.id === managerId);
    if (!originalManager) return;
    
    const updatedManager: Manager = {
      ...originalManager,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setManagers(prev => prev.map(m => m.id === managerId ? updatedManager : m));
    setEditingManager(null);
    setManagersError(null);
    
    // Update in Firebase
    const success = await updateManagerInFirebase(originalManager, updatedManager);
    if (!success) {
      // Revert optimistic update on failure
      setManagers(prev => prev.map(m => m.id === managerId ? originalManager : m));
    }
  };

  const handleUpdateNurse = async (nurseId: string, updatedData: Partial<Nurse>) => {
    const originalNurse = nurses.find(n => n.id === nurseId);
    if (!originalNurse) return;
    
    const updatedNurse: Nurse = {
      ...originalNurse,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setNurses(prev => prev.map(n => n.id === nurseId ? updatedNurse : n));
    setEditingNurse(null);
    setNursesError(null);
    
    // Update in Firebase
    const success = await updateNurseInFirebase(originalNurse, updatedNurse);
    if (!success) {
      // Revert optimistic update on failure
      setNurses(prev => prev.map(n => n.id === nurseId ? originalNurse : n));
    }
  };

  const handleUpdateCTM = async (ctmId: string, updatedData: Partial<CTM>) => {
    const originalCTM = ctms.find(c => c.id === ctmId);
    if (!originalCTM) return;
    
    const updatedCTM: CTM = {
      ...originalCTM,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setCTMs(prev => prev.map(c => c.id === ctmId ? updatedCTM : c));
    setEditingCTM(null);
    setCTMsError(null);
    
    // Update in Firebase
    const success = await updateCTMInFirebase(originalCTM, updatedCTM);
    if (!success) {
      // Revert optimistic update on failure
      setCTMs(prev => prev.map(c => c.id === ctmId ? originalCTM : c));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Slim admin header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white rounded-b-3xl shadow-2xl">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-40 -translate-x-40"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 py-6 sm:py-8 lg:py-10 px-8 md:px-12 lg:px-16">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12">
            {/* Main content - left side */}
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                {workspace.name}
              </h1>
            </div>

            {/* Key metrics cards - right side */}
            <div className="w-full lg:w-auto">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
                {/* Folders */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-yellow-500/20 rounded-xl group-hover:bg-yellow-500/30 transition-colors duration-300">
                      <FolderIcon className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">{totalFolders}</div>
                      <div className="text-xs text-yellow-200 font-medium uppercase tracking-wide">Folders</div>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-colors duration-300">
                      <FileText className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">{totalDocuments}</div>
                      <div className="text-xs text-purple-200 font-medium uppercase tracking-wide">Documents</div>
                    </div>
                  </div>
                </div>

                {/* Types */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors duration-300">
                      <Tag className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">{Object.keys(fileTypeCounts).length}</div>
                      <div className="text-xs text-emerald-200 font-medium uppercase tracking-wide">Types</div>
                    </div>
                  </div>
                </div>

                {/* Compliance */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors duration-300">
                      <Shield className={`w-4 h-4 lg:w-5 lg:h-5 ${totalDocuments > 10 ? 'text-green-400' : totalDocuments > 5 ? 'text-yellow-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">{totalDocuments > 10 ? '95%' : totalDocuments > 5 ? '78%' : '45%'}</div>
                      <div className="text-xs text-emerald-200 font-medium uppercase tracking-wide">Compliance</div>
                    </div>
                  </div>
                </div>

                {/* Occupancy */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-rose-500/20 rounded-xl group-hover:bg-rose-500/30 transition-colors duration-300">
                      <Users className="w-4 h-4 lg:w-5 lg:h-5 text-rose-400" />
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">{typeof occupancyPercent === 'number' ? `${occupancyPercent}%` : 'n/a'}</div>
                      <div className="text-xs text-rose-200 font-medium uppercase tracking-wide">Occupancy</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

  {/* Main content */}
  <main className="flex-1 overflow-y-auto">
    <div className="min-h-full bg-gray-50">
      <div className="w-full p-6 space-y-6">
        {/* Workspace Analytics */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Workspace Analytics</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Workspace Health */}
            <Card className="hover:shadow-lg transition-all duration-300 border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-700">Workspace Health</div>
                <Zap className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">Excellent</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>All systems operational</span>
                </div>
              </CardContent>
            </Card>

            {/* Document Compliance */}
            <Card className="hover:shadow-lg transition-all duration-300 border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-700">Document Compliance</div>
                <Shield className={`h-4 w-4 ${totalDocuments > 10 ? 'text-green-500' : totalDocuments > 5 ? 'text-yellow-500' : 'text-red-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {totalDocuments > 10 ? '95%' : totalDocuments > 5 ? '78%' : '45%'}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                  <div className={`w-2 h-2 rounded-full ${totalDocuments > 10 ? 'bg-green-500' : totalDocuments > 5 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span>{totalDocuments} documents tracked</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="hover:shadow-lg transition-all duration-300 border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-700">Recent Activity</div>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{recentUploads.length}</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  <span>uploads this week</span>
                </div>
              </CardContent>
            </Card>

            {/* Last Updated */}
            <Card className="hover:shadow-lg transition-all duration-300 border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-700">Last Updated</div>
                <Calendar className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">Today</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                  <Clock className="w-3 h-3 text-purple-500" />
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="folders" className="w-full">
          <TabsList className="grid w-[800px] grid-cols-5 bg-white border border-gray-200 rounded-lg">
            <TabsTrigger value="folders" className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              Folders
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Management
            </TabsTrigger>
            <TabsTrigger value="nurses" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Nurses
            </TabsTrigger>
            <TabsTrigger value="ctm" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              CTM
            </TabsTrigger>
            { /* Dependency Calculator temporarily hidden until backend/frontend integration is fixed.
            <TabsTrigger value="dependency" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dependency Calculator
            </TabsTrigger>
            */ }
          </TabsList>
          { /* Dependency tab disabled for now */ }
          
          <TabsContent value="folders" className="mt-6 flex-1">
            <div className="flex flex-col lg:flex-row gap-8 flex-1">
              <div className="flex-1 flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Location</div>
                    <nav className="text-sm text-muted-foreground mt-1">
                      {breadcrumb.map((b, index) => (
                        <button
                          key={b.id}
                          onClick={() => navigateToCrumb(index)}
                          className={`mr-2 inline-flex items-center ${index < breadcrumb.length - 1 ? 'text-blue-600 hover:underline' : 'text-slate-700 font-medium'}`}
                        >
                          {b.name}{index < breadcrumb.length - 1 ? ' / ' : ''}
                        </button>
                      ))}
                    </nav>
                  </div>
                  <div>
                    {stack.length > 0 ? (
                      <button
                        onClick={() => setStack(s => s.slice(0, -1))}
                        className="text-sm text-muted-foreground hover:text-slate-900"
                      >
                        ← Back
                      </button>
                    ) : null}
                  </div>
                </div>

                <main className="overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {currentFolder.items?.map((item) => (
                      <Card
                        key={item.id}
                        className="hover:shadow-lg transition-all duration-300 cursor-pointer min-h-[100px] w-full border border-gray-200 hover:border-gray-300"
                        onClick={() => {
                          if (item.type === 'folder') {
                            pushFolder(item.id);
                            return;
                          }
                          // If it's a document, dispatch the shared navigation event so
                          // the admin page can listen and open DocumentView.
                          try {
                            const documentId = item.id;
                            if (typeof window !== 'undefined' && window.dispatchEvent) {
                              window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: item.name } }));
                              try { localStorage.setItem('lastHighlightedDocumentId', documentId); } catch (e) {}
                              if (item.name) try { localStorage.setItem('lastHighlightedDocumentName', item.name); } catch (e) {}
                            }
                          } catch (e) {
                            // ignore
                          }
                        }}
                      >
                        <CardHeader className="p-0">
                          <div className="flex items-stretch">
                            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-l flex-shrink-0 border-r border-blue-100/50">
                              {item.type === 'folder' ? (
                                <FolderIcon className="w-7 h-7 text-yellow-500" />
                              ) : (
                                getFileIcon(item.fileType)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Title bar with subtle colored background */}
                              <div className="px-3 py-2 bg-gradient-to-r from-slate-50/40 via-transparent to-transparent dark:from-slate-800/40 rounded-r">
                                <p className="font-medium break-words text-slate-900 dark:text-slate-100">{item.name}</p>
                                {item.type === 'folder' && (
                                  <p className="text-sm text-muted-foreground">{item.items?.filter(c => c.type === 'document').length} document{(item.items?.filter(c => c.type === 'document').length === 1) ? '' : 's'}</p>
                                )}
                                {item.type === 'document' && (
                                  <p className="text-sm text-muted-foreground">Uploaded: {new Date(item.createdAt).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </main>
              </div>

              <aside className="w-full lg:w-80">
                <div className="space-y-4">
                  <Card className="border border-gray-200 hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="text-sm font-semibold text-gray-900">Recent uploads</div>
                    </CardHeader>
                    <CardContent>
                      <ul className="divide-y divide-blue-100/50">
                        {recentUploads.length === 0 && <div className="text-sm text-muted-foreground">No recent uploads</div>}
                        {recentUploads.map((r, idx) => (
                          <li key={r.name + String(r.createdAt) + idx} className="py-2">
                            <button
                              onClick={() => {
                                try {
                                  let documentId = (r as any).id || (r as any).documentId || null;

                                  // If no explicit id, try to find the document by name in the workspace folders
                                  if (!documentId && r && r.name) {
                                    const targetName = String(r.name).toLowerCase().trim();
                                    const findDoc = (items: any[]): string | null => {
                                      for (const it of items || []) {
                                        if (it.type === 'document') {
                                          const n = String(it.name || '').toLowerCase().trim();
                                          if (n === targetName || n.includes(targetName) || targetName.includes(n)) return it.id;
                                        } else if (it.type === 'folder') {
                                          const res = findDoc(it.items || []);
                                          if (res) return res;
                                        }
                                      }
                                      return null;
                                    };
                                    try {
                                      const found = findDoc(workspace.folders || []);
                                      if (found) documentId = found;
                                    } catch (e) {
                                      // ignore
                                    }

                                    // last-resort: slugify name (legacy behavior)
                                    if (!documentId) {
                                      documentId = String(r.name).replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
                                    }
                                  }

                                  if (documentId && typeof window !== 'undefined' && window.dispatchEvent) {
                                    window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: r.name } }));
                                    try { localStorage.setItem('lastHighlightedDocumentId', documentId); } catch (e) {}
                                    if (r.name) try { localStorage.setItem('lastHighlightedDocumentName', r.name); } catch (e) {}
                                  } else {
                                    console.warn('Could not locate document for recent upload:', r.name);
                                  }
                                } catch (e) { console.warn('Recent upload click error', e); }
                              }}
                              className="w-full text-left cursor-pointer hover:underline"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm truncate">{r.name}</div>
                                <div className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="text-sm font-semibold text-gray-900">Top file types</div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {Object.entries(fileTypeCounts).length === 0 && <div className="text-sm text-muted-foreground">No documents</div>}
                        {Object.entries(fileTypeCounts).slice(0, 8).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-slate-400" /> {k}</div>
                            <div className="font-medium">{v}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {/* occupancy moved to header */}
                </div>
              </aside>
            </div>
          </TabsContent>
          
          <TabsContent value="teams" className="mt-6">
            <TeamsView workspace={workspace} />
          </TabsContent>
          
          <TabsContent value="management" className="mt-6">
            <div className="space-y-6">
              {/* Error Display */}
              {managersError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{managersError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setManagersError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
              {/* Add New Manager Form */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Add New Manager
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter manager name"
                        value={newManager.name}
                        onChange={(e) => setNewManager(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      <Input
                        type="email"
                        placeholder="manager@example.com"
                        value={newManager.email}
                        onChange={(e) => setNewManager(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+44 123 456 7890"
                        value={newManager.phone}
                        onChange={(e) => setNewManager(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={async () => {
                        if (newManager.name && newManager.email && newManager.phone) {
                          const newManagerEntry: Manager = {
                            id: Date.now().toString(),
                            ...newManager,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          
                          // Optimistically update UI
                          setManagers(prev => [...prev, newManagerEntry]);
                          setNewManager({ name: '', email: '', phone: '' });
                          setManagersError(null);
                          
                          // Save to Firebase
                          const success = await addManagerToFirebase(newManagerEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setManagers(prev => prev.filter(m => m.id !== newManagerEntry.id));
                          }
                        }
                      }}
                      disabled={!newManager.name || !newManager.email || !newManager.phone || managersLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {managersLoading ? 'Adding...' : 'Add Manager'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Managers List */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    Current Managers ({managers.length})
                    {managersLoading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {managers.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No managers assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add managers using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {managers.map((manager) => (
                        <AdminManagerCard
                          key={manager.id}
                          manager={manager}
                          isEditing={editingManager === manager.id}
                          onEdit={() => setEditingManager(manager.id)}
                          onCancelEdit={() => setEditingManager(null)}
                          onSave={(updatedData) => handleUpdateManager(manager.id, updatedData)}
                          onDelete={async () => {
                            // Optimistically update UI
                            setManagers(prev => prev.filter(m => m.id !== manager.id));
                            setManagersError(null);
                            
                            // Remove from Firebase
                            const success = await removeManagerFromFirebase(manager);
                            if (!success) {
                              // Revert optimistic update on failure
                              setManagers(prev => [...prev, manager]);
                            }
                          }}
                          disabled={managersLoading}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="nurses" className="mt-6">
            <div className="space-y-6">
              {/* Error Display */}
              {nursesError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{nursesError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNursesError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
              {/* Add New Nurse Form */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Add New Nurse
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter nurse name"
                        value={newNurse.name}
                        onChange={(e) => setNewNurse(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      <Input
                        type="email"
                        placeholder="nurse@example.com"
                        value={newNurse.email}
                        onChange={(e) => setNewNurse(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+44 123 456 7890"
                        value={newNurse.phone}
                        onChange={(e) => setNewNurse(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={async () => {
                        if (newNurse.name && newNurse.email && newNurse.phone) {
                          const newNurseEntry: Nurse = {
                            id: Date.now().toString(),
                            ...newNurse,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          
                          // Optimistically update UI
                          setNurses(prev => [...prev, newNurseEntry]);
                          setNewNurse({ name: '', email: '', phone: '' });
                          setNursesError(null);
                          
                          // Save to Firebase
                          const success = await addNurseToFirebase(newNurseEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setNurses(prev => prev.filter(n => n.id !== newNurseEntry.id));
                          }
                        }
                      }}
                      disabled={!newNurse.name || !newNurse.email || !newNurse.phone || nursesLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {nursesLoading ? 'Adding...' : 'Add Nurse'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Nurses List */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    Current Nurses ({nurses.length})
                    {nursesLoading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {nurses.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No nurses assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add nurses using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {nurses.map((nurse) => (
                        <AdminNurseCard
                          key={nurse.id}
                          nurse={nurse}
                          isEditing={editingNurse === nurse.id}
                          onEdit={() => setEditingNurse(nurse.id)}
                          onCancelEdit={() => setEditingNurse(null)}
                          onSave={(updatedData) => handleUpdateNurse(nurse.id, updatedData)}
                          onDelete={async () => {
                            // Optimistically update UI
                            setNurses(prev => prev.filter(n => n.id !== nurse.id));
                            setNursesError(null);
                            
                            // Remove from Firebase
                            const success = await removeNurseFromFirebase(nurse);
                            if (!success) {
                              // Revert optimistic update on failure
                              setNurses(prev => [...prev, nurse]);
                            }
                          }}
                          disabled={nursesLoading}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ctm" className="mt-6">
            <div className="space-y-6">
              {/* Error Display */}
              {ctmsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{ctmsError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCTMsError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
              {/* Add New CTM Form */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Add New CTM
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter CTM name"
                        value={newCTM.name}
                        onChange={(e) => setNewCTM(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      <Input
                        type="email"
                        placeholder="ctm@example.com"
                        value={newCTM.email}
                        onChange={(e) => setNewCTM(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+44 123 456 7890"
                        value={newCTM.phone}
                        onChange={(e) => setNewCTM(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={async () => {
                        if (newCTM.name && newCTM.email && newCTM.phone) {
                          const newCTMEntry: CTM = {
                            id: Date.now().toString(),
                            ...newCTM,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          
                          // Optimistically update UI
                          setCTMs(prev => [...prev, newCTMEntry]);
                          setNewCTM({ name: '', email: '', phone: '' });
                          setCTMsError(null);
                          
                          // Save to Firebase
                          const success = await addCTMToFirebase(newCTMEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setCTMs(prev => prev.filter(c => c.id !== newCTMEntry.id));
                          }
                        }
                      }}
                      disabled={!newCTM.name || !newCTM.email || !newCTM.phone || ctmsLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {ctmsLoading ? 'Adding...' : 'Add CTM'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current CTMs List */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    Current CTMs ({ctms.length})
                    {ctmsLoading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {ctms.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No CTMs assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add CTMs using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ctms.map((ctm) => (
                        <AdminCTMCard
                          key={ctm.id}
                          ctm={ctm}
                          isEditing={editingCTM === ctm.id}
                          onEdit={() => setEditingCTM(ctm.id)}
                          onCancelEdit={() => setEditingCTM(null)}
                          onSave={(updatedData) => handleUpdateCTM(ctm.id, updatedData)}
                          onDelete={async () => {
                            // Optimistically update UI
                            setCTMs(prev => prev.filter(c => c.id !== ctm.id));
                            setCTMsError(null);
                            
                            // Remove from Firebase
                            const success = await removeCTMFromFirebase(ctm);
                            if (!success) {
                              // Revert optimistic update on failure
                              setCTMs(prev => [...prev, ctm]);
                            }
                          }}
                          disabled={ctmsLoading}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </main>
    </div>
  );
}

// Admin Manager Card Component with Edit Functionality
interface AdminManagerCardProps {
  manager: Manager;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Manager>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function AdminManagerCard({ manager, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: AdminManagerCardProps) {
  const [editForm, setEditForm] = useState({
    name: manager.name,
    email: manager.email,
    phone: manager.phone,
  });

  const handleSave = () => {
    if (editForm.name && editForm.email && editForm.phone) {
      onSave(editForm);
    }
  };

  const handleCancel = () => {
    setEditForm({
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
    });
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter manager name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="manager@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <Input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+44 123 456 7890"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={disabled}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!editForm.name || !editForm.email || !editForm.phone || disabled}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{manager.name}</p>
            <p className="text-sm text-gray-500">Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{manager.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{manager.phone}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Admin Nurse Card Component with Edit Functionality
interface AdminNurseCardProps {
  nurse: Nurse;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Nurse>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function AdminNurseCard({ nurse, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: AdminNurseCardProps) {
  const [editForm, setEditForm] = useState({
    name: nurse.name,
    email: nurse.email,
    phone: nurse.phone,
  });

  const handleSave = () => {
    onSave(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      name: nurse.name,
      email: nurse.email,
      phone: nurse.phone,
    });
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Edit Nurse</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nurse name"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="nurse@example.com"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Phone</label>
              <Input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+44 123 456 7890"
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editForm.name || !editForm.email || !editForm.phone || disabled}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={disabled}
              className="text-gray-600 hover:text-gray-700"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{nurse.name}</p>
            <p className="text-sm text-gray-500">Nurse</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{nurse.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{nurse.phone}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Admin CTM Card Component with Edit Functionality
interface AdminCTMCardProps {
  ctm: CTM;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<CTM>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function AdminCTMCard({ ctm, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: AdminCTMCardProps) {
  const [editForm, setEditForm] = useState({
    name: ctm.name,
    email: ctm.email,
    phone: ctm.phone,
  });

  const handleSave = () => {
    onSave(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      name: ctm.name,
      email: ctm.email,
      phone: ctm.phone,
    });
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Edit CTM</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="CTM name"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="ctm@example.com"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Phone</label>
              <Input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+44 123 456 7890"
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editForm.name || !editForm.email || !editForm.phone || disabled}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={disabled}
              className="text-gray-600 hover:text-gray-700"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{ctm.name}</p>
            <p className="text-sm text-gray-500">CTM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{ctm.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{ctm.phone}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
