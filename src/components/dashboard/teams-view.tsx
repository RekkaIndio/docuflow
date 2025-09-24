"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { mockUser } from "@/lib/data";
import { ArrowLeft, MoreVertical, Plus, Trash2, Edit, FolderLock, Users, UserCheck, Phone, Mail, Save, X, AlertTriangle } from "lucide-react";
import type { Workspace, Team } from "@/lib/types";
import { ManageFolderAccessDialog } from "./manage-folder-access-dialog";
import { NewTeamDialog } from "./new-team-dialog";
import { SidebarTrigger } from "../ui/sidebar";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from '@/hooks/use-toast';
import { workspaceCollectionPath, workspaceDocPath } from '@/lib/paths';


interface TeamsViewProps {
  workspace: Workspace;
  // When true the full-width themed header is hidden (useful when
  // embedding TeamsView inside another page that already provides a
  // header, e.g. the admin workspace view).
  hideHeader?: boolean;
}

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

const initialMockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Engineering',
    members: [
      mockUser,
      { id: 'user-2', name: 'Jane Doe', email: 'jane.d@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=jane' },
      { id: 'user-3', name: 'Peter Jones', email: 'peter.j@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=peter' },
    ],
    folderCount: 2,
    accessibleFolderIds: ['folder-1', 'subfolder-1a'],
    emails: ['engineering@example.com'],
    workspaceId: '', // Set as needed
  },
  {
    id: 'team-2',
    name: 'Product & Design',
    members: [
      { id: 'user-4', name: 'Emily White', email: 'emily.w@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=emily' },
      { id: 'user-5', name: 'Chris Green', email: 'chris.g@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=chris' },
    ],
    folderCount: 1,
    accessibleFolderIds: ['folder-2'],
    emails: ['productdesign@example.com'],
    workspaceId: '', // Set as needed
  }
]

