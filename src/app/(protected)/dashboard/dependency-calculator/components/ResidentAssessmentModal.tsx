"use client";
import React from "react";
import { Resident, Community } from "./types";

interface ResidentAssessmentModalProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  editingIndex: number | null;
  step: number;
  setStep: (step: number) => void;
  form: Resident;
  setForm: React.Dispatch<React.SetStateAction<Resident>>;
  stepError: string | null;
  setStepError: (error: string | null) => void;
  communities: Community[];
  FIELDS: any[];
  attemptNext: () => void;
  attemptSave: () => void;
  handleBack: () => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => void;
  isStepValid: (s: number) => boolean;
  isAllValid: () => boolean;
  residents: Resident[]; // Add residents prop for duplicate validation
}

export function ResidentAssessmentModal({
  modalOpen,
  setModalOpen,
  editingIndex,
  step,
  setStep,
  form,
  setForm,
  stepError,
  setStepError,
  communities,
  FIELDS,
  attemptNext,
  attemptSave,
  handleBack,
  handleChange,
  isStepValid,
  isAllValid,
  residents
}: ResidentAssessmentModalProps) {
  if (!modalOpen) return null;

  // Helper function to check if room is duplicate and get occupant info
  const getRoomDuplicateInfo = (roomNumber: string) => {
    if (!roomNumber.trim()) return { isDuplicate: false, occupant: null };
    
    const duplicateResident = residents.find((resident, index) => {
      // If editing, exclude the current resident from the check
      if (editingIndex !== null && index === editingIndex) {
        return false;
      }
      return resident.room.trim().toLowerCase() === roomNumber.trim().toLowerCase();
    });
    
    return {
      isDuplicate: !!duplicateResident,
      occupant: duplicateResident ? duplicateResident.name : null
    };
  };

  const roomInfo = getRoomDuplicateInfo(form.room);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingIndex !== null ? "Edit Resident" : "Add New Resident"}
                </h2>
                <p className="text-blue-100 text-sm">NDPS Dependency Assessment</p>
              </div>
            </div>
            <button
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-colors"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-100">Progress</span>
              <span className="text-sm font-medium text-white">{step + 1} of {FIELDS.length + 2}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / (FIELDS.length + 2)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Basic Information</h3>
                <p className="text-gray-600 text-sm">Enter the resident's basic details to start the assessment</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Resident Name
                    </span>
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-gray-50 focus:bg-white"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter resident's full name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Room Number
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      className={`w-full border rounded-lg px-4 py-3 focus:ring-2 transition-all bg-gray-50 focus:bg-white ${
                        roomInfo.isDuplicate
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50'
                          : form.room.trim() && !roomInfo.isDuplicate
                          ? 'border-green-500 focus:border-green-500 focus:ring-green-200 bg-green-50'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                      name="room"
                      value={form.room}
                      onChange={handleChange}
                      placeholder="e.g. 101, 2A, etc."
                    />
                    {roomInfo.isDuplicate ? (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    ) : form.room.trim() && !roomInfo.isDuplicate ? (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    ) : null}
                  </div>
                  {roomInfo.isDuplicate ? (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span>
                        Room "{form.room}" is already occupied by {roomInfo.occupant || 'another resident'}
                      </span>
                    </div>
                  ) : form.room.trim() && !roomInfo.isDuplicate ? (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Room "{form.room}" is available</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Step content would go here - simplified for brevity */}
          {step > 0 && step <= FIELDS.length && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{FIELDS[step - 1]?.label}</h3>
                <p className="text-gray-600 text-sm">Select the appropriate dependency level for this care area</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Dependency Level
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* No Needs Option */}
                    <label className={`relative cursor-pointer transition-all duration-200 ${
                      form[FIELDS[step - 1]?.key as keyof Resident] === "None"
                        ? 'ring-2 ring-green-500 ring-offset-2'
                        : 'hover:ring-1 hover:ring-green-300'
                    }`}>
                      <input
                        type="radio"
                        name={FIELDS[step - 1]?.key}
                        value="None"
                        checked={form[FIELDS[step - 1]?.key as keyof Resident] === "None"}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center ${
                        form[FIELDS[step - 1]?.key as keyof Resident] === "None"
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                      }`}>
                        <div className="flex items-center gap-3 w-full">
                          <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                            form[FIELDS[step - 1]?.key as keyof Resident] === "None"
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300'
                          }`}>
                            <div className={`w-2 h-2 bg-white rounded-full transition-all duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "None"
                                ? 'block scale-100'
                                : 'hidden scale-0'
                            }`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold transition-colors duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "None"
                                ? 'text-green-800'
                                : 'text-gray-800'
                            }`}>No Needs</div>
                            <div className={`text-sm transition-colors duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "None"
                                ? 'text-green-600'
                                : 'text-gray-600'
                            }`}>Independent in this area</div>
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* Low Option */}
                    <label className={`relative cursor-pointer transition-all duration-200 ${
                      form[FIELDS[step - 1]?.key as keyof Resident] === "Low"
                        ? 'ring-2 ring-blue-500 ring-offset-2'
                        : 'hover:ring-1 hover:ring-blue-300'
                    }`}>
                      <input
                        type="radio"
                        name={FIELDS[step - 1]?.key}
                        value="Low"
                        checked={form[FIELDS[step - 1]?.key as keyof Resident] === "Low"}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center ${
                        form[FIELDS[step - 1]?.key as keyof Resident] === "Low"
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                      }`}>
                        <div className="flex items-center gap-3 w-full">
                          <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                            form[FIELDS[step - 1]?.key as keyof Resident] === "Low"
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            <div className={`w-2 h-2 bg-white rounded-full transition-all duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "Low"
                                ? 'block scale-100'
                                : 'hidden scale-0'
                            }`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold transition-colors duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "Low"
                                ? 'text-blue-800'
                                : 'text-gray-800'
                            }`}>Low</div>
                            <div className={`text-sm transition-colors duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "Low"
                                ? 'text-blue-600'
                                : 'text-gray-600'
                            }`}>Minimal assistance needed</div>
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* Medium Option */}
                    <label className={`relative cursor-pointer transition-all duration-200 ${
                      form[FIELDS[step - 1]?.key as keyof Resident] === "Medium"
                        ? 'ring-2 ring-yellow-500 ring-offset-2'
                        : 'hover:ring-1 hover:ring-yellow-300'
                    }`}>
                      <input
                        type="radio"
                        name={FIELDS[step - 1]?.key}
                        value="Medium"
                        checked={form[FIELDS[step - 1]?.key as keyof Resident] === "Medium"}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center ${
                        form[FIELDS[step - 1]?.key as keyof Resident] === "Medium"
                          ? 'border-yellow-500 bg-yellow-50 shadow-md'
                          : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-25'
                      }`}>
                        <div className="flex items-center gap-3 w-full">
                          <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                            form[FIELDS[step - 1]?.key as keyof Resident] === "Medium"
                              ? 'border-yellow-500 bg-yellow-500'
                              : 'border-gray-300'
                          }`}>
                            <div className={`w-2 h-2 bg-white rounded-full transition-all duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "Medium"
                                ? 'block scale-100'
                                : 'hidden scale-0'
                            }`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold transition-colors duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "Medium"
                                ? 'text-yellow-800'
                                : 'text-gray-800'
                            }`}>Medium</div>
                            <div className={`text-sm transition-colors duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "Medium"
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                            }`}>Moderate assistance needed</div>
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* High Option */}
                    <label className={`relative cursor-pointer transition-all duration-200 ${
                      form[FIELDS[step - 1]?.key as keyof Resident] === "High"
                        ? 'ring-2 ring-red-500 ring-offset-2'
                        : 'hover:ring-1 hover:ring-red-300'
                    }`}>
                      <input
                        type="radio"
                        name={FIELDS[step - 1]?.key}
                        value="High"
                        checked={form[FIELDS[step - 1]?.key as keyof Resident] === "High"}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center ${
                        form[FIELDS[step - 1]?.key as keyof Resident] === "High"
                          ? 'border-red-500 bg-red-50 shadow-md'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
                      }`}>
                        <div className="flex items-center gap-3 w-full">
                          <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                            form[FIELDS[step - 1]?.key as keyof Resident] === "High"
                              ? 'border-red-500 bg-red-500'
                              : 'border-gray-300'
                          }`}>
                            <div className={`w-2 h-2 bg-white rounded-full transition-all duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "High"
                                ? 'block scale-100'
                                : 'hidden scale-0'
                            }`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold transition-colors duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "High"
                                ? 'text-red-800'
                                : 'text-gray-800'
                            }`}>High</div>
                            <div className={`text-sm transition-colors duration-200 ${
                              form[FIELDS[step - 1]?.key as keyof Resident] === "High"
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}>Extensive assistance needed</div>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === FIELDS.length + 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Assign to Community</h3>
                <p className="text-gray-600 text-sm">Optionally assign this resident to a care community for better organization</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Select Community
                    </span>
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-gray-50 focus:bg-white"
                    name="communityId"
                    value={form.communityId || ""}
                    onChange={handleChange}
                  >
                    <option value="">No Community (Individual)</option>
                    {communities.map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Communities help organize residents and track care patterns across groups.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
              onClick={handleBack}
              disabled={step === 0}
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              {stepError && (
                <span className="text-sm text-red-600 font-medium">{stepError}</span>
              )}

              {step < FIELDS.length + 1 ? (
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                  onClick={attemptNext}
                  disabled={!isStepValid(step)}
                >
                  Next
                </button>
              ) : (
                <button
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                  onClick={attemptSave}
                  disabled={!isAllValid()}
                >
                  {editingIndex !== null ? "Update Resident" : "Save Resident"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}