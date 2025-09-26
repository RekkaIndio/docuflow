"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/context/workspace';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AuditFooter from '@/components/audit-footer';

interface EquipmentAuditData {
  home: string;
  date: string;
  personCompletingAudit: string;
  
  totalHoists: string;
  hoistsLolerInDate: string;
  totalStandAids: string;
  standAidsLolerInDate: string;
  totalProfilingBeds: string;
  profilingBedsWorkingOrder: string;
  
  // Pressure cushions (5 entries)
  pressureCushion1: string;
  pressureCushion1Condition: string;
  pressureCushion2: string;
  pressureCushion2Condition: string;
  pressureCushion3: string;
  pressureCushion3Condition: string;
  pressureCushion4: string;
  pressureCushion4Condition: string;
  pressureCushion5: string;
  pressureCushion5Condition: string;
  
  // Airflow mattresses (5 entries)
  airflowMattress1: string;
  airflowMattress1Condition: string;
  airflowMattress2: string;
  airflowMattress2Condition: string;
  airflowMattress3: string;
  airflowMattress3Condition: string;
  airflowMattress4: string;
  airflowMattress4Condition: string;
  airflowMattress5: string;
  airflowMattress5Condition: string;
  
  slingsAssigned: string;
  slideSheetsAssigned: string;
  totalWheelchairs: string;
  wheelchairsWorkingOrder: string;
  totalSensorMats: string;
  totalChairSensors: string;
  totalRoomSensors: string;
  acousticMonitoringWorking: string;
  
  comments: string;
}

