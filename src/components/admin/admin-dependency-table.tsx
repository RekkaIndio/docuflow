import React from "react";
// Minimal types for admin view
export interface Resident {
  id?: string;
  name: string;
  room: string;
  personalCare?: string;
  mobility?: string;
  continence?: string;
  eatingDrinking?: string;
  skinIntegrity?: string;
  medication?: string;
  medical?: string;
  breathing?: string;
  emotionalSupport?: string;
  behaviours?: string;
  additionalNeeds?: string;
  cognition?: string;
  nightNeeds?: string;
  communityId?: string | null;
}
export interface Community {
  id: string;
  name: string;
  residentIds: string[];
}
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface AdminDependencyTableProps {
  residents: Resident[];
  communities: Community[];
  selectedCommunityId?: string | null;
}

const FIELDS = [
  { key: "personalCare", label: "Personal Care" },
  { key: "mobility", label: "Mobility" },
  { key: "continence", label: "Continence" },
  { key: "eatingDrinking", label: "Eating & Drinking" },
  { key: "skinIntegrity", label: "Skin Integrity" },
  { key: "medication", label: "Medication" },
  { key: "medical", label: "Medical" },
  { key: "breathing", label: "Breathing" },
  { key: "emotionalSupport", label: "Emotional Support" },
  { key: "behaviours", label: "Behaviours" },
  { key: "additionalNeeds", label: "Additional Needs" },
  { key: "cognition", label: "Cognition" },
  { key: "nightNeeds", label: "Night Needs" },
];

// Minute mappings for admin table (match values shown in screenshot)
const MINUTES_BY_FIELD_DAY_ADMIN: Record<string, Record<string, number>> = {
  personalCare: { '': 0, None: 0, Low: 10, Medium: 20, High: 30 },
  eatingDrinking: { '': 0, None: 0, Low: 5, Medium: 15, High: 25 },
  medical: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  mobility: { '': 0, None: 0, Low: 5, Medium: 15, High: 25 },
  continence: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  skinIntegrity: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  medication: { '': 0, None: 0, Low: 5, Medium: 10, High: 15 },
  emotionalSupport: { '': 0, None: 0, Low: 5, Medium: 10, High: 15 },
  cognition: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  nightNeeds: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  additionalNeeds: { '': 0, None: 0, Low: 0, Medium: 10, High: 20 },
  behaviours: { '': 0, None: 0, Low: 0, Medium: 10, High: 20 },
  breathing: { '': 0, None: 0, Low: 0, Medium: 10, High: 20 },
};

const MINUTES_BY_FIELD_NIGHT_ADMIN: Record<string, Record<string, number>> = {
  personalCare: { '': 0, None: 0, Low: 5, Medium: 10, High: 15 },
  eatingDrinking: { '': 0, None: 0, Low: 3, Medium: 8, High: 13 },
  medical: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  mobility: { '': 0, None: 0, Low: 3, Medium: 8, High: 13 },
  continence: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  skinIntegrity: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  medication: { '': 0, None: 0, Low: 3, Medium: 5, High: 8 },
  emotionalSupport: { '': 0, None: 0, Low: 3, Medium: 5, High: 8 },
  cognition: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  nightNeeds: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  additionalNeeds: { '': 0, None: 0, Low: 0, Medium: 5, High: 10 },
  behaviours: { '': 0, None: 0, Low: 0, Medium: 5, High: 10 },
  breathing: { '': 0, None: 0, Low: 0, Medium: 5, High: 10 },
};

function calculateResidentCareMinutes(r: Resident) {
  let day = 0;
  let night = 0;
  for (const f of FIELDS) {
    const key = f.key;
    const lvl = (r as any)[key] || '';
    day += MINUTES_BY_FIELD_DAY_ADMIN[key]?.[lvl] ?? 0;
    night += MINUTES_BY_FIELD_NIGHT_ADMIN[key]?.[lvl] ?? 0;
  }
  return { Day: Math.round(day), Night: Math.round(night) };
}

function ceilToQuarter(x: number) {
  return Math.ceil(x * 4) / 4;
}

