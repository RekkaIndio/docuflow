"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Save, User, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { StaffMember } from "./rotas-view";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { workspaceDocPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

interface ContractedHoursSettingsProps {
  staff: StaffMember[];
  workspaceId: string;
  organisationId?: string;
  onUpdate: (staffId: string, hours: number, type: 'weekly' | 'monthly') => void;
}

interface StaffHoursConfig {
  [staffId: string]: {
    contractedHours: number;
    hoursType: 'weekly' | 'monthly';
  };
}

export function ContractedHoursSettings({ staff, workspaceId, organisationId, onUpdate }: ContractedHoursSettingsProps) {
  const [hoursConfig, setHoursConfig] = useState<StaffHoursConfig>({});
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [hourInputs, setHourInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load contracted hours from Firestore
  useEffect(() => {
    const loadContractedHours = async () => {
      if (!workspaceId) return;

      try {
        const hoursRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', 'contracted-hours');
        const hoursSnap = await getDoc(hoursRef);

        if (hoursSnap.exists()) {
          setHoursConfig(hoursSnap.data() as StaffHoursConfig);
        } else {
          // Initialize with defaults
          const defaultConfig: StaffHoursConfig = {};
          staff.forEach(member => {
            defaultConfig[member.id] = {
              contractedHours: member.contractedHours || 40,
              hoursType: member.hoursType || 'weekly'
            };
          });
          setHoursConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Failed to load contracted hours:', error);
      }
    };

    loadContractedHours();
  }, [workspaceId, organisationId, staff]);

  const handleSave = async () => {
    if (!workspaceId) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const nextConfig: StaffHoursConfig = { ...hoursConfig };

      Object.entries(hourInputs).forEach(([staffId, raw]) => {
        const existing = nextConfig[staffId] || { contractedHours: 40, hoursType: 'weekly' as const };
        const parsed = raw.trim() === '' ? existing.contractedHours : clampHours(Number(raw));
        nextConfig[staffId] = {
          contractedHours: parsed,
          hoursType: existing.hoursType,
        };
        onUpdate(staffId, parsed, existing.hoursType);
      });

      setHoursConfig(nextConfig);
      setEditingStaff(null);
      setHourInputs({});

      const hoursRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', 'contracted-hours');
      await setDoc(hoursRef, nextConfig);

      setSaveMessage('Contracted hours saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save contracted hours:', error);
      setSaveMessage('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateStaffHours = (staffId: string, hours: number, type: 'weekly' | 'monthly') => {
    setHoursConfig(prev => ({
      ...prev,
      [staffId]: { contractedHours: hours, hoursType: type }
    }));
    onUpdate(staffId, hours, type);
  };

  const getHoursForStaff = (staffId: string) => {
    return hoursConfig[staffId] || { contractedHours: 40, hoursType: 'weekly' as const };
  };

  const handleHoursInputChange = (staffId: string, rawValue: string) => {
    if (/^\d*$/.test(rawValue)) {
      setHourInputs(prev => ({
        ...prev,
        [staffId]: rawValue,
      }));
    }
  };

  const clampHours = (value: number) => {
    if (Number.isNaN(value)) return 40;
    return Math.min(Math.max(value, 1), 168);
  };

  const commitHoursChange = (staffId: string) => {
    const currentConfig = getHoursForStaff(staffId);
    const raw = hourInputs[staffId];
    const parsed = raw === undefined || raw.trim() === ''
      ? currentConfig.contractedHours
      : clampHours(Number(raw));
  updateStaffHours(staffId, parsed, currentConfig.hoursType);
    setHourInputs(prev => {
      const next = { ...prev };
      delete next[staffId];
      return next;
    });
    setEditingStaff(null);
  };

  const handlePeriodChange = (staffId: string, nextType: 'weekly' | 'monthly') => {
    const currentConfig = getHoursForStaff(staffId);
    const raw = hourInputs[staffId];
    const parsedValue = raw === undefined || raw.trim() === ''
      ? currentConfig.contractedHours
      : clampHours(Number(raw));
    updateStaffHours(staffId, parsedValue, nextType);
    if (raw !== undefined) {
      setHourInputs(prev => {
        const next = { ...prev };
        next[staffId] = parsedValue.toString();
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Contracted Hours Settings
              </CardTitle>
              <CardDescription className="mt-2">
                Set the contracted hours for each staff member to track their weekly/monthly schedules
              </CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {saveMessage && (
            <Alert className={cn(
              "mb-4",
              saveMessage.includes('success') ? "border-green-500 bg-green-50" : "border-destructive bg-destructive/10"
            )}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {staff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No staff members found. Add staff in the Teams page.
              </div>
            ) : (
              staff.map((member) => {
                const config = getHoursForStaff(member.id);
                const isEditing = editingStaff === member.id;
                const inputValue = isEditing
                  ? hourInputs[member.id] ?? config.contractedHours.toString()
                  : config.contractedHours.toString();

                return (
                  <Card key={member.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Staff Info */}
                        <div className="flex items-center gap-3 flex-1">
                          <User className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{member.name}</div>
                            <div className="text-sm text-muted-foreground">{member.roles}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {member.department}
                            </Badge>
                          </div>
                        </div>

                        {/* Hours Configuration */}
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Hours</Label>
                              <Input
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="1"
                                max="168"
                                value={inputValue}
                                onChange={(e) => handleHoursInputChange(member.id, e.target.value)}
                                className="w-24"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Period</Label>
                              <Select
                                value={config.hoursType}
                                onValueChange={(value: 'weekly' | 'monthly') => handlePeriodChange(member.id, value)}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => commitHoursChange(member.id)}
                            >
                              Done
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold">{config.contractedHours}</div>
                              <div className="text-xs text-muted-foreground capitalize">hours/{config.hoursType === 'weekly' ? 'week' : 'month'}</div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingStaff(member.id);
                                setHourInputs(prev => ({
                                  ...prev,
                                  [member.id]: config.contractedHours?.toString() ?? '',
                                }));
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm mb-2">💡 How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Set each staff member's contracted hours (weekly or monthly)</li>
              <li>• When scheduling shifts, you'll see warnings if approaching or exceeding these hours</li>
              <li>• Green = within hours, Amber = 90%+ used, Red = over contracted hours</li>
              <li>• Changes are saved automatically to your workspace</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
