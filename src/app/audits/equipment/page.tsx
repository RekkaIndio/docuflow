"use client";
import React, { useState } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/context/workspace';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';
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
      };

      const auditId = await saveAudit(payload, activeWorkspace.id);
      const completedAt = auditData.date || new Date().toISOString();
      await markAuditCompleted(activeWorkspace.id, 'equipment', completedAt);
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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-4" data-field={field}>
        <label className="flex items-center">
          <input
            type="radio"
            name={field}
            value="Yes"
            checked={value === 'Yes'}
            onChange={(e) => onChange(e.target.value)}
            className="mr-2"
          />
          Yes
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name={field}
            value="No"
            checked={value === 'No'}
            onChange={(e) => onChange(e.target.value)}
            className="mr-2"
          />
          No
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name={field}
            value="N/A"
            checked={value === 'N/A'}
            onChange={(e) => onChange(e.target.value)}
            className="mr-2"
          />
          N/A
        </label>
      </div>
      {errors.includes(field) && (
        <p className="text-red-500 text-sm mt-1">This field is required</p>
      )}
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <input
          type="text"
          data-field={roomField}
          value={roomValue}
          onChange={(e) => onRoomChange(e.target.value)}
          className={`w-full p-2 border rounded-md ${errors.includes(roomField) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
          placeholder="Room number or initials"
        />
        {errors.includes(roomField) && <p className="text-red-500 text-sm mt-1">This field is required</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
        <div className="flex gap-4" data-field={conditionField}>
          <label className="flex items-center">
            <input
              type="radio"
              name={conditionField}
              value="Good"
              checked={conditionValue === 'Good'}
              onChange={(e) => onConditionChange(e.target.value)}
              className="mr-2"
            />
            Good
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={conditionField}
              value="Poor"
              checked={conditionValue === 'Poor'}
              onChange={(e) => onConditionChange(e.target.value)}
              className="mr-2"
            />
            Poor
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={conditionField}
              value="N/A"
              checked={conditionValue === 'N/A'}
              onChange={(e) => onConditionChange(e.target.value)}
              className="mr-2"
            />
            N/A
          </label>
        </div>
        {errors.includes(conditionField) && <p className="text-red-500 text-sm mt-1">This field is required</p>}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md flex-shrink-0">
        <div className="w-full">
          <div>
            <h1 className="text-2xl font-bold mb-1">Equipment Audit</h1>
            <p className="text-blue-100 text-sm">Complete this equipment audit to check estate & equipment safety</p>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4">
          <div className="flex gap-4">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex-1">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentReport(Math.max(1, currentReport - 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={currentReport === 1}
                    >
                      ←
                    </button>
                    <span className="text-sm text-gray-600">Report {currentReport} of {totalReports}</span>
                    <button 
                      onClick={() => setCurrentReport(Math.min(totalReports, currentReport + 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={currentReport === totalReports}
                    >
                      →
                    </button>
                  </div>
                  <div>
                    <button onClick={addNewReport} className="bg-red-500 text-white p-2 rounded">+</button>
                  </div>
                </div>

                {/* Three column layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Left column: Basic Info + Hoists + Stand Aids + Profiling Beds */}
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-blue-900 mb-4">Audit Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
                          <input
                            type="text"
                            data-field="home"
                            value={auditData.home}
                            onChange={(e) => handleInputChange('home', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('home') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter home name"
                          />
                          {errors.includes('home') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                          <input
                            type="date"
                            data-field="date"
                            value={auditData.date}
                            onChange={(e) => handleInputChange('date', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('date') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                          />
                          {errors.includes('date') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Person Completing the Audit</label>
                          <input
                            type="text"
                            data-field="personCompletingAudit"
                            value={auditData.personCompletingAudit}
                            onChange={(e) => handleInputChange('personCompletingAudit', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter auditor name"
                          />
                          {errors.includes('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                      </div>
                    </div>

                    {/* Hoists Section */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-green-900 mb-4">Hoists</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Hoists</label>
                          <input
                            type="number"
                            data-field="totalHoists"
                            value={auditData.totalHoists}
                            onChange={(e) => handleInputChange('totalHoists', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('totalHoists') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter number"
                          />
                          {errors.includes('totalHoists') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                        <YesNoNAField
                          label="LOLER Inspections in Date"
                          field="hoistsLolerInDate"
                          value={auditData.hoistsLolerInDate}
                          onChange={(value) => handleInputChange('hoistsLolerInDate', value)}
                        />
                      </div>
                    </div>

                    {/* Stand Aids */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-purple-900 mb-4">Stand Aids</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Stand Aids</label>
                          <input
                            type="number"
                            data-field="totalStandAids"
                            value={auditData.totalStandAids}
                            onChange={(e) => handleInputChange('totalStandAids', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('totalStandAids') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter number"
                          />
                          {errors.includes('totalStandAids') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                        <YesNoNAField
                          label="LOLER Inspections in Date"
                          field="standAidsLolerInDate"
                          value={auditData.standAidsLolerInDate}
                          onChange={(value) => handleInputChange('standAidsLolerInDate', value)}
                        />
                      </div>
                    </div>

                    {/* Profiling Beds */}
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-orange-900 mb-4">Profiling Beds</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Profiling Beds</label>
                          <input
                            type="number"
                            data-field="totalProfilingBeds"
                            value={auditData.totalProfilingBeds}
                            onChange={(e) => handleInputChange('totalProfilingBeds', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('totalProfilingBeds') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter number"
                          />
                          {errors.includes('totalProfilingBeds') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                        <YesNoNAField
                          label="Profiling Beds in Good Working Order"
                          field="profilingBedsWorkingOrder"
                          value={auditData.profilingBedsWorkingOrder}
                          onChange={(value) => handleInputChange('profilingBedsWorkingOrder', value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Middle column: Pressure Cushions, Airflow Mattresses, Slings, Wheelchairs */}
                  <div className="space-y-6">

                    {/* Pressure Cushions Section */}
                    <div className="bg-red-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">Pressure Cushions in Good Condition (Check 5)</h2>
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
        <div className="bg-indigo-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">Airflow Mattresses in Good Working Order (Check 5)</h2>
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

        {/* Slings and Slide Sheets Section */}
        <div className="bg-teal-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-teal-900 mb-4">Slings and Slide Sheets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <YesNoNAField
              label="Slings Assigned to Each Resident"
              field="slingsAssigned"
              value={auditData.slingsAssigned}
              onChange={(value) => handleInputChange('slingsAssigned', value)}
            />
            <YesNoNAField
              label="Slide Sheets Assigned to Each Resident"
              field="slideSheetsAssigned"
              value={auditData.slideSheetsAssigned}
              onChange={(value) => handleInputChange('slideSheetsAssigned', value)}
            />
          </div>
        </div>

        {/* Wheelchairs Section */}
        <div className="bg-pink-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-pink-900 mb-4">Wheelchairs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Wheelchairs</label>
              <input
                type="number"
                data-field="totalWheelchairs"
                value={auditData.totalWheelchairs}
                onChange={(e) => handleInputChange('totalWheelchairs', e.target.value)}
                className={`w-full p-2 border rounded-md ${errors.includes('totalWheelchairs') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                placeholder="Enter number"
              />
              {errors.includes('totalWheelchairs') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
            <YesNoNAField
              label="Wheelchairs in Good Working Order"
              field="wheelchairsWorkingOrder"
              value={auditData.wheelchairsWorkingOrder}
              onChange={(value) => handleInputChange('wheelchairsWorkingOrder', value)}
            />
          </div>
        </div>

                  </div>

                  {/* Right column: Sensors + Final Comments / Submit */}
                  <div className="space-y-6">
                    {/* Sensors Section */}
                    <div className="bg-cyan-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-cyan-900 mb-4">Sensors and Monitoring</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Sensor Mats in Use</label>
                          <input
                            type="number"
                            data-field="totalSensorMats"
                            value={auditData.totalSensorMats}
                            onChange={(e) => handleInputChange('totalSensorMats', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('totalSensorMats') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter number"
                          />
                          {errors.includes('totalSensorMats') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Chair Sensors in Use</label>
                          <input
                            type="number"
                            data-field="totalChairSensors"
                            value={auditData.totalChairSensors}
                            onChange={(e) => handleInputChange('totalChairSensors', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('totalChairSensors') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter number"
                          />
                          {errors.includes('totalChairSensors') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Number of Room Sensors in Use</label>
                          <input
                            type="number"
                            data-field="totalRoomSensors"
                            value={auditData.totalRoomSensors}
                            onChange={(e) => handleInputChange('totalRoomSensors', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('totalRoomSensors') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter number"
                          />
                          {errors.includes('totalRoomSensors') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                        <YesNoNAField
                          label="Acoustic Monitoring in Good Working Order"
                          field="acousticMonitoringWorking"
                          value={auditData.acousticMonitoringWorking}
                          onChange={(value) => handleInputChange('acousticMonitoringWorking', value)}
                        />
                      </div>
                    </div>

                    {/* Final Comments + Submit (AuditFooter) */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <AuditFooter finalComments={finalComments} setFinalComments={setFinalComments} saving={saving} />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Completed</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan based on this audit?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                }}
                disabled={saving}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                No, thanks
              </button>
              <button
                onClick={() => handleModalCreate(true)}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create Action Plan'}
              </button>
              <button
                onClick={() => handleModalCreate(false)}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
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