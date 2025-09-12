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
import { db } from "@/lib/firebase";


interface TeamsViewProps {
    workspace: Workspace;
}

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

export function TeamsView({ workspace }: TeamsViewProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [editingManager, setEditingManager] = useState<string | null>(null);
  const [newManager, setNewManager] = useState({ name: '', email: '', phone: '' });
  const [managersError, setManagersError] = useState<string | null>(null);

  // Nurses state
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [nursesLoading, setNursesLoading] = useState(false);
  const [editingNurse, setEditingNurse] = useState<string | null>(null);
  const [newNurse, setNewNurse] = useState({ name: '', email: '', phone: '' });
  const [nursesError, setNursesError] = useState<string | null>(null);

  // CTMs state
  const [ctms, setCTMs] = useState<CTM[]>([]);
  const [ctmsLoading, setCTMsLoading] = useState(false);
  const [editingCTM, setEditingCTM] = useState<string | null>(null);
  const [newCTM, setNewCTM] = useState({ name: '', email: '', phone: '' });
  const [ctmsError, setCTMsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsCollection = collection(db, "teams");
        const teamsSnapshot = await getDocs(teamsCollection);
        // map docs to include id from Firestore doc id
        let fetchedTeams = teamsSnapshot.docs.map((d) => {
          const data = d.data() as any;
          const accessibleFolderIds = Array.isArray(data.accessibleFolderIds) ? data.accessibleFolderIds : [];
          const emails = Array.isArray(data.emails) ? data.emails : [];
          const members = Array.isArray(data.members) ? data.members : [];
          const folderCount = typeof data.folderCount === "number" ? data.folderCount : accessibleFolderIds.length || 0;
          // Patch: always set workspaceId
          if (!data.workspaceId || data.workspaceId !== workspace.id) {
            // Patch Firestore to set workspaceId if missing or incorrect
            const teamRef = doc(db, "teams", data.id ?? d.id);
            setDoc(teamRef, { ...data, workspaceId: workspace.id }, { merge: true });
          }
          return {
            id: data.id ?? d.id,
            name: data.name ?? "Untitled Team",
            members,
            folderCount,
            accessibleFolderIds,
            emails,
            workspaceId: workspace.id,
          } as Team;
        });

        // Ensure Admin, Staff, and Inspection teams exist for this workspace
        const requiredTeams = [
          { name: "Admin", id: `admin-${workspace.id}` },
          { name: "Staff", id: `staff-${workspace.id}` },
          { name: "Inspection", id: `inspection-${workspace.id}` },
        ];
        const teamsToCreate = requiredTeams.filter(rt => !fetchedTeams.some(t => t.name === rt.name && t.workspaceId === workspace.id));
        for (const team of teamsToCreate) {
          const newTeam: Team = {
            id: team.id,
            name: team.name,
            members: [],
            folderCount: 0,
            accessibleFolderIds: [],
            emails: [],
            workspaceId: workspace.id,
          };
          // Add to Firestore
          const teamRef = doc(db, "teams", newTeam.id);
          await setDoc(teamRef, newTeam);
          fetchedTeams.push(newTeam);
        }
        setTeams(fetchedTeams);
      } catch (error) {
        console.error("Error fetching teams from Firestore:", error);
      }
    };

    fetchTeams();
  }, [workspace.id]);

  // Load managers from workspace
  useEffect(() => {
    const loadManagers = async () => {
      if (!workspace?.id) return;
      
      setManagersLoading(true);
      
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
      } finally {
        setManagersLoading(false);
      }
    };
    
    loadManagers();
  }, [workspace.id]);

  // Load nurses from workspace
  useEffect(() => {
    const loadNurses = async () => {
      if (!workspace?.id) return;
      
      setNursesLoading(true);
      
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
      } finally {
        setNursesLoading(false);
      }
    };
    
    loadNurses();
  }, [workspace.id]);

  // Load CTMs from workspace
  useEffect(() => {
    const loadCTMs = async () => {
      if (!workspace?.id) return;
      
      setCTMsLoading(true);
      
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
      } finally {
        setCTMsLoading(false);
      }
    };
    
    loadCTMs();
  }, [workspace.id]);

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
      setNursesError('Failed to save nurse');
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
      setNursesError('Failed to update nurse');
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
      setNursesError('Failed to remove nurse');
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
      setCTMsError('Failed to save CTM');
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
      setCTMsError('Failed to update CTM');
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
      setCTMsError('Failed to remove CTM');
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
    setNewManager({ name: '', email: '', phone: '' });
    setManagersError(null);
    
    // Save to Firebase
    const success = await addManagerToFirebase(managerToAdd);
    if (!success) {
      // Revert optimistic update on failure
      setManagers(prev => prev.filter(m => m.id !== managerToAdd.id));
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
        const teamRef = doc(db, "teams", teamId);
        await deleteDoc(teamRef);
      } catch (error) {
        console.error("Error deleting team:", error);
        // Could refetch or revert optimistic change; for now refetch all teams
        try {
          const teamsCollection = collection(db, "teams");
          const teamsSnapshot = await getDocs(teamsCollection);
          const fetchedTeams = teamsSnapshot.docs.map((d) => {
            const data = d.data() as Team;
            return { ...data, id: data.id ?? d.id } as Team;
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
        const teamRef = doc(db, "teams", teamId);
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
        const teamRef = doc(db, "teams", teamToAdd.id);
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
        const teamRef = doc(db, "teams", teamId);
        await updateDoc(teamRef, { emails: arrayUnion(email) });
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
        const teamRef = doc(db, "teams", teamId);
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
    setNewNurse({ name: '', email: '', phone: '' });
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
    setNewCTM({ name: '', email: '', phone: '' });
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

  // Load nurses from workspace
  useEffect(() => {
    const loadNurses = async () => {
      if (!workspace?.id) return;
      
      setNursesLoading(true);
      
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
      } finally {
        setNursesLoading(false);
      }
    };
    
    loadNurses();
  }, [workspace.id]);

  // Load CTMs from workspace
  useEffect(() => {
    const loadCTMs = async () => {
      if (!workspace?.id) return;
      
      setCTMsLoading(true);
      
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
      } finally {
        setCTMsLoading(false);
      }
    };
    
    loadCTMs();
  }, [workspace.id]);

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Full-width themed header */}
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
            <NewTeamDialog onTeamCreated={handleTeamCreated}>
              <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm">
                <Plus className="mr-2 h-4 w-4" />
                Create New Team
              </Button>
            </NewTeamDialog>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 overflow-y-auto">
        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-[600px] grid-cols-4 bg-white border border-gray-200 rounded-lg mb-6">
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
                        <Button
                          onClick={(e) => {
                            const input = e.currentTarget
                              .previousElementSibling as HTMLInputElement;
                            handleAddEmail(team.id, input.value);
                            input.value = "";
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
                      onClick={handleAddManager}
                      disabled={!newManager.name || !newManager.email || !newManager.phone || managersLoading}
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
                      onClick={handleAddNurse}
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
                      onClick={handleAddCTM}
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
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nurse name"
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
            disabled={!editForm.name || !editForm.email || !editForm.phone || disabled}
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="CTM name"
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
            disabled={!editForm.name || !editForm.email || !editForm.phone || disabled}
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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
