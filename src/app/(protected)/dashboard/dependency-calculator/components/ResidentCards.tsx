"use client";
import React from "react";
import { Resident, Community } from "./types";

interface ResidentCardsProps {
  residents: Resident[];
  communities: Community[];
  selectedCommunity: string | null;
  setSelectedCommunity: (id: string | null) => void;
  openAddModal: () => void;
  openEditModal: (index: number) => void;
  openEditAssessmentModal: (resident: Resident) => void;
  deleteResidentById: (id: string | undefined) => void;
  calculateResidentCareMinutes: (resident: Resident) => { Day: number; Night: number };
  calculateNDPSScore: (resident: Resident) => number;
  getNDPSBand: (score: number) => { band: number; name: string };
  compareRooms: (a: string, b: string) => number;
}

export function ResidentCards({
  residents,
  communities,
  selectedCommunity,
  setSelectedCommunity,
  openAddModal,
  openEditModal,
  openEditAssessmentModal,
  deleteResidentById,
  calculateResidentCareMinutes,
  calculateNDPSScore,
  getNDPSBand,
  compareRooms
}: ResidentCardsProps) {
  const displayResidents = selectedCommunity
    ? residents.filter(r => r.communityId === selectedCommunity)
    : residents.filter(r => !r.communityId);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
        {displayResidents.slice().sort((x, y) => compareRooms(x.room, y.room)).map((r) => {
          const idx = residents.findIndex(rr => rr.id === r.id);
          const careMinutes = calculateResidentCareMinutes(r);
          const ndpsScore = calculateNDPSScore(r);
          const ndpsBand = getNDPSBand(ndpsScore);
          const inCommunity = r.communityId !== null;

          return (
            <div
              key={r.id}
              draggable
              onDragStart={e => {
                if (!r.id) return;
                e.dataTransfer.setData('text/residentId', r.id);
              }}
              className={`relative bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-lg hover:ring-2 ring-blue-400/50 transition-all duration-200 ${inCommunity ? 'ring-2 ring-green-300/70' : ''}`}
              onClick={() => { if (idx >= 0) openEditAssessmentModal(r); }}
            >
              {/* Header with avatar and actions */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-800">{r.name || "Unnamed"}</div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Room: {r.room || "-"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    onClick={e => { e.stopPropagation(); if (idx >= 0) openEditAssessmentModal(r); }}
                    title="Edit resident"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={e => { e.stopPropagation(); deleteResidentById(r.id); }}
                    title="Delete resident"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* NDPS Band Badge */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-indigo-800">Band {ndpsBand.band}</span>
                  <span className="text-xs text-indigo-600">({ndpsBand.name})</span>
                </div>
              </div>

              {/* Care Hours */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Day Care:</span>
                  <span className="font-semibold text-gray-800">{Math.round(careMinutes.Day / 60 * 10) / 10}h</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Night Care:</span>
                  <span className="font-semibold text-gray-800">{Math.round(careMinutes.Night / 60 * 10) / 10}h</span>
                </div>
                <div className="flex items-center justify-between text-sm font-medium pt-1 border-t border-gray-200">
                  <span className="text-gray-700">Total:</span>
                  <span className="font-bold text-gray-900">{Math.round((careMinutes.Day + careMinutes.Night) / 60 * 10) / 10}h</span>
                </div>
              </div>

              {/* Community Indicator */}
              {inCommunity && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  In {communities.find(c => c.id === r.communityId)?.name}
                </div>
              )}

              {/* Drag Handle */}
              <div className="absolute bottom-2 right-2 opacity-30 hover:opacity-60 transition-opacity">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {displayResidents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {selectedCommunity ? 'No Residents in Community' : 'No Unassigned Residents'}
          </h3>
          <p className="text-gray-600 text-center max-w-md mb-6">
            {selectedCommunity
              ? `No residents are currently assigned to ${communities.find(c => c.id === selectedCommunity)?.name}.`
              : 'All residents are assigned to communities. Create a new resident or select a community above to view its residents.'
            }
          </p>
          {!selectedCommunity && (
            <button
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              onClick={openAddModal}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Resident
              </span>
            </button>
          )}
        </div>
      )}
    </>
  );
}