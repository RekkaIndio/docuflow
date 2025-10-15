"use client";

import React, { useState, useEffect, useMemo } from "react";
import ActivitiesSupervisionForm from "./activities-supervision/page";
import AdminSupervisionForm from "./admin-supervision/page";
import StaffAppraisalForm from "./staff-appraisal/page";
import CarersSupervisionForm from "./carers-supervision/page";
import ChefSupervisionForm from "./chef-supervision/page";
import ClinicalLeadSupervisionForm from "./clinical-lead-supervision/page";
import DeputySupervisionForm from "./deputy-supervision/page";
import DomesticStaffSupervisionForm from "./domestic-staff-supervision/page";
import HousekeepingSupervisionForm from "./housekeeping-supervision/page";
import KitchenAssistantSupervisionForm from "./kitchen-assistant-supervision/page";
import MaintenencePersonSupervisionForm from "./maintenence-person-supervision/page";
import NursesSupervisionForm from "./nurses-supervision/page";
import ReceptionSupervisionForm from "./reception-supervision/page";
import SeniorCarerSupervisionForm from "./senior-carer-supervision/page";
import TrackerModal from "../../../components/TrackerModal";
import PageHeader from '../../../components/page-header';
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/context/workspace";
import { workspaceCollectionPath } from '@/lib/paths';
import { generateAppraisalPDFWithLogo, getAppraisalPDFFilename } from '@/lib/appraisal-pdf-generator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mapping of tracker roles to their appraisals
const trackerAppraisalMapping = {
  'Deputy/ies': ['deputy-supervision'],
  'Clinical lead & Nurses': ['carers-supervision', 'clinical-lead-supervision', 'nurses-supervision'],
  'Senior/Care team managers': ['deputy-supervision', 'senior-carer-supervision'],
  'Admin staff': ['reception-supervision', 'admin-supervision'],
  'Maintenance staff': ['maintenence-person-supervision'],
  'Activities staff': ['activities-supervision'],
  'Kitchen staff': ['chef-supervision', 'kitchen-assistant-supervision'],
  'Domestic staff': ['domestic-staff-supervision', 'housekeeping-supervision'],
};

