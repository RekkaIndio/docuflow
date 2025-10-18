import type { DependencyLevel, Shift, Resident as NDPSResident } from "@/lib/staffing/ndps";

export type { DependencyLevel, Shift };
export type Resident = NDPSResident;
export type ViewMode = "dashboard" | "residents" | "communities" | "analytics" | "reports";

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