export default function EquipmentAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user } = useAuth();
  const activeWorkspace = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  
  // Collapsible state for each section
  const [openSections, setOpenSections] = useState(() => Array(6).fill(true));

  const toggleSection = (idx: number) => {
    setOpenSections((prev: boolean[]) => prev.map((open, i) => (i === idx ? !open : open)));
  };

  // Section definitions for collapsible form
  const sections = [
    {
      label: "1. Audit Information",
      name: "auditInfo",
      guidance: ["Enter basic audit details including home, date, and person completing the audit."]
    },
    {
      label: "2. Hoists & Stand Aids",
      name: "hoistsAndAids",
      guidance: [
        "Document the total number of hoists and stand aids.",
        "Verify that LOLER inspections are up to date for all equipment."
      ]
    },
    {
      label: "3. Beds & Profiling",
      name: "bedsAndProfiling",
      guidance: [
        "Count the total number of profiling beds.",
        "Check that all beds are in good working order."
      ]
    },
    {
      label: "4. Pressure Equipment",
      name: "pressureEquipment",
      guidance: [
        "Check 5 pressure cushions and document their condition.",
        "Check 5 airflow mattresses and verify they are working properly."
      ]
    },
    {
      label: "5. Mobility & Transfer",
      name: "mobilityAndTransfer",
      guidance: [
        "Verify slings and slide sheets are assigned to each resident.",
        "Count wheelchairs and check their working condition."
      ]
    },
    {
      label: "6. Sensors & Monitoring",
      name: "sensorsAndMonitoring",
      guidance: [
        "Count all sensor mats, chair sensors, and room sensors in use.",
        "Verify acoustic monitoring systems are working properly."
      ]
    }
  ];

  // Helper function to check if field has error
  const hasError = (fieldName: string) => errors.includes(fieldName);
  
  // Helper function to get error styling
  const getFieldClassName = (fieldName: string, baseClassName: string) => {
    return hasError(fieldName) 
      ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500` 
      : baseClassName;
  };
  
  const [auditData, setAuditData] = useState<EquipmentAuditData>({
    home: '',
    date: '',
    personCompletingAudit: '',
    
    totalHoists: '',
    hoistsLolerInDate: '',
    totalStandAids: '',
    standAidsLolerInDate: '',
    totalProfilingBeds: '',
    profilingBedsWorkingOrder: '',
    
    pressureCushion1: '',
    pressureCushion1Condition: '',
    pressureCushion2: '',
    pressureCushion2Condition: '',
    pressureCushion3: '',
    pressureCushion3Condition: '',
    pressureCushion4: '',
    pressureCushion4Condition: '',
    pressureCushion5: '',
    pressureCushion5Condition: '',
    
    airflowMattress1: '',
    airflowMattress1Condition: '',
    airflowMattress2: '',
    airflowMattress2Condition: '',
    airflowMattress3: '',
    airflowMattress3Condition: '',
    airflowMattress4: '',
    airflowMattress4Condition: '',
    airflowMattress5: '',
    airflowMattress5Condition: '',
    
    slingsAssigned: '',
    slideSheetsAssigned: '',
    totalWheelchairs: '',
    wheelchairsWorkingOrder: '',
    totalSensorMats: '',
    totalChairSensors: '',
    totalRoomSensors: '',
    acousticMonitoringWorking: '',
    
    comments: '',
  });

  const handleInputChange = (field: keyof EquipmentAuditData, value: string) => {
    setAuditData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Remove error highlighting when field is filled
    if (value.trim() !== '' && errors.includes(field)) {
      setErrors(prev => prev.filter(error => error !== field));
    }
  };

  const validateForm = () => {
    const requiredFields: (keyof EquipmentAuditData)[] = [
      'home', 'date', 'personCompletingAudit',
      'totalHoists', 'hoistsLolerInDate',
      'totalStandAids', 'standAidsLolerInDate',
      'totalProfilingBeds', 'profilingBedsWorkingOrder',
      'pressureCushion1', 'pressureCushion1Condition',
      'pressureCushion2', 'pressureCushion2Condition',
      'pressureCushion3', 'pressureCushion3Condition',
      'pressureCushion4', 'pressureCushion4Condition',
      'pressureCushion5', 'pressureCushion5Condition',
      'airflowMattress1', 'airflowMattress1Condition',
      'airflowMattress2', 'airflowMattress2Condition',
      'airflowMattress3', 'airflowMattress3Condition',
      'airflowMattress4', 'airflowMattress4Condition',
      'airflowMattress5', 'airflowMattress5Condition',
      'slingsAssigned', 'slideSheetsAssigned',
      'totalWheelchairs', 'wheelchairsWorkingOrder',
      'totalSensorMats', 'totalChairSensors', 'totalRoomSensors',
      'acousticMonitoringWorking'
    ];
    
    const newErrors = requiredFields.filter(field => !auditData[field].trim());
    setErrors(newErrors);
    
    if (newErrors.length > 0) {
      // Scroll to first error
      const firstErrorElement = document.querySelector(`[data-field="${newErrors[0]}"]`);
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    return newErrors.length === 0;
  };

  const handleModalCreate = async (createActionPlan: boolean) => {
    if (!validateForm()) return;
    if (!activeWorkspace?.id) {
      alert('No active workspace. Please select a workspace before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...auditData,
        comments: finalComments,
        createActionPlan,
        createdBy: user?.id ?? null,
        organisationId: activeWorkspace.organisationId || null,
      };

      const auditId = await saveAudit(payload, activeWorkspace.id, activeWorkspace.organisationId || null);
      const completedAt = auditData.date || new Date().toISOString();
      await markAuditCompleted(activeWorkspace.id, 'equipment', completedAt, activeWorkspace.organisationId || null);
      setShowModal(false);
      alert('Audit saved');
    } catch (err) {
      console.error('Failed to save audit', err);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const addNewReport = () => {
    // Reset form for new report
    setAuditData({
      home: '',
      date: '',
      personCompletingAudit: '',
      
      totalHoists: '',
      hoistsLolerInDate: '',
      totalStandAids: '',
      standAidsLolerInDate: '',
      totalProfilingBeds: '',
      profilingBedsWorkingOrder: '',
      
      pressureCushion1: '',
      pressureCushion1Condition: '',
      pressureCushion2: '',
      pressureCushion2Condition: '',
      pressureCushion3: '',
      pressureCushion3Condition: '',
      pressureCushion4: '',
      pressureCushion4Condition: '',
      pressureCushion5: '',
      pressureCushion5Condition: '',
      
      airflowMattress1: '',
      airflowMattress1Condition: '',
      airflowMattress2: '',
      airflowMattress2Condition: '',
      airflowMattress3: '',
      airflowMattress3Condition: '',
      airflowMattress4: '',
      airflowMattress4Condition: '',
      airflowMattress5: '',
      airflowMattress5Condition: '',
      
      slingsAssigned: '',
      slideSheetsAssigned: '',
      totalWheelchairs: '',
      wheelchairsWorkingOrder: '',
      totalSensorMats: '',
      totalChairSensors: '',
      totalRoomSensors: '',
      acousticMonitoringWorking: '',
      
      comments: '',
    });
    setErrors([]);
  };

  const YesNoNAField = ({ 
    label, 
    field, 
    value, 
    onChange 
  }: {
    label: string;
    field: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
          <div className="flex gap-4" data-field={field}>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={field}
                value="Yes"
                checked={value === 'Yes'}
                onChange={(e) => onChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={field}
                value="No"
                checked={value === 'No'}
                onChange={(e) => onChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={field}
                value="N/A"
                checked={value === 'N/A'}
                onChange={(e) => onChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">N/A</span>
            </label>
          </div>
          {errors.includes(field) && (
            <p className="text-red-500 text-sm mt-1">This field is required</p>
          )}
        </div>
      </div>
    </div>
  );

  const ConditionCheckField = ({ 
    label, 
    roomField, 
    conditionField, 
    roomValue, 
    conditionValue, 
    onRoomChange, 
    onConditionChange 
  }: {
    label: string;
    roomField: string;
    conditionField: string;
    roomValue: string;
    conditionValue: string;
    onRoomChange: (value: string) => void;
    onConditionChange: (value: string) => void;
  }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
              type="text"
              data-field={roomField}
              value={roomValue}
              onChange={(e) => onRoomChange(e.target.value)}
              className={`w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50 ${errors.includes(roomField) ? 'border-red-500 bg-red-50' : ''}`}
              placeholder="Room number or initials"
            />
            {errors.includes(roomField) && <p className="text-red-500 text-sm mt-1">This field is required</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
            <div className="flex gap-4" data-field={conditionField}>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={conditionField}
                  value="Good"
                  checked={conditionValue === 'Good'}
                  onChange={(e) => onConditionChange(e.target.value)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Good</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={conditionField}
                  value="Poor"
                  checked={conditionValue === 'Poor'}
                  onChange={(e) => onConditionChange(e.target.value)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Poor</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={conditionField}
                  value="N/A"
                  checked={conditionValue === 'N/A'}
                  onChange={(e) => onConditionChange(e.target.value)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">N/A</span>
              </label>
            </div>
            {errors.includes(conditionField) && <p className="text-red-500 text-sm mt-1">This field is required</p>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
  <div className="w-full p-10 bg-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Equipment Audit</h1>
          <p className="mb-4 text-slate-500">Complete this equipment audit to check estate & equipment safety. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input
                type="text"
                className={getFieldClassName('home', "w-full")}
                name="home"
                value={auditData.home}
                onChange={(e) => handleInputChange('home', e.target.value)}
                placeholder="Enter care home name"
                required
              />
              {hasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Date</label>
              <Input
                type="date"
                className={getFieldClassName('date', "w-full")}
                name="date"
                value={auditData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
              {hasError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <Input
                type="text"
                className={getFieldClassName('personCompletingAudit', "w-full")}
                name="personCompletingAudit"
                value={auditData.personCompletingAudit}
                onChange={(e) => handleInputChange('personCompletingAudit', e.target.value)}
                placeholder="Full name and position"
                required
              />
              {hasError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>
        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleModalCreate(false); }} className="flex flex-col gap-8">
            {sections.map((section, idx) => (
              <div key={section.name} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(idx)}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {section.label}
                  </span>
                  {openSections[idx] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[idx] && (
                  <div className="px-8 pb-8">
                    {section.guidance && (
                      <p className="mb-6 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border-l-4 border-blue-500">
                        {section.guidance.map((g, i) => (
                          <span key={i}>
                            {g}
                            {i < section.guidance.length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    )}
                    {/* Section content based on index */}
                    {idx === 0 && (
                      <div className="space-y-4">
                        {/* Audit Information - already in left panel, so this section is minimal */}
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-sm text-slate-600">Basic audit information has been entered in the left panel.</p>
                        </div>
                      </div>
                    )}
                    {idx === 1 && (
                      <div className="space-y-6">
                        {/* Hoists Section */}
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-green-900 mb-4">Hoists</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Hoists {hasError('totalHoists') && <span className="text-red-500">*</span>}</label>
                              <Input
                                type="number"
                                className={getFieldClassName('totalHoists', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="totalHoists"
                                value={auditData.totalHoists}
                                onChange={(e) => handleInputChange('totalHoists', e.target.value)}
                                placeholder="Enter number"
                                required
                              />
                              {hasError('totalHoists') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">LOLER Inspections in Date</label>
                              <div className="flex gap-4" data-field="hoistsLolerInDate">
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="hoistsLolerInDate"
                                    value="Yes"
                                    checked={auditData.hoistsLolerInDate === 'Yes'}
                                    onChange={(e) => handleInputChange('hoistsLolerInDate', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="hoistsLolerInDate"
                                    value="No"
                                    checked={auditData.hoistsLolerInDate === 'No'}
                                    onChange={(e) => handleInputChange('hoistsLolerInDate', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">No</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="hoistsLolerInDate"
                                    value="N/A"
                                    checked={auditData.hoistsLolerInDate === 'N/A'}
                                    onChange={(e) => handleInputChange('hoistsLolerInDate', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">N/A</span>
                                </label>
                              </div>
                              {hasError('hoistsLolerInDate') && <p className="text-red-500 text-sm mt-1">Please select an option</p>}
                            </div>
                          </div>
                        </div>

                        {/* Stand Aids */}
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-purple-900 mb-4">Stand Aids</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Stand Aids {hasError('totalStandAids') && <span className="text-red-500">*</span>}</label>
                              <Input
                                type="number"
                                className={getFieldClassName('totalStandAids', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="totalStandAids"
                                value={auditData.totalStandAids}
                                onChange={(e) => handleInputChange('totalStandAids', e.target.value)}
                                placeholder="Enter number"
                                required
                              />
                              {hasError('totalStandAids') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">LOLER Inspections in Date</label>
                              <div className="flex gap-4" data-field="standAidsLolerInDate">
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="standAidsLolerInDate"
                                    value="Yes"
                                    checked={auditData.standAidsLolerInDate === 'Yes'}
                                    onChange={(e) => handleInputChange('standAidsLolerInDate', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="standAidsLolerInDate"
                                    value="No"
                                    checked={auditData.standAidsLolerInDate === 'No'}
                                    onChange={(e) => handleInputChange('standAidsLolerInDate', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">No</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="standAidsLolerInDate"
                                    value="N/A"
                                    checked={auditData.standAidsLolerInDate === 'N/A'}
                                    onChange={(e) => handleInputChange('standAidsLolerInDate', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">N/A</span>
                                </label>
                              </div>
                              {hasError('standAidsLolerInDate') && <p className="text-red-500 text-sm mt-1">Please select an option</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {idx === 2 && (
                      <div className="space-y-4">
                        {/* Profiling Beds */}
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-orange-900 mb-4">Profiling Beds</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Profiling Beds {hasError('totalProfilingBeds') && <span className="text-red-500">*</span>}</label>
                              <Input
                                type="number"
                                className={getFieldClassName('totalProfilingBeds', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="totalProfilingBeds"
                                value={auditData.totalProfilingBeds}
                                onChange={(e) => handleInputChange('totalProfilingBeds', e.target.value)}
                                placeholder="Enter number"
                                required
                              />
                              {hasError('totalProfilingBeds') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Profiling Beds in Good Working Order</label>
                              <div className="flex gap-4" data-field="profilingBedsWorkingOrder">
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="profilingBedsWorkingOrder"
                                    value="Yes"
                                    checked={auditData.profilingBedsWorkingOrder === 'Yes'}
                                    onChange={(e) => handleInputChange('profilingBedsWorkingOrder', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="profilingBedsWorkingOrder"
                                    value="No"
                                    checked={auditData.profilingBedsWorkingOrder === 'No'}
                                    onChange={(e) => handleInputChange('profilingBedsWorkingOrder', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">No</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="profilingBedsWorkingOrder"
                                    value="N/A"
                                    checked={auditData.profilingBedsWorkingOrder === 'N/A'}
                                    onChange={(e) => handleInputChange('profilingBedsWorkingOrder', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">N/A</span>
                                </label>
                              </div>
                              {hasError('profilingBedsWorkingOrder') && <p className="text-red-500 text-sm mt-1">Please select an option</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {idx === 3 && (
                      <div className="space-y-6">
                        {/* Pressure Cushions Section */}
                        <div className="bg-red-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-red-900 mb-4">Pressure Cushions in Good Condition (Check 5)</h3>
                          <div className="space-y-4">
                            <ConditionCheckField
                              label="Pressure Cushion 1"
                              roomField="pressureCushion1"
                              conditionField="pressureCushion1Condition"
                              roomValue={auditData.pressureCushion1}
                              conditionValue={auditData.pressureCushion1Condition}
                              onRoomChange={(value) => handleInputChange('pressureCushion1', value)}
                              onConditionChange={(value) => handleInputChange('pressureCushion1Condition', value)}
                            />
                            <ConditionCheckField
                              label="Pressure Cushion 2"
                              roomField="pressureCushion2"
                              conditionField="pressureCushion2Condition"
                              roomValue={auditData.pressureCushion2}
                              conditionValue={auditData.pressureCushion2Condition}
                              onRoomChange={(value) => handleInputChange('pressureCushion2', value)}
                              onConditionChange={(value) => handleInputChange('pressureCushion2Condition', value)}
                            />
                            <ConditionCheckField
                              label="Pressure Cushion 3"
                              roomField="pressureCushion3"
                              conditionField="pressureCushion3Condition"
                              roomValue={auditData.pressureCushion3}
                              conditionValue={auditData.pressureCushion3Condition}
                              onRoomChange={(value) => handleInputChange('pressureCushion3', value)}
                              onConditionChange={(value) => handleInputChange('pressureCushion3Condition', value)}
                            />
                            <ConditionCheckField
                              label="Pressure Cushion 4"
                              roomField="pressureCushion4"
                              conditionField="pressureCushion4Condition"
                              roomValue={auditData.pressureCushion4}
                              conditionValue={auditData.pressureCushion4Condition}
                              onRoomChange={(value) => handleInputChange('pressureCushion4', value)}
                              onConditionChange={(value) => handleInputChange('pressureCushion4Condition', value)}
                            />
                            <ConditionCheckField
                              label="Pressure Cushion 5"
                              roomField="pressureCushion5"
                              conditionField="pressureCushion5Condition"
                              roomValue={auditData.pressureCushion5}
                              conditionValue={auditData.pressureCushion5Condition}
                              onRoomChange={(value) => handleInputChange('pressureCushion5', value)}
                              onConditionChange={(value) => handleInputChange('pressureCushion5Condition', value)}
                            />
                          </div>
                        </div>

                        {/* Airflow Mattresses Section */}
                        <div className="bg-indigo-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-indigo-900 mb-4">Airflow Mattresses in Good Working Order (Check 5)</h3>
                          <div className="space-y-4">
                            <ConditionCheckField
                              label="Airflow Mattress 1"
                              roomField="airflowMattress1"
                              conditionField="airflowMattress1Condition"
                              roomValue={auditData.airflowMattress1}
                              conditionValue={auditData.airflowMattress1Condition}
                              onRoomChange={(value) => handleInputChange('airflowMattress1', value)}
                              onConditionChange={(value) => handleInputChange('airflowMattress1Condition', value)}
                            />
                            <ConditionCheckField
                              label="Airflow Mattress 2"
                              roomField="airflowMattress2"
                              conditionField="airflowMattress2Condition"
                              roomValue={auditData.airflowMattress2}
                              conditionValue={auditData.airflowMattress2Condition}
                              onRoomChange={(value) => handleInputChange('airflowMattress2', value)}
                              onConditionChange={(value) => handleInputChange('airflowMattress2Condition', value)}
                            />
                            <ConditionCheckField
                              label="Airflow Mattress 3"
                              roomField="airflowMattress3"
                              conditionField="airflowMattress3Condition"
                              roomValue={auditData.airflowMattress3}
                              conditionValue={auditData.airflowMattress3Condition}
                              onRoomChange={(value) => handleInputChange('airflowMattress3', value)}
                              onConditionChange={(value) => handleInputChange('airflowMattress3Condition', value)}
                            />
                            <ConditionCheckField
                              label="Airflow Mattress 4"
                              roomField="airflowMattress4"
                              conditionField="airflowMattress4Condition"
                              roomValue={auditData.airflowMattress4}
                              conditionValue={auditData.airflowMattress4Condition}
                              onRoomChange={(value) => handleInputChange('airflowMattress4', value)}
                              onConditionChange={(value) => handleInputChange('airflowMattress4Condition', value)}
                            />
                            <ConditionCheckField
                              label="Airflow Mattress 5"
                              roomField="airflowMattress5"
                              conditionField="airflowMattress5Condition"
                              roomValue={auditData.airflowMattress5}
                              conditionValue={auditData.airflowMattress5Condition}
                              onRoomChange={(value) => handleInputChange('airflowMattress5', value)}
                              onConditionChange={(value) => handleInputChange('airflowMattress5Condition', value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {idx === 4 && (
                      <div className="space-y-6">
                        {/* Slings and Slide Sheets Section */}
                        <div className="bg-teal-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-teal-900 mb-4">Slings and Slide Sheets</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Slings Assigned to Each Resident</label>
                              <div className="flex gap-4" data-field="slingsAssigned">
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="slingsAssigned"
                                    value="Yes"
                                    checked={auditData.slingsAssigned === 'Yes'}
                                    onChange={(e) => handleInputChange('slingsAssigned', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="slingsAssigned"
                                    value="No"
                                    checked={auditData.slingsAssigned === 'No'}
                                    onChange={(e) => handleInputChange('slingsAssigned', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">No</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="slingsAssigned"
                                    value="N/A"
                                    checked={auditData.slingsAssigned === 'N/A'}
                                    onChange={(e) => handleInputChange('slingsAssigned', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">N/A</span>
                                </label>
                              </div>
                              {hasError('slingsAssigned') && <p className="text-red-500 text-sm mt-1">Please select an option</p>}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Slide Sheets Assigned to Each Resident</label>
                              <div className="flex gap-4" data-field="slideSheetsAssigned">
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="slideSheetsAssigned"
                                    value="Yes"
                                    checked={auditData.slideSheetsAssigned === 'Yes'}
                                    onChange={(e) => handleInputChange('slideSheetsAssigned', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="slideSheetsAssigned"
                                    value="No"
                                    checked={auditData.slideSheetsAssigned === 'No'}
                                    onChange={(e) => handleInputChange('slideSheetsAssigned', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">No</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="slideSheetsAssigned"
                                    value="N/A"
                                    checked={auditData.slideSheetsAssigned === 'N/A'}
                                    onChange={(e) => handleInputChange('slideSheetsAssigned', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">N/A</span>
                                </label>
                              </div>
                              {hasError('slideSheetsAssigned') && <p className="text-red-500 text-sm mt-1">Please select an option</p>}
                            </div>
                          </div>
                        </div>

                        {/* Wheelchairs Section */}
                        <div className="bg-pink-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-pink-900 mb-4">Wheelchairs</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Wheelchairs {hasError('totalWheelchairs') && <span className="text-red-500">*</span>}</label>
                              <Input
                                type="number"
                                className={getFieldClassName('totalWheelchairs', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="totalWheelchairs"
                                value={auditData.totalWheelchairs}
                                onChange={(e) => handleInputChange('totalWheelchairs', e.target.value)}
                                placeholder="Enter number"
                                required
                              />
                              {hasError('totalWheelchairs') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Wheelchairs in Good Working Order</label>
                              <div className="flex gap-4" data-field="wheelchairsWorkingOrder">
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="wheelchairsWorkingOrder"
                                    value="Yes"
                                    checked={auditData.wheelchairsWorkingOrder === 'Yes'}
                                    onChange={(e) => handleInputChange('wheelchairsWorkingOrder', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="wheelchairsWorkingOrder"
                                    value="No"
                                    checked={auditData.wheelchairsWorkingOrder === 'No'}
                                    onChange={(e) => handleInputChange('wheelchairsWorkingOrder', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">No</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="wheelchairsWorkingOrder"
                                    value="N/A"
                                    checked={auditData.wheelchairsWorkingOrder === 'N/A'}
                                    onChange={(e) => handleInputChange('wheelchairsWorkingOrder', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">N/A</span>
                                </label>
                              </div>
                              {hasError('wheelchairsWorkingOrder') && <p className="text-red-500 text-sm mt-1">Please select an option</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {idx === 5 && (
                      <div className="space-y-4">
                        {/* Sensors Section */}
                        <div className="bg-cyan-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-cyan-900 mb-4">Sensors and Monitoring</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Sensor Mats in Use {hasError('totalSensorMats') && <span className="text-red-500">*</span>}</label>
                              <Input
                                type="number"
                                className={getFieldClassName('totalSensorMats', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="totalSensorMats"
                                value={auditData.totalSensorMats}
                                onChange={(e) => handleInputChange('totalSensorMats', e.target.value)}
                                placeholder="Enter number"
                                required
                              />
                              {hasError('totalSensorMats') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Chair Sensors in Use {hasError('totalChairSensors') && <span className="text-red-500">*</span>}</label>
                              <Input
                                type="number"
                                className={getFieldClassName('totalChairSensors', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="totalChairSensors"
                                value={auditData.totalChairSensors}
                                onChange={(e) => handleInputChange('totalChairSensors', e.target.value)}
                                placeholder="Enter number"
                                required
                              />
                              {hasError('totalChairSensors') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Room Sensors in Use {hasError('totalRoomSensors') && <span className="text-red-500">*</span>}</label>
                              <Input
                                type="number"
                                className={getFieldClassName('totalRoomSensors', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="totalRoomSensors"
                                value={auditData.totalRoomSensors}
                                onChange={(e) => handleInputChange('totalRoomSensors', e.target.value)}
                                placeholder="Enter number"
                                required
                              />
                              {hasError('totalRoomSensors') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Acoustic Monitoring in Good Working Order</label>
                              <div className="flex gap-4" data-field="acousticMonitoringWorking">
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="acousticMonitoringWorking"
                                    value="Yes"
                                    checked={auditData.acousticMonitoringWorking === 'Yes'}
                                    onChange={(e) => handleInputChange('acousticMonitoringWorking', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="acousticMonitoringWorking"
                                    value="No"
                                    checked={auditData.acousticMonitoringWorking === 'No'}
                                    onChange={(e) => handleInputChange('acousticMonitoringWorking', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">No</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="acousticMonitoringWorking"
                                    value="N/A"
                                    checked={auditData.acousticMonitoringWorking === 'N/A'}
                                    onChange={(e) => handleInputChange('acousticMonitoringWorking', e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">N/A</span>
                                </label>
                              </div>
                              {hasError('acousticMonitoringWorking') && <p className="text-red-500 text-sm mt-1">Please select an option</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {/* Final Comments section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Final Comments & Recommendations</label>
                  <Textarea
                    name="finalComments"
                    value={finalComments}
                    onChange={(e) => setFinalComments(e.target.value)}
                    placeholder="Enter any additional comments or recommendations based on the equipment audit findings..."
                    className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50"
                    rows={6}
                  />
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full h-14 text-lg font-bold mt-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 disabled:opacity-60" disabled={saving}>
              {saving ? "Saving..." : "Complete Audit"}
            </Button>
          </form>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Complete</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan for this incident?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleModalClose()}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'No'}
              </button>
              <button
                onClick={() => handleModalCreate(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Yes, Create Action Plan'}
              </button>
              <button
                onClick={() => handleModalCreate(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save and Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}