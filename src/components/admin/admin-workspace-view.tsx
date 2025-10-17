"use client";
import React, { useMemo, useEffect, useState } from 'react';
import type { Workspace, Folder, Document } from '@/lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TeamsView } from '@/components/dashboard/teams-view';
import { NewTeamDialog } from '@/components/dashboard/new-team-dialog';
import { collection, query as fsQuery, orderBy, limit, onSnapshot, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { workspaceCollectionPath, workspaceDocPath } from '@/lib/paths';
import { Folder as FolderIcon, FileText, FileSpreadsheet, FileX2, Home, ChevronRight, ArrowLeft, PlusSquare, Users, Tag, Clock, TrendingUp, Activity, Shield, CheckCircle, AlertTriangle, Calendar, Zap, UserCheck, Phone, Mail, Plus, Trash2, Edit, Save, X, BarChart2 } from 'lucide-react';
// AdminDependencyTable and OccupancyPie were removed as they're not used in this view
import StatsView from '@/components/admin/admin-stats-view';
import AuditsView from './admin-audits-view';
import { AdminRotasView } from './admin-rotas-view';
import { useIsMobile } from '@/hooks/use-mobile';

interface Manager {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Nurse {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CTM {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Domestic {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Maintenance {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Kitchen {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Activities {
  id: string;
  name: string;
  roles: string;
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

  // Local wrapper to expose the NewTeamDialog trigger in the admin view
  function NewTeamDialogWrapper({ workspaceId }: { workspaceId?: string }) {
    return (
      <NewTeamDialog onTeamCreated={() => { /* handled inside TeamsView via realtime fetch */ }} workspaceId={workspaceId}>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white border border-transparent">
          <Plus className="mr-2 h-4 w-4 text-white" />
          Create New Team
        </Button>
      </NewTeamDialog>
    );
  }

  const pushFolder = (id: string) => setStack(s => [...s, id]);
  const popFolder = () => setStack(s => s.slice(0, -1));

  // onFolderAdd helper intentionally removed — folder creation in the
  // admin view is handled elsewhere or via backend APIs. Keeping the
  // in-memory mutator caused unused code and lint noise.

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

  // Dependency data (residents & communities)
  const [residents, setResidents] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [dependencyLoading, setDependencyLoading] = useState(false);
  // Aggregates for stats (workspace-scoped)
  const [aggregateWoundsData, setAggregateWoundsData] = useState<any>(null);
  const [aggregateFallsData, setAggregateFallsData] = useState<any>(null);
  const [aggregateInfectionData, setAggregateInfectionData] = useState<any>(null);
  const [aggregateAuditData, setAggregateAuditData] = useState<any>(null);

  // Management data state
  const [managers, setManagers] = useState<Manager[]>([]);
  const [newManager, setNewManager] = useState({ name: '', roles: '', email: '', phone: '' });
  const [managersLoading, setManagersLoading] = useState(false);
  const [managersError, setManagersError] = useState<string | null>(null);
  const [editingManager, setEditingManager] = useState<string | null>(null);

  // Nurses data state
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [newNurse, setNewNurse] = useState({ name: '', roles: '', email: '', phone: '' });
  const [nursesLoading, setNursesLoading] = useState(false);
  const [nursesError, setNursesError] = useState<string | null>(null);
  const [editingNurse, setEditingNurse] = useState<string | null>(null);

  // CTM data state
  const [ctms, setCTMs] = useState<CTM[]>([]);
  const [newCTM, setNewCTM] = useState({ name: '', roles: '', email: '', phone: '' });
  const [ctmsLoading, setCTMsLoading] = useState(false);
  const [ctmsError, setCTMsError] = useState<string | null>(null);
  const [editingCTM, setEditingCTM] = useState<string | null>(null);

  // Domestic data state
  const [domestics, setDomestics] = useState<Domestic[]>([]);
  const [newDomestic, setNewDomestic] = useState({ name: '', roles: '', email: '', phone: '' });
  const [domesticsLoading, setDomesticsLoading] = useState(false);
  const [domesticsError, setDomesticsError] = useState<string | null>(null);
  const [editingDomestic, setEditingDomestic] = useState<string | null>(null);

  // Maintenance data state
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [newMaintenance, setNewMaintenance] = useState({ name: '', roles: '', email: '', phone: '' });
  const [maintenancesLoading, setMaintenancesLoading] = useState(false);
  const [maintenancesError, setMaintenancesError] = useState<string | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<string | null>(null);

  // Kitchen data state
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [newKitchen, setNewKitchen] = useState({ name: '', roles: '', email: '', phone: '' });
  const [kitchensLoading, setKitchensLoading] = useState(false);
  const [kitchensError, setKitchensError] = useState<string | null>(null);
  const [editingKitchen, setEditingKitchen] = useState<string | null>(null);

  // Activities data state
  const [activities, setActivities] = useState<Activities[]>([]);
  const [newActivity, setNewActivity] = useState({ name: '', roles: '', email: '', phone: '' });
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);

  // Fetch latest staffing data from daily check-ins
  useEffect(() => {
    if (!workspace?.id) return;
    
    setStaffingLoading(true);
    
    try {
      const colRef = collection(db, workspaceCollectionPath(workspace.id, 'daily-checkins', (workspace as any).organisationId));
      
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

  // Load dependency calculator data (residents & communities) from workspace-scoped doc
  useEffect(() => {
    if (!workspace?.id) return;
    setDependencyLoading(true);

    try {
      const depCol = collection(db, workspaceCollectionPath(workspace.id, 'dependency_calculator', (workspace as any).organisationId));
      const depRef = doc(depCol, 'default');
      const unsub = onSnapshot(depRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setResidents(Array.isArray(data.residents) ? data.residents : []);
          setCommunities(Array.isArray(data.communities) ? data.communities : []);
        } else {
          setResidents([]);
          setCommunities([]);
        }
        setDependencyLoading(false);
      }, (err) => {
        console.error('Failed to load dependency calculator data', err);
        setDependencyLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.error('Failed to set up dependency listener', e);
      setDependencyLoading(false);
    }
  }, [workspace?.id]);

  // Compute workspace-scoped aggregates for wounds/falls/infections from daily-checkins (last 30 days)
  useEffect(() => {
    if (!workspace?.id) return;

    let unsub: (() => void) | undefined;
    (async () => {
      try {
  const colRef = collection(db, workspaceCollectionPath(workspace.id, 'daily-checkins', (workspace as any).organisationId));
        // we'll do a one-time getDocs to compute aggregates for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const q = fsQuery(colRef, where('createdAt', '>=', thirtyDaysAgo));
  const { getDocs: _getDocs } = await import('firebase/firestore');
  const snaps = await _getDocs(q);

        // default accumulators
        let pressure = 0, brk = 0, fracture = 0, bruise = 0, skintear = 0;
        let totalFalls = 0;
        let uti = 0, chest = 0, wound = 0;

        if (!snaps.empty) {
          snaps.docs.forEach((docSnap: any) => {
            const d: any = docSnap.data();
            const wounds = d.wounds?.types || {};
            pressure += Number(wounds.pressure || 0);
            brk += Number(wounds.break || 0);
            fracture += Number(wounds.fracture || 0);
            bruise += Number(wounds.bruise || 0);
            skintear += Number(wounds.skintear || 0);

            // falls
            if (d.falls) {
              if (typeof d.falls === 'object') totalFalls += Number(d.falls.count || 0);
              else totalFalls += Number(d.falls || 0);
            }

            // infections
            if (d.infections) {
              uti += Number(d.infections.uti || 0);
              chest += Number(d.infections.chest || 0);
              wound += Number(d.infections.wound || 0);
            }
          });
        }

        const totalWounds = pressure + brk + fracture + bruise + skintear;

        setAggregateWoundsData({ total: totalWounds, pressure, break: brk, fracture, bruise, skintear, workspacesWithData: totalWounds > 0 ? 1 : 0 });
        setAggregateFallsData({ totalFalls, workspacesWithData: totalFalls > 0 ? 1 : 0 });
        const totalInfections = uti + chest + wound;
        setAggregateInfectionData({ totalInfections, uti, chest, wound, workspacesWithData: totalInfections > 0 ? 1 : 0 });

        // Also listen for audit_latest_scores doc in workspace settings for compliance info
  const settingsCol = collection(db, workspaceCollectionPath(workspace.id, 'settings', (workspace as any).organisationId));
  const auditRef = doc(settingsCol, 'audit_latest_scores');
        unsub = onSnapshot(auditRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as any;
            // reuse dashboard calculation approach
            const auditTypes = ['care-plan', 'health-safety', 'maintenance', 'restrictive-practice', 'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen'];
            let totalYes = 0, totalQuestions = 0, completed = 0;
            auditTypes.forEach((t) => {
              const a = data?.[t];
              if (a && typeof a.yesCount === 'number' && typeof a.totalCount === 'number') {
                totalYes += a.yesCount;
                totalQuestions += a.totalCount;
                completed += 1;
              }
            });
            const overallPercentage = totalQuestions > 0 ? Math.round((totalYes / totalQuestions) * 100) : null;
            setAggregateAuditData({ totalYesCount: totalYes, totalQuestions, overallPercentage, auditsCompleted: completed, totalAudits: auditTypes.length, workspacesWithData: completed > 0 ? 1 : 0 });
          } else {
            setAggregateAuditData(null);
          }
        }, (err) => {
          console.warn('Failed to listen to audit_latest_scores for workspace', err);
        });

      } catch (error) {
        console.warn('Failed to compute workspace aggregates for admin stats', error);
        setAggregateWoundsData({ total: 0, pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0, workspacesWithData: 0 });
        setAggregateFallsData({ totalFalls: 0, workspacesWithData: 0 });
        setAggregateInfectionData({ totalInfections: 0, uti: 0, chest: 0, wound: 0, workspacesWithData: 0 });
      }
    })();

    return () => { if (unsub) unsub(); };
  }, [workspace?.id]);

  // Load managers from Firebase
  useEffect(() => {
    const loadManagers = async () => {
      if (!workspace?.id) return;
      
      setManagersLoading(true);
      setManagersError(null);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
  const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
  const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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

  // Load Domestics from Firebase
  useEffect(() => {
    const loadDomestics = async () => {
      if (!workspace?.id) return;
      
      setDomesticsLoading(true);
      setDomesticsError(null);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
  const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const domesticsData = data.domestics || [];
          setDomestics(domesticsData);
        }
      } catch (error) {
        console.error('Failed to load Domestics:', error);
        setDomesticsError('Failed to load Domestics');
      } finally {
        setDomesticsLoading(false);
      }
    };
    
    loadDomestics();
  }, [workspace?.id]);

  // Load Maintenances from Firebase
  useEffect(() => {
    const loadMaintenances = async () => {
      if (!workspace?.id) return;
      
      setMaintenancesLoading(true);
      setMaintenancesError(null);
      
      try {
        const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const maintenancesData = data.maintenances || [];
          setMaintenances(maintenancesData);
        }
      } catch (error) {
        console.error('Failed to load Maintenances:', error);
        setMaintenancesError('Failed to load Maintenances');
      } finally {
        setMaintenancesLoading(false);
      }
    };
    
    loadMaintenances();
  }, [workspace?.id]);

  // Load Kitchens from Firebase
  useEffect(() => {
    const loadKitchens = async () => {
      if (!workspace?.id) return;
      
      setKitchensLoading(true);
      setKitchensError(null);
      
      try {
        const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const kitchensData = data.kitchens || [];
          setKitchens(kitchensData);
        }
      } catch (error) {
        console.error('Failed to load Kitchens:', error);
        setKitchensError('Failed to load Kitchens');
      } finally {
        setKitchensLoading(false);
      }
    };
    
    loadKitchens();
  }, [workspace?.id]);

  // Load Activities from Firebase
  useEffect(() => {
    const loadActivities = async () => {
      if (!workspace?.id) return;
      
      setActivitiesLoading(true);
      setActivitiesError(null);
      
      try {
        const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const activitiesData = data.activities || [];
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error('Failed to load Activities:', error);
        setActivitiesError('Failed to load Activities');
      } finally {
        setActivitiesLoading(false);
      }
    };
    
    loadActivities();
  }, [workspace?.id]);

  // Add manager to Firebase
  const addManagerToFirebase = async (manager: Manager) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
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

  // Add Domestic to Firebase
  const addDomesticToFirebase = async (domestic: Domestic) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        domestics: arrayUnion(domestic)
      });
      return true;
    } catch (error) {
      console.error('Failed to add Domestic to Firebase:', error);
      return false;
    }
  };

  // Remove Domestic from Firebase
  const removeDomesticFromFirebase = async (domestic: Domestic) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        domestics: arrayRemove(domestic)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove Domestic from Firebase:', error);
      return false;
    }
  };

  // Update Domestic in Firebase
  const updateDomesticInFirebase = async (oldDomestic: Domestic, newDomestic: Domestic) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        domestics: arrayRemove(oldDomestic)
      });
      await updateDoc(workspaceRef, {
        domestics: arrayUnion(newDomestic)
      });
      return true;
    } catch (error) {
      console.error('Failed to update Domestic in Firebase:', error);
      return false;
    }
  };

  // Add Maintenance to Firebase
  const addMaintenanceToFirebase = async (maintenance: Maintenance) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        maintenances: arrayUnion(maintenance)
      });
      return true;
    } catch (error) {
      console.error('Failed to add Maintenance to Firebase:', error);
      return false;
    }
  };

  // Remove Maintenance from Firebase
  const removeMaintenanceFromFirebase = async (maintenance: Maintenance) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        maintenances: arrayRemove(maintenance)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove Maintenance from Firebase:', error);
      return false;
    }
  };

  // Update Maintenance in Firebase
  const updateMaintenanceInFirebase = async (oldMaintenance: Maintenance, newMaintenance: Maintenance) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        maintenances: arrayRemove(oldMaintenance)
      });
      await updateDoc(workspaceRef, {
        maintenances: arrayUnion(newMaintenance)
      });
      return true;
    } catch (error) {
      console.error('Failed to update Maintenance in Firebase:', error);
      return false;
    }
  };

  // Add Kitchen to Firebase
  const addKitchenToFirebase = async (kitchen: Kitchen) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        kitchens: arrayUnion(kitchen)
      });
      return true;
    } catch (error) {
      console.error('Failed to add Kitchen to Firebase:', error);
      return false;
    }
  };

  // Remove Kitchen from Firebase
  const removeKitchenFromFirebase = async (kitchen: Kitchen) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        kitchens: arrayRemove(kitchen)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove Kitchen from Firebase:', error);
      return false;
    }
  };

  // Update Kitchen in Firebase
  const updateKitchenInFirebase = async (oldKitchen: Kitchen, newKitchen: Kitchen) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        kitchens: arrayRemove(oldKitchen)
      });
      await updateDoc(workspaceRef, {
        kitchens: arrayUnion(newKitchen)
      });
      return true;
    } catch (error) {
      console.error('Failed to update Kitchen in Firebase:', error);
      return false;
    }
  };

  // Add Activity to Firebase
  const addActivityToFirebase = async (activity: Activities) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        activities: arrayUnion(activity)
      });
      return true;
    } catch (error) {
      console.error('Failed to add Activity to Firebase:', error);
      return false;
    }
  };

  // Remove Activity from Firebase
  const removeActivityFromFirebase = async (activity: Activities) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        activities: arrayRemove(activity)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove Activity from Firebase:', error);
      return false;
    }
  };

  // Update Activity in Firebase
  const updateActivityInFirebase = async (oldActivity: Activities, newActivity: Activities) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      // Remove old and add new (atomic operation alternative)
      await updateDoc(workspaceRef, {
        activities: arrayRemove(oldActivity)
      });
      await updateDoc(workspaceRef, {
        activities: arrayUnion(newActivity)
      });
      return true;
    } catch (error) {
      console.error('Failed to update Activity in Firebase:', error);
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

  const handleUpdateDomestic = async (domesticId: string, updatedData: Partial<Domestic>) => {
    const originalDomestic = domestics.find(d => d.id === domesticId);
    if (!originalDomestic) return;
    
    const updatedDomestic: Domestic = {
      ...originalDomestic,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setDomestics(prev => prev.map(d => d.id === domesticId ? updatedDomestic : d));
    setEditingDomestic(null);
    setDomesticsError(null);
    
    // Update in Firebase
    const success = await updateDomesticInFirebase(originalDomestic, updatedDomestic);
    if (!success) {
      // Revert optimistic update on failure
      setDomestics(prev => prev.map(d => d.id === domesticId ? originalDomestic : d));
    }
  };

  const handleUpdateMaintenance = async (maintenanceId: string, updatedData: Partial<Maintenance>) => {
    const originalMaintenance = maintenances.find(m => m.id === maintenanceId);
    if (!originalMaintenance) return;
    
    const updatedMaintenance: Maintenance = {
      ...originalMaintenance,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setMaintenances(prev => prev.map(m => m.id === maintenanceId ? updatedMaintenance : m));
    setEditingMaintenance(null);
    setMaintenancesError(null);
    
    // Update in Firebase
    const success = await updateMaintenanceInFirebase(originalMaintenance, updatedMaintenance);
    if (!success) {
      // Revert optimistic update on failure
      setMaintenances(prev => prev.map(m => m.id === maintenanceId ? originalMaintenance : m));
    }
  };

  const handleUpdateKitchen = async (kitchenId: string, updatedData: Partial<Kitchen>) => {
    const originalKitchen = kitchens.find(k => k.id === kitchenId);
    if (!originalKitchen) return;
    
    const updatedKitchen: Kitchen = {
      ...originalKitchen,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setKitchens(prev => prev.map(k => k.id === kitchenId ? updatedKitchen : k));
    setEditingKitchen(null);
    setKitchensError(null);
    
    // Update in Firebase
    const success = await updateKitchenInFirebase(originalKitchen, updatedKitchen);
    if (!success) {
      // Revert optimistic update on failure
      setKitchens(prev => prev.map(k => k.id === kitchenId ? originalKitchen : k));
    }
  };

  const handleUpdateActivity = async (activityId: string, updatedData: Partial<Activities>) => {
    const originalActivity = activities.find(a => a.id === activityId);
    if (!originalActivity) return;
    
    const updatedActivity: Activities = {
      ...originalActivity,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setActivities(prev => prev.map(a => a.id === activityId ? updatedActivity : a));
    setEditingActivity(null);
    setActivitiesError(null);
    
    // Update in Firebase
    const success = await updateActivityInFirebase(originalActivity, updatedActivity);
    if (!success) {
      // Revert optimistic update on failure
      setActivities(prev => prev.map(a => a.id === activityId ? originalActivity : a));
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
              <div className="w-full lg:w-auto">
                <div className="grid grid-cols-1 gap-0">
                  {/* Occupancy (kept) */}
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
      </div>

  {/* Main content */}
  <main className="flex-1 overflow-y-auto">
    <div className="min-h-full bg-gray-50">
      <div className="w-full p-6 space-y-6">

        <Tabs defaultValue="folders" className="w-full">
          <TabsList className="flex flex-row flex-nowrap items-start justify-start overflow-x-auto bg-white border border-gray-200 rounded-lg gap-2 p-1 w-auto">
            <TabsTrigger value="folders" className="flex items-center gap-2 whitespace-nowrap">
              <FolderIcon className="w-4 h-4" />
              Folders
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2 whitespace-nowrap">
              <Users className="w-4 h-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2 whitespace-nowrap">
              <TrendingUp className="w-4 h-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="audits" className="flex items-center gap-2 whitespace-nowrap">
              <Tag className="w-4 h-4" />
              Audits
            </TabsTrigger>
            <TabsTrigger value="rotas" className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="w-4 h-4" />
              Rotas
            </TabsTrigger>
            {/* Management / staff-category triggers removed — TeamsView handles those categories */}
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
            {/* Render TeamsView without its full-width header when embedded in admin view */}
            <div className="mb-4 flex items-center justify-between">
              <div />
              <NewTeamDialogWrapper workspaceId={workspace.id} />
            </div>
            <TeamsView workspace={workspace} hideHeader />
          </TabsContent>
          
          <TabsContent value="stats" className="mt-6">
            <StatsView
              workspace={workspace}
              totalFolders={totalFolders}
              totalDocuments={totalDocuments}
              occupancyPercent={occupancyPercent as any}
              fileTypeCounts={fileTypeCounts}
              recentUploads={recentUploads}
              staffingData={staffingData}
              staffingHistory={staffingHistory}
              residents={residents}
              communities={communities}
              aggregateWoundsData={aggregateWoundsData}
              aggregateFallsData={aggregateFallsData}
              aggregateInfectionData={aggregateInfectionData}
              aggregateAuditData={aggregateAuditData}
            />
          </TabsContent>
          
          <TabsContent value="audits" className="mt-6">
            <AuditsView
              workspace={workspace}
              recentUploads={recentUploads}
              aggregateAuditData={aggregateAuditData}
            />
          </TabsContent>
          
          <TabsContent value="rotas" className="mt-6">
            <AdminRotasView workspace={workspace} />
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter manager name"
                        value={newManager.name}
                        onChange={(e) => setNewManager(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Roles</label>
                      <Input
                        placeholder="e.g. Senior Manager, Team Lead"
                        value={newManager.roles}
                        onChange={(e) => setNewManager(prev => ({ ...prev, roles: e.target.value }))}
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
                          setNewManager({ name: '', roles: '', email: '', phone: '' });
                          setManagersError(null);
                          
                          // Save to Firebase
                          const success = await addManagerToFirebase(newManagerEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setManagers(prev => prev.filter(m => m.id !== newManagerEntry.id));
                          }
                        }
                      }}
                      disabled={!newManager.name || !newManager.roles || !newManager.email || !newManager.phone || managersLoading}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter nurse name"
                        value={newNurse.name}
                        onChange={(e) => setNewNurse(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Roles</label>
                      <Input
                        placeholder="e.g. Registered Nurse, HCA"
                        value={newNurse.roles}
                        onChange={(e) => setNewNurse(prev => ({ ...prev, roles: e.target.value }))}
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
                          setNewNurse({ name: '', roles: '', email: '', phone: '' });
                          setNursesError(null);
                          
                          // Save to Firebase
                          const success = await addNurseToFirebase(newNurseEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setNurses(prev => prev.filter(n => n.id !== newNurseEntry.id));
                          }
                        }
                      }}
                      disabled={!newNurse.name || !newNurse.roles || !newNurse.email || !newNurse.phone || nursesLoading}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter CTM name"
                        value={newCTM.name}
                        onChange={(e) => setNewCTM(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Roles</label>
                      <Input
                        placeholder="e.g. Care Team Manager, Senior CTM"
                        value={newCTM.roles}
                        onChange={(e) => setNewCTM(prev => ({ ...prev, roles: e.target.value }))}
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
                          setNewCTM({ name: '', roles: '', email: '', phone: '' });
                          setCTMsError(null);
                          
                          // Save to Firebase
                          const success = await addCTMToFirebase(newCTMEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setCTMs(prev => prev.filter(c => c.id !== newCTMEntry.id));
                          }
                        }
                      }}
                      disabled={!newCTM.name || !newCTM.roles || !newCTM.email || !newCTM.phone || ctmsLoading}
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

          <TabsContent value="domestic" className="mt-6">
            <div className="space-y-6">
              {/* Error Display */}
              {domesticsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{domesticsError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDomesticsError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
              {/* Add New Domestic Form */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Add New Domestic
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter domestic name"
                        value={newDomestic.name}
                        onChange={(e) => setNewDomestic(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Roles</label>
                      <Input
                        placeholder="e.g. Housekeeper, Cleaner"
                        value={newDomestic.roles}
                        onChange={(e) => setNewDomestic(prev => ({ ...prev, roles: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      <Input
                        type="email"
                        placeholder="domestic@example.com"
                        value={newDomestic.email}
                        onChange={(e) => setNewDomestic(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+44 123 456 7890"
                        value={newDomestic.phone}
                        onChange={(e) => setNewDomestic(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={async () => {
                        if (newDomestic.name && newDomestic.email && newDomestic.phone) {
                          const newDomesticEntry: Domestic = {
                            id: Date.now().toString(),
                            ...newDomestic,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          
                          // Optimistically update UI
                          setDomestics(prev => [...prev, newDomesticEntry]);
                          setNewDomestic({ name: '', roles: '', email: '', phone: '' });
                          setDomesticsError(null);
                          
                          // Save to Firebase
                          const success = await addDomesticToFirebase(newDomesticEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setDomestics(prev => prev.filter(d => d.id !== newDomesticEntry.id));
                          }
                        }
                      }}
                      disabled={!newDomestic.name || !newDomestic.roles || !newDomestic.email || !newDomestic.phone || domesticsLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {domesticsLoading ? 'Adding...' : 'Add Domestic'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Domestics List */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    Current Domestics ({domestics.length})
                    {domesticsLoading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {domestics.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No domestics assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add domestics using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {domestics.map((domestic) => (
                        <AdminDomesticCard
                          key={domestic.id}
                          domestic={domestic}
                          isEditing={editingDomestic === domestic.id}
                          onEdit={() => setEditingDomestic(domestic.id)}
                          onCancelEdit={() => setEditingDomestic(null)}
                          onSave={(updatedData) => handleUpdateDomestic(domestic.id, updatedData)}
                          onDelete={async () => {
                            // Optimistically update UI
                            setDomestics(prev => prev.filter(d => d.id !== domestic.id));
                            setDomesticsError(null);
                            
                            // Remove from Firebase
                            const success = await removeDomesticFromFirebase(domestic);
                            if (!success) {
                              // Revert optimistic update on failure
                              setDomestics(prev => [...prev, domestic]);
                            }
                          }}
                          disabled={domesticsLoading}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-6">
            <div className="space-y-6">
              {/* Error Display */}
              {maintenancesError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{maintenancesError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMaintenancesError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
              {/* Add New Maintenance Form */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-gray-600" />
                    Add New Maintenance
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter maintenance name"
                        value={newMaintenance.name}
                        onChange={(e) => setNewMaintenance(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Roles</label>
                      <Input
                        placeholder="e.g. Electrician, Plumber, Handyman"
                        value={newMaintenance.roles}
                        onChange={(e) => setNewMaintenance(prev => ({ ...prev, roles: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      <Input
                        type="email"
                        placeholder="maintenance@example.com"
                        value={newMaintenance.email}
                        onChange={(e) => setNewMaintenance(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+44 123 456 7890"
                        value={newMaintenance.phone}
                        onChange={(e) => setNewMaintenance(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={async () => {
                        if (newMaintenance.name && newMaintenance.email && newMaintenance.phone) {
                          const newMaintenanceEntry: Maintenance = {
                            id: Date.now().toString(),
                            ...newMaintenance,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          
                          // Optimistically update UI
                          setMaintenances(prev => [...prev, newMaintenanceEntry]);
                          setNewMaintenance({ name: '', roles: '', email: '', phone: '' });
                          setMaintenancesError(null);
                          
                          // Save to Firebase
                          const success = await addMaintenanceToFirebase(newMaintenanceEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setMaintenances(prev => prev.filter(m => m.id !== newMaintenanceEntry.id));
                          }
                        }
                      }}
                      disabled={!newMaintenance.name || !newMaintenance.roles || !newMaintenance.email || !newMaintenance.phone || maintenancesLoading}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {maintenancesLoading ? 'Adding...' : 'Add Maintenance'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Maintenances List */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    Current Maintenance ({maintenances.length})
                    {maintenancesLoading && <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {maintenances.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No maintenance staff assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add maintenance staff using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {maintenances.map((maintenance) => (
                        <AdminMaintenanceCard
                          key={maintenance.id}
                          maintenance={maintenance}
                          isEditing={editingMaintenance === maintenance.id}
                          onEdit={() => setEditingMaintenance(maintenance.id)}
                          onCancelEdit={() => setEditingMaintenance(null)}
                          onSave={(updatedData) => handleUpdateMaintenance(maintenance.id, updatedData)}
                          onDelete={async () => {
                            // Optimistically update UI
                            setMaintenances(prev => prev.filter(m => m.id !== maintenance.id));
                            setMaintenancesError(null);
                            
                            // Remove from Firebase
                            const success = await removeMaintenanceFromFirebase(maintenance);
                            if (!success) {
                              // Revert optimistic update on failure
                              setMaintenances(prev => [...prev, maintenance]);
                            }
                          }}
                          disabled={maintenancesLoading}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="kitchen" className="mt-6">
            <div className="space-y-6">
              {/* Error Display */}
              {kitchensError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{kitchensError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setKitchensError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
              {/* Add New Kitchen Form */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-red-600" />
                    Add New Kitchen
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter kitchen name"
                        value={newKitchen.name}
                        onChange={(e) => setNewKitchen(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Roles</label>
                      <Input
                        placeholder="e.g. Chef, Cook, Kitchen Assistant"
                        value={newKitchen.roles}
                        onChange={(e) => setNewKitchen(prev => ({ ...prev, roles: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      <Input
                        type="email"
                        placeholder="kitchen@example.com"
                        value={newKitchen.email}
                        onChange={(e) => setNewKitchen(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+44 123 456 7890"
                        value={newKitchen.phone}
                        onChange={(e) => setNewKitchen(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={async () => {
                        if (newKitchen.name && newKitchen.email && newKitchen.phone) {
                          const newKitchenEntry: Kitchen = {
                            id: Date.now().toString(),
                            ...newKitchen,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          
                          // Optimistically update UI
                          setKitchens(prev => [...prev, newKitchenEntry]);
                          setNewKitchen({ name: '', roles: '', email: '', phone: '' });
                          setKitchensError(null);
                          
                          // Save to Firebase
                          const success = await addKitchenToFirebase(newKitchenEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setKitchens(prev => prev.filter(k => k.id !== newKitchenEntry.id));
                          }
                        }
                      }}
                      disabled={!newKitchen.name || !newKitchen.roles || !newKitchen.email || !newKitchen.phone || kitchensLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {kitchensLoading ? 'Adding...' : 'Add Kitchen'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Kitchens List */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    Current Kitchen ({kitchens.length})
                    {kitchensLoading && <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {kitchens.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No kitchen staff assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add kitchen staff using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {kitchens.map((kitchen) => (
                        <AdminKitchenCard
                          key={kitchen.id}
                          kitchen={kitchen}
                          isEditing={editingKitchen === kitchen.id}
                          onEdit={() => setEditingKitchen(kitchen.id)}
                          onCancelEdit={() => setEditingKitchen(null)}
                          onSave={(updatedData) => handleUpdateKitchen(kitchen.id, updatedData)}
                          onDelete={async () => {
                            // Optimistically update UI
                            setKitchens(prev => prev.filter(k => k.id !== kitchen.id));
                            setKitchensError(null);
                            
                            // Remove from Firebase
                            const success = await removeKitchenFromFirebase(kitchen);
                            if (!success) {
                              // Revert optimistic update on failure
                              setKitchens(prev => [...prev, kitchen]);
                            }
                          }}
                          disabled={kitchensLoading}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activities" className="mt-6">
            <div className="space-y-6">
              {/* Error Display */}
              {activitiesError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{activitiesError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivitiesError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
              {/* Add New Activity Form */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-pink-600" />
                    Add New Activity
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        placeholder="Enter activity name"
                        value={newActivity.name}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Roles</label>
                      <Input
                        placeholder="e.g. Activities Coordinator, Entertainment"
                        value={newActivity.roles}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, roles: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      <Input
                        type="email"
                        placeholder="activity@example.com"
                        value={newActivity.email}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+44 123 456 7890"
                        value={newActivity.phone}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={async () => {
                        if (newActivity.name && newActivity.email && newActivity.phone) {
                          const newActivityEntry: Activities = {
                            id: Date.now().toString(),
                            ...newActivity,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          
                          // Optimistically update UI
                          setActivities(prev => [...prev, newActivityEntry]);
                          setNewActivity({ name: '', roles: '', email: '', phone: '' });
                          setActivitiesError(null);
                          
                          // Save to Firebase
                          const success = await addActivityToFirebase(newActivityEntry);
                          if (!success) {
                            // Revert optimistic update on failure
                            setActivities(prev => prev.filter(a => a.id !== newActivityEntry.id));
                          }
                        }
                      }}
                      disabled={!newActivity.name || !newActivity.roles || !newActivity.email || !newActivity.phone || activitiesLoading}
                      className="bg-pink-600 hover:bg-pink-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {activitiesLoading ? 'Adding...' : 'Add Activity'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Activities List */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    Current Activities ({activities.length})
                    {activitiesLoading && <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No activities staff assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add activities staff using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <AdminActivityCard
                          key={activity.id}
                          activity={activity}
                          isEditing={editingActivity === activity.id}
                          onEdit={() => setEditingActivity(activity.id)}
                          onCancelEdit={() => setEditingActivity(null)}
                          onSave={(updatedData) => handleUpdateActivity(activity.id, updatedData)}
                          onDelete={async () => {
                            // Optimistically update UI
                            setActivities(prev => prev.filter(a => a.id !== activity.id));
                            setActivitiesError(null);
                            
                            // Remove from Firebase
                            const success = await removeActivityFromFirebase(activity);
                            if (!success) {
                              // Revert optimistic update on failure
                              setActivities(prev => [...prev, activity]);
                            }
                          }}
                          disabled={activitiesLoading}
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
    roles: manager.roles,
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
      roles: manager.roles,
      email: manager.email,
      phone: manager.phone,
    });
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter manager name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Roles</label>
            <Input
              value={editForm.roles}
              onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
              placeholder="e.g. Senior Manager, Team Lead"
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
            disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{manager.name}</p>
            <p className="text-sm text-gray-500">Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{manager.roles}</p>
            <p className="text-xs text-gray-500">Roles</p>
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
    roles: nurse.roles,
    email: nurse.email,
    phone: nurse.phone,
  });

  const handleSave = () => {
    onSave(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      name: nurse.name,
      roles: nurse.roles,
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
              <label className="text-xs font-medium text-gray-700 block mb-1">Roles</label>
              <Input
                value={editForm.roles}
                onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
                placeholder="e.g. Registered Nurse, HCA"
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
    roles: ctm.roles,
    email: ctm.email,
    phone: ctm.phone,
  });

  const handleSave = () => {
    onSave(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      name: ctm.name,
      roles: ctm.roles,
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
              <label className="text-xs font-medium text-gray-700 block mb-1">Roles</label>
              <Input
                value={editForm.roles}
                onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
                placeholder="e.g. Care Team Manager, Senior CTM"
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{ctm.roles}</p>
            <p className="text-xs text-gray-500">Roles</p>
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

// Admin Domestic Card Component with Edit Functionality
interface AdminDomesticCardProps {
  domestic: Domestic;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Domestic>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function AdminDomesticCard({ domestic, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: AdminDomesticCardProps) {
  const [editForm, setEditForm] = useState({
    name: domestic.name,
    roles: domestic.roles,
    email: domestic.email,
    phone: domestic.phone,
  });

  const handleSave = () => {
    onSave(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      name: domestic.name,
      roles: domestic.roles,
      email: domestic.email,
      phone: domestic.phone,
    });
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-orange-900">Edit Domestic</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Domestic name"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Roles</label>
              <Input
                value={editForm.roles}
                onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
                placeholder="e.g. Housekeeper, Cleaner"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="domestic@example.com"
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
              disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
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
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{domestic.name}</p>
            <p className="text-sm text-gray-500">Domestic</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{domestic.roles}</p>
            <p className="text-xs text-gray-500">Roles</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{domestic.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{domestic.phone}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
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

// Admin Maintenance Card Component with Edit Functionality
interface AdminMaintenanceCardProps {
  maintenance: Maintenance;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Maintenance>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function AdminMaintenanceCard({ maintenance, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: AdminMaintenanceCardProps) {
  const [editForm, setEditForm] = useState({
    name: maintenance.name,
    roles: maintenance.roles,
    email: maintenance.email,
    phone: maintenance.phone,
  });

  const handleSave = () => {
    onSave(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      name: maintenance.name,
      roles: maintenance.roles,
      email: maintenance.email,
      phone: maintenance.phone,
    });
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">Edit Maintenance</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Maintenance name"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Roles</label>
              <Input
                value={editForm.roles}
                onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
                placeholder="e.g. Electrician, Plumber, Handyman"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="maintenance@example.com"
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
              disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
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
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{maintenance.name}</p>
            <p className="text-sm text-gray-500">Maintenance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{maintenance.roles}</p>
            <p className="text-xs text-gray-500">Roles</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{maintenance.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{maintenance.phone}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
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

// Admin Kitchen Card Component with Edit Functionality
interface AdminKitchenCardProps {
  kitchen: Kitchen;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Kitchen>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function AdminKitchenCard({ kitchen, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: AdminKitchenCardProps) {
  const [editForm, setEditForm] = useState({
    name: kitchen.name,
    roles: kitchen.roles,
    email: kitchen.email,
    phone: kitchen.phone,
  });

  const handleSave = () => {
    onSave(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      name: kitchen.name,
      roles: kitchen.roles,
      email: kitchen.email,
      phone: kitchen.phone,
    });
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-red-600" />
            <span className="font-medium text-red-900">Edit Kitchen</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Kitchen name"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Roles</label>
              <Input
                value={editForm.roles}
                onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
                placeholder="e.g. Chef, Cook, Kitchen Assistant"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="kitchen@example.com"
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
              disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
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
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{kitchen.name}</p>
            <p className="text-sm text-gray-500">Kitchen</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{kitchen.roles}</p>
            <p className="text-xs text-gray-500">Roles</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{kitchen.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{kitchen.phone}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

// Admin Activity Card Component with Edit Functionality
interface AdminActivityCardProps {
  activity: Activities;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Activities>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function AdminActivityCard({ activity, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: AdminActivityCardProps) {
  const [editForm, setEditForm] = useState({
    name: activity.name,
    roles: activity.roles,
    email: activity.email,
    phone: activity.phone,
  });

  const handleSave = () => {
    onSave(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      name: activity.name,
      roles: activity.roles,
      email: activity.email,
      phone: activity.phone,
    });
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div className="border border-pink-200 rounded-lg p-4 bg-pink-50">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-pink-600" />
            <span className="font-medium text-pink-900">Edit Activity</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Activity name"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Roles</label>
              <Input
                value={editForm.roles}
                onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
                placeholder="e.g. Activities Coordinator, Entertainment"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="activity@example.com"
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
              disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
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
          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-pink-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{activity.name}</p>
            <p className="text-sm text-gray-500">Activities</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{activity.roles}</p>
            <p className="text-xs text-gray-500">Roles</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{activity.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{activity.phone}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
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
