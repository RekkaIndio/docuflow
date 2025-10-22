"use client";
import React, { useState, useEffect } from "react";
import { Resident, Community, DependencyLevel } from "./types";

interface ResidentAssessmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident | null;
  communities: Community[];
  onSave: (updatedResident: Resident) => void;
  FIELDS: ReadonlyArray<{ key: string; label: string; section: string; maxScore: number; description?: string }>;
  allResidents: Resident[];
}

export function ResidentAssessmentEditModal({
  isOpen,
  onClose,
  resident,
  communities,
  onSave,
  FIELDS,
  allResidents
}: ResidentAssessmentEditModalProps) {
  const [formData, setFormData] = useState<Partial<Resident>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [roomError, setRoomError] = useState<string>("");

  useEffect(() => {
    if (resident && isOpen) {
      setFormData({ ...resident });
    }
  }, [resident, isOpen]);

  if (!isOpen || !resident) return null;

  const handleSave = async () => {
    if (!formData.name || !resident?.id || roomError) return;

    setIsSaving(true);

    const updatedResident: Resident = {
      ...resident,
      ...formData,
      name: formData.name,
      room: formData.room || "",
    } as Resident;

    try {
      await Promise.resolve(onSave(updatedResident));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Check for duplicate room numbers
    if (field === "room" && value) {
      const isDuplicate = allResidents.some(
        r => r.id !== resident?.id && r.room === value
      );
      if (isDuplicate) {
        setRoomError(`Room ${value} is already assigned to another resident`);
      } else {
        setRoomError("");
      }
    }
  };

  // Calculate completion progress
  const totalFields = FIELDS.length;
  const completedFields = FIELDS.filter(field => formData[field.key as keyof Resident]).length;
  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  // Group fields by section
  const groupedFields = Array.from(FIELDS).reduce((acc, field) => {
    if (!acc[field.section]) acc[field.section] = [];
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, Array<(typeof FIELDS)[number]>>);

  // Section configurations
  const sectionConfig = {
    BCN: {
      title: "Basic Care Needs",
      description: "Essential daily living activities",
      icon: "🧼",
      color: "blue",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800"
    },
    SNN: {
      title: "Special Needs",
      description: "Medical and specialised care requirements",
      icon: "🏥",
      color: "red",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-800"
    },
    THERAPY: {
      title: "Therapy Needs",
      description: "Communication and cognitive support",
      icon: "🧠",
      color: "purple",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-800"
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-6xl w-full max-h-[98vh] flex flex-col">
        {/* Header - Enhanced */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Edit Resident Assessment</h2>
                <p className="text-blue-100 text-sm">Update {resident.name}'s care requirements</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Progress Indicator */}
              <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-white">{completionPercentage}% Complete</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content - Optimized for no scrolling */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Basic Info Card - Compact */}
          <div className="mb-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Resident Information</h3>
                <p className="text-xs text-gray-600">Basic details and community assignment</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                    placeholder="Enter resident's full name"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Room Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.room || ""}
                    onChange={(e) => handleChange("room", e.target.value)}
                    className={`w-full pl-8 pr-2 py-2 text-sm border rounded-lg focus:ring-2 transition-all bg-white ${
                      roomError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                    placeholder="Room number"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                {roomError && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {roomError}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Community</label>
                <div className="relative">
                  <select
                    value={formData.communityId || ""}
                    onChange={(e) => handleChange("communityId", e.target.value || null)}
                    className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white appearance-none"
                  >
                    <option value="">No Community</option>
                    {communities.map(community => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                  </select>
                  <svg className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Assessment Sections - Compact */}
          <div className="space-y-4">
            {Object.entries(groupedFields).map(([sectionKey, sectionFields]) => {
              const config = sectionConfig[sectionKey as keyof typeof sectionConfig];
              const sectionCompleted = sectionFields.filter(field => formData[field.key as keyof Resident]).length;
              const sectionTotal = sectionFields.length;
              const sectionProgress = Math.round((sectionCompleted / sectionTotal) * 100);

              return (
                <div key={sectionKey} className={`${config.bgColor} rounded-xl p-4 border ${config.borderColor}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-lg">{config.icon}</div>
                      <div>
                        <h3 className={`text-sm font-semibold ${config.textColor}`}>{config.title}</h3>
                        <p className="text-xs text-gray-600">{config.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`text-xs font-medium ${config.textColor}`}>{sectionCompleted}/{sectionTotal}</div>
                        <div className="w-16 h-1.5 bg-white/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${config.color === 'blue' ? 'bg-blue-500' : config.color === 'red' ? 'bg-red-500' : 'bg-purple-500'} rounded-full transition-all duration-300`}
                            style={{ width: `${sectionProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {sectionFields.map(field => {
                      const value = formData[field.key as keyof Resident] as DependencyLevel;
                      const isCompleted = !!value;

                      return (
                        <div key={field.key} className="bg-white rounded-lg p-2 border border-gray-200 hover:border-gray-300 transition-colors group relative">
                          <label className="block text-xs font-medium text-gray-700 mb-1 leading-tight flex items-center justify-between">
                            <span>{field.label}</span>
                            {field.description && (
                              <div className="relative group/tooltip">
                                <svg className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tooltip:block z-10 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                                  {field.description}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </label>
                          <select
                            value={value || ""}
                            onChange={(e) => handleChange(field.key, e.target.value as DependencyLevel)}
                            className={`w-full border rounded-lg px-1.5 py-1 text-xs bg-white transition-all ${
                              isCompleted
                                ? 'border-green-300 focus:border-green-500 focus:ring-1 focus:ring-green-500/20'
                                : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                            }`}
                            title={`${field.description || field.label} - 0=Independent, 5=Totally Dependent`}
                          >
                            <option value="">Select...</option>
                            <option value="0">0 - Independent</option>
                            <option value="1">1 - Minimal Help</option>
                            <option value="2">2 - Some Help</option>
                            <option value="3">3 - Moderate Help</option>
                            <option value="4">4 - Extensive Help</option>
                            <option value="5">5 - Totally Dependent</option>
                          </select>
                          {isCompleted && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <svg className="w-2.5 h-2.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-xs text-green-600 font-medium">
                                {value === "0" ? "Independent" : 
                                 value === "1" ? "Minimal" :
                                 value === "2" ? "Some Help" :
                                 value === "3" ? "Moderate" :
                                 value === "4" ? "Extensive" :
                                 "Dependent"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer - Compact */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{completedFields}</span> of <span className="font-medium">{totalFields}</span> fields completed
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !formData.name || !!roomError}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}