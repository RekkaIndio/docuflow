'use client';
import React, { useState } from 'react';
import { useWorkspace } from '@/context/workspace';
import { saveAudit, updateAudit, markAuditCompletedWithSnapshot } from '@/lib/firestore';
import { useAuth } from '@/hooks/use-auth';

interface MaintenanceAuditData {
  home: string;
  date: string;
  personCompletingAudit: string;

  // 1 General Building Condition
  internal_walls_ceiling_floor_ok: string;
  internal_walls_ceiling_floor_ok_comment: string;
  external_walls_roof_windows_ok: string;
  external_walls_roof_windows_ok_comment: string;
  lighting_fixtures_ok: string;
  lighting_fixtures_ok_comment: string;
  doors_locks_handles_ok: string;
  doors_locks_handles_ok_comment: string;
  rooms_well_maintained: string;
  rooms_well_maintained_comment: string;

  // 2 Heating, Ventilation and Water Systems
  radiators_heating_ok: string;
  radiators_heating_ok_comment: string;
  thermostats_controls_ok: string;
  thermostats_controls_ok_comment: string;
  extractor_ventilation_ok: string;
  extractor_ventilation_ok_comment: string;
  water_temps_safe: string;
  water_temps_safe_comment: string;
  water_outlets_flushed_recorded: string;
  water_outlets_flushed_recorded_comment: string;

  // 3 Electrical Safety
  pat_testing_current: string;
  pat_testing_current_comment: string;
  sockets_plugs_safe: string;
  sockets_plugs_safe_comment: string;
  fixed_wiring_inspection_current: string;
  fixed_wiring_inspection_current_comment: string;
  staff_report_faults_aware: string;
  staff_report_faults_aware_comment: string;

  //4 Fire Safety
  fire_doors_ok: string;
  fire_doors_ok_comment: string;
  extinguishers_serviced: string;
  extinguishers_serviced_comment: string;
  emergency_lighting_ok: string;
  emergency_lighting_ok_comment: string;
  weekly_alarm_tests: string;
  weekly_alarm_tests_comment: string;
  evacuation_routes_clear: string;
  evacuation_routes_clear_comment: string;

  //5 Lifts and Hoists
  lifts_serviced_loler: string;
  lifts_serviced_loler_comment: string;
  hoists_serviced_logged: string;
  hoists_serviced_logged_comment: string;
  slings_checked: string;
  slings_checked_comment: string;
  lifting_records_up_to_date: string;
  lifting_records_up_to_date_comment: string;

  //6 Garden and Outdoor Areas
  paths_walkways_safe: string;
  paths_walkways_safe_comment: string;
  handrails_fences_secure: string;
  handrails_fences_secure_comment: string;
  garden_tidy_hazard_free: string;
  garden_tidy_hazard_free_comment: string;
  external_bins_stored_secure: string;
  external_bins_stored_secure_comment: string;

  //7 Housekeeping and Equipment
  cleaning_machines_ok: string;
  cleaning_machines_ok_comment: string;
  domestic_trolleys_bins_ok: string;
  domestic_trolleys_bins_ok_comment: string;
  laundry_machines_serviced: string;
  laundry_machines_serviced_comment: string;
  furniture_good_condition: string;
  furniture_good_condition_comment: string;

  //8 Toilets and Bathrooms
  toilets_sinks_baths_ok: string;
  toilets_sinks_baths_ok_comment: string;
  grabrails_secure: string;
  grabrails_secure_comment: string;
  waste_bins_seats_dispensers_ok: string;
  waste_bins_seats_dispensers_ok_comment: string;

  //9 Storage and Hazardous Materials
  storage_areas_neat: string;
  storage_areas_neat_comment: string;
  coshh_items_stored_secure: string;
  coshh_items_stored_secure_comment: string;
  tools_ladders_stored_safe: string;
  tools_ladders_stored_safe_comment: string;

  //10 Reporting and Record-Keeping
  issues_reported_process: string;
  issues_reported_process_comment: string;
  repair_logs_maintained: string;
  repair_logs_maintained_comment: string;
  outstanding_repairs_tracked: string;
  outstanding_repairs_tracked_comment: string;
  scheduled_servicing_record: string;
  scheduled_servicing_record_comment: string;
  contractors_qualified_records: string;
  contractors_qualified_records_comment: string;
}

