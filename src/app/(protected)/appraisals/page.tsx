"use client";

import React, { useState, useEffect } from "react";
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
import { generateAppraisalPDF, generateAppraisalPDFWithLogo, getAppraisalPDFFilename } from '@/lib/appraisal-pdf-generator';

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

export default function AppraisalsPage() {
  const { user } = useAuth();
  const workspace = useWorkspace();
  const [tab, setTab] = useState<'appraisals' | 'tracker' | 'history'>('appraisals');
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [trackerModal, setTrackerModal] = useState<{ role: string; month: number } | null>(null);
  const [completionStatus, setCompletionStatus] = useState<Record<string, Record<string, boolean>>>({});
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [openHistorySections, setOpenHistorySections] = useState<Record<string, boolean>>({});

  const toggleHistorySection = (appraisalSlug: string) => {
    setOpenHistorySections(prev => ({
      ...prev,
      [appraisalSlug]: !prev[appraisalSlug]
    }));
  };

  const [additionalReportModal, setAdditionalReportModal] = useState<{ appraisal: string; title: string } | null>(null);
  const [appraisalData, setAppraisalData] = useState<Record<string, any>>({});
  const [pdfViewer, setPdfViewer] = useState<{ appraisal: string; month: number; content: string | null } | null>(null);

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
          setCompletionStatus(data.completionStatus || {});
          setAppraisalData(data.appraisalData || {});
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
      setTrackerModal({ role: firstRole, month: currentMonth });
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

  // Check for month changes and reset completion status for previous months
  useEffect(() => {
    const checkMonthTransition = () => {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // If it's a new year, reset all completion status
      if (currentYear > 2025) {
        setCompletionStatus({});
        saveCompletionStatus({});
        return;
      }

      let hasChanges = false;
      const newStatus = { ...completionStatus };

      // Check each role and their completion entries
      Object.keys(newStatus).forEach(role => {
        Object.keys(newStatus[role]).forEach(key => {
          if (newStatus[role][key]) {
            const [, monthStr] = key.split('-');
            const completedMonth = parseInt(monthStr);

            // If completed in a previous month, reset it
            if (completedMonth < currentMonth) {
              delete newStatus[role][key];
              hasChanges = true;
            }
          }
        });
      });

      // Save changes if any were made
      if (hasChanges) {
        setCompletionStatus(newStatus);
        saveCompletionStatus(newStatus);
      }
    };

    // Check immediately and then every hour
    checkMonthTransition();
    const interval = setInterval(checkMonthTransition, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, [completionStatus]);

  // Save completion status and appraisal data to Firebase
  const saveCompletionStatus = (newStatus: Record<string, Record<string, boolean>>, appraisalData?: any, appraisal?: string, month?: number) => {
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

    // If appraisal data is provided, save it as well
    if (appraisalData && appraisal && month !== undefined) {
      if (!updateData.appraisalData) {
        updateData.appraisalData = {};
      }
      updateData.appraisalData[`${appraisal}-${month}`] = {
        data: appraisalData,
        completedAt: new Date(),
        appraisalType: appraisal,
        month: month,
      };
    }

    setDoc(docRef, updateData, { merge: true }).catch(error => {
      console.error("Error saving completion status:", error);
    });
  };

    const handleOpenTrackerModal = (role: string, month: number) => {
      setTrackerModal({ role, month });
    };

    const handleCloseTrackerModal = () => {
      setTrackerModal(null);
    };

  const handleSelectAppraisal = (appraisal: string) => {
    setCurrentView(appraisal);
    setTab('appraisals');
    setTrackerModal(null);
    if (trackerModal) {
      setCurrentMonth(trackerModal.month);
    } else {
      // Set current month to current date if not coming from tracker modal
      setCurrentMonth(new Date().getMonth());
    }
    // Don't mark as complete here - only when form is actually submitted
  };

  // Callback for forms to call when successfully saved
  const handleFormSave = (appraisal: string, formData: any) => {
    const month = new Date().getMonth();
    markAppraisalComplete(appraisal, month, formData);
  };

  const markAppraisalComplete = async (appraisal: string, month: number, appraisalData?: any) => {
    const role = Object.keys(trackerAppraisalMapping).find(r =>
      trackerAppraisalMapping[r as keyof typeof trackerAppraisalMapping].includes(appraisal)
    );

    if (role) {
      setCompletionStatus(prevStatus => {
        const newStatus = {
          ...prevStatus,
          [role]: {
            ...prevStatus[role],
            [`${appraisal}-${month}`]: true,
          }
        };
        // Save to Firebase asynchronously
        saveCompletionStatus(newStatus, appraisalData, appraisal, month);
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
      markAppraisalComplete(currentView, currentMonth, appraisalData);
    }

    setCurrentView(null);
    setCurrentMonth(null);
  };

  const getCompletionPercentage = (role: string, month: number) => {
    const appraisals = trackerAppraisalMapping[role as keyof typeof trackerAppraisalMapping] || [];
    if (appraisals.length === 0) return 0;

    const completed = appraisals.filter(appraisal => {
      const key = `${appraisal}-${month}`;
      return completionStatus[role]?.[key];
    }).length;

    return Math.round((completed / appraisals.length) * 100);
  };

  // Check if an appraisal card (by slug) has been completed in the current month
  const isAppraisalCompleted = (slug: string) => {
    const currentMonth = new Date().getMonth(); // Get current month (0-11)
    const currentYear = new Date().getFullYear();

    // If it's a new year, reset all completion status
    if (currentYear > 2025) {
      setCompletionStatus({});
      return false;
    }

    // Iterate over all roles and their completion entries to see if this slug is completed for current month
    for (const role of Object.keys(completionStatus || {})) {
      const entries = completionStatus[role] || {};
      for (const key of Object.keys(entries)) {
        // Check for exact match with current month
        if (key === `${slug}-${currentMonth}` && entries[key]) {
          return true;
        }
        // If completed in a previous month, reset it for new month
        else if (key.startsWith(`${slug}-`)) {
          const [, monthStr] = key.split('-');
          const completedMonth = parseInt(monthStr);
          if (completedMonth < currentMonth && entries[key]) {
            // Remove the old completion status
            const newStatus = { ...completionStatus };
            delete newStatus[role][key];
            setCompletionStatus(newStatus);
            // Save the updated status to Firebase
            saveCompletionStatus(newStatus);
          }
        }
      }
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

  // Get all completed appraisals organized by appraisal type
  const getCompletedAppraisalsByType = () => {
    const result: Record<string, { month: number; role: string }[]> = {};

    Object.keys(completionStatus).forEach(role => {
      const roleEntries = completionStatus[role];
      Object.keys(roleEntries).forEach(key => {
        if (roleEntries[key]) {
          const [appraisalSlug, monthStr] = key.split('-');
          const month = parseInt(monthStr);

          if (!result[appraisalSlug]) {
            result[appraisalSlug] = [];
          }
          result[appraisalSlug].push({ month, role });
        }
      });
    });

    return result;
  };

  const handleViewPDF = async (appraisal: string, month: number) => {
    try {
      // Try to get appraisal data from Firebase first, then localStorage as fallback
      const firebaseKey = `${appraisal}-${month}`;

      let formData = appraisalData[firebaseKey]?.data;

      // If no data from Firebase tracker, try specific Firebase collection
      if (!formData) {
        formData = await getAppraisalDataFromCollection(appraisal, month);
      }

      if (!formData) {
        // Fallback to localStorage - try multiple possible key formats
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

        // If still no data, try to get all localStorage keys and find relevant ones
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
          year: 2025
        });

        // Create a data URL for the PDF to display in iframe
        const blob = new Blob([pdfData as any], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(blob);

        setPdfViewer({ appraisal, month, content: pdfUrl });
      } else {
        // If no data found, show placeholder
        setPdfViewer({ appraisal, month, content: null });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setPdfViewer({ appraisal, month, content: null });
    }
  };

  const handleDownloadPDF = async (appraisal: string, month: number) => {
    try {
      // Try to get appraisal data from Firebase first, then localStorage as fallback
      const firebaseKey = `${appraisal}-${month}`;

      let formData = appraisalData[firebaseKey]?.data;

      // If no data from Firebase tracker, try specific Firebase collection
      if (!formData) {
        formData = await getAppraisalDataFromCollection(appraisal, month);
      }

      if (!formData) {
        // Fallback to localStorage - try multiple possible key formats
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

        // If still no data, try to get all localStorage keys and find relevant ones
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
          year: 2025
        });

        // Create a blob from the PDF data
        const blob = new Blob([pdfData as any], { type: 'application/pdf' });

        // Generate filename
        const filename = getAppraisalPDFFilename(appraisal, month, 2025);

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
  const getAppraisalDataFromCollection = async (appraisal: string, month: number) => {
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

        // Check if the document date matches the requested month
        if (data.date) {
          const docDate = new Date(data.date);
          const docMonth = docDate.getMonth();

          if (docMonth === month) {
            return data;
          }
        }
      }

      // If no exact month match, return the most recent document
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
  return (
    <div>
      <PageHeader
        title="Appraisals & Supervisions"
        subtitle="Manage and complete staff appraisals and supervisions. Click a card to begin."
      />
      {/* Tabs below header */}
      <div className="flex gap-2 border-b border-gray-200 mb-8">
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${tab === 'appraisals' ? 'border-blue-600 text-blue-800 bg-blue-50' : 'border-transparent text-gray-500 hover:text-blue-700'}`}
          onClick={() => setTab('appraisals')}
        >
          Appraisals
        </button>
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${tab === 'tracker' ? 'border-blue-600 text-blue-800 bg-blue-50' : 'border-transparent text-gray-500 hover:text-blue-700'}`}
          onClick={() => setTab('tracker')}
        >
          Tracker
        </button>
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${tab === 'history' ? 'border-blue-600 text-blue-800 bg-blue-50' : 'border-transparent text-gray-500 hover:text-blue-700'}`}
          onClick={() => setTab('history')}
        >
          Audit History
        </button>
      </div>
      {/* Main Content */}
      {tab === 'appraisals' && (
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
      )}
      {tab === 'tracker' && (
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
                          <th key={m} className={`py-4 px-6 font-semibold border-b border-blue-500 text-center ${idx === 8 ? 'bg-blue-700' : ''}`}>
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        'Deputy/ies',
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
                            const isCurrentMonth = i === 8; // September is current month
                            return (
                              <td
                                key={i}
                                className={`py-4 px-6 text-center border-r border-gray-200 cursor-pointer transition-all duration-200 hover:bg-blue-100 hover:shadow-inner ${
                                  isCurrentMonth ? 'bg-blue-50' : ''
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
      )}

      {tab === 'history' && (
        <div className="px-4 sm:px-8 lg:px-16">
          <div className="space-y-4">
            {Object.keys(getCompletedAppraisalsByType()).length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-6">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-current">
                    <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Completed Appraisals</h3>
                <p className="text-gray-600 mb-6">Complete some appraisals to see them in your audit history</p>
                <button
                  onClick={() => setTab('appraisals')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
                    <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Start an Appraisal
                </button>
              </div>
            ) : (
              Object.keys(getCompletedAppraisalsByType()).map(appraisalSlug => {
                const appraisalTitle = appraisalCards.find(card => card.slug === appraisalSlug)?.title || appraisalSlug;
                const reports = getCompletedAppraisalsByType()[appraisalSlug];
                const isOpen = openHistorySections[appraisalSlug] ?? true; // Default to open

                return (
                  <div key={appraisalSlug} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleHistorySection(appraisalSlug)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-left hover:from-blue-700 hover:to-indigo-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white">{appraisalTitle}</h2>
                            <p className="text-blue-100 text-sm">{reports.length} completed report{reports.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            className={`text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          >
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {reports.map(({ month, role }, index) => (
                            <div key={`${appraisalSlug}-${month}-${index}`} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
                                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 text-sm">{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month]} 2025</div>
                                    <div className="text-xs text-gray-600">{role}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleViewPDF(appraisalSlug, month)}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-current">
                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  View PDF
                                </button>
                                <button
                                  onClick={() => handleDownloadPDF(appraisalSlug, month)}
                                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-current">
                                    <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {trackerModal && (
        <TrackerModal
          isOpen={true}
          role={trackerModal.role}
          month={trackerModal.month}
          appraisals={trackerAppraisalMapping[trackerModal.role as keyof typeof trackerAppraisalMapping] || []}
          onClose={handleCloseTrackerModal}
          onSelectAppraisal={handleSelectAppraisal}
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
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    const selectedMonth = (document.querySelector('select') as HTMLSelectElement)?.value;
                    if (selectedMonth) {
                      setCurrentView(additionalReportModal.appraisal);
                      setCurrentMonth(parseInt(selectedMonth));
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
                <p className="text-sm text-gray-600">{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][pdfViewer.month]} 2025</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(pdfViewer.appraisal, pdfViewer.month)}
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
                  <p className="text-sm text-gray-500">File: {appraisalCards.find(card => card.slug === pdfViewer.appraisal)?.title || pdfViewer.appraisal}_{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][pdfViewer.month]}_2025_Report.pdf</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