export function TeamsView({ workspace, hideHeader = false }: TeamsViewProps) {
  const workspaceId = workspace?.id || '';
  const organisationId = (workspace as any)?.organisationId || (workspace as any)?.organisationId || '';
  const [teams, setTeams] = useState<Team[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Array<any>>([]);
  // Per-team invite duration (hours) for temporary invites (e.g. inspection)
  const [inviteDurations, setInviteDurations] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const [editingManager, setEditingManager] = useState<string | null>(null);
  const [newManager, setNewManager] = useState({ name: '', roles: '', email: '', phone: '' });
  const [managersError, setManagersError] = useState<string | null>(null);

  // Nurses state
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [nursesLoading, setNursesLoading] = useState(false);
  const [editingNurse, setEditingNurse] = useState<string | null>(null);
  const [newNurse, setNewNurse] = useState({ name: '', roles: '', email: '', phone: '' });
  const [nursesError, setNursesError] = useState<string | null>(null);

  // CTMs state
  const [ctms, setCTMs] = useState<CTM[]>([]);
  const [ctmsLoading, setCTMsLoading] = useState(false);
  const [editingCTM, setEditingCTM] = useState<string | null>(null);
  const [newCTM, setNewCTM] = useState({ name: '', roles: '', email: '', phone: '' });
  const [ctmsError, setCTMsError] = useState<string | null>(null);

  // Domestic state
  const [domestics, setDomestics] = useState<Domestic[]>([]);
  const [domesticsLoading, setDomesticsLoading] = useState(false);
  const [editingDomestic, setEditingDomestic] = useState<string | null>(null);
  const [newDomestic, setNewDomestic] = useState({ name: '', roles: '', email: '', phone: '' });
  const [domesticsError, setDomesticsError] = useState<string | null>(null);

  // Maintenance state
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [maintenancesLoading, setMaintenancesLoading] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<string | null>(null);
  const [newMaintenance, setNewMaintenance] = useState({ name: '', roles: '', email: '', phone: '' });
  const [maintenancesError, setMaintenancesError] = useState<string | null>(null);

  // Kitchen state
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [kitchensLoading, setKitchensLoading] = useState(false);
  const [editingKitchen, setEditingKitchen] = useState<string | null>(null);
  const [newKitchen, setNewKitchen] = useState({ name: '', roles: '', email: '', phone: '' });
  const [kitchensError, setKitchensError] = useState<string | null>(null);

  // Activities state
  const [activities, setActivities] = useState<Activities[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({ name: '', roles: '', email: '', phone: '' });
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!workspaceId) return;
      try {
  // Read from workspace subcollection: organisations/{orgId}/workspaces/{workspaceId}/teams or legacy workspaces/{workspaceId}/teams
  const teamsCollection = collection(db, workspaceCollectionPath(workspaceId, 'teams', organisationId || workspace?.organisationId));
        const teamsSnapshot = await getDocs(teamsCollection);
        const fetchedTeams = teamsSnapshot.docs.map((d) => {
          const data = d.data() as any;
          const accessibleFolderIds = Array.isArray(data.accessibleFolderIds) ? data.accessibleFolderIds : [];
          const emails = Array.isArray(data.emails) ? data.emails : [];
          const members = Array.isArray(data.members) ? data.members : [];
          const folderCount = typeof data.folderCount === "number" ? data.folderCount : accessibleFolderIds.length || 0;
          return {
            id: data.id ?? d.id,
            name: data.name ?? "Untitled Team",
            members,
            folderCount,
            accessibleFolderIds,
            emails,
            workspaceId: workspaceId,
          } as Team;
        });

        // Ensure Admin, Staff, and Inspection teams exist for this workspace
        const requiredTeams = [
          { name: "Admin", id: `admin-${workspaceId}` },
          { name: "Staff", id: `staff-${workspaceId}` },
          { name: "Inspection", id: `inspection-${workspaceId}` },
        ];
        const teamsToCreate = requiredTeams.filter(rt => !fetchedTeams.some(t => t.name === rt.name && t.workspaceId === workspaceId));
        for (const team of teamsToCreate) {
          const newTeam: Team = {
            id: team.id,
            name: team.name,
            members: [],
            folderCount: 0,
            accessibleFolderIds: [],
            emails: [],
            workspaceId: workspaceId,
          };
          // Add to Firestore under workspace teams subcollection
          const teamRef = doc(db, workspaceCollectionPath(workspaceId, 'teams', organisationId || workspace?.organisationId), newTeam.id);
          await setDoc(teamRef, newTeam);
          fetchedTeams.push(newTeam);
        }
        setTeams(fetchedTeams);
      } catch (error) {
        console.error("Error fetching teams from Firestore:", error);
      }
    };

    fetchTeams();
  }, [workspaceId, organisationId]);

  // Load managers from workspace
  // Fetch pending invites for the workspace
  const fetchPendingInvites = async () => {
    if (!workspaceId) return;
    try {
      const resp = await fetch(`/api/admin/invite/list?workspaceId=${encodeURIComponent(workspaceId)}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.ok && Array.isArray(data.invites)) setPendingInvites(data.invites);
    } catch (e) {
      console.warn('Failed to fetch pending invites', e);
    }
  };

  useEffect(() => {
    const loadManagers = async () => {
      if (!workspaceId) return;
      
      setManagersLoading(true);
      
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
    const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const managersData = data.managers || [];
          setManagers(managersData);
        }
      } catch (error: any) {
        console.error('Failed to load managers:', error);
        // Surface permission errors so admin knows why data is missing
        if (error?.code === 'permission-denied' || (error?.message && error.message.toLowerCase().includes('permission'))) {
          setManagersError('Missing or insufficient Firestore permissions to read workspace data.');
        } else {
          setManagersError('Failed to load managers.');
        }
      } finally {
        setManagersLoading(false);
      }
    };

    loadManagers();
    fetchPendingInvites();
  }, [workspaceId, organisationId]);

  // Load nurses from workspace
  useEffect(() => {
    const loadNurses = async () => {
      if (!workspaceId) return;
      
      setNursesLoading(true);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const nursesData = data.nurses || [];
          setNurses(nursesData);
        }
      } catch (error) {
        console.error('Failed to load nurses:', error);
      } finally {
        setNursesLoading(false);
      }
    };
    
    loadNurses();
  }, [workspaceId, organisationId]);

  // Load CTMs from workspace
  useEffect(() => {
    const loadCTMs = async () => {
      if (!workspaceId) return;
      
      setCTMsLoading(true);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const ctmsData = data.ctms || [];
          setCTMs(ctmsData);
        }
      } catch (error) {
        console.error('Failed to load CTMs:', error);
      } finally {
        setCTMsLoading(false);
      }
    };
    
    loadCTMs();
  }, [workspaceId, organisationId]);

  // Load domestics from workspace
  useEffect(() => {
    const loadDomestics = async () => {
      if (!workspaceId) return;
      
      setDomesticsLoading(true);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const domesticsData = data.domestics || [];
          setDomestics(domesticsData);
        }
      } catch (error) {
        console.error('Failed to load domestics:', error);
      } finally {
        setDomesticsLoading(false);
      }
    };
    
    loadDomestics();
  }, [workspaceId, organisationId]);

  // Load maintenances from workspace
  useEffect(() => {
    const loadMaintenances = async () => {
      if (!workspaceId) return;
      
      setMaintenancesLoading(true);
      
      try {
        const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const maintenancesData = data.maintenances || [];
          setMaintenances(maintenancesData);
        }
      } catch (error) {
        console.error('Failed to load maintenances:', error);
      } finally {
        setMaintenancesLoading(false);
      }
    };
    
    loadMaintenances();
  }, [workspaceId, organisationId]);

  // Load kitchens from workspace
  useEffect(() => {
    const loadKitchens = async () => {
      if (!workspaceId) return;
      
      setKitchensLoading(true);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const kitchensData = data.kitchens || [];
          setKitchens(kitchensData);
        }
      } catch (error) {
        console.error('Failed to load kitchens:', error);
      } finally {
        setKitchensLoading(false);
      }
    };
    
    loadKitchens();
  }, [workspaceId, organisationId]);

  // Load activities from workspace
  useEffect(() => {
    const loadActivities = async () => {
      if (!workspaceId) return;
      
      setActivitiesLoading(true);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const activitiesData = data.activities || [];
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setActivitiesLoading(false);
      }
    };
    
    loadActivities();
  }, [workspaceId, organisationId]);

  // Add manager to Firebase
  const addManagerToFirebase = async (manager: Manager) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
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

  // Update manager in Firebase
  const updateManagerInFirebase = async (oldManager: Manager, newManager: Manager) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
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

  // Remove manager from Firebase
  const removeManagerFromFirebase = async (manager: Manager) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
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

  // Add nurse to Firebase
  const addNurseToFirebase = async (nurse: Nurse) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
      await updateDoc(workspaceRef, {
        nurses: arrayUnion(nurse)
      });
      return true;
    } catch (error) {
      console.error('Failed to add nurse to Firebase:', error);
      setNursesError('Failed to save nurse');
      return false;
    }
  };

  // Update nurse in Firebase
  const updateNurseInFirebase = async (oldNurse: Nurse, newNurse: Nurse) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
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
      setNursesError('Failed to update nurse');
      return false;
    }
  };

  // Remove nurse from Firebase
  const removeNurseFromFirebase = async (nurse: Nurse) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
      await updateDoc(workspaceRef, {
        nurses: arrayRemove(nurse)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove nurse from Firebase:', error);
      setNursesError('Failed to remove nurse');
      return false;
    }
  };

  // Add CTM to Firebase
  const addCTMToFirebase = async (ctm: CTM) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
      await updateDoc(workspaceRef, {
        ctms: arrayUnion(ctm)
      });
      return true;
    } catch (error) {
      console.error('Failed to add CTM to Firebase:', error);
      setCTMsError('Failed to save CTM');
      return false;
    }
  };

  // Update CTM in Firebase
  const updateCTMInFirebase = async (oldCTM: CTM, newCTM: CTM) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
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
      setCTMsError('Failed to update CTM');
      return false;
    }
  };

  // Remove CTM from Firebase
  const removeCTMFromFirebase = async (ctm: CTM) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId || workspace?.organisationId));
      await updateDoc(workspaceRef, {
        ctms: arrayRemove(ctm)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove CTM from Firebase:', error);
      setCTMsError('Failed to remove CTM');
      return false;
    }
  };

  // Add domestic to Firebase
  const addDomesticToFirebase = async (domestic: Domestic) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        domestics: arrayUnion(domestic)
      });
      return true;
    } catch (error) {
      console.error('Failed to add domestic to Firebase:', error);
      setDomesticsError('Failed to save domestic');
      return false;
    }
  };

  // Update domestic in Firebase
  const updateDomesticInFirebase = async (oldDomestic: Domestic, newDomestic: Domestic) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        domestics: arrayRemove(oldDomestic)
      });
      await updateDoc(workspaceRef, {
        domestics: arrayUnion(newDomestic)
      });
      return true;
    } catch (error) {
      console.error('Failed to update domestic in Firebase:', error);
      setDomesticsError('Failed to update domestic');
      return false;
    }
  };

  // Remove domestic from Firebase
  const removeDomesticFromFirebase = async (domestic: Domestic) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        domestics: arrayRemove(domestic)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove domestic from Firebase:', error);
      setDomesticsError('Failed to remove domestic');
      return false;
    }
  };

  // Add maintenance to Firebase
  const addMaintenanceToFirebase = async (maintenance: Maintenance) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        maintenances: arrayUnion(maintenance)
      });
      return true;
    } catch (error) {
      console.error('Failed to add maintenance to Firebase:', error);
      setMaintenancesError('Failed to save maintenance');
      return false;
    }
  };

  // Update maintenance in Firebase
  const updateMaintenanceInFirebase = async (oldMaintenance: Maintenance, newMaintenance: Maintenance) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        maintenances: arrayRemove(oldMaintenance)
      });
      await updateDoc(workspaceRef, {
        maintenances: arrayUnion(newMaintenance)
      });
      return true;
    } catch (error) {
      console.error('Failed to update maintenance in Firebase:', error);
      setMaintenancesError('Failed to update maintenance');
      return false;
    }
  };

  // Remove maintenance from Firebase
  const removeMaintenanceFromFirebase = async (maintenance: Maintenance) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        maintenances: arrayRemove(maintenance)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove maintenance from Firebase:', error);
      setMaintenancesError('Failed to remove maintenance');
      return false;
    }
  };

  // Add kitchen to Firebase
  const addKitchenToFirebase = async (kitchen: Kitchen) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        kitchens: arrayUnion(kitchen)
      });
      return true;
    } catch (error) {
      console.error('Failed to add kitchen to Firebase:', error);
      setKitchensError('Failed to save kitchen');
      return false;
    }
  };

  // Update kitchen in Firebase
  const updateKitchenInFirebase = async (oldKitchen: Kitchen, newKitchen: Kitchen) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        kitchens: arrayRemove(oldKitchen)
      });
      await updateDoc(workspaceRef, {
        kitchens: arrayUnion(newKitchen)
      });
      return true;
    } catch (error) {
      console.error('Failed to update kitchen in Firebase:', error);
      setKitchensError('Failed to update kitchen');
      return false;
    }
  };

  // Remove kitchen from Firebase
  const removeKitchenFromFirebase = async (kitchen: Kitchen) => {
    if (!workspaceId) return false;
    
    try {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        kitchens: arrayRemove(kitchen)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove kitchen from Firebase:', error);
      setKitchensError('Failed to remove kitchen');
      return false;
    }
  };

  // Add activity to Firebase
  const addActivityToFirebase = async (activity: Activities) => {
    if (!workspaceId) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        activities: arrayUnion(activity)
      });
      return true;
    } catch (error) {
      console.error('Failed to add activity to Firebase:', error);
      setActivitiesError('Failed to save activity');
      return false;
    }
  };

  // Update activity in Firebase
  const updateActivityInFirebase = async (oldActivity: Activities, newActivity: Activities) => {
    if (!workspaceId) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        activities: arrayRemove(oldActivity)
      });
      await updateDoc(workspaceRef, {
        activities: arrayUnion(newActivity)
      });
      return true;
    } catch (error) {
      console.error('Failed to update activity in Firebase:', error);
      setActivitiesError('Failed to update activity');
      return false;
    }
  };

  // Remove activity from Firebase
  const removeActivityFromFirebase = async (activity: Activities) => {
    if (!workspaceId) return false;
    
    try {
      const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        activities: arrayRemove(activity)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove activity from Firebase:', error);
      setActivitiesError('Failed to remove activity');
      return false;
    }
  };

  const handleAddManager = async () => {
    if (!newManager.name || !newManager.email || !newManager.phone) return;
    
    const managerToAdd: Manager = {
      id: Date.now().toString(),
      ...newManager,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setManagers(prev => [...prev, managerToAdd]);
    setNewManager({ name: '', roles: '', email: '', phone: '' });
    setManagersError(null);
    
  // Save to Firebase
  const success = await addManagerToFirebase(managerToAdd);
    if (!success) {
      // Revert optimistic update on failure
      setManagers(prev => prev.filter(m => m.id !== managerToAdd.id));
    } else {
      // On success, create/send an invite token via server API (magic-link)
      try {
        const inviterName = (window as any)?.CURRENT_USER_NAME || 'Workspace Manager';
  const workspaceName = workspace?.name || '';

        // Build headers: prefer Firebase ID token in Authorization header
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            const idToken = await currentUser.getIdToken();
            if (idToken) headers['authorization'] = `Bearer ${idToken}`;
          }
        } catch (e) {
          // ignore token retrieval errors
        }
        if (!headers.authorization) headers['x-admin-secret'] = (window as any)?.__ADMIN_SECRET || '';

        const resp = await fetch('/api/admin/invite', {
          method: 'POST',
          headers,
          body: JSON.stringify({ email: managerToAdd.email, workspaceId: workspaceId, workspaceOrgId: organisationId || null, inviterName, workspaceName })
        });
        const data = await resp.json();
        if (!data.ok) {
          console.warn('Invite API responded with error', data);
          toast({ title: 'Invite failed', description: data?.error || 'Failed to create invite', variant: 'destructive' });
        } else {
          if (!data.emailSent) {
            console.warn('Invite token created but email not sent:', data.error);
            toast({ title: 'Invite created', description: `Created invite token for ${managerToAdd.email} (email not sent)` });
          } else {
            toast({ title: 'Invite sent', description: `Magic link sent to ${managerToAdd.email}` });
          }
          // Refresh the pending invites list so count and items update whenever token was created
          try { fetchPendingInvites(); } catch (e) { /* ignore */ }
          console.info('Invite created for', managerToAdd.email);
        }
      } catch (e) {
        console.error('Failed to call invite API', e);
      }
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

  const handleDeleteManager = async (manager: Manager) => {
    // Optimistically update UI
    setManagers(prev => prev.filter(m => m.id !== manager.id));
    setManagersError(null);
    
    // Remove from Firebase
    const success = await removeManagerFromFirebase(manager);
    if (!success) {
      // Revert optimistic update on failure
      setManagers(prev => [...prev, manager]);
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    // optimistic UI
    setTeams((prevTeams) => prevTeams.filter((team) => team.id !== teamId));
    (async () => {
      try {
        if (!workspaceId) throw new Error('Missing workspace id');
  const teamRef = doc(db, workspaceCollectionPath(workspaceId, 'teams', organisationId || workspace?.organisationId), teamId);
        await deleteDoc(teamRef);
      } catch (error) {
        console.error("Error deleting team:", error);
        // Could refetch or revert optimistic change; for now refetch all teams
          try {
          if (!workspaceId) return;
          const teamsCollection = collection(db, workspaceCollectionPath(workspaceId, 'teams', organisationId || workspace?.organisationId));
          const teamsSnapshot = await getDocs(teamsCollection);
          const fetchedTeams = teamsSnapshot.docs.map((d) => {
            const data = d.data() as Team;
            return { ...data, id: data.id ?? d.id, workspaceId: workspaceId } as Team;
          });
          setTeams(fetchedTeams);
        } catch (e) {
          console.error("Error refetching teams after delete failure:", e);
        }
      }
    })();
  };

  const handleAccessUpdated = (teamId: string, accessibleFolderIds: string[]) => {
    // optimistic UI update
    setTeams((prevTeams) =>
      prevTeams.map((team: Team) =>
        team.id === teamId
          ? { ...team, accessibleFolderIds, folderCount: accessibleFolderIds.length }
          : team
      )
    );
    // persist to Firestore
    (async () => {
      try {
        if (!workspaceId) throw new Error('Missing workspace id');
      const teamRef = doc(db, workspaceCollectionPath(workspaceId, 'teams', organisationId || workspace?.organisationId), teamId);
        await updateDoc(teamRef, {
          accessibleFolderIds,
          folderCount: accessibleFolderIds.length,
        });
      } catch (error) {
        console.error("Error updating team access in Firestore:", error);
      }
    })();
  };

  const handleTeamCreated = (newTeam: Team) => {
    // create team in Firestore and add to UI optimistically
    const tmpId = newTeam.id ?? `team-${Date.now()}`;
    const teamToAdd = { ...newTeam, id: tmpId } as Team;
    setTeams((prevTeams) => [...prevTeams, teamToAdd]);
    (async () => {
      try {
        if (!workspaceId) throw new Error('Missing workspace id');
  const teamRef = doc(db, workspaceCollectionPath(workspaceId, 'teams', organisationId || workspace?.organisationId), teamToAdd.id);
        await setDoc(teamRef, teamToAdd);
      } catch (error) {
        console.error("Error creating team in Firestore:", error);
      }
    })();
  };

  const handleAddEmail = (teamId: string, email: string) => {
    // optimistic UI update
    setTeams((prevTeams) =>
      prevTeams.map((team: Team) =>
        team.id === teamId
          ? { ...team, emails: [...(team.emails || []), email] }
          : team
      )
    );
    // use atomic arrayUnion to avoid race conditions
    (async () => {
      try {
        if (!workspace?.id) throw new Error('Missing workspace id');
  const teamRef = doc(db, workspaceCollectionPath(workspace.id, 'teams', (workspace as any).organisationId || workspace.organisationId), teamId);
        await updateDoc(teamRef, { emails: arrayUnion(email) });
        // If this is the Inspection team, create a magic-link invite with 24h expiry and inspection_readonly role
        const team = teams.find(t => t.id === teamId || (t.name === 'Inspection' && t.workspaceId === workspace?.id));
        const isInspection = team?.name === 'Inspection' || teamId.startsWith(`inspection-${workspace?.id}`);
        // read selected duration for this team (default to 24 hours)
        const expiresInHours = inviteDurations[teamId] || 24;
        if (isInspection) {
          try {
            const inviterName = (window as any)?.CURRENT_USER_NAME || 'Workspace Manager';
            const workspaceName = workspace?.name || '';
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            try {
              const currentUser = auth.currentUser;
              if (currentUser) {
                const idToken = await currentUser.getIdToken();
                if (idToken) headers['authorization'] = `Bearer ${idToken}`;
              }
            } catch (e) {
              // ignore
            }
            if (!headers.authorization) headers['x-admin-secret'] = (window as any)?.__ADMIN_SECRET || '';

            const resp = await fetch('/api/admin/invite', {
              method: 'POST',
              headers,
              body: JSON.stringify({ email, workspaceId: workspace.id, workspaceOrgId: organisationId || null, inviterName, workspaceName, expiresInHours, temporaryRole: 'inspection_readonly' })
            });
            const data = await resp.json();
            if (!data.ok) {
              console.warn('Invite API responded with error for inspection invite', data);
              toast({ title: 'Invite failed', description: data?.error || 'Failed to create invite', variant: 'destructive' });
            } else {
              if (data.emailSent) {
                toast({ title: 'Invite sent', description: `Magic link sent to ${email}` });
              } else {
                toast({ title: 'Invite created', description: `Created invite token for ${email} (email not sent)` });
              }
              try { fetchPendingInvites(); } catch (e) { /* ignore */ }
            }
          } catch (err) {
            console.error('Failed to create inspection invite', err);
            toast({ title: 'Invite failed', description: 'Failed to create invite', variant: 'destructive' });
          }
        }
      } catch (error) {
        console.error("Error adding email to team in Firestore:", error);
      }
    })();
  };

  const handleRemoveEmail = (teamId: string, email: string) => {
    setTeams((prevTeams) =>
      prevTeams.map((team: Team) =>
        team.id === teamId
          ? { ...team, emails: (team.emails || []).filter((e: string) => e !== email) }
          : team
      )
    );
    (async () => {
      try {
        if (!workspaceId) throw new Error('Missing workspace id');
      const teamRef = doc(db, workspaceCollectionPath(workspaceId, 'teams', organisationId || workspace?.organisationId), teamId);
        await updateDoc(teamRef, { emails: arrayRemove(email) });
      } catch (error) {
        console.error("Error removing email from team in Firestore:", error);
      }
    })();
  };

  const handleAddNurse = async () => {
    if (!newNurse.name || !newNurse.email || !newNurse.phone) return;
    
    const nurseToAdd: Nurse = {
      id: Date.now().toString(),
      ...newNurse,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setNurses(prev => [...prev, nurseToAdd]);
    setNewNurse({ name: '', roles: '', email: '', phone: '' });
    setNursesError(null);
    
    const success = await addNurseToFirebase(nurseToAdd);
    if (!success) {
      // Revert optimistic update
      setNurses(prev => prev.filter(n => n.id !== nurseToAdd.id));
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

  const handleAddCTM = async () => {
    if (!newCTM.name || !newCTM.email || !newCTM.phone) return;
    
    const ctmToAdd: CTM = {
      id: Date.now().toString(),
      ...newCTM,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setCTMs(prev => [...prev, ctmToAdd]);
    setNewCTM({ name: '', roles: '', email: '', phone: '' });
    setCTMsError(null);
    
    const success = await addCTMToFirebase(ctmToAdd);
    if (!success) {
      // Revert optimistic update
      setCTMs(prev => prev.filter(c => c.id !== ctmToAdd.id));
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

  const handleAddDomestic = async () => {
    if (!newDomestic.name || !newDomestic.email || !newDomestic.phone) return;
    
    const domesticToAdd: Domestic = {
      id: Date.now().toString(),
      ...newDomestic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setDomestics(prev => [...prev, domesticToAdd]);
    setNewDomestic({ name: '', roles: '', email: '', phone: '' });
    setDomesticsError(null);
    
    const success = await addDomesticToFirebase(domesticToAdd);
    if (!success) {
      // Revert optimistic update
      setDomestics(prev => prev.filter(d => d.id !== domesticToAdd.id));
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

  const handleAddMaintenance = async () => {
    if (!newMaintenance.name || !newMaintenance.email || !newMaintenance.phone) return;
    
    const maintenanceToAdd: Maintenance = {
      id: Date.now().toString(),
      ...newMaintenance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setMaintenances(prev => [...prev, maintenanceToAdd]);
    setNewMaintenance({ name: '', roles: '', email: '', phone: '' });
    setMaintenancesError(null);
    
    const success = await addMaintenanceToFirebase(maintenanceToAdd);
    if (!success) {
      // Revert optimistic update
      setMaintenances(prev => prev.filter(m => m.id !== maintenanceToAdd.id));
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

  const handleAddKitchen = async () => {
    if (!newKitchen.name || !newKitchen.email || !newKitchen.phone) return;
    
    const kitchenToAdd: Kitchen = {
      id: Date.now().toString(),
      ...newKitchen,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setKitchens(prev => [...prev, kitchenToAdd]);
    setNewKitchen({ name: '', roles: '', email: '', phone: '' });
    setKitchensError(null);
    
    const success = await addKitchenToFirebase(kitchenToAdd);
    if (!success) {
      // Revert optimistic update
      setKitchens(prev => prev.filter(k => k.id !== kitchenToAdd.id));
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

  const handleAddActivity = async () => {
    if (!newActivity.name || !newActivity.email || !newActivity.phone) return;
    
    const activityToAdd: Activities = {
      id: Date.now().toString(),
      ...newActivity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setActivities(prev => [...prev, activityToAdd]);
    setNewActivity({ name: '', roles: '', email: '', phone: '' });
    setActivitiesError(null);
    
    const success = await addActivityToFirebase(activityToAdd);
    if (!success) {
      // Revert optimistic update
      setActivities(prev => prev.filter(a => a.id !== activityToAdd.id));
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
    <div className="flex flex-col h-full bg-muted/20">
      {/* Full-width themed header (opt-out for embedding pages) */}
      {!hideHeader && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
          </div>
          <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold leading-tight tracking-tight">Teams & Permissions</h2>
                <div className="text-slate-200 text-base leading-relaxed">Manage team access and folder permissions across your workspace</div>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <NewTeamDialog onTeamCreated={handleTeamCreated} workspaceId={workspaceId}>
                <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Team
                </Button>
              </NewTeamDialog>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-6 overflow-y-auto">
        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-[1200px] grid-cols-8 bg-white border border-gray-200 rounded-lg mb-6">
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
            <TabsTrigger value="domestic" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Domestic
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Kitchen
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Activities
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="teams" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team: Team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-headline">{team.name}</CardTitle>
                      <TeamMenu
                        team={team}
                        workspace={workspace}
                        onDelete={() => handleDeleteTeam(team.id)}
                        onAccessUpdated={handleAccessUpdated}
                      />
                    </div>
                    <CardDescription>
                      {team.members.length} members have access to {team.folderCount} folders.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold">Emails</h4>
                      <ul className="list-disc pl-5">
                        {(team.emails || []).length === 0 ? (
                          <li className="text-sm text-muted-foreground">No emails added</li>
                        ) : (
                          (team.emails || []).map((email: string) => (
                            <li key={email} className="flex justify-between items-center">
                              <span>{email}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveEmail(team.id, email)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </li>
                          ))
                        )}
                      </ul>
                      <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="Add email"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const input = e.target as HTMLInputElement;
                                handleAddEmail(team.id, input.value);
                                input.value = "";
                              }
                            }}
                          />
                          {/* Only show duration selector for Inspection team */}
                          {(team.name === 'Inspection' || team.id.startsWith(`inspection-${workspace?.id}`)) && (
                            <Select value={(inviteDurations[team.id] || 24).toString()} onValueChange={(val: string) => setInviteDurations(prev => ({ ...prev, [team.id]: parseInt(val, 10) }))}>
                              <SelectTrigger className="min-w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="4">4 hours</SelectItem>
                                <SelectItem value="8">8 hours</SelectItem>
                                <SelectItem value="24">24 hours</SelectItem>
                                <SelectItem value="48">48 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            onClick={(e) => {
                              // Find the input element within the same container so this works whether the Select exists or not
                              const container = e.currentTarget.parentElement as HTMLElement | null;
                              const emailInput = container?.querySelector('input') as HTMLInputElement | null;
                              if (!emailInput) return;
                              handleAddEmail(team.id, emailInput.value);
                              emailInput.value = "";
                            }}
                          >
                            Add
                          </Button>
                        </div>
                    </div>
                    <div className="flex -space-x-2">
                      {team.members.map((member) => (
                        <Avatar
                          key={member.id}
                          className="border-2 border-background"
                        >
                          <AvatarImage
                            src={member.avatarUrl ?? undefined}
                            alt={member.name ?? undefined}
                          />
                          <AvatarFallback>
                            {member.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {team.members.length > 4 && (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border-2 border-background text-xs font-medium text-muted-foreground">
                          +{Math.max(0, team.members.length - 4)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Add New Manager
                  </CardTitle>
                  <CardDescription>
                    Add managers who will oversee this workspace and be contact points for teams.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Invites ({pendingInvites.length})</h4>
                    <div className="space-y-2">
                      {pendingInvites.length === 0 ? (
                        <div className="text-sm text-gray-500">No pending invites for this workspace.</div>
                      ) : (
                        pendingInvites.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div>
                              <div className="text-sm font-medium">{inv.email}</div>
                              <div className="text-xs text-gray-500">Expires: {inv.expiresAt ? (new Date(inv.expiresAt).toLocaleString()) : 'N/A'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={async () => {
                                try {
                                  const resp = await fetch(`/api/admin/invite/${encodeURIComponent(inv.id)}`, { method: 'POST' });
                                  const d = await resp.json();
                                  if (!d.ok) console.warn('Resend failed', d);
                                } catch (e) { console.error(e); }
                              }}>Resend</Button>
                              <Button variant="destructive" size="sm" onClick={async () => {
                                try {
                                  const resp = await fetch(`/api/admin/invite/${encodeURIComponent(inv.id)}`, { method: 'DELETE' });
                                  const d = await resp.json();
                                  if (d.ok) setPendingInvites(prev => prev.filter(p => p.id !== inv.id));
                                } catch (e) { console.error(e); }
                              }}>Revoke</Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
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
                      <Select value={newManager.roles || 'Manager'} onValueChange={(value: string) => setNewManager(prev => ({ ...prev, roles: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Deputy Manager">Deputy Manager</SelectItem>
                        </SelectContent>
                      </Select>
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
                      onClick={handleAddManager}
                      disabled={!newManager.name || !newManager.roles || !newManager.email || !newManager.phone || managersLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {managersLoading ? 'Adding...' : 'Add Manager'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Managers List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    Workspace Managers ({managers.length})
                    {managersLoading && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Manage the people responsible for overseeing this workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {managersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-3 text-gray-600">Loading managers...</span>
                    </div>
                  ) : managers.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No managers assigned</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Add managers using the form above to get started.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {managers.map((manager) => (
                        <ManagerCard
                          key={manager.id}
                          manager={manager}
                          isEditing={editingManager === manager.id}
                          onEdit={() => setEditingManager(manager.id)}
                          onCancelEdit={() => setEditingManager(null)}
                          onSave={(updatedData) => handleUpdateManager(manager.id, updatedData)}
                          onDelete={() => handleDeleteManager(manager)}
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
                      onClick={handleAddNurse}
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
                        <NurseCard
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
                      onClick={handleAddCTM}
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
                        <CTMCard
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
                      onClick={handleAddDomestic}
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
                        <DomesticCard
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
                    <Plus className="w-5 h-5 text-blue-600" />
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
                      onClick={handleAddMaintenance}
                      disabled={!newMaintenance.name || !newMaintenance.roles || !newMaintenance.email || !newMaintenance.phone || maintenancesLoading}
                      className="bg-blue-600 hover:bg-blue-700"
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
                    Current Maintenances ({maintenances.length})
                    {maintenancesLoading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {maintenances.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No maintenances assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add maintenances using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {maintenances.map((maintenance) => (
                        <MaintenanceCard
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
                    <Plus className="w-5 h-5 text-blue-600" />
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
                      onClick={handleAddKitchen}
                      disabled={!newKitchen.name || !newKitchen.roles || !newKitchen.email || !newKitchen.phone || kitchensLoading}
                      className="bg-blue-600 hover:bg-blue-700"
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
                    Current Kitchens ({kitchens.length})
                    {kitchensLoading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {kitchens.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No kitchens assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add kitchens using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {kitchens.map((kitchen) => (
                        <KitchenCard
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
                    <Plus className="w-5 h-5 text-blue-600" />
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
                      onClick={handleAddActivity}
                      disabled={!newActivity.name || !newActivity.roles || !newActivity.email || !newActivity.phone || activitiesLoading}
                      className="bg-blue-600 hover:bg-blue-700"
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
                    {activitiesLoading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                  </h3>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No activities assigned yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add activities using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <ActivityCard
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
      </main>
    </div>
  );
}


// Manager Card Component with Edit Functionality
interface ManagerCardProps {
  manager: Manager;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Manager>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function ManagerCard({ manager, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: ManagerCardProps) {
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
            <Select value={editForm.roles || 'Manager'} onValueChange={(value: string) => setEditForm(prev => ({ ...prev, roles: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Deputy Manager">Deputy Manager</SelectItem>
              </SelectContent>
            </Select>
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
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-full">
            <UserCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{manager.name}</p>
            <p className="text-sm text-blue-600 font-medium">Workspace Manager</p>
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Mail className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{manager.email}</p>
            <p className="text-xs text-gray-500">Email address</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Phone className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{manager.phone}</p>
            <p className="text-xs text-gray-500">Phone number</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Nurse Card Component with Edit Functionality
interface NurseCardProps {
  nurse: Nurse;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Nurse>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function NurseCard({ nurse, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: NurseCardProps) {
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
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nurse name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <Input
              value={editForm.roles}
              onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
              placeholder="e.g. Registered Nurse, HCA"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="nurse@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <Input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+44 123 456 7890"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={disabled}
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-full">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{nurse.name}</p>
            <p className="text-sm text-green-600 font-medium">Nurse</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{nurse.roles}</p>
            <p className="text-xs text-gray-500">Roles</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Mail className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{nurse.email}</p>
            <p className="text-xs text-gray-500">Email address</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Phone className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{nurse.phone}</p>
            <p className="text-xs text-gray-500">Phone number</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-green-600 hover:text-green-700 hover:bg-green-100"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// CTM Card Component with Edit Functionality
interface CTMCardProps {
  ctm: CTM;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<CTM>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function CTMCard({ ctm, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: CTMCardProps) {
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
      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="CTM name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <Input
              value={editForm.roles}
              onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
              placeholder="e.g. Care Team Manager, Senior CTM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="ctm@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <Input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+44 123 456 7890"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={disabled}
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-100">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-full">
            <UserCheck className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{ctm.name}</p>
            <p className="text-sm text-purple-600 font-medium">CTM</p>
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Mail className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{ctm.email}</p>
            <p className="text-xs text-gray-500">Email address</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Phone className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{ctm.phone}</p>
            <p className="text-xs text-gray-500">Phone number</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}


// Domestic Card Component with Edit Functionality
interface DomesticCardProps {
  domestic: Domestic;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Domestic>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function DomesticCard({ domestic, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: DomesticCardProps) {
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
      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Domestic name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <Input
              value={editForm.roles}
              onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
              placeholder="e.g. Housekeeper, Cleaner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="domestic@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <Input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+44 123 456 7890"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={disabled}
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-full">
            <UserCheck className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{domestic.name}</p>
            <p className="text-sm text-orange-600 font-medium">Domestic</p>
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Mail className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{domestic.email}</p>
            <p className="text-xs text-gray-500">Email address</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Phone className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{domestic.phone}</p>
            <p className="text-xs text-gray-500">Phone number</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Maintenance Card Component with Edit Functionality
interface MaintenanceCardProps {
  maintenance: Maintenance;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Maintenance>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function MaintenanceCard({ maintenance, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: MaintenanceCardProps) {
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
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Maintenance name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <Input
              value={editForm.roles}
              onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
              placeholder="e.g. Electrician, Plumber, Handyman"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="maintenance@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <Input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+44 123 456 7890"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={disabled}
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-100">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gray-100 rounded-full">
            <UserCheck className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{maintenance.name}</p>
            <p className="text-sm text-gray-600 font-medium">Maintenance</p>
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Mail className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{maintenance.email}</p>
            <p className="text-xs text-gray-500">Email address</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Phone className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{maintenance.phone}</p>
            <p className="text-xs text-gray-500">Phone number</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Kitchen Card Component with Edit Functionality
interface KitchenCardProps {
  kitchen: Kitchen;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Kitchen>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function KitchenCard({ kitchen, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: KitchenCardProps) {
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
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Kitchen name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <Input
              value={editForm.roles}
              onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
              placeholder="e.g. Chef, Cook, Kitchen Assistant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="kitchen@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <Input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+44 123 456 7890"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={disabled}
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border border-red-100">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-full">
            <UserCheck className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{kitchen.name}</p>
            <p className="text-sm text-red-600 font-medium">Kitchen</p>
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Mail className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{kitchen.email}</p>
            <p className="text-xs text-gray-500">Email address</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Phone className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{kitchen.phone}</p>
            <p className="text-xs text-gray-500">Phone number</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Activity Card Component with Edit Functionality
interface ActivityCardProps {
  activity: Activities;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updatedData: Partial<Activities>) => void;
  onDelete: () => void;
  disabled: boolean;
}

function ActivityCard({ activity, isEditing, onEdit, onCancelEdit, onSave, onDelete, disabled }: ActivityCardProps) {
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
      <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Activity name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <Input
              value={editForm.roles}
              onChange={(e) => setEditForm(prev => ({ ...prev, roles: e.target.value }))}
              placeholder="e.g. Activities Coordinator, Entertainment"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="activity@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <Input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+44 123 456 7890"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!editForm.name || !editForm.roles || !editForm.email || !editForm.phone || disabled}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={disabled}
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-100">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pink-100 rounded-full">
            <UserCheck className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{activity.name}</p>
            <p className="text-sm text-pink-600 font-medium">Activities</p>
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Mail className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{activity.email}</p>
            <p className="text-xs text-gray-500">Email address</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full">
            <Phone className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{activity.phone}</p>
            <p className="text-xs text-gray-500">Phone number</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          className="text-pink-600 hover:text-pink-700 hover:bg-pink-100"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}


const TeamMenu = ({ team, workspace, onDelete, onAccessUpdated }: { team: Team, workspace: Workspace, onDelete: () => void, onAccessUpdated: (teamId: string, accessibleFolderIds: string[]) => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 -mt-2" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit Team Name
        </DropdownMenuItem>
        <ManageFolderAccessDialog team={team} workspace={workspace} onAccessUpdated={onAccessUpdated}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <FolderLock className="mr-2 h-4 w-4" />
                Manage Folder Access
            </DropdownMenuItem>
        </ManageFolderAccessDialog>
        <DeleteTeamDialog onConfirm={onDelete}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Team
            </DropdownMenuItem>
        </DeleteTeamDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


function DeleteTeamDialog({ children, onConfirm }: { children: React.ReactNode, onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this team?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the team and remove all associated permissions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
