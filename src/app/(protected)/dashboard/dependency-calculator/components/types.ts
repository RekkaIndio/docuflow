export type DependencyLevel = "" | "0" | "1" | "2" | "3" | "4" | "5";
export type Shift = "Day" | "Night";
export type ViewMode = "dashboard" | "residents" | "communities" | "analytics" | "reports";

export interface Resident {
  name: string;
  room: string;
  id?: string;
  createdAt?: number;
  updatedAt?: number;
  updatedBy?: string | null;
  communityId?: string | null;
  personalCare: DependencyLevel;
  mobility: DependencyLevel;
  continence: DependencyLevel;
  eatingDrinking: DependencyLevel;
  skinIntegrity: DependencyLevel;
  medication: DependencyLevel;
  medical: DependencyLevel;
  breathing: DependencyLevel;
  emotionalSupport: DependencyLevel;
  behaviours: DependencyLevel;
  additionalNeeds: DependencyLevel;
  cognition: DependencyLevel;
  nightNeeds: DependencyLevel;
  
  // Therapy Needs (organizational extension)
  therapy_communication: DependencyLevel;
  therapy_cognitive: DependencyLevel;
  therapy_behaviour: DependencyLevel;
}

export interface Community {
  id: string;
  name: string;
  residentIds: string[];
  createdAt?: number;
  color?: string;
}

export interface ChartData {
  date: string;
  ndpsScore: number;
  careHours: number;
  staffRequired: number;
  residentCount: number;
}