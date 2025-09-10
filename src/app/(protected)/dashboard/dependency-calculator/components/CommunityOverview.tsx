"use client";
import React from "react";
import { Resident, Community } from "./types";

interface CommunityOverviewProps {
  communities: Community[];
  residents: Resident[];
  selectedCommunity: string | null;
  setSelectedCommunity: (id: string | null) => void;
  setCommunities: React.Dispatch<React.SetStateAction<Community[]>>;
  setResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  calculateNDPSScore: (resident: Resident) => number;
  calculateResidentCareMinutes: (resident: Resident) => { Day: number; Night: number };
}

export function CommunityOverview({
  communities,
  residents,
  selectedCommunity,
  setSelectedCommunity,
  setCommunities,
  setResidents,
  calculateNDPSScore,
  calculateResidentCareMinutes
}: CommunityOverviewProps) {
  if (communities.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Community Overview</h2>
          <p className="text-sm text-gray-600 font-medium">View residents organized by care communities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {communities.map((community, index) => {
          const communityResidents = residents.filter(r => r.communityId === community.id);
          const totalCareHours = communityResidents.reduce((sum, r) => sum + calculateResidentCareMinutes(r).Day + calculateResidentCareMinutes(r).Night, 0) / 60;
          const avgNDPSScore = communityResidents.length > 0 ? communityResidents.reduce((sum, r) => sum + calculateNDPSScore(r), 0) / communityResidents.length : 0;

          // Color based on index - use more sophisticated color system
          const colorClasses = [
            'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
            'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
          ];
          const colorClass = colorClasses[index % colorClasses.length];

          return (
            <div
              key={community.id}
              className={`group hover:shadow-xl transition-all duration-300 border bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg cursor-pointer ${
                selectedCommunity === community.id
                  ? 'border-emerald-400/80 ring-2 ring-emerald-400/30 shadow-emerald-100/50'
                  : 'border-gray-200/60 hover:shadow-gray-100/50'
              }`}
              onClick={() => setSelectedCommunity(selectedCommunity === community.id ? null : community.id)}
            >
              {/* Header */}
              <div className="pb-3 border-b border-gray-100/80 bg-gradient-to-r from-gray-50/40 to-transparent rounded-t-2xl">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${colorClass} rounded-lg flex items-center justify-center text-white shadow-sm`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900 truncate">{community.name}</div>
                      <div className="text-xs text-gray-600">{communityResidents.length} resident{communityResidents.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt('Rename community:', community.name);
                        if (newName && newName.trim() !== community.name) {
                          setCommunities(prev => prev.map(c => c.id === community.id ? { ...c, name: newName.trim() } : c));
                        }
                      }}
                      title="Rename community"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete community "${community.name}"? This will unassign all residents from this community.`)) {
                          setCommunities(prev => prev.filter(c => c.id !== community.id));
                          setResidents(prev => prev.map(r => r.communityId === community.id ? { ...r, communityId: null } : r));
                          if (selectedCommunity === community.id) setSelectedCommunity(null);
                        }
                      }}
                      title="Delete community"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {communityResidents.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-emerald-50/60 rounded-lg border border-emerald-200/40">
                        <div className="text-lg font-bold text-emerald-700">{avgNDPSScore.toFixed(1)}</div>
                        <div className="text-xs text-emerald-600 font-medium">Avg NDPS</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50/60 rounded-lg border border-blue-200/40">
                        <div className="text-lg font-bold text-blue-700">{Math.round(totalCareHours * 10) / 10}h</div>
                        <div className="text-xs text-blue-600 font-medium">Care Hours</div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <div className="text-xs text-gray-500 mb-2 font-medium">Recent residents:</div>
                      <div className="space-y-1">
                        {communityResidents.slice(0, 3).map(resident => (
                          <div key={resident.id} className="flex items-center justify-between text-xs bg-gray-50/60 p-2 rounded-lg">
                            <span className="text-gray-700 truncate font-medium">{resident.name}</span>
                            <span className="text-gray-500">Room {resident.room}</span>
                          </div>
                        ))}
                        {communityResidents.length > 3 && (
                          <div className="text-xs text-gray-500 text-center pt-1 font-medium">+{communityResidents.length - 3} more residents</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {communityResidents.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div className="text-sm">No residents assigned</div>
                    <div className="text-xs mt-1 text-gray-400">Drop residents here</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}