const appraisalCards = [
  { title: 'Activities supervision', slug: 'activities-supervision' },
  { title: 'Admin supervision', slug: 'admin-supervision' },
  { title: 'Appraisal form', slug: 'staff-appraisal' },
  { title: 'Carers supervision', slug: 'carers-supervision' },
  { title: 'Chef supervision', slug: 'chef-supervision' },
  { title: 'Clinical lead supervision', slug: 'clinical-lead-supervision' },
  { title: 'Deputy supervision', slug: 'deputy-supervision' },
  { title: 'Domestic staff supervision', slug: 'domestic-staff-supervision' },
  { title: 'Housekeeping supervision', slug: 'housekeeping-supervision' },
  { title: 'Kitchen assistant supervision', slug: 'kitchen-assistant-supervision' },
  { title: 'Maintenence person supervision', slug: 'maintenence-person-supervision' },
  { title: 'Nurses supervision', slug: 'nurses-supervision' },
  { title: 'Reception supervision', slug: 'reception-supervision' },
  { title: 'Senior Carer / Care Team Manager supervision', slug: 'senior-carer-supervision' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type HistoryEntry = {
  slug: string;
  title: string;
  month: number;
  year: number;
  role?: string;
  hasSnapshot: boolean;
};

type HistoryGroup = {
  key: string;
  month: number;
  year: number;
  entries: HistoryEntry[];
};

export default function AppraisalsPage() {
  const { user } = useAuth();
  const workspace = useWorkspace();
  const [tab, setTab] = useState<'appraisals' | 'tracker' | 'history'>('appraisals');
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [trackerModal, setTrackerModal] = useState<{ role: string; month: number; year: number } | null>(null);
  const [completionStatus, setCompletionStatus] = useState<Record<string, Record<string, boolean>>>({});
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHistoryMonthKey, setSelectedHistoryMonthKey] = useState<string | null>(null);

  const [additionalReportModal, setAdditionalReportModal] = useState<{ appraisal: string; title: string } | null>(null);
  const [appraisalData, setAppraisalData] = useState<Record<string, any>>({});
  const [pdfViewer, setPdfViewer] = useState<{ appraisal: string; month: number; year?: number; content: string | null } | null>(null);
  const [readOnlyViewer, setReadOnlyViewer] = useState<{ appraisal: string; month: number; year: number; formData?: any } | null>(null);
  const [confirmCreateModal, setConfirmCreateModal] = useState<{ appraisal: string; month: number; year: number } | null>(null);

  // Load completion status and appraisal data from Firebase
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || !workspace?.id) return;

      try {
  const trackerCol = collection(db, workspaceCollectionPath(workspace.id, 'appraisal-tracker', workspace.organisationId));
  const docRef = doc(trackerCol, user.id);
  const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // Immediately prune any completionStatus entries that do not belong to the active month/year
          const loadedStatus: Record<string, Record<string, boolean>> = data.completionStatus || {};
          const cleanedStatus: Record<string, Record<string, boolean>> = {};
          const { activeMonth: initialActiveMonth, activeYear: initialActiveYear } = calculateResetInfo();
          let hadRemovals = false;

          Object.keys(loadedStatus).forEach(role => {
            const roleMap = loadedStatus[role] || {};
            const kept: Record<string, boolean> = {};
            Object.keys(roleMap).forEach(key => {
              try {
                const parsed = parseCompletionKey(key);
                if (parsed.month === initialActiveMonth && parsed.year === initialActiveYear && roleMap[key]) {
                  kept[key] = true;
                } else {
                  hadRemovals = true;
                }
              } catch (e) {
                // If parsing fails conservatively drop the key for the UI
                hadRemovals = true;
              }
            });
            cleanedStatus[role] = kept;
          });

          setCompletionStatus(cleanedStatus);
          setAppraisalData(data.appraisalData || {});

          // Persist cleaned map back to Firestore if we removed old entries
          if (hadRemovals) {
            saveCompletionStatus(cleanedStatus);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, workspace?.id]);

  // Add event listeners for chat commands
  useEffect(() => {
    const handleOpenTrackerModal = (event: CustomEvent) => {
      // Open the tracker tab and show the modal for current month
      setTab('tracker');
      const currentMonth = new Date().getMonth();
      // For now, open tracker for the first role and current month
      const firstRole = 'Deputy/ies';
      setTrackerModal({ role: firstRole, month: currentMonth, year: inferYearForMonth(currentMonth) });
    };

    const handleOpenTrackerTab = (event: CustomEvent) => {
      // Just switch to the tracker tab without opening any modal
      setTab('tracker');
    };

    const handleOpenAppraisalModal = (event: CustomEvent) => {
      // Navigate to appraisals tab
      setTab('appraisals');
    };

    const handleOpenAuditModal = (event: CustomEvent) => {
      // Navigate to audits page (this would need routing)
      window.dispatchEvent(new CustomEvent('navigate-to-audits'));
    };

    const handleOpenSpecificAppraisal = (event: CustomEvent) => {
      const appraisalName = event.detail?.appraisalName?.toLowerCase();
      if (appraisalName) {
        // Find the matching appraisal card
        const matchingCard = appraisalCards.find(card =>
          card.title.toLowerCase().includes(appraisalName) ||
          card.slug.toLowerCase().includes(appraisalName) ||
          appraisalName.includes(card.title.toLowerCase()) ||
          appraisalName.includes(card.slug.toLowerCase())
        );

        if (matchingCard) {
          setCurrentView(matchingCard.slug);
          setTab('appraisals');
          setCurrentMonth(new Date().getMonth());
        }
      }
    };

    // Add event listeners
    window.addEventListener('open-tracker-modal', handleOpenTrackerModal as EventListener);
    window.addEventListener('open-tracker-tab', handleOpenTrackerTab as EventListener);
    window.addEventListener('open-appraisal-modal', handleOpenAppraisalModal as EventListener);
    window.addEventListener('open-audit-modal', handleOpenAuditModal as EventListener);
    window.addEventListener('open-specific-appraisal', handleOpenSpecificAppraisal as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('open-tracker-modal', handleOpenTrackerModal as EventListener);
      window.removeEventListener('open-tracker-tab', handleOpenTrackerTab as EventListener);
      window.removeEventListener('open-appraisal-modal', handleOpenAppraisalModal as EventListener);
      window.removeEventListener('open-audit-modal', handleOpenAuditModal as EventListener);
      window.removeEventListener('open-specific-appraisal', handleOpenSpecificAppraisal as EventListener);
    };
  }, []);

  // Audits reset on the 7th of each month - compute the active month/year based on that rule
  const calculateResetInfo = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    // Determine the active month/year: if we've passed the 7th (inclusive), the active month is this month,
    // otherwise it's the previous month (with year wrap).
    if (currentDay >= 7) {
      return { activeMonth: currentMonth, activeYear: currentYear };
    }
    // previous month with year handling
    if (currentMonth === 0) {
      return { activeMonth: 11, activeYear: currentYear - 1 };
    }
    return { activeMonth: currentMonth - 1, activeYear: currentYear };
  };

  const inferYearForMonth = (month: number) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    // Heuristic: if the month is <= currentMonth, assume current year, otherwise previous year
    return month <= currentMonth ? currentYear : currentYear - 1;
  };

  // Parse completion map keys which are stored as either:
  // - `${slug}-${year}-${month}` (recommended)
  // - legacy: `${slug}-${month}`
  // Slugs can contain hyphens, so parsing must take the year/month from the end of the string.
  const parseCompletionKey = (key: string) => {
    // Try new format: slug-YYYY-M
    const newMatch = key.match(/^(.+)-(\d{4})-(\d{1,2})$/);
    if (newMatch) {
      const slug = newMatch[1];
      const year = parseInt(newMatch[2], 10);
      const month = parseInt(newMatch[3], 10);
      return { slug, year, month };
    }

    // Try legacy format: slug-M
    const legacyMatch = key.match(/^(.+)-(\d{1,2})$/);
    if (legacyMatch) {
      const slug = legacyMatch[1];
      const month = parseInt(legacyMatch[2], 10);
      const year = inferYearForMonth(month);
      return { slug, year, month };
    }

    // Fallback to current month/year and use full key as slug
    const now = new Date();
    return { slug: key, year: now.getFullYear(), month: now.getMonth() };
  };

  // Check for month transitions & reset completionStatus entries that are not for the active month/year
  useEffect(() => {
    const checkMonthTransition = () => {
      const { activeMonth, activeYear } = calculateResetInfo();

      // If it's a new year far in the future, reset everything (safety)
      const nowYear = new Date().getFullYear();
      if (nowYear > 3000) { // safeguard, unlikely
        setCompletionStatus({});
        saveCompletionStatus({});
        return;
      }

      let hasChanges = false;
      const newStatus: Record<string, Record<string, boolean>> = {};

      // Build a cleaned status map keeping only entries that match activeMonth/activeYear
      Object.keys(completionStatus || {}).forEach(role => {
        const roleMap = completionStatus[role] || {};
        const kept: Record<string, boolean> = {};
        Object.keys(roleMap).forEach(key => {
          const parsed = parseCompletionKey(key);
          if (parsed.month === activeMonth && parsed.year === activeYear && roleMap[key]) {
            kept[key] = true;
          } else {
            hasChanges = true;
          }
        });
        newStatus[role] = kept;
      });

      if (hasChanges) {
        setCompletionStatus(newStatus);
        saveCompletionStatus(newStatus);
      }
    };

    checkMonthTransition();
    const interval = setInterval(checkMonthTransition, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [completionStatus]);

  // Save completion status and appraisal data to Firebase
  const saveCompletionStatus = (newStatus: Record<string, Record<string, boolean>>, appraisalData?: any, appraisal?: string, month?: number, year?: number) => {
    if (!user?.id || !workspace?.id) {
      return;
    }

    // Save to Firebase asynchronously without blocking
  const trackerCol = collection(db, workspaceCollectionPath(workspace.id, 'appraisal-tracker', workspace.organisationId));
  const docRef = doc(trackerCol, user.id);
    const updateData: any = {
      completionStatus: newStatus,
      updatedAt: new Date(),
      userId: user.id,
      userEmail: user.email,
    };

    // If appraisal data is provided, save it as well (keyed by year-month)
    if (appraisalData && appraisal && month !== undefined) {
      const inferredYear = typeof year === 'number' ? year : inferYearForMonth(month);
      if (!updateData.appraisalData) {
        updateData.appraisalData = {};
      }
      updateData.appraisalData[`${appraisal}-${inferredYear}-${month}`] = {
        data: appraisalData,
        completedAt: new Date(),
        appraisalType: appraisal,
        month: month,
        year: inferredYear,
      };
    }

    setDoc(docRef, updateData, { merge: true }).catch(error => {
      console.error("Error saving completion status:", error);
    });
  };

    const handleOpenTrackerModal = (role: string, month: number) => {
      // Use the activeYear for the active column so that early-month behaviour (before the 7th) is respected
      const year = month === activeMonth ? activeYear : inferYearForMonth(month);
      setTrackerModal({ role, month, year });
    };

    const handleCloseTrackerModal = () => {
      setTrackerModal(null);
    };

  const handleSelectAppraisal = (appraisal: string) => {
    // If invoked from a tracker modal, perform additional checks (past month / completed view)
    if (trackerModal) {
      const { month, year, role } = trackerModal;
      const { activeMonth, activeYear } = calculateResetInfo();

      // If this is the active month/year, proceed to create/edit directly
      if (month === activeMonth && year === activeYear) {
        setCurrentView(appraisal);
        setTab('appraisals');
        setCurrentMonth(month);
        setCurrentYear(year);
        setTrackerModal(null);
        return;
      }

      // If the selected month/year already has a completed snapshot, open read-only viewer
      const alreadyCompleted = doesRoleHaveCompletionForMonth(completionStatus[role], appraisal, month, year);
      if (alreadyCompleted) {
        openReadOnlyViewer(appraisal, month, year);
        return;
      }

  // If it's a past month and not completed - confirm creation
  setTrackerModal(null);
  setConfirmCreateModal({ appraisal, month, year });
      return;
    }

    // Not coming from tracker - assume current month
    setCurrentView(appraisal);
    setTab('appraisals');
    setCurrentMonth(new Date().getMonth());
    setCurrentYear(inferYearForMonth(new Date().getMonth()));
    setTrackerModal(null);
  };

  // Callback for forms to call when successfully saved
  const handleFormSave = (appraisal: string, formData: any) => {
    // Prefer the form's own date if provided so saved snapshots are tagged with the intended month/year
    let month: number;
    let year: number;
    if (formData?.date) {
      try {
        const d = new Date(formData.date);
        month = d.getMonth();
        year = d.getFullYear();
      } catch (e) {
        month = currentMonth ?? new Date().getMonth();
        year = currentYear ?? inferYearForMonth(month);
      }
    } else {
      month = currentMonth ?? new Date().getMonth();
      year = currentYear ?? inferYearForMonth(month);
    }
    markAppraisalComplete(appraisal, month, year, formData);
  };

  const markAppraisalComplete = async (appraisal: string, month: number, year?: number, appraisalData?: any) => {
    const role = Object.keys(trackerAppraisalMapping).find(r =>
      trackerAppraisalMapping[r as keyof typeof trackerAppraisalMapping].includes(appraisal)
    );

    const inferredYear = typeof year === 'number' ? year : inferYearForMonth(month);

    if (role) {
      setCompletionStatus(prevStatus => {
        const roleMap = prevStatus[role] ?? {};
        const key = `${appraisal}-${inferredYear}-${month}`;
        const newStatus = {
          ...prevStatus,
          [role]: {
            ...roleMap,
            [key]: true,
          }
        };
        // Save to Firebase asynchronously
        saveCompletionStatus(newStatus, appraisalData, appraisal, month, inferredYear);
        return newStatus;
      });
    }
  };

  const handleBackToAppraisals = () => {
    // Check if the form was actually submitted by looking for saved data
    const formKey = `${currentView}-form`;
    const savedFormData = localStorage.getItem(formKey);

    if (currentView && currentMonth !== null && savedFormData) {
      // Only mark as complete if form data exists (indicating it was submitted)
      const appraisalData = JSON.parse(savedFormData);
      // Prefer the saved form's date if present so we tag completion to the month the user chose
      if (appraisalData && appraisalData.date) {
        try {
          const d = new Date(appraisalData.date);
          const m = d.getMonth();
          const y = d.getFullYear();
          markAppraisalComplete(currentView, m, y, appraisalData);
        } catch (e) {
          markAppraisalComplete(currentView, currentMonth, currentYear ?? inferYearForMonth(currentMonth), appraisalData);
        }
      } else {
        markAppraisalComplete(currentView, currentMonth, currentYear ?? inferYearForMonth(currentMonth), appraisalData);
      }
    }

    setCurrentView(null);
    setCurrentMonth(null);
    setCurrentYear(null);
  };

  // Open read-only viewer for a completed snapshot
  const openReadOnlyViewer = async (appraisal: string, month: number, year: number) => {
    try {
      // Prefer tracker snapshot first
      let formData = appraisalData[`${appraisal}-${year}-${month}`]?.data;
      if (!formData) {
        // Search all appraisalData keys
        for (const k of Object.keys(appraisalData || {})) {
          const parsed = parseCompletionKey(k);
          if (parsed.slug === appraisal && parsed.month === month && parsed.year === year) {
            formData = appraisalData[k]?.data;
            break;
          }
        }
      }

      // If not in tracker, try collection fallback
      if (!formData) {
        formData = await getAppraisalDataFromCollection(appraisal, month, year);
      }

      // If still not found, try localStorage fallback
      if (!formData) {
        const localKey = `${appraisal}-form`;
        const stored = localStorage.getItem(localKey);
        if (stored) formData = JSON.parse(stored);
      }

      setReadOnlyViewer({ appraisal, month, year, formData });
      setTrackerModal(null);
    } catch (err) {
      console.error('Error opening read-only viewer', err);
    }
  };

  const proceedToAppraisal = (appraisal: string, month: number, year: number) => {
    setCurrentView(appraisal);
    setTab('appraisals');
    setCurrentMonth(month);
    setCurrentYear(year);
    setConfirmCreateModal(null);
    setTrackerModal(null);
  };

  const doesRoleHaveCompletionForMonth = (roleMap: Record<string, boolean> | undefined, appraisalSlug: string, month: number, year: number) => {
    if (!roleMap) return false;
    return Object.keys(roleMap).some(key => {
      const parsed = parseCompletionKey(key);
      return parsed.slug === appraisalSlug && parsed.month === month && parsed.year === year && roleMap[key];
    });
  };

  const getCompletionPercentage = (role: string, month: number) => {
    const appraisals = trackerAppraisalMapping[role as keyof typeof trackerAppraisalMapping] || [];
    if (appraisals.length === 0) return 0;

    // Use active year for the active month so the audits-style 7th reset is respected across the UI
    const { activeMonth, activeYear } = calculateResetInfo();
    const year = month === activeMonth ? activeYear : inferYearForMonth(month);

    const completed = appraisals.filter(appraisal => {
      // 1) Check saved appraisalData by scanning keys (robust to legacy vs new keys)
      if (appraisalData) {
        for (const k of Object.keys(appraisalData)) {
          const parsed = parseCompletionKey(k);
          if (parsed.slug === appraisal && parsed.month === month && parsed.year === year) return true;
        }
      }

      // 2) Check completionStatus map using parsed keys
      return doesRoleHaveCompletionForMonth(completionStatus[role], appraisal, month, year);
    }).length;

    return Math.round((completed / appraisals.length) * 100);
  };

  // Check if an appraisal card (by slug) has been completed for the active month/year
  const isAppraisalCompleted = (slug: string) => {
    const { activeMonth, activeYear } = calculateResetInfo();

    // 1) Check tracker snapshot data (year-aware key)
    const exactKey = `${slug}-${activeYear}-${activeMonth}`;
    if (appraisalData && appraisalData[exactKey]) return true;



    // 3) Scan any appraisalData entries for a matching slug/month/year
    if (appraisalData) {
      for (const k of Object.keys(appraisalData)) {
        const parsed = parseCompletionKey(k);
        if (parsed.slug === slug && parsed.month === activeMonth && parsed.year === activeYear) return true;
      }
    }

    // 4) Check role-based completionStatus entries
    for (const role of Object.keys(completionStatus || {})) {
      if (doesRoleHaveCompletionForMonth(completionStatus[role], slug, activeMonth, activeYear)) return true;
    }

    // 5) LocalStorage quick-fallback (immediate local saves) - only if the saved form's date matches the active month/year
    try {
      const localKey = `${slug}-form`;
      const saved = typeof window !== 'undefined' ? localStorage.getItem(localKey) : null;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const savedDate = parsed?.date ? new Date(parsed.date) : null;
          if (savedDate) {
            if (savedDate.getMonth() === activeMonth && savedDate.getFullYear() === activeYear) {
              return true;
            }
          }
        } catch (e) {
          // ignore parse errors and do not treat as completed
        }
      }
    } catch (err) {
      // ignore localStorage errors
    }

    return false;
  };

  // Function to group form data into logical sections like the appraisal form
  const groupFormDataIntoSections = (formData: any) => {
    const sections = [];

    // Employee Details Section
    const employeeDetails = [];
    if (formData.employeeName) employeeDetails.push({ label: 'Employee Name', value: formData.employeeName });
    if (formData.role) employeeDetails.push({ label: 'Role', value: formData.role });
    if (formData.appraiser) employeeDetails.push({ label: 'Appraiser', value: formData.appraiser });
    if (formData.date) employeeDetails.push({ label: 'Date of Appraisal', value: formData.date });
    if (formData.period) employeeDetails.push({ label: 'Period Covered', value: formData.period });

    if (employeeDetails.length > 0) {
      sections.push({
        title: 'Employee Details',
        groups: [{
          title: '',
          fields: employeeDetails,
          objectives: null
        }]
      });
    }

    // Previous Objectives Section
    if (formData.objectives && Array.isArray(formData.objectives) && formData.objectives.length > 0) {
      sections.push({
        title: 'Review of Previous Objectives',
        groups: [{
          title: '',
          fields: [],
          objectives: formData.objectives
        }]
      });
    }

    // Performance Review Section
    const performanceFields = [];
    if (formData.qualityOfWork) performanceFields.push({ label: 'Quality of Work', value: formData.qualityOfWork });
    if (formData.teamwork) performanceFields.push({ label: 'Teamwork & Communication', value: formData.teamwork });
    if (formData.residentFocus) performanceFields.push({ label: 'Resident/Service User Focus', value: formData.residentFocus });
    if (formData.reliability) performanceFields.push({ label: 'Reliability & Professionalism', value: formData.reliability });

    if (performanceFields.length > 0) {
      sections.push({
        title: 'Performance Review',
        groups: [{
          title: '',
          fields: performanceFields,
          objectives: null
        }]
      });
    }

    // Strengths & Achievements Section
    if (formData.strengths) {
      sections.push({
        title: 'Strengths & Achievements',
        groups: [{
          title: '',
          fields: [{ label: 'Key Strengths and Achievements', value: formData.strengths }],
          objectives: null
        }]
      });
    }

    // Development Needs Section
    if (formData.development) {
      sections.push({
        title: 'Development Needs',
        groups: [{
          title: '',
          fields: [{ label: 'Areas Requiring Improvement', value: formData.development }],
          objectives: null
        }]
      });
    }

    // Next Year Objectives Section
    if (formData.nextObjectives && Array.isArray(formData.nextObjectives) && formData.nextObjectives.length > 0) {
      sections.push({
        title: 'Objectives for the Next Year (SMART)',
        groups: [{
          title: '',
          fields: [],
          objectives: formData.nextObjectives.map((obj: any) => ({ text: obj.text || obj, status: '', comments: '' }))
        }]
      });
    }

    // Training & Career Development Section
    if (formData.training) {
      sections.push({
        title: 'Training & Career Development',
        groups: [{
          title: '',
          fields: [{ label: 'Training Completed and Required', value: formData.training }],
          objectives: null
        }]
      });
    }

    // Wellbeing & Support Section
    if (formData.wellbeing) {
      sections.push({
        title: 'Wellbeing & Support',
        groups: [{
          title: '',
          fields: [{ label: 'Workload and Support Assessment', value: formData.wellbeing }],
          objectives: null
        }]
      });
    }

    // Overall Rating Section
    if (formData.overallRating) {
      sections.push({
        title: 'Overall Appraisal Rating',
        groups: [{
          title: '',
          fields: [{ label: 'Rating', value: formData.overallRating }],
          objectives: null
        }]
      });
    }

    // Comments Section
    const commentsFields = [];
    if (formData.appraiserComments) commentsFields.push({ label: 'Appraiser Comments', value: formData.appraiserComments });
    if (formData.appraiseeComments) commentsFields.push({ label: 'Appraisee Comments', value: formData.appraiseeComments });

    if (commentsFields.length > 0) {
      sections.push({
        title: 'Comments',
        groups: [{
          title: '',
          fields: commentsFields,
          objectives: null
        }]
      });
    }

    // Fallback: Add any remaining fields that weren't categorized
    const categorizedFields = new Set([
      'employeeName', 'role', 'appraiser', 'date', 'period',
      'objectives', 'qualityOfWork', 'teamwork', 'residentFocus', 'reliability',
      'strengths', 'development', 'nextObjectives', 'training', 'wellbeing',
      'overallRating', 'appraiserComments', 'appraiseeComments',
      'signature', 'employeeSignature', 'employeeSignatureDate', 'appraiserSignature', 'appraiserSignatureDate'
    ]);

    const remainingFields = Object.entries(formData)
      .filter(([key]) => !categorizedFields.has(key))
      .map(([key, value]) => ({
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: value as string
      }));

    if (remainingFields.length > 0) {
      sections.push({
        title: 'Additional Information',
        groups: [{
          title: '',
          fields: remainingFields,
          objectives: null
        }]
      });
    }

    return sections;
  };

  const getAppraisalTitle = (slug: string) => {
    const match = appraisalCards.find(card => card.slug === slug);
    return match?.title || slug;
  };

  const formatMonthLabel = (month: number, year: number) => {
    const name = MONTH_NAMES[month] ?? `Month ${month + 1}`;
    return `${name} ${year}`;
  };

  const historyGroups = useMemo<HistoryGroup[]>(() => {
    const monthMap = new Map<string, { key: string; month: number; year: number; entries: Map<string, HistoryEntry> }>();

    const recordEntry = (slug: string, month: number, year: number, options?: { role?: string; hasSnapshot?: boolean }) => {
      if (!Number.isFinite(month) || !Number.isFinite(year)) return;
      if (month < 0 || month > 11) return;

      const normalizedMonth = Number(month);
      const normalizedYear = Number(year);
      const key = `${normalizedYear}-${String(normalizedMonth).padStart(2, '0')}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          key,
          month: normalizedMonth,
          year: normalizedYear,
          entries: new Map<string, HistoryEntry>(),
        });
      }

      const group = monthMap.get(key)!;
      const entryKey = `${slug}-${normalizedYear}-${normalizedMonth}`;
      const existing = group.entries.get(entryKey);

      if (existing) {
        if (!existing.role && options?.role) {
          existing.role = options.role;
        }
        existing.hasSnapshot = existing.hasSnapshot || Boolean(options?.hasSnapshot);
        group.entries.set(entryKey, existing);
        return;
      }

      group.entries.set(entryKey, {
        slug,
        title: getAppraisalTitle(slug),
        month: normalizedMonth,
        year: normalizedYear,
        role: options?.role,
        hasSnapshot: Boolean(options?.hasSnapshot),
      });
    };

    Object.entries(appraisalData || {}).forEach(([key, value]) => {
      const parsed = parseCompletionKey(key);
      recordEntry(parsed.slug, parsed.month, parsed.year, {
        role: value?.role || value?.data?.role,
        hasSnapshot: true,
      });
    });

    Object.entries(completionStatus || {}).forEach(([role, roleMap]) => {
      Object.entries(roleMap || {}).forEach(([key, completed]) => {
        if (!completed) return;
        const parsed = parseCompletionKey(key);
        recordEntry(parsed.slug, parsed.month, parsed.year, { role, hasSnapshot: false });
      });
    });

    return Array.from(monthMap.values())
      .map(group => ({
        key: group.key,
        month: group.month,
        year: group.year,
        entries: Array.from(group.entries.values()).sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }, [appraisalData, completionStatus]);

  useEffect(() => {
    if (!historyGroups.length) {
      if (selectedHistoryMonthKey !== null) {
        setSelectedHistoryMonthKey(null);
      }
      return;
    }

    const hasSelected = selectedHistoryMonthKey && historyGroups.some(group => group.key === selectedHistoryMonthKey);
    if (!hasSelected) {
      setSelectedHistoryMonthKey(historyGroups[0].key);
    }
  }, [historyGroups, selectedHistoryMonthKey]);

  const selectedHistoryGroup = historyGroups.find(group => group.key === selectedHistoryMonthKey) || null;

  useEffect(() => {
    if (!pdfViewer?.content) return;
    const url = pdfViewer.content;
    return () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    };
  }, [pdfViewer]);

  const handleViewPDF = async (appraisal: string, month: number, year?: number) => {
    try {
      // 1) Try to find snapshot in the tracker appraisalData using year-aware keys
      const effectiveYear = typeof year === 'number' ? year : inferYearForMonth(month);
      const exactKey = `${appraisal}-${effectiveYear}-${month}`;
      let formData = appraisalData[exactKey]?.data;

      // 2) If not found, try to find any appraisalData key that matches slug/month/year
      if (!formData) {
        for (const k of Object.keys(appraisalData || {})) {
          const parsed = parseCompletionKey(k);
          if (parsed.slug === appraisal && parsed.month === month && parsed.year === effectiveYear) {
            formData = appraisalData[k]?.data;
            break;
          }
        }
      }

      // 3) If still not found, fallback to collection query (prefer matching year)
      if (!formData) {
        formData = await getAppraisalDataFromCollection(appraisal, month, effectiveYear);
      }

      // 4) Fallback to localStorage heuristics
      if (!formData) {
        const possibleKeys = [
          `${appraisal}-form`,
          `${appraisal.replace(/-/g, '')}form`,
          appraisal,
          `${appraisal}-data`
        ];

        for (const key of possibleKeys) {
          const storedData = localStorage.getItem(key);
          if (storedData) {
            formData = JSON.parse(storedData);
            break;
          }
        }

        if (!formData) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes(appraisal) || key.includes('form'))) {
              const storedData = localStorage.getItem(key);
              if (storedData) {
                try {
                  const parsed = JSON.parse(storedData);
                  if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                    formData = parsed;
                    break;
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }
      }

      if (formData) {
        // Generate PDF using the new PDF generator with logo
        const pdfData = await generateAppraisalPDFWithLogo({
          appraisalType: appraisal,
          formData: formData,
          month: month,
          year: effectiveYear,
        });

        // Create a data URL for the PDF to display in iframe
        const blob = new Blob([pdfData as any], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(blob);

        setPdfViewer({ appraisal, month, year: effectiveYear, content: pdfUrl });
      } else {
        // If no data found, show placeholder
        const effectiveYear = typeof year === 'number' ? year : inferYearForMonth(month);
        setPdfViewer({ appraisal, month, year: effectiveYear, content: null });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      const effectiveYear = typeof year === 'number' ? year : inferYearForMonth(month);
      setPdfViewer({ appraisal, month, year: effectiveYear, content: null });
    }
  };

  const handleDownloadPDF = async (appraisal: string, month: number, year?: number) => {
    try {
      const effectiveYear = typeof year === 'number' ? year : inferYearForMonth(month);

      // 1) Try snapshot from appraisalData
      let formData = appraisalData[`${appraisal}-${effectiveYear}-${month}`]?.data;
      if (!formData) {
        for (const k of Object.keys(appraisalData || {})) {
          const parsed = parseCompletionKey(k);
          if (parsed.slug === appraisal && parsed.month === month && parsed.year === effectiveYear) {
            formData = appraisalData[k]?.data;
            break;
          }
        }
      }

      // 2) Try collection fallback
      if (!formData) {
        formData = await getAppraisalDataFromCollection(appraisal, month);
      }

      // 3) Localstorage fallback
      if (!formData) {
        const possibleKeys = [
          `${appraisal}-form`,
          `${appraisal.replace(/-/g, '')}form`,
          appraisal,
          `${appraisal}-data`
        ];

        for (const key of possibleKeys) {
          const storedData = localStorage.getItem(key);
          if (storedData) {
            formData = JSON.parse(storedData);
            break;
          }
        }

        if (!formData) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes(appraisal) || key.includes('form'))) {
              const storedData = localStorage.getItem(key);
              if (storedData) {
                try {
                  const parsed = JSON.parse(storedData);
                  if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                    formData = parsed;
                    break;
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }
      }

      if (formData) {
        // Generate PDF using the new PDF generator with logo
        const pdfData = await generateAppraisalPDFWithLogo({
          appraisalType: appraisal,
          formData: formData,
          month: month,
          year: effectiveYear,
        });

        // Create a blob from the PDF data
        const blob = new Blob([pdfData as any], { type: 'application/pdf' });

        // Generate filename
        const filename = getAppraisalPDFFilename(appraisal, month, effectiveYear);

        // Create download link and trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('No appraisal data found for download');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF. Please try again.');
    }
  };

  // Get collection name for a specific appraisal type
  const getCollectionName = (appraisal: string) => {
    const collectionMap: Record<string, string> = {
      'maintenence-person-supervision': 'maintenencePersonSupervisions',
      'activities-supervision': 'activitiesSupervisions',
      'admin-supervision': 'adminSupervisions',
      'carers-supervision': 'carersSupervisions',
      'chef-supervision': 'chefSupervisions',
      'clinical-lead-supervision': 'clinicalLeadSupervisions',
      'deputy-supervision': 'deputySupervisions',
      'domestic-staff-supervision': 'domesticStaffSupervisions',
      'housekeeping-supervision': 'housekeepingSupervisions',
      'kitchen-assistant-supervision': 'kitchenAssistantSupervisions',
      'nurses-supervision': 'nursesSupervisions',
      'reception-supervision': 'receptionSupervisions',
      'senior-carer-supervision': 'seniorCarerSupervisions',
      'staff-appraisal': 'staffAppraisals',
    };
    return collectionMap[appraisal] || `${appraisal.replace(/-/g, '')}s`;
  };

  // Try to get appraisal data from the workspace-specific appraisal collection
  const getAppraisalDataFromCollection = async (appraisal: string, month: number, year?: number) => {
    if (!user?.id || !workspace?.id) return null;

    try {
      const collectionName = getCollectionName(appraisal);

      const q = query(
        collection(db, workspaceCollectionPath(workspace.id, collectionName, workspace.organisationId)),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);

      // Find the most recent document that matches the month
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();

        // Check if the document date matches the requested month (and year if provided)
        if (data.date) {
          const docDate = new Date(data.date);
          const docMonth = docDate.getMonth();
          const docYear = docDate.getFullYear();

          if (docMonth === month && (typeof year !== 'number' || docYear === year)) {
            return data;
          }
        }
      }

      // If no exact match for month/year, return the most recent document as fallback
      if (!querySnapshot.empty) {
        const mostRecent = querySnapshot.docs[0].data();
        return mostRecent;
      }

      return null;
    } catch (error) {
      console.error('Error getting data from collection:', error);
      return null;
    }
  };
  // Determine the currently active month/year based on the audits reset rule
  const { activeMonth, activeYear } = calculateResetInfo();
  return (
    <div>
      {/* Header with countdown matching audits reset (7th of month) */}
      <PageHeader
        title="Appraisals & Supervisions"
        subtitle="Manage and complete staff appraisals and supervisions. Click a card to begin."
        actions={(
          <div className="text-right">
            {/* Compute next reset date (7th) and days remaining */}
            {(() => {
              const now = new Date();
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth();
              const currentDay = now.getDate();

              let resetMonth = currentMonth;
              let resetYear = currentYear;
              if (currentDay >= 7) {
                resetMonth = currentMonth + 1;
                if (resetMonth > 11) {
                  resetMonth = 0;
                  resetYear = currentYear + 1;
                }
              }

              const resetDate = new Date(resetYear, resetMonth, 7);
              const timeDiff = resetDate.getTime() - now.getTime();
              const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

              const getCountdownColor = (days: number) => {
                if (days > 15) return { text: 'text-green-800', bg: 'bg-green-100' };
                if (days > 5) return { text: 'text-amber-800', bg: 'bg-amber-100' };
                return { text: 'text-destructive', bg: 'bg-destructive/10' };
              };

              return (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col justify-center items-end h-10 sm:h-12 px-3 gap-1 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-sm">
                    <div className="text-primary-foreground/80 text-xs leading-none">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-primary-foreground/80 text-xs">Next: {resetDate.toLocaleDateString()}</div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCountdownColor(daysRemaining).bg} ${getCountdownColor(daysRemaining).text}`}>
                        {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      />
      {/* Tabs below header */}
      <Tabs value={tab} onValueChange={(value) => setTab(value as 'appraisals' | 'tracker' | 'history')} className="mb-8">
        <TabsList className="grid h-auto items-center w-full max-w-2xl grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="appraisals">Appraisals</TabsTrigger>
          <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="tracker">Tracker</TabsTrigger>
          <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="history">Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="appraisals" className="mt-6">
        <div className="px-4 sm:px-8 lg:px-16">
          {currentView === null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {appraisalCards.map(({ title, slug }) => {
                const completed = isAppraisalCompleted(slug);
                return (
                  <div
                    key={title}
                    role="button"
                    onClick={() => setCurrentView(slug)}
                    className={`group relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 min-h-[200px] flex flex-col ${
                      completed 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300' 
                        : 'bg-white/90 border-blue-100 hover:border-blue-200'
                    }`}
                  >
                    {/* Subtle background pattern for completed cards */}
                    {completed && (
                      <div className="absolute inset-0 opacity-5 pointer-events-none">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-400 rounded-full -translate-y-16 translate-x-16"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400 rounded-full translate-y-12 -translate-x-12"></div>
                      </div>
                    )}
                    
                    <div className="relative p-6 flex flex-col flex-grow">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                          completed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                        }`}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex items-center gap-2">
                          {completed && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-600 text-white text-xs font-medium shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L7 12.172 4.707 9.879a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l9-9z" clipRule="evenodd" />
                              </svg>
                              Completed
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdditionalReportModal({ appraisal: slug, title });
                            }}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 flex items-center justify-center transition-colors shadow-sm"
                            title="Add additional report"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
                              <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 flex-grow">
                        <h3 className={`font-semibold text-lg leading-tight ${
                          completed ? 'text-green-800' : 'text-blue-900 group-hover:text-blue-800'
                        }`}>
                          {title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {completed ? 'Completed - Click to review or update' : 'Click to begin this appraisal'}
                        </p>
                      </div>
                      
                      {/* Progress indicator for completed cards */}
                      {completed && (
                        <div className="mt-4 pt-4 border-t border-green-200">
                          <div className="flex items-center justify-between text-xs text-green-700">
                            <span>Status</span>
                            <span className="font-medium">✓ Complete</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Bottom accent bar */}
                    <div className={`absolute left-0 bottom-0 h-1 w-full transition-all duration-300 ${
                      completed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                    }`}></div>
                  </div>
                );
              })}
            </div>
          )}
          {currentView === 'senior-carer-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><SeniorCarerSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'reception-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><ReceptionSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'nurses-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><NursesSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'maintenence-person-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><MaintenencePersonSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'kitchen-assistant-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><KitchenAssistantSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'housekeeping-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><HousekeepingSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'domestic-staff-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><DomesticStaffSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'deputy-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><DeputySupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'chef-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><ChefSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'clinical-lead-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><ClinicalLeadSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'activities-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><ActivitiesSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'admin-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><AdminSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'staff-appraisal' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><StaffAppraisalForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
          {currentView === 'carers-supervision' && (
            <div><button onClick={handleBackToAppraisals} className="mb-4 p-2 text-primary hover:text-primary/80">← Back to Appraisals</button><CarersSupervisionForm onSave={handleFormSave} workspaceId={workspace?.id} /></div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="tracker" className="mt-6">
        <div className="px-4 sm:px-8 lg:px-16">
          <div className="w-full">
            <div className="bg-white/90 rounded-2xl shadow-xl border border-blue-100 p-6 sm:p-10 mb-8 min-h-[500px] flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-blue-500"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>
                <div>
                  <h2 className="text-2xl font-bold text-blue-900 leading-tight">Supervision & Appraisal Tracker</h2>
                  <div className="text-blue-700 text-sm mt-1">Overview of staff supervisions and appraisals by month</div>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Loading tracker data...</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-200 shadow-sm rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <th className="py-4 px-6 text-left font-semibold border-b border-blue-500">Staff member & Role</th>
                        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, idx) => (
                          <th key={m} className={`py-4 px-6 font-semibold border-b border-blue-500 text-center ${idx === activeMonth ? 'bg-blue-700' : ''}`}>
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        'Deputy',
                        'Clinical lead & Nurses',
                        'Senior/Care team managers',
                        'Admin staff',
                        'Maintenance staff',
                        'Activities staff',
                        'Kitchen staff',
                        'Domestic staff',
                      ].map((role, idx) => (
                        <tr key={role} className={`transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'} border-b border-gray-200`}>
                          <td className="py-4 px-6 font-medium text-gray-900 border-r border-gray-200">{role}</td>
                          {Array.from({ length: 12 }).map((_, i) => {
                            const percentage = getCompletionPercentage(role, i);
                            const isActiveCell = i === activeMonth;
                            return (
                              <td
                                key={i}
                                className={`py-4 px-6 text-center border-r border-gray-200 cursor-pointer transition-all duration-200 hover:bg-blue-100 hover:shadow-inner ${
                                  isActiveCell ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => handleOpenTrackerModal(role, i)}
                              >
                                {percentage > 0 ? (
                                  <div className="flex flex-col items-center space-y-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${
                                      percentage === 100 
                                        ? 'bg-green-500 text-white' 
                                        : percentage > 0 
                                          ? 'bg-blue-500 text-white' 
                                          : 'bg-gray-200 text-gray-600'
                                    }`}>
                                      {percentage === 100 ? '✓' : percentage > 0 ? `${percentage}%` : ''}
                                    </div>
                                    {percentage > 0 && percentage < 100 && (
                                      <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-blue-500 transition-all duration-300" 
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-full border-2 border-gray-300 border-dashed flex items-center justify-center text-gray-400 hover:border-blue-400 transition-colors">
                                    <span className="text-xs">+</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        <div className="px-4 sm:px-8 lg:px-16">
          {historyGroups.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-current">
                  <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">No Completed Appraisals</h3>
              <p className="mb-6 text-gray-600">Complete some appraisals to see them in your history.</p>
              <button
                onClick={() => setTab('appraisals')}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-medium text-white transition-shadow hover:shadow-lg"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
                  <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Start an Appraisal
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto pb-3">
                <div className="flex min-w-max gap-3">
                  {historyGroups.map(group => {
                    const isActive = group.key === selectedHistoryMonthKey;
                    return (
                      <button
                        key={group.key}
                        onClick={() => setSelectedHistoryMonthKey(group.key)}
                        className={`flex min-w-[170px] flex-col rounded-xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isActive ? 'border-blue-600 bg-blue-600 text-white shadow-lg' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'}`}
                      >
                        <span className="text-sm font-semibold">{formatMonthLabel(group.month, group.year)}</span>
                        <span className={`mt-1 text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                          {group.entries.length} completed {group.entries.length === 1 ? 'appraisal' : 'appraisals'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedHistoryGroup && selectedHistoryGroup.entries.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {selectedHistoryGroup.entries.map(entry => (
                    <div
                      key={`${entry.slug}-${entry.year}-${entry.month}`}
                      onClick={() => openReadOnlyViewer(entry.slug, entry.month, entry.year)}
                      className="group relative flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-600">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-current">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-blue-700">{entry.title}</div>
                            <div className="text-xs text-gray-500">{formatMonthLabel(entry.month, entry.year)}</div>
                            {entry.role && <div className="mt-1 text-xs text-gray-500">{entry.role}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleViewPDF(entry.slug, entry.month, entry.year);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current">
                              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            View
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDownloadPDF(entry.slug, entry.month, entry.year);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current">
                              <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Download
                          </button>
                        </div>
                      </div>
                      {!entry.hasSnapshot && (
                        <div className="flex items-center gap-2 text-xs text-amber-600">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current">
                            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Snapshot will be rebuilt when opened.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600">
                  {(() => {
                    if (!selectedHistoryMonthKey) return 'Select a month to view completed appraisals.';
                    const [yearPart, monthPart] = selectedHistoryMonthKey.split('-');
                    const parsedMonth = Number(monthPart);
                    const parsedYear = Number(yearPart);
                    if (Number.isFinite(parsedMonth) && Number.isFinite(parsedYear)) {
                      return `No appraisals stored for ${formatMonthLabel(parsedMonth, parsedYear)}.`;
                    }
                    return 'No appraisals stored for the selected month.';
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>

      {trackerModal && (
        <TrackerModal
          isOpen={true}
          role={trackerModal.role}
          month={trackerModal.month}
          year={trackerModal.year}
          appraisals={trackerAppraisalMapping[trackerModal.role as keyof typeof trackerAppraisalMapping] || []}
          onClose={handleCloseTrackerModal}
          onSelectAppraisal={handleSelectAppraisal}
          onViewCompletedAppraisal={(appraisal) => openReadOnlyViewer(appraisal, trackerModal.month, trackerModal.year)}
          completionStatus={completionStatus[trackerModal.role] || {}}
        />
      )}

      {/* Additional Report Modal */}
      {additionalReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
                  <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add Additional Report</h3>
                <p className="text-sm text-gray-600">Create another {additionalReportModal.title} for a different month</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={new Date().getMonth()}
                >
                  {MONTH_NAMES.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      const selectedMonth = (document.querySelector('select') as HTMLSelectElement)?.value;
                      if (selectedMonth) {
                        const monthIdx = parseInt(selectedMonth);
                        setCurrentView(additionalReportModal.appraisal);
                        setCurrentMonth(monthIdx);
                        setCurrentYear(inferYearForMonth(monthIdx));
                        setAdditionalReportModal(null);
                      }
                    }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow"
                >
                  Create Report
                </button>
                <button
                  onClick={() => setAdditionalReportModal(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfViewer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {appraisalCards.find(card => card.slug === pdfViewer.appraisal)?.title || pdfViewer.appraisal}
                </h3>
                <p className="text-sm text-gray-600">{MONTH_NAMES[pdfViewer.month]} {pdfViewer.year ?? new Date().getFullYear()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(pdfViewer.appraisal, pdfViewer.month, pdfViewer.year)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
                    <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => setPdfViewer(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-auto">
              {pdfViewer.content ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <iframe
                    src={pdfViewer.content}
                    className="w-full h-[600px] border border-gray-200 rounded-lg"
                    title={`${pdfViewer.appraisal} PDF`}
                  />
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No PDF Available</h3>
                  <p className="text-gray-600 mb-4">The appraisal data could not be loaded for PDF generation.</p>
                  <p className="text-sm text-gray-500">File: {appraisalCards.find(card => card.slug === pdfViewer.appraisal)?.title || pdfViewer.appraisal}_{MONTH_NAMES[pdfViewer.month]}_{pdfViewer.year ?? new Date().getFullYear()}_Report.pdf</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Read-only Appraisal Viewer Modal */}
      {readOnlyViewer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{appraisalCards.find(card => card.slug === readOnlyViewer.appraisal)?.title || readOnlyViewer.appraisal}</h3>
                <p className="text-sm text-gray-600">{MONTH_NAMES[readOnlyViewer.month]} {readOnlyViewer.year}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(readOnlyViewer.appraisal, readOnlyViewer.month, readOnlyViewer.year)}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  Download
                </button>
                <button
                  onClick={() => setReadOnlyViewer(null)}
                  className="p-2 text-gray-500 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6">
              {readOnlyViewer.formData ? (
                <div className="space-y-6">
                  {groupFormDataIntoSections(readOnlyViewer.formData).map((section, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">{section.title}</h4>
                      {section.groups.map((group: any, gidx: number) => (
                        <div key={gidx} className="space-y-2">
                          {group.fields && group.fields.map((f: any, fi: number) => (
                            <div key={fi} className="mb-2">
                              <div className="text-sm font-medium text-gray-700">{f.label}</div>
                              <div className="text-gray-800">{f.value || <span className="text-gray-400">Not provided</span>}</div>
                            </div>
                          ))}
                          {group.objectives && group.objectives.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm font-medium text-gray-700">Objectives</div>
                              <ul className="list-disc list-inside text-gray-800 mt-2">
                                {group.objectives.map((o: any, oi: number) => (
                                  <li key={oi}>{o.text || o}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-600">No snapshot data available for this appraisal.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm-create modal for creating past-month appraisal */}
      {confirmCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create appraisal for {MONTH_NAMES[confirmCreateModal.month]} {confirmCreateModal.year}?</h3>
            <p className="text-sm text-gray-600 mb-6">This will create a new appraisal for the selected past month. Are you sure you want to proceed?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmCreateModal(null)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => proceedToAppraisal(confirmCreateModal.appraisal, confirmCreateModal.month, confirmCreateModal.year)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
