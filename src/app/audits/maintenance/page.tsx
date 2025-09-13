'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<boolean[]>(Array(10).fill(false));

  const toggleSection = (index: number) => {
    setOpenSections(prev => prev.map((open, i) => i === index ? !open : open));
  };

  // Section definitions with guidance text
  const sections = [
    {
      title: "1. General Building Condition",
      guidance: "Assess the overall structural integrity and maintenance of the building, including walls, ceilings, floors, lighting, doors, and general room condition.",
      questions: [
        { label: "Are internal walls, ceilings, and floors in good condition and free from damage?", yesNoField: "internal_walls_ceiling_floor_ok", commentField: "internal_walls_ceiling_floor_ok_comment" },
        { label: "Are external walls, roofs, gutters, and windows in good repair?", yesNoField: "external_walls_roof_windows_ok", commentField: "external_walls_roof_windows_ok_comment" },
        { label: "Are lighting fixtures working and adequate in all areas (indoor and outdoor)?", yesNoField: "lighting_fixtures_ok", commentField: "lighting_fixtures_ok_comment" },
        { label: "Are doors, locks, and handles functioning properly throughout the home?", yesNoField: "doors_locks_handles_ok", commentField: "doors_locks_handles_ok_comment" },
        { label: "Are all resident bedrooms, bathrooms, and communal areas well maintained?", yesNoField: "rooms_well_maintained", commentField: "rooms_well_maintained_comment" }
      ]
    },
    {
      title: "2. Heating, Ventilation and Water Systems",
      guidance: "Check heating systems, ventilation, water temperatures, and flushing procedures to ensure safe and efficient operation.",
      questions: [
        { label: "Are all radiators and heating systems working effectively?", yesNoField: "radiators_heating_ok", commentField: "radiators_heating_ok_comment" },
        { label: "Are thermostats and heating controls functioning correctly?", yesNoField: "thermostats_controls_ok", commentField: "thermostats_controls_ok_comment" },
        { label: "Are extractor fans and ventilation systems clean and operational?", yesNoField: "extractor_ventilation_ok", commentField: "extractor_ventilation_ok_comment" },
        { label: "Are hot and cold water temperatures within safe limits (legionella control)?", yesNoField: "water_temps_safe", commentField: "water_temps_safe_comment" },
        { label: "Are water outlets flushed regularly and recorded (for infrequently used taps/showers)?", yesNoField: "water_outlets_flushed_recorded", commentField: "water_outlets_flushed_recorded_comment" }
      ]
    },
    {
      title: "3. Electrical Safety",
      guidance: "Verify electrical safety measures including PAT testing, socket condition, wiring inspections, and staff awareness of electrical faults.",
      questions: [
        { label: "Are all portable appliances PAT tested and labelled?", yesNoField: "pat_testing_current", commentField: "pat_testing_current_comment" },
        { label: "Are electrical sockets and plugs in safe, working condition?", yesNoField: "sockets_plugs_safe", commentField: "sockets_plugs_safe_comment" },
        { label: "Is there a current fixed wiring inspection (every 5 years)?", yesNoField: "fixed_wiring_inspection_current", commentField: "fixed_wiring_inspection_current_comment" },
        { label: "Are staff aware of how to report electrical faults?", yesNoField: "staff_report_faults_aware", commentField: "staff_report_faults_aware_comment" }
      ]
    },
    {
      title: "4. Fire Safety and Emergency Systems",
      guidance: "Inspect fire safety equipment, emergency lighting, alarm systems, and evacuation procedures to ensure comprehensive fire protection.",
      questions: [
        { label: "Are all fire doors in good working order and not wedged open?", yesNoField: "fire_doors_ok", commentField: "fire_doors_ok_comment" },
        { label: "Are fire extinguishers present, serviced, and located correctly?", yesNoField: "extinguishers_serviced", commentField: "extinguishers_serviced_comment" },
        { label: "Are emergency lighting systems tested and functional?", yesNoField: "emergency_lighting_ok", commentField: "emergency_lighting_ok_comment" },
        { label: "Are weekly fire alarm tests carried out and recorded?", yesNoField: "weekly_alarm_tests", commentField: "weekly_alarm_tests_comment" },
        { label: "Are evacuation routes clear and signage in place?", yesNoField: "evacuation_routes_clear", commentField: "evacuation_routes_clear_comment" }
      ]
    },
    {
      title: "5. Lifts and Hoists",
      guidance: "Check the maintenance and safety of lifts, ceiling track hoists, mobile hoists, and all lifting equipment according to LOLER regulations.",
      questions: [
        { label: "Are passenger lifts serviced and inspected in line with LOLER regulations?", yesNoField: "lifts_serviced_loler", commentField: "lifts_serviced_loler_comment" },
        { label: "Are ceiling track hoists and mobile hoists maintained and logged?", yesNoField: "hoists_serviced_logged", commentField: "hoists_serviced_logged_comment" },
        { label: "Are slings and lifting equipment checked for wear and tear?", yesNoField: "slings_checked", commentField: "slings_checked_comment" },
        { label: "Are maintenance records for all lifting equipment up to date?", yesNoField: "lifting_records_up_to_date", commentField: "lifting_records_up_to_date_comment" }
      ]
    },
    {
      title: "6. Garden and Outdoor Areas",
      guidance: "Assess outdoor spaces for safety, maintenance, and security including paths, handrails, garden areas, and waste storage.",
      questions: [
        { label: "Are paths, walkways, and ramps clear, well-lit, and in safe condition?", yesNoField: "paths_walkways_safe", commentField: "paths_walkways_safe_comment" },
        { label: "Are handrails and fences secure and stable?", yesNoField: "handrails_fences_secure", commentField: "handrails_fences_secure_comment" },
        { label: "Is the garden area tidy and free from hazardous equipment or waste?", yesNoField: "garden_tidy_hazard_free", commentField: "garden_tidy_hazard_free_comment" },
        { label: "Are external bins stored securely and away from access points?", yesNoField: "external_bins_stored_secure", commentField: "external_bins_stored_secure_comment" }
      ]
    },
    {
      title: "7. Housekeeping and Equipment",
      guidance: "Verify the condition and maintenance of cleaning equipment, domestic supplies, laundry facilities, and furniture.",
      questions: [
        { label: "Are cleaning machines (vacuum, floor cleaners) in good working order?", yesNoField: "cleaning_machines_ok", commentField: "cleaning_machines_ok_comment" },
        { label: "Are domestic trolleys and bins clean and stored correctly?", yesNoField: "domestic_trolleys_bins_ok", commentField: "domestic_trolleys_bins_ok_comment" },
        { label: "Are laundry machines serviced and maintained regularly?", yesNoField: "laundry_machines_serviced", commentField: "laundry_machines_serviced_comment" },
        { label: "Is furniture in good condition and free from damage?", yesNoField: "furniture_good_condition", commentField: "furniture_good_condition_comment" }
      ]
    },
    {
      title: "8. Toilets and Bathrooms",
      guidance: "Check the condition and functionality of all toilet and bathroom facilities, including fixtures, grab rails, and hygiene equipment.",
      questions: [
        { label: "Are all toilets, sinks, and baths in good working condition?", yesNoField: "toilets_sinks_baths_ok", commentField: "toilets_sinks_baths_ok_comment" },
        { label: "Are grab rails and support bars secure and rust-free?", yesNoField: "grabrails_secure", commentField: "grabrails_secure_comment" },
        { label: "Are waste bins, toilet seats, and dispensers working and hygienic?", yesNoField: "waste_bins_seats_dispensers_ok", commentField: "waste_bins_seats_dispensers_ok_comment" }
      ]
    },
    {
      title: "9. Storage and Hazardous Materials",
      guidance: "Assess storage areas for organization, security of hazardous materials, and safe storage of maintenance tools and equipment.",
      questions: [
        { label: "Are all storage areas neat, accessible, and well organised?", yesNoField: "storage_areas_neat", commentField: "storage_areas_neat_comment" },
        { label: "Are COSHH items stored securely and labelled properly?", yesNoField: "coshh_items_stored_secure", commentField: "coshh_items_stored_secure_comment" },
        { label: "Are maintenance tools and ladders stored safely and used appropriately?", yesNoField: "tools_ladders_stored_safe", commentField: "tools_ladders_stored_safe_comment" }
      ]
    },
    {
      title: "10. Reporting and Record-Keeping",
      guidance: "Review maintenance reporting processes, repair logs, outstanding work tracking, scheduled servicing, and contractor qualifications.",
      questions: [
        { label: "Are all maintenance issues reported via a clear process?", yesNoField: "issues_reported_process", commentField: "issues_reported_process_comment" },
        { label: "Are repair logs maintained and up to date?", yesNoField: "repair_logs_maintained", commentField: "repair_logs_maintained_comment" },
        { label: "Are outstanding repairs tracked with priority levels?", yesNoField: "outstanding_repairs_tracked", commentField: "outstanding_repairs_tracked_comment" },
        { label: "Is there a record of scheduled servicing (e.g. boilers, alarms, equipment)?", yesNoField: "scheduled_servicing_record", commentField: "scheduled_servicing_record_comment" },
        { label: "Are contractors appropriately qualified and records retained?", yesNoField: "contractors_qualified_records", commentField: "contractors_qualified_records_comment" }
      ]
    }
  ];

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

  // Helper functions
  const getFieldErrorStyle = (fieldName: string) => {
    return errors.includes(fieldName) ? 'border-red-500 bg-red-50' : 'border-gray-300';
  };

  const handleInputChange = (field: keyof MaintenanceAuditData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) {
      setErrors(prev => prev.filter(e => e !== field));
    }
  };

  const activeWorkspace = useWorkspace();
  const { user: authUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);

  const handleChange = (field: keyof MaintenanceAuditData, value: string) => {
    handleInputChange(field, value);
  };

  const YesNoQuestion = ({ label, yesNoField, commentField, yesNoValue, commentValue, onYesNoChange, onCommentChange }: { label: string; yesNoField: string; commentField: string; yesNoValue: string; commentValue: string; onYesNoChange: (v: string) => void; onCommentChange: (v: string) => void; }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
          <div className="flex gap-4" data-field={yesNoField}>
            <label className="flex items-center">
              <input
                type="radio"
                name={yesNoField}
                value="Yes"
                checked={yesNoValue === 'Yes'}
                onChange={(e) => onYesNoChange(e.target.value)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={yesNoField}
                value="No"
                checked={yesNoValue === 'No'}
                onChange={(e) => onYesNoChange(e.target.value)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
          {errors.includes(yesNoField) && (
            <p className="text-red-600 text-sm font-medium">This field is required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <Textarea
            value={commentValue}
            onChange={(e) => onCommentChange(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50"
            rows={2}
            placeholder="Add any comments or observations..."
          />
        </div>
      </div>
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
    <div className="max-w-7xl mx-auto p-10 bg-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Maintenance Audit</h1>
          <p className="mb-4 text-slate-500">Comprehensive assessment of building maintenance, safety systems, and equipment. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
              <Input
                value={data.home}
                onChange={(e) => handleInputChange('home', e.target.value)}
                className={getFieldErrorStyle('home')}
                placeholder="Enter home name"
              />
              {errors.includes('home') && (
                <p className="text-red-600 text-sm font-medium mt-1">This field is required</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <Input
                type="date"
                value={data.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={getFieldErrorStyle('date')}
              />
              {errors.includes('date') && (
                <p className="text-red-600 text-sm font-medium mt-1">This field is required</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Person Completing the Audit</label>
              <Input
                value={data.personCompletingAudit}
                onChange={(e) => handleInputChange('personCompletingAudit', e.target.value)}
                className={getFieldErrorStyle('personCompletingAudit')}
                placeholder="Enter auditor name"
              />
              {errors.includes('personCompletingAudit') && (
                <p className="text-red-600 text-sm font-medium mt-1">This field is required</p>
              )}
            </div>
          </div>
        </div>

        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="space-y-4">
              {/* Collapsible Sections */}
              {sections.map((section, index) => (
                <div key={index} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleSection(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    </div>
                    {openSections[index] ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  {openSections[index] && (
                    <div className="px-6 pb-6">
                      <p className="text-slate-600 mb-6 text-sm leading-relaxed">{section.guidance}</p>
                      <div className="space-y-4">
                        {section.questions.map((question, qIndex) => (
                          <YesNoQuestion
                            key={qIndex}
                            label={question.label}
                            yesNoField={question.yesNoField}
                            commentField={question.commentField}
                            yesNoValue={data[question.yesNoField as keyof MaintenanceAuditData]}
                            commentValue={data[question.commentField as keyof MaintenanceAuditData]}
                            onYesNoChange={(v) => handleChange(question.yesNoField as keyof MaintenanceAuditData, v)}
                            onCommentChange={(v) => handleChange(question.commentField as keyof MaintenanceAuditData, v)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Complete Audit Button */}
              <Button
                type="button"
                onClick={handleComplete}
                className="w-full h-14 text-lg font-bold mt-6 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Complete Audit"}
              </Button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Audit Complete</h3>
              <p className="text-gray-600 mb-6">Would you like to create an action plan for this audit?</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleModalCreate(false)}
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
                  {saving ? 'Saving...' : 'Save and Create Action Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