export default function MaintenanceAuditPage() {
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [data, setData] = useState<MaintenanceAuditData>({
    home: '',
    date: '',
    personCompletingAudit: '',

    internal_walls_ceiling_floor_ok: '',
    internal_walls_ceiling_floor_ok_comment: '',
    external_walls_roof_windows_ok: '',
    external_walls_roof_windows_ok_comment: '',
    lighting_fixtures_ok: '',
    lighting_fixtures_ok_comment: '',
    doors_locks_handles_ok: '',
    doors_locks_handles_ok_comment: '',
    rooms_well_maintained: '',
    rooms_well_maintained_comment: '',

    radiators_heating_ok: '',
    radiators_heating_ok_comment: '',
    thermostats_controls_ok: '',
    thermostats_controls_ok_comment: '',
    extractor_ventilation_ok: '',
    extractor_ventilation_ok_comment: '',
    water_temps_safe: '',
    water_temps_safe_comment: '',
    water_outlets_flushed_recorded: '',
    water_outlets_flushed_recorded_comment: '',

    pat_testing_current: '',
    pat_testing_current_comment: '',
    sockets_plugs_safe: '',
    sockets_plugs_safe_comment: '',
    fixed_wiring_inspection_current: '',
    fixed_wiring_inspection_current_comment: '',
    staff_report_faults_aware: '',
    staff_report_faults_aware_comment: '',

    fire_doors_ok: '',
    fire_doors_ok_comment: '',
    extinguishers_serviced: '',
    extinguishers_serviced_comment: '',
    emergency_lighting_ok: '',
    emergency_lighting_ok_comment: '',
    weekly_alarm_tests: '',
    weekly_alarm_tests_comment: '',
    evacuation_routes_clear: '',
    evacuation_routes_clear_comment: '',

    lifts_serviced_loler: '',
    lifts_serviced_loler_comment: '',
    hoists_serviced_logged: '',
    hoists_serviced_logged_comment: '',
    slings_checked: '',
    slings_checked_comment: '',
    lifting_records_up_to_date: '',
    lifting_records_up_to_date_comment: '',

    paths_walkways_safe: '',
    paths_walkways_safe_comment: '',
    handrails_fences_secure: '',
    handrails_fences_secure_comment: '',
    garden_tidy_hazard_free: '',
    garden_tidy_hazard_free_comment: '',
    external_bins_stored_secure: '',
    external_bins_stored_secure_comment: '',

    cleaning_machines_ok: '',
    cleaning_machines_ok_comment: '',
    domestic_trolleys_bins_ok: '',
    domestic_trolleys_bins_ok_comment: '',
    laundry_machines_serviced: '',
    laundry_machines_serviced_comment: '',
    furniture_good_condition: '',
    furniture_good_condition_comment: '',

    toilets_sinks_baths_ok: '',
    toilets_sinks_baths_ok_comment: '',
    grabrails_secure: '',
    grabrails_secure_comment: '',
    waste_bins_seats_dispensers_ok: '',
    waste_bins_seats_dispensers_ok_comment: '',

    storage_areas_neat: '',
    storage_areas_neat_comment: '',
    coshh_items_stored_secure: '',
    coshh_items_stored_secure_comment: '',
    tools_ladders_stored_safe: '',
    tools_ladders_stored_safe_comment: '',

    issues_reported_process: '',
    issues_reported_process_comment: '',
    repair_logs_maintained: '',
    repair_logs_maintained_comment: '',
    outstanding_repairs_tracked: '',
    outstanding_repairs_tracked_comment: '',
    scheduled_servicing_record: '',
    scheduled_servicing_record_comment: '',
    contractors_qualified_records: '',
    contractors_qualified_records_comment: '',
  });

  const activeWorkspace = useWorkspace();
  const { user: authUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);

  const handleChange = (field: keyof MaintenanceAuditData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

  const YesNoQuestion = ({ label, yesNoField, commentField, yesNoValue, commentValue, onYesNoChange, onCommentChange }: { label: string; yesNoField: string; commentField: string; yesNoValue: string; commentValue: string; onYesNoChange: (v: string) => void; onCommentChange: (v: string) => void; }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-4 items-center" data-field={yesNoField}>
        <label className="flex items-center"><input type="radio" name={yesNoField} value="Yes" checked={yesNoValue === 'Yes'} onChange={(e) => onYesNoChange(e.target.value)} className="mr-2" />Yes</label>
        <label className="flex items-center"><input type="radio" name={yesNoField} value="No" checked={yesNoValue === 'No'} onChange={(e) => onYesNoChange(e.target.value)} className="mr-2" />No</label>
      </div>
      {errors.includes(yesNoField) && <p className="text-red-500 text-sm">This field is required</p>}
      <textarea value={commentValue} onChange={(e) => onCommentChange(e.target.value)} rows={2} placeholder="Comments" className="w-full p-2 border rounded resize-none mt-2" />
    </div>
  );

  const validateForm = () => {
    const required: (keyof MaintenanceAuditData)[] = [
      'home','date','personCompletingAudit',
      'internal_walls_ceiling_floor_ok','external_walls_roof_windows_ok','lighting_fixtures_ok','doors_locks_handles_ok','rooms_well_maintained',
      'radiators_heating_ok','thermostats_controls_ok','extractor_ventilation_ok','water_temps_safe','water_outlets_flushed_recorded',
      'pat_testing_current','sockets_plugs_safe','fixed_wiring_inspection_current','staff_report_faults_aware',
      'fire_doors_ok','extinguishers_serviced','emergency_lighting_ok','weekly_alarm_tests','evacuation_routes_clear',
      'lifts_serviced_loler','hoists_serviced_logged','slings_checked','lifting_records_up_to_date',
      'paths_walkways_safe','handrails_fences_secure','garden_tidy_hazard_free','external_bins_stored_secure',
      'cleaning_machines_ok','domestic_trolleys_bins_ok','laundry_machines_serviced','furniture_good_condition',
      'toilets_sinks_baths_ok','grabrails_secure','waste_bins_seats_dispensers_ok',
      'storage_areas_neat','coshh_items_stored_secure','tools_ladders_stored_safe',
      'issues_reported_process','repair_logs_maintained','outstanding_repairs_tracked','scheduled_servicing_record','contractors_qualified_records'
    ];

    const missing = required.filter(f => !data[f].trim());
    setErrors(missing as string[]);
    if (missing.length > 0) {
      const el = document.querySelector(`[data-field="${missing[0]}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return missing.length === 0;
  };

  const handleComplete = () => {
    if (validateForm()) {
      setShowModal(true);
      // mark completed will be handled when the audit is persisted in handleModalCreate
    }
  };

  async function handleModalCreate(createActionPlan: boolean) {
    setShowModal(false);
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Please choose a workspace before saving audits.');
      return;
    }
    const workspaceId = activeWorkspace.id;
    // compute yes/no score for maintenance audit
    const YES_NO_FIELDS: (keyof MaintenanceAuditData)[] = [
      'internal_walls_ceiling_floor_ok','external_walls_roof_windows_ok','lighting_fixtures_ok','doors_locks_handles_ok','rooms_well_maintained',
      'radiators_heating_ok','thermostats_controls_ok','extractor_ventilation_ok','water_temps_safe','water_outlets_flushed_recorded',
      'pat_testing_current','sockets_plugs_safe','fixed_wiring_inspection_current','staff_report_faults_aware',
      'fire_doors_ok','extinguishers_serviced','emergency_lighting_ok','weekly_alarm_tests','evacuation_routes_clear',
      'lifts_serviced_loler','hoists_serviced_logged','slings_checked','lifting_records_up_to_date',
      'paths_walkways_safe','handrails_fences_secure','garden_tidy_hazard_free','external_bins_stored_secure',
      'cleaning_machines_ok','domestic_trolleys_bins_ok','laundry_machines_serviced','furniture_good_condition',
      'toilets_sinks_baths_ok','grabrails_secure','waste_bins_seats_dispensers_ok',
      'storage_areas_neat','coshh_items_stored_secure','tools_ladders_stored_safe',
      'issues_reported_process','repair_logs_maintained','outstanding_repairs_tracked','scheduled_servicing_record','contractors_qualified_records'
    ];

    const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + (data[f] === 'Yes' ? 1 : 0), 0);
    const totalCount = YES_NO_FIELDS.length;
    const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 0;

    const payload = {
      auditType: 'maintenance',
      data,
      createActionPlan: !!createActionPlan,
      createdBy: authUser?.id ?? null,
      workspaceId,
      scorePercent,
      yesCount,
      totalCount,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, workspaceId);
      setSavedAuditId(id);
      try {
        const completedAt = data.date || new Date().toISOString();
        const result = await markAuditCompletedWithSnapshot(workspaceId, 'maintenance', payload, completedAt);
      } catch (e) {
        console.warn('Failed to mark audit completed', e);
      }
      setSaving(false);
      alert(`Audit completed and saved${createActionPlan ? '; an action plan will be created.' : '.'}`);
    } catch (e) {
      setSaving(false);
      console.error('Failed to save audit', e);
      alert('Failed to save audit. Please try again.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Audit</h1>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Audit Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
              <input value={data.home} data-field="home" onChange={(e) => handleChange('home', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('home') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter home name" />
              {errors.includes('home') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input type="date" value={data.date} data-field="date" onChange={(e) => handleChange('date', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('date') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
              {errors.includes('date') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Person Completing the Audit</label>
              <input value={data.personCompletingAudit} data-field="personCompletingAudit" onChange={(e) => handleChange('personCompletingAudit', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter auditor name" />
              {errors.includes('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-3">1. General Building Condition</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are internal walls, ceilings, and floors in good condition and free from damage?" yesNoField="internal_walls_ceiling_floor_ok" commentField="internal_walls_ceiling_floor_ok_comment" yesNoValue={data.internal_walls_ceiling_floor_ok} commentValue={data.internal_walls_ceiling_floor_ok_comment} onYesNoChange={(v) => handleChange('internal_walls_ceiling_floor_ok', v)} onCommentChange={(v) => handleChange('internal_walls_ceiling_floor_ok_comment', v)} />
              <YesNoQuestion label="Are external walls, roofs, gutters, and windows in good repair?" yesNoField="external_walls_roof_windows_ok" commentField="external_walls_roof_windows_ok_comment" yesNoValue={data.external_walls_roof_windows_ok} commentValue={data.external_walls_roof_windows_ok_comment} onYesNoChange={(v) => handleChange('external_walls_roof_windows_ok', v)} onCommentChange={(v) => handleChange('external_walls_roof_windows_ok_comment', v)} />
              <YesNoQuestion label="Are lighting fixtures working and adequate in all areas (indoor and outdoor)?" yesNoField="lighting_fixtures_ok" commentField="lighting_fixtures_ok_comment" yesNoValue={data.lighting_fixtures_ok} commentValue={data.lighting_fixtures_ok_comment} onYesNoChange={(v) => handleChange('lighting_fixtures_ok', v)} onCommentChange={(v) => handleChange('lighting_fixtures_ok_comment', v)} />
              <YesNoQuestion label="Are doors, locks, and handles functioning properly throughout the home?" yesNoField="doors_locks_handles_ok" commentField="doors_locks_handles_ok_comment" yesNoValue={data.doors_locks_handles_ok} commentValue={data.doors_locks_handles_ok_comment} onYesNoChange={(v) => handleChange('doors_locks_handles_ok', v)} onCommentChange={(v) => handleChange('doors_locks_handles_ok_comment', v)} />
              <YesNoQuestion label="Are all resident bedrooms, bathrooms, and communal areas well maintained?" yesNoField="rooms_well_maintained" commentField="rooms_well_maintained_comment" yesNoValue={data.rooms_well_maintained} commentValue={data.rooms_well_maintained_comment} onYesNoChange={(v) => handleChange('rooms_well_maintained', v)} onCommentChange={(v) => handleChange('rooms_well_maintained_comment', v)} />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">2. Heating, Ventilation and Water Systems</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all radiators and heating systems working effectively?" yesNoField="radiators_heating_ok" commentField="radiators_heating_ok_comment" yesNoValue={data.radiators_heating_ok} commentValue={data.radiators_heating_ok_comment} onYesNoChange={(v) => handleChange('radiators_heating_ok', v)} onCommentChange={(v) => handleChange('radiators_heating_ok_comment', v)} />
              <YesNoQuestion label="Are thermostats and heating controls functioning correctly?" yesNoField="thermostats_controls_ok" commentField="thermostats_controls_ok_comment" yesNoValue={data.thermostats_controls_ok} commentValue={data.thermostats_controls_ok_comment} onYesNoChange={(v) => handleChange('thermostats_controls_ok', v)} onCommentChange={(v) => handleChange('thermostats_controls_ok_comment', v)} />
              <YesNoQuestion label="Are extractor fans and ventilation systems clean and operational?" yesNoField="extractor_ventilation_ok" commentField="extractor_ventilation_ok_comment" yesNoValue={data.extractor_ventilation_ok} commentValue={data.extractor_ventilation_ok_comment} onYesNoChange={(v) => handleChange('extractor_ventilation_ok', v)} onCommentChange={(v) => handleChange('extractor_ventilation_ok_comment', v)} />
              <YesNoQuestion label="Are hot and cold water temperatures within safe limits (legionella control)?" yesNoField="water_temps_safe" commentField="water_temps_safe_comment" yesNoValue={data.water_temps_safe} commentValue={data.water_temps_safe_comment} onYesNoChange={(v) => handleChange('water_temps_safe', v)} onCommentChange={(v) => handleChange('water_temps_safe_comment', v)} />
              <YesNoQuestion label="Are water outlets flushed regularly and recorded (for infrequently used taps/showers)?" yesNoField="water_outlets_flushed_recorded" commentField="water_outlets_flushed_recorded_comment" yesNoValue={data.water_outlets_flushed_recorded} commentValue={data.water_outlets_flushed_recorded_comment} onYesNoChange={(v) => handleChange('water_outlets_flushed_recorded', v)} onCommentChange={(v) => handleChange('water_outlets_flushed_recorded_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">3. Electrical Safety</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all portable appliances PAT tested and labelled?" yesNoField="pat_testing_current" commentField="pat_testing_current_comment" yesNoValue={data.pat_testing_current} commentValue={data.pat_testing_current_comment} onYesNoChange={(v) => handleChange('pat_testing_current', v)} onCommentChange={(v) => handleChange('pat_testing_current_comment', v)} />
              <YesNoQuestion label="Are electrical sockets and plugs in safe, working condition?" yesNoField="sockets_plugs_safe" commentField="sockets_plugs_safe_comment" yesNoValue={data.sockets_plugs_safe} commentValue={data.sockets_plugs_safe_comment} onYesNoChange={(v) => handleChange('sockets_plugs_safe', v)} onCommentChange={(v) => handleChange('sockets_plugs_safe_comment', v)} />
              <YesNoQuestion label="Is there a current fixed wiring inspection (every 5 years)?" yesNoField="fixed_wiring_inspection_current" commentField="fixed_wiring_inspection_current_comment" yesNoValue={data.fixed_wiring_inspection_current} commentValue={data.fixed_wiring_inspection_current_comment} onYesNoChange={(v) => handleChange('fixed_wiring_inspection_current', v)} onCommentChange={(v) => handleChange('fixed_wiring_inspection_current_comment', v)} />
              <YesNoQuestion label="Are staff aware of how to report electrical faults?" yesNoField="staff_report_faults_aware" commentField="staff_report_faults_aware_comment" yesNoValue={data.staff_report_faults_aware} commentValue={data.staff_report_faults_aware_comment} onYesNoChange={(v) => handleChange('staff_report_faults_aware', v)} onCommentChange={(v) => handleChange('staff_report_faults_aware_comment', v)} />
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">4. Fire Safety and Emergency Systems</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all fire doors in good working order and not wedged open?" yesNoField="fire_doors_ok" commentField="fire_doors_ok_comment" yesNoValue={data.fire_doors_ok} commentValue={data.fire_doors_ok_comment} onYesNoChange={(v) => handleChange('fire_doors_ok', v)} onCommentChange={(v) => handleChange('fire_doors_ok_comment', v)} />
              <YesNoQuestion label="Are fire extinguishers present, serviced, and located correctly?" yesNoField="extinguishers_serviced" commentField="extinguishers_serviced_comment" yesNoValue={data.extinguishers_serviced} commentValue={data.extinguishers_serviced_comment} onYesNoChange={(v) => handleChange('extinguishers_serviced', v)} onCommentChange={(v) => handleChange('extinguishers_serviced_comment', v)} />
              <YesNoQuestion label="Are emergency lighting systems tested and functional?" yesNoField="emergency_lighting_ok" commentField="emergency_lighting_ok_comment" yesNoValue={data.emergency_lighting_ok} commentValue={data.emergency_lighting_ok_comment} onYesNoChange={(v) => handleChange('emergency_lighting_ok', v)} onCommentChange={(v) => handleChange('emergency_lighting_ok_comment', v)} />
              <YesNoQuestion label="Are weekly fire alarm tests carried out and recorded?" yesNoField="weekly_alarm_tests" commentField="weekly_alarm_tests_comment" yesNoValue={data.weekly_alarm_tests} commentValue={data.weekly_alarm_tests_comment} onYesNoChange={(v) => handleChange('weekly_alarm_tests', v)} onCommentChange={(v) => handleChange('weekly_alarm_tests_comment', v)} />
              <YesNoQuestion label="Are evacuation routes clear and signage in place?" yesNoField="evacuation_routes_clear" commentField="evacuation_routes_clear_comment" yesNoValue={data.evacuation_routes_clear} commentValue={data.evacuation_routes_clear_comment} onYesNoChange={(v) => handleChange('evacuation_routes_clear', v)} onCommentChange={(v) => handleChange('evacuation_routes_clear_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">5. Lifts and Hoists</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are passenger lifts serviced and inspected in line with LOLER regulations?" yesNoField="lifts_serviced_loler" commentField="lifts_serviced_loler_comment" yesNoValue={data.lifts_serviced_loler} commentValue={data.lifts_serviced_loler_comment} onYesNoChange={(v) => handleChange('lifts_serviced_loler', v)} onCommentChange={(v) => handleChange('lifts_serviced_loler_comment', v)} />
              <YesNoQuestion label="Are ceiling track hoists and mobile hoists maintained and logged?" yesNoField="hoists_serviced_logged" commentField="hoists_serviced_logged_comment" yesNoValue={data.hoists_serviced_logged} commentValue={data.hoists_serviced_logged_comment} onYesNoChange={(v) => handleChange('hoists_serviced_logged', v)} onCommentChange={(v) => handleChange('hoists_serviced_logged_comment', v)} />
              <YesNoQuestion label="Are slings and lifting equipment checked for wear and tear?" yesNoField="slings_checked" commentField="slings_checked_comment" yesNoValue={data.slings_checked} commentValue={data.slings_checked_comment} onYesNoChange={(v) => handleChange('slings_checked', v)} onCommentChange={(v) => handleChange('slings_checked_comment', v)} />
              <YesNoQuestion label="Are maintenance records for all lifting equipment up to date?" yesNoField="lifting_records_up_to_date" commentField="lifting_records_up_to_date_comment" yesNoValue={data.lifting_records_up_to_date} commentValue={data.lifting_records_up_to_date_comment} onYesNoChange={(v) => handleChange('lifting_records_up_to_date', v)} onCommentChange={(v) => handleChange('lifting_records_up_to_date_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">6. Garden and Outdoor Areas</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are paths, walkways, and ramps clear, well-lit, and in safe condition?" yesNoField="paths_walkways_safe" commentField="paths_walkways_safe_comment" yesNoValue={data.paths_walkways_safe} commentValue={data.paths_walkways_safe_comment} onYesNoChange={(v) => handleChange('paths_walkways_safe', v)} onCommentChange={(v) => handleChange('paths_walkways_safe_comment', v)} />
              <YesNoQuestion label="Are handrails and fences secure and stable?" yesNoField="handrails_fences_secure" commentField="handrails_fences_secure_comment" yesNoValue={data.handrails_fences_secure} commentValue={data.handrails_fences_secure_comment} onYesNoChange={(v) => handleChange('handrails_fences_secure', v)} onCommentChange={(v) => handleChange('handrails_fences_secure_comment', v)} />
              <YesNoQuestion label="Is the garden area tidy and free from hazardous equipment or waste?" yesNoField="garden_tidy_hazard_free" commentField="garden_tidy_hazard_free_comment" yesNoValue={data.garden_tidy_hazard_free} commentValue={data.garden_tidy_hazard_free_comment} onYesNoChange={(v) => handleChange('garden_tidy_hazard_free', v)} onCommentChange={(v) => handleChange('garden_tidy_hazard_free_comment', v)} />
              <YesNoQuestion label="Are external bins stored securely and away from access points?" yesNoField="external_bins_stored_secure" commentField="external_bins_stored_secure_comment" yesNoValue={data.external_bins_stored_secure} commentValue={data.external_bins_stored_secure_comment} onYesNoChange={(v) => handleChange('external_bins_stored_secure', v)} onCommentChange={(v) => handleChange('external_bins_stored_secure_comment', v)} />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-3">7. Housekeeping and Equipment</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are cleaning machines (vacuum, floor cleaners) in good working order?" yesNoField="cleaning_machines_ok" commentField="cleaning_machines_ok_comment" yesNoValue={data.cleaning_machines_ok} commentValue={data.cleaning_machines_ok_comment} onYesNoChange={(v) => handleChange('cleaning_machines_ok', v)} onCommentChange={(v) => handleChange('cleaning_machines_ok_comment', v)} />
              <YesNoQuestion label="Are domestic trolleys and bins clean and stored correctly?" yesNoField="domestic_trolleys_bins_ok" commentField="domestic_trolleys_bins_ok_comment" yesNoValue={data.domestic_trolleys_bins_ok} commentValue={data.domestic_trolleys_bins_ok_comment} onYesNoChange={(v) => handleChange('domestic_trolleys_bins_ok', v)} onCommentChange={(v) => handleChange('domestic_trolleys_bins_ok_comment', v)} />
              <YesNoQuestion label="Are laundry machines serviced and maintained regularly?" yesNoField="laundry_machines_serviced" commentField="laundry_machines_serviced_comment" yesNoValue={data.laundry_machines_serviced} commentValue={data.laundry_machines_serviced_comment} onYesNoChange={(v) => handleChange('laundry_machines_serviced', v)} onCommentChange={(v) => handleChange('laundry_machines_serviced_comment', v)} />
              <YesNoQuestion label="Is furniture in good condition and free from damage?" yesNoField="furniture_good_condition" commentField="furniture_good_condition_comment" yesNoValue={data.furniture_good_condition} commentValue={data.furniture_good_condition_comment} onYesNoChange={(v) => handleChange('furniture_good_condition', v)} onCommentChange={(v) => handleChange('furniture_good_condition_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">8. Toilets and Bathrooms</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all toilets, sinks, and baths in good working condition?" yesNoField="toilets_sinks_baths_ok" commentField="toilets_sinks_baths_ok_comment" yesNoValue={data.toilets_sinks_baths_ok} commentValue={data.toilets_sinks_baths_ok_comment} onYesNoChange={(v) => handleChange('toilets_sinks_baths_ok', v)} onCommentChange={(v) => handleChange('toilets_sinks_baths_ok_comment', v)} />
              <YesNoQuestion label="Are grab rails and support bars secure and rust-free?" yesNoField="grabrails_secure" commentField="grabrails_secure_comment" yesNoValue={data.grabrails_secure} commentValue={data.grabrails_secure_comment} onYesNoChange={(v) => handleChange('grabrails_secure', v)} onCommentChange={(v) => handleChange('grabrails_secure_comment', v)} />
              <YesNoQuestion label="Are waste bins, toilet seats, and dispensers working and hygienic?" yesNoField="waste_bins_seats_dispensers_ok" commentField="waste_bins_seats_dispensers_ok_comment" yesNoValue={data.waste_bins_seats_dispensers_ok} commentValue={data.waste_bins_seats_dispensers_ok_comment} onYesNoChange={(v) => handleChange('waste_bins_seats_dispensers_ok', v)} onCommentChange={(v) => handleChange('waste_bins_seats_dispensers_ok_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">9. Storage and Hazardous Materials</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all storage areas neat, accessible, and well organised?" yesNoField="storage_areas_neat" commentField="storage_areas_neat_comment" yesNoValue={data.storage_areas_neat} commentValue={data.storage_areas_neat_comment} onYesNoChange={(v) => handleChange('storage_areas_neat', v)} onCommentChange={(v) => handleChange('storage_areas_neat_comment', v)} />
              <YesNoQuestion label="Are COSHH items stored securely and labelled properly?" yesNoField="coshh_items_stored_secure" commentField="coshh_items_stored_secure_comment" yesNoValue={data.coshh_items_stored_secure} commentValue={data.coshh_items_stored_secure_comment} onYesNoChange={(v) => handleChange('coshh_items_stored_secure', v)} onCommentChange={(v) => handleChange('coshh_items_stored_secure_comment', v)} />
              <YesNoQuestion label="Are maintenance tools and ladders stored safely and used appropriately?" yesNoField="tools_ladders_stored_safe" commentField="tools_ladders_stored_safe_comment" yesNoValue={data.tools_ladders_stored_safe} commentValue={data.tools_ladders_stored_safe_comment} onYesNoChange={(v) => handleChange('tools_ladders_stored_safe', v)} onCommentChange={(v) => handleChange('tools_ladders_stored_safe_comment', v)} />
            </div>
          </div>

          <div className="bg-sky-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-sky-900 mb-3">10. Reporting and Record-Keeping</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all maintenance issues reported via a clear process?" yesNoField="issues_reported_process" commentField="issues_reported_process_comment" yesNoValue={data.issues_reported_process} commentValue={data.issues_reported_process_comment} onYesNoChange={(v) => handleChange('issues_reported_process', v)} onCommentChange={(v) => handleChange('issues_reported_process_comment', v)} />
              <YesNoQuestion label="Are repair logs maintained and up to date?" yesNoField="repair_logs_maintained" commentField="repair_logs_maintained_comment" yesNoValue={data.repair_logs_maintained} commentValue={data.repair_logs_maintained_comment} onYesNoChange={(v) => handleChange('repair_logs_maintained', v)} onCommentChange={(v) => handleChange('repair_logs_maintained_comment', v)} />
              <YesNoQuestion label="Are outstanding repairs tracked with priority levels?" yesNoField="outstanding_repairs_tracked" commentField="outstanding_repairs_tracked_comment" yesNoValue={data.outstanding_repairs_tracked} commentValue={data.outstanding_repairs_tracked_comment} onYesNoChange={(v) => handleChange('outstanding_repairs_tracked', v)} onCommentChange={(v) => handleChange('outstanding_repairs_tracked_comment', v)} />
              <YesNoQuestion label="Is there a record of scheduled servicing (e.g. boilers, alarms, equipment)?" yesNoField="scheduled_servicing_record" commentField="scheduled_servicing_record_comment" yesNoValue={data.scheduled_servicing_record} commentValue={data.scheduled_servicing_record_comment} onYesNoChange={(v) => handleChange('scheduled_servicing_record', v)} onCommentChange={(v) => handleChange('scheduled_servicing_record_comment', v)} />
              <YesNoQuestion label="Are contractors appropriately qualified and records retained?" yesNoField="contractors_qualified_records" commentField="contractors_qualified_records_comment" yesNoValue={data.contractors_qualified_records} commentValue={data.contractors_qualified_records_comment} onYesNoChange={(v) => handleChange('contractors_qualified_records', v)} onCommentChange={(v) => handleChange('contractors_qualified_records_comment', v)} />
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button onClick={handleComplete} className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">Complete Audit</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Completed</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan based on this audit?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => handleModalCreate(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800" disabled={saving}>{saving ? 'Saving...' : 'No, thanks'}</button>
              <button onClick={() => handleModalCreate(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" disabled={saving}>{saving ? 'Saving...' : 'Create Action Plan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