export default function AdminDependencyTable({ residents, communities, selectedCommunityId }: AdminDependencyTableProps) {
  // Filter by community if provided
  const list = selectedCommunityId
    ? residents.filter(r => r.communityId === selectedCommunityId || communities.find(c => c.id === selectedCommunityId)?.residentIds.includes(r.id || ""))
    : residents;

  // Pooled totals: sum minutes, convert to hours for shifts
  const totalDayMinutes = Math.round(list.reduce((s, r) => s + calculateResidentCareMinutes(r).Day, 0));
  const totalNightMinutes = Math.round(list.reduce((s, r) => s + calculateResidentCareMinutes(r).Night, 0));
  const totalDayHours = Math.round((totalDayMinutes / 60) * 100) / 100;
  const totalNightHours = Math.round((totalNightMinutes / 60) * 100) / 100;
  const totalDayShifts = Math.ceil((totalDayHours / 12) * 4) / 4;
  const totalNightShifts = Math.ceil((totalNightHours / 12) * 4) / 4;

  return (
    <div className="overflow-x-auto rounded-xl shadow bg-white mb-8">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="text-sm text-gray-600">Showing {list.length} resident{list.length !== 1 ? 's' : ''}</div>
        {selectedCommunityId && (
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Community: {communities.find(c => c.id === selectedCommunityId)?.name}</div>
          </div>
        )}
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left"></th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Room</th>
            <th className="px-3 py-2 text-left">
              Day (h)
              <Tooltip>
                <TooltipTrigger>
                  <span className="ml-1 text-gray-500 cursor-pointer">(i)</span>
                </TooltipTrigger>
                <TooltipContent>Total Care Hours (rounded to 0.25)</TooltipContent>
              </Tooltip>
            </th>
            <th className="px-3 py-2 text-left">
              Night (h)
              <Tooltip>
                <TooltipTrigger>
                  <span className="ml-1 text-gray-500 cursor-pointer">(i)</span>
                </TooltipTrigger>
                <TooltipContent>Total Care Hours (rounded to 0.25)</TooltipContent>
              </Tooltip>
            </th>
            <th className="px-3 py-2 text-left">
              12h Day
              <Tooltip>
                <TooltipTrigger>
                  <span className="ml-1 text-gray-500 cursor-pointer">(i)</span>
                </TooltipTrigger>
                <TooltipContent>Carers needed</TooltipContent>
              </Tooltip>
            </th>
            <th className="px-3 py-2 text-left">
              12h Night
              <Tooltip>
                <TooltipTrigger>
                  <span className="ml-1 text-gray-500 cursor-pointer">(i)</span>
                </TooltipTrigger>
                <TooltipContent>Carers needed</TooltipContent>
              </Tooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => {
            const careMinutes = calculateResidentCareMinutes(r);
            return (
              <tr className="border-t" key={r.id || `${r.name}-${r.room}`}>
                <td className="px-3 py-2 text-center">{/* No expand/collapse in admin view */}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 font-mono">{r.room}</td>
                <td className="px-3 py-2 font-mono">{Math.round((careMinutes.Day / 60) * 100) / 100}</td>
                <td className="px-3 py-2 font-mono">{Math.round((careMinutes.Night / 60) * 100) / 100}</td>
                <td className="px-3 py-2 font-mono">{Math.round(ceilToQuarter((careMinutes.Day / 60 / 12)) * 100) / 100}</td>
                <td className="px-3 py-2 font-mono">{Math.round(ceilToQuarter((careMinutes.Night / 60 / 12)) * 100) / 100}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td className="px-4 py-2"></td>
            <td className="px-3 py-2 text-left">Totals</td>
            <td className="px-3 py-2 font-mono"></td>
            <td className="px-3 py-2 font-mono">{totalDayHours}</td>
            <td className="px-3 py-2 font-mono">{totalNightHours}</td>
            <td className="px-3 py-2 font-mono">{totalDayShifts}</td>
            <td className="px-3 py-2 font-mono">{totalNightShifts}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
