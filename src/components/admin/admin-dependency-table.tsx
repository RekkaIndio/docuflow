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

function calculateResidentCareHours(r: Resident) {
  // Dummy implementation, replace with real logic if needed
  // Should match the logic from the main dependency calculator
  return {
    Day: r.personalCare === "High" ? 3 : 1.5, // Example logic
    Night: r.nightNeeds === "High" ? 2 : 1,
  };
}

function ceilToQuarter(x: number) {
  return Math.ceil(x * 4) / 4;
}

export default function AdminDependencyTable({ residents, communities, selectedCommunityId }: AdminDependencyTableProps) {
  // Filter by community if provided
  const list = selectedCommunityId
    ? residents.filter(r => r.communityId === selectedCommunityId || communities.find(c => c.id === selectedCommunityId)?.residentIds.includes(r.id || ""))
    : residents;

  // Pooled totals: sum hours first, then convert to 12h shifts (ceil to nearest 0.25)
  const totalDayHours = Math.round(list.reduce((s, r) => s + calculateResidentCareHours(r).Day, 0) * 100) / 100;
  const totalNightHours = Math.round(list.reduce((s, r) => s + calculateResidentCareHours(r).Night, 0) * 100) / 100;
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
                <TooltipContent>Total Care Hours</TooltipContent>
              </Tooltip>
            </th>
            <th className="px-3 py-2 text-left">
              Night (h)
              <Tooltip>
                <TooltipTrigger>
                  <span className="ml-1 text-gray-500 cursor-pointer">(i)</span>
                </TooltipTrigger>
                <TooltipContent>Total Care Hours</TooltipContent>
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
            const careHours = calculateResidentCareHours(r);
            return (
              <tr className="border-t" key={r.id || `${r.name}-${r.room}`}>
                <td className="px-3 py-2 text-center">{/* No expand/collapse in admin view */}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 font-mono">{r.room}</td>
                <td className="px-3 py-2 font-mono">{careHours.Day}</td>
                <td className="px-3 py-2 font-mono">{careHours.Night}</td>
                <td className="px-3 py-2 font-mono">{Math.round(ceilToQuarter((careHours.Day / 12)) * 100) / 100}</td>
                <td className="px-3 py-2 font-mono">{Math.round(ceilToQuarter((careHours.Night / 12)) * 100) / 100}</td>
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
