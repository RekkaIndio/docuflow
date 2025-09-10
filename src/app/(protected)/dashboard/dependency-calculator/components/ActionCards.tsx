"use client";
import React from "react";
import { Community } from "./types";

interface ActionCardsProps {
  openAddModal: () => void;
  communities: Community[];
  setCommunities: React.Dispatch<React.SetStateAction<Community[]>>;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  saveSnapshot: (month: string) => void;
  loadSnapshot: (month: string) => void;
  genId: () => string;
}

export function ActionCards({
  openAddModal,
  communities,
  setCommunities,
  selectedMonth,
  setSelectedMonth,
  saveSnapshot,
  loadSnapshot,
  genId
}: ActionCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
      {/* Add Resident Card */}
      <div className="group hover:shadow-xl transition-all duration-300 border border-blue-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-blue-100/50">
        <div className="pb-3 border-b border-blue-100/80 bg-gradient-to-r from-blue-50/40 to-transparent rounded-t-2xl">
          <div className="flex items-center gap-2 p-4">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-blue-900">Add Resident</div>
          </div>
        </div>
        <div className="p-4">
          <button
            className="w-full flex flex-col items-center justify-center h-20 border-2 border-dashed border-blue-300/60 rounded-xl bg-gradient-to-br from-blue-50/30 to-transparent text-blue-600 hover:from-blue-100/50 hover:to-blue-50/30 transition-all duration-200 group-hover:border-blue-400/80"
            onClick={openAddModal}
          >
            <span className="font-semibold text-sm">Create Assessment</span>
            <span className="text-xs text-blue-500/80 mt-1">Add new resident profile</span>
          </button>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="group hover:shadow-xl transition-all duration-300 border border-purple-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-purple-100/50">
        <div className="pb-3 border-b border-purple-100/80 bg-gradient-to-r from-purple-50/40 to-transparent rounded-t-2xl">
          <div className="flex items-center gap-2 p-4">
            <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-purple-900">Snapshots</div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <button
            className="w-full text-left px-3 py-2 text-sm bg-purple-50/60 hover:bg-purple-100/80 rounded-lg transition-colors font-medium text-purple-800 border border-purple-200/40"
            onClick={() => {
              const month = prompt('Enter month (YYYY-MM):', selectedMonth);
              if (month) {
                setSelectedMonth(month);
                saveSnapshot(month);
              }
            }}
          >
            💾 Save Snapshot
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm bg-purple-50/60 hover:bg-purple-100/80 rounded-lg transition-colors font-medium text-purple-800 border border-purple-200/40"
            onClick={() => {
              const month = prompt('Enter month (YYYY-MM):', selectedMonth);
              if (month) {
                setSelectedMonth(month);
                loadSnapshot(month);
              }
            }}
          >
            📂 Load Snapshot
          </button>
        </div>
      </div>

      {/* Community Management Card */}
      <div className="group hover:shadow-xl transition-all duration-300 border border-emerald-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-emerald-100/50">
        <div className="pb-3 border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/40 to-transparent rounded-t-2xl">
          <div className="flex items-center gap-2 p-4">
            <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-emerald-900">Communities</div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              id="new-community"
              placeholder="New community name"
              className="flex-1 border border-emerald-200/60 rounded-lg px-3 py-2 text-sm bg-white/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
            />
            <button
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors font-medium shadow-sm"
              onClick={() => {
                const el = document.getElementById('new-community') as HTMLInputElement | null;
                if (!el || !el.value.trim()) return;
                const c: Community = { id: genId(), name: el.value.trim(), residentIds: [] };
                setCommunities(prev => [...prev, c]);
                el.value = '';
              }}
            >
              Add
            </button>
          </div>
          {communities.length > 0 && (
            <div className="text-sm text-emerald-700 font-medium bg-emerald-50/60 px-3 py-1 rounded-lg">
              {communities.length} community{communities.length !== 1 ? 'ies' : ''} created
            </div>
          )}
        </div>
      </div>
    </div>
  );
}