"use client";
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Users, Search, User, Building, Phone, Mail, MapPin, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import FeatureManagement from '@/components/admin/feature-management';

interface AdminSettingsProps {
  workspaces: any[];
}

interface OwnerProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  Organisation: string;
  title: string;
  department: string;
  licenseNumber: string;
  certifications: string;
}

export default function AdminSettings({ workspaces = [] }: AdminSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Get organisationId from workspaces - use first workspace's organisationId
  // In a multi-org setup, you might want to add org selection UI here
  const organisationId = React.useMemo(() => {
    const firstWorkspace = workspaces.find(w => w.organisationId);
    const orgId = firstWorkspace?.organisationId || user?.organisationId;
    return orgId;
  }, [workspaces, user?.organisationId]);
  
  // Owner profile state
  const [ownerProfile, setOwnerProfile] = React.useState<OwnerProfile>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    Organisation: '',
    title: '',
    department: '',
    licenseNumber: '',
    certifications: '',
  });

  // Load current owner profile data
  React.useEffect(() => {
    const loadOwnerProfile = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setOwnerProfile({
            name: userData.name || user.name || '',
            email: userData.email || user.email || '',
            phone: userData.phone || '',
            address: userData.address || '',
            city: userData.city || '',
            state: userData.state || '',
            postalCode: userData.postalCode || '',
            country: userData.country || '',
            Organisation: userData.Organisation || '',
            title: userData.title || '',
            department: userData.department || '',
            licenseNumber: userData.licenseNumber || '',
            certifications: userData.certifications || '',
          });
        }
      } catch (error) {
        console.error('Failed to load owner profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOwnerProfile();
  }, [user]);

  // Save owner profile
  const saveOwnerProfile = async () => {
    if (!user?.id) return;
    
    try {
      setIsSaving(true);
      const userRef = doc(db, 'users', user.id);
      
      await updateDoc(userRef, {
        ...ownerProfile,
        updatedAt: new Date(),
      }).catch(async (error) => {
        // If user doc doesn't exist, create it
        if (error.code === 'not-found') {
          await setDoc(userRef, {
            ...ownerProfile,
            role: 'Admin',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          throw error;
        }
      });
      
      toast({
        title: 'Success',
        description: 'Owner profile updated successfully',
      });
    } catch (error) {
      console.error('Failed to save owner profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof OwnerProfile, value: string) => {
    setOwnerProfile(prev => ({ ...prev, [field]: value }));
  };

  const filtered = React.useMemo(() => {
    if (!query) return workspaces;
    const q = query.toLowerCase();
    return workspaces.filter(w => (w.name || w.id || '').toLowerCase().includes(q) || (w.ownerId || '').toLowerCase().includes(q) || (w.region || '').toLowerCase().includes(q));
  }, [workspaces, query]);

  const openWorkspace = (ws: any) => {
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('navigate-to-workspace', { detail: { workspaceId: ws.id, workspaceName: ws.name } }));
        // Also navigate admin to workspaces view so UI opens the workspace
        window.dispatchEvent(new CustomEvent('admin-set-view', { detail: { view: 'workspaces' } }));
      }
    } catch (e) {
      // noop
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Admin Settings</h2>
            <div className="text-sm text-muted-foreground">Global administration and superuser tools</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Owner Profile</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="features">Feature Management</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Header card with title and save action */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">Owner Information</h3>
                    <p className="text-sm text-muted-foreground">This information will be used for policy signing and administrative purposes</p>
                  </div>
                </div>
                <Button onClick={saveOwnerProfile} disabled={isSaving || isLoading}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading profile...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Information card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h4 className="text-md font-medium">Personal Information</h4>
                  <p className="text-sm text-muted-foreground">Your name, contact and job title</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" value={ownerProfile.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" value={ownerProfile.email} onChange={(e) => updateField('email', e.target.value)} placeholder="Enter email address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={ownerProfile.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Enter phone number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input id="title" value={ownerProfile.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g., Care Home Manager" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organisation Information card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h4 className="text-md font-medium">Organisation Information</h4>
                  <p className="text-sm text-muted-foreground">Company and professional details</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="Organisation">Organisation Name</Label>
                  <Input id="Organisation" value={ownerProfile.Organisation} onChange={(e) => updateField('Organisation', e.target.value)} placeholder="Enter Organisation name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={ownerProfile.department} onChange={(e) => updateField('department', e.target.value)} placeholder="Enter department" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input id="licenseNumber" value={ownerProfile.licenseNumber} onChange={(e) => updateField('licenseNumber', e.target.value)} placeholder="Professional license number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certifications">Certifications</Label>
                  <Input id="certifications" value={ownerProfile.certifications} onChange={(e) => updateField('certifications', e.target.value)} placeholder="Relevant certifications" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h4 className="text-md font-medium">Address Information</h4>
                  <p className="text-sm text-muted-foreground">Street address and locality</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Textarea id="address" value={ownerProfile.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Enter street address" className="min-h-[60px]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={ownerProfile.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Enter city" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input id="state" value={ownerProfile.state} onChange={(e) => updateField('state', e.target.value)} placeholder="Enter state" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input id="postalCode" value={ownerProfile.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} placeholder="Enter postal code" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={ownerProfile.country} onChange={(e) => updateField('country', e.target.value)} placeholder="Enter country" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspaces" className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm font-medium">Workspaces</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input placeholder="Search workspaces by name, owner or region" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>

              <div className="space-y-3">
                {filtered.length === 0 && <div className="text-sm text-muted-foreground">No workspaces found</div>}
                {filtered.map((ws) => (
                  <div key={ws.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{ws.name || ws.id}</div>
                      <div className="text-xs text-muted-foreground">Owner: {ws.ownerId || '—'} · Region: {ws.region || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => openWorkspace(ws)}>Open</Button>
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(ws.id); }}>Copy ID</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <FeatureManagement organisationId={organisationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
