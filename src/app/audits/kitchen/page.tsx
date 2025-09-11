"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';

interface KitchenAuditData {
  home: string;
  date: string;
  personCompletingAudit: string;

  // 1 General Cleanliness
  surfaces_clean: string;
  surfaces_clean_comment: string;
  flooring_safe: string;
  flooring_safe_comment: string;
  walls_ceiling_good: string;
  walls_ceiling_good_comment: string;
  sinks_designated: string;
  sinks_designated_comment: string;
  bins_clean: string;
  bins_clean_comment: string;

  // 2 Food Storage and Labelling
  fridges_clean_temp: string;
  fridges_clean_temp_comment: string;
  temps_monitored_recorded: string;
  temps_monitored_recorded_comment: string;
  dry_goods_stored: string;
  dry_goods_stored_comment: string;
  opened_items_dated: string;
  opened_items_dated_comment: string;
  raw_stored_separately: string;
  raw_stored_separately_comment: string;

  // 3 Equipment and Utensils
  equipment_clean_working: string;
  equipment_clean_working_comment: string;
  chopping_boards_coloured: string;
  chopping_boards_coloured_comment: string;
  knives_utensils_safe: string;
  knives_utensils_safe_comment: string;
  small_appliances_clean: string;
  small_appliances_clean_comment: string;
  dishwasher_effective: string;
  dishwasher_effective_comment: string;

  // 4 Personal Hygiene
  handwashing_sinks: string;
  handwashing_sinks_comment: string;
  staff_hand_hygiene_observed: string;
  staff_hand_hygiene_observed_comment: string;
  ppe_worn_where_appropriate: string;
  ppe_worn_where_appropriate_comment: string;
  ppe_changed_between_tasks: string;
  ppe_changed_between_tasks_comment: string;
  posters_displayed_food: string;
  posters_displayed_food_comment: string;

  // 5 Kitchenette Safety
  kitchenettes_clean_hazard_free: string;
  kitchenettes_clean_hazard_free_comment: string;
  kitchenette_food_stored_safe: string;
  kitchenette_food_stored_safe_comment: string;
  cleaning_products_stored: string;
  cleaning_products_stored_comment: string;
  appliances_pat: string;
  appliances_pat_comment: string;
  resident_use_risk_assessed: string;
  resident_use_risk_assessed_comment: string;

  // 6 Pest Control
  signs_of_pests: string;
  signs_of_pests_comment: string;
  doors_windows_sealed: string;
  doors_windows_sealed_comment: string;
  pest_contract_in_place: string;
  pest_contract_in_place_comment: string;
  pest_proof_storage: string;
  pest_proof_storage_comment: string;

  // 7 Allergens and Dietary Needs
  allergens_info_displayed: string;
  allergens_info_displayed_comment: string;
  special_diets_separated: string;
  special_diets_separated_comment: string;
  cross_contamination_avoided: string;
  cross_contamination_avoided_comment: string;

  // 8 Documentation & Records
  cleaning_schedules_signed: string;
  cleaning_schedules_signed_comment: string;
  temp_logs_maintained: string;
  temp_logs_maintained_comment: string;
  deliveries_stock_rotation: string;
  deliveries_stock_rotation_comment: string;
  staff_food_training: string;
  staff_food_training_comment: string;

  // 9 Waste Management
  food_waste_bins: string;
  food_waste_bins_comment: string;
  clinical_waste_separate: string;
  clinical_waste_separate_comment: string;
  recycling_managed: string;
  recycling_managed_comment: string;

  // 10 Compliance & Risk
  last_eho_actions_completed: string;
  last_eho_actions_completed_comment: string;
  food_hygiene_rating_displayed: string;
  food_hygiene_rating_displayed_comment: string;
  staff_food_safety_trained: string;
  staff_food_safety_trained_comment: string;
  cleaning_risk_assessment: string;
  cleaning_risk_assessment_comment: string;
  coshh_sheets_available: string;
  coshh_sheets_available_comment: string;
}

export default function KitchenAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');

  const [data, setData] = useState<KitchenAuditData>({
    home: '',
    date: '',
    personCompletingAudit: '',

    surfaces_clean: '',
    surfaces_clean_comment: '',
    flooring_safe: '',
    flooring_safe_comment: '',
    walls_ceiling_good: '',
    walls_ceiling_good_comment: '',
    sinks_designated: '',
    sinks_designated_comment: '',
    bins_clean: '',
    bins_clean_comment: '',

    fridges_clean_temp: '',
    fridges_clean_temp_comment: '',
    temps_monitored_recorded: '',
    temps_monitored_recorded_comment: '',
    dry_goods_stored: '',
    dry_goods_stored_comment: '',
    opened_items_dated: '',
    opened_items_dated_comment: '',
    raw_stored_separately: '',
    raw_stored_separately_comment: '',

    equipment_clean_working: '',
    equipment_clean_working_comment: '',
    chopping_boards_coloured: '',
    chopping_boards_coloured_comment: '',
    knives_utensils_safe: '',
    knives_utensils_safe_comment: '',
    small_appliances_clean: '',
    small_appliances_clean_comment: '',
    dishwasher_effective: '',
    dishwasher_effective_comment: '',

    handwashing_sinks: '',
    handwashing_sinks_comment: '',
    staff_hand_hygiene_observed: '',
    staff_hand_hygiene_observed_comment: '',
    ppe_worn_where_appropriate: '',
    ppe_worn_where_appropriate_comment: '',
    ppe_changed_between_tasks: '',
    ppe_changed_between_tasks_comment: '',
    posters_displayed_food: '',
    posters_displayed_food_comment: '',

    kitchenettes_clean_hazard_free: '',
    kitchenettes_clean_hazard_free_comment: '',
    kitchenette_food_stored_safe: '',
    kitchenette_food_stored_safe_comment: '',
    cleaning_products_stored: '',
    cleaning_products_stored_comment: '',
    appliances_pat: '',
    appliances_pat_comment: '',
    resident_use_risk_assessed: '',
    resident_use_risk_assessed_comment: '',

    signs_of_pests: '',
    signs_of_pests_comment: '',
    doors_windows_sealed: '',
    doors_windows_sealed_comment: '',
    pest_contract_in_place: '',
    pest_contract_in_place_comment: '',
    pest_proof_storage: '',
    pest_proof_storage_comment: '',

    allergens_info_displayed: '',
    allergens_info_displayed_comment: '',
    special_diets_separated: '',
    special_diets_separated_comment: '',
    cross_contamination_avoided: '',
    cross_contamination_avoided_comment: '',

    cleaning_schedules_signed: '',
    cleaning_schedules_signed_comment: '',
    temp_logs_maintained: '',
    temp_logs_maintained_comment: '',
    deliveries_stock_rotation: '',
    deliveries_stock_rotation_comment: '',
    staff_food_training: '',
    staff_food_training_comment: '',

    food_waste_bins: '',
    food_waste_bins_comment: '',
    clinical_waste_separate: '',
    clinical_waste_separate_comment: '',
    recycling_managed: '',
    recycling_managed_comment: '',

    last_eho_actions_completed: '',
    last_eho_actions_completed_comment: '',
    food_hygiene_rating_displayed: '',
    food_hygiene_rating_displayed_comment: '',
    staff_food_safety_trained: '',
    staff_food_safety_trained_comment: '',
    cleaning_risk_assessment: '',
    cleaning_risk_assessment_comment: '',
    coshh_sheets_available: '',
    coshh_sheets_available_comment: '',
  });

  const activeWorkspace = useWorkspace();

  // Load existing audit data when component mounts
  useEffect(() => {
    const loadExistingAuditData = async () => {
      if (!activeWorkspace?.id) return;
      
      try {
        const existingData = await getLatestAuditData(activeWorkspace.id, 'kitchen');
        if (existingData) {
          // Remove metadata fields and populate form
          const { id, createdAt, ...formData } = existingData;
          setData(prevData => ({
            ...prevData,
            ...formData
          }));
          
          // Load final comments if available
          if (existingData.comments) {
            setFinalComments(existingData.comments);
          }
        }
      } catch (error) {
        console.warn('Failed to load existing audit data:', error);
      }
    };

    loadExistingAuditData();
  }, [activeWorkspace?.id]);

  const handleChange = (field: keyof KitchenAuditData, value: string) => {
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
      {/* per-question comment fields intentionally hidden in the UI; kept in data model for compatibility */}
    </div>
  );

  const validateForm = () => {
    const required: (keyof KitchenAuditData)[] = [
      'home','date','personCompletingAudit',
      'surfaces_clean','flooring_safe','walls_ceiling_good','sinks_designated','bins_clean',
      'fridges_clean_temp','temps_monitored_recorded','dry_goods_stored','opened_items_dated','raw_stored_separately',
      'equipment_clean_working','chopping_boards_coloured','knives_utensils_safe','small_appliances_clean','dishwasher_effective',
      'handwashing_sinks','staff_hand_hygiene_observed','ppe_worn_where_appropriate','ppe_changed_between_tasks','posters_displayed_food',
      'kitchenettes_clean_hazard_free','kitchenette_food_stored_safe','cleaning_products_stored','appliances_pat','resident_use_risk_assessed',
      'signs_of_pests','doors_windows_sealed','pest_contract_in_place','pest_proof_storage',
      'allergens_info_displayed','special_diets_separated','cross_contamination_avoided',
      'cleaning_schedules_signed','temp_logs_maintained','deliveries_stock_rotation','staff_food_training',
      'food_waste_bins','clinical_waste_separate','recycling_managed',
      'last_eho_actions_completed','food_hygiene_rating_displayed','staff_food_safety_trained','cleaning_risk_assessment','coshh_sheets_available'
    ];

    const missing = required.filter(f => !data[f].trim());
    setErrors(missing as string[]);
    if (missing.length > 0) {
      const el = document.querySelector(`[data-field="${missing[0]}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return missing.length === 0;
  };

  const handleModalCreate = async (createActionPlan: boolean) => {
    if (!validateForm()) return;
    if (!activeWorkspace?.id) {
      alert('No active workspace. Please select a workspace before saving.');
      return;
    }

    setSaving(true);
    try {
      // Compute yes/no score
      const YES_NO_FIELDS = [
        'surfaces_clean','flooring_safe','walls_ceiling_good','sinks_designated','bins_clean',
        'fridges_clean_temp','temps_monitored_recorded','dry_goods_stored','opened_items_dated','raw_stored_separately',
        'equipment_clean_working','chopping_boards_coloured','knives_utensils_safe','small_appliances_clean','dishwasher_effective',
        'handwashing_sinks','staff_hand_hygiene_observed','ppe_worn_where_appropriate','ppe_changed_between_tasks','posters_displayed_food',
        'kitchenettes_clean_hazard_free','kitchenette_food_stored_safe','cleaning_products_stored','appliances_pat','resident_use_risk_assessed',
        'signs_of_pests','doors_windows_sealed','pest_contract_in_place','pest_proof_storage',
        'allergens_info_displayed','special_diets_separated','cross_contamination_avoided',
        'cleaning_schedules_signed','temp_logs_maintained','deliveries_stock_rotation','staff_food_training',
        'food_waste_bins','clinical_waste_separate','recycling_managed',
        'last_eho_actions_completed','food_hygiene_rating_displayed','staff_food_safety_trained','cleaning_risk_assessment','coshh_sheets_available'
      ] as (keyof KitchenAuditData)[];

      const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + (data[f] === 'Yes' ? 1 : 0), 0);
      const totalCount = YES_NO_FIELDS.length;
      const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 0;

      const payload = {
        ...data,
        comments: finalComments,
        createActionPlan,
        createdBy: user?.id ?? null,
        // Audit summary fields mirrored for fast dashboard read
        auditType: 'kitchen',
        yesCount,
        totalCount,
        scorePercent,
      };

      const id = await saveAudit(payload, activeWorkspace.id);
      const completedAt = data.date || new Date().toISOString();
      const result = await markAuditCompletedWithSnapshot(activeWorkspace.id, 'kitchen', payload, completedAt);
      setShowModal(false);
      alert('Audit saved');
    } catch (err) {
      console.error('Failed to save audit', err);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const addNewReport = () => {
    setData({
      home: '',
      date: '',
      personCompletingAudit: '',

      surfaces_clean: '',
      surfaces_clean_comment: '',
      flooring_safe: '',
      flooring_safe_comment: '',
      walls_ceiling_good: '',
      walls_ceiling_good_comment: '',
      sinks_designated: '',
      sinks_designated_comment: '',
      bins_clean: '',
      bins_clean_comment: '',

      fridges_clean_temp: '',
      fridges_clean_temp_comment: '',
      temps_monitored_recorded: '',
      temps_monitored_recorded_comment: '',
      dry_goods_stored: '',
      dry_goods_stored_comment: '',
      opened_items_dated: '',
      opened_items_dated_comment: '',
      raw_stored_separately: '',
      raw_stored_separately_comment: '',

      equipment_clean_working: '',
      equipment_clean_working_comment: '',
      chopping_boards_coloured: '',
      chopping_boards_coloured_comment: '',
      knives_utensils_safe: '',
      knives_utensils_safe_comment: '',
      small_appliances_clean: '',
      small_appliances_clean_comment: '',
      dishwasher_effective: '',
      dishwasher_effective_comment: '',

      handwashing_sinks: '',
      handwashing_sinks_comment: '',
      staff_hand_hygiene_observed: '',
      staff_hand_hygiene_observed_comment: '',
      ppe_worn_where_appropriate: '',
      ppe_worn_where_appropriate_comment: '',
      ppe_changed_between_tasks: '',
      ppe_changed_between_tasks_comment: '',
      posters_displayed_food: '',
      posters_displayed_food_comment: '',

      kitchenettes_clean_hazard_free: '',
      kitchenettes_clean_hazard_free_comment: '',
      kitchenette_food_stored_safe: '',
      kitchenette_food_stored_safe_comment: '',
      cleaning_products_stored: '',
      cleaning_products_stored_comment: '',
      appliances_pat: '',
      appliances_pat_comment: '',
      resident_use_risk_assessed: '',
      resident_use_risk_assessed_comment: '',

      signs_of_pests: '',
      signs_of_pests_comment: '',
      doors_windows_sealed: '',
      doors_windows_sealed_comment: '',
      pest_contract_in_place: '',
      pest_contract_in_place_comment: '',
      pest_proof_storage: '',
      pest_proof_storage_comment: '',

      allergens_info_displayed: '',
      allergens_info_displayed_comment: '',
      special_diets_separated: '',
      special_diets_separated_comment: '',
      cross_contamination_avoided: '',
      cross_contamination_avoided_comment: '',

      cleaning_schedules_signed: '',
      cleaning_schedules_signed_comment: '',
      temp_logs_maintained: '',
      temp_logs_maintained_comment: '',
      deliveries_stock_rotation: '',
      deliveries_stock_rotation_comment: '',
      staff_food_training: '',
      staff_food_training_comment: '',

      food_waste_bins: '',
      food_waste_bins_comment: '',
      clinical_waste_separate: '',
      clinical_waste_separate_comment: '',
      recycling_managed: '',
      recycling_managed_comment: '',

      last_eho_actions_completed: '',
      last_eho_actions_completed_comment: '',
      food_hygiene_rating_displayed: '',
      food_hygiene_rating_displayed_comment: '',
      staff_food_safety_trained: '',
      staff_food_safety_trained_comment: '',
      cleaning_risk_assessment: '',
      cleaning_risk_assessment_comment: '',
      coshh_sheets_available: '',
      coshh_sheets_available_comment: '',
    });

    setErrors([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Kitchen & Kitchenettes Audit</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentReport(Math.max(1, currentReport - 1))} className="p-1 hover:bg-gray-100 rounded" disabled={currentReport === 1}>←</button>
              <span className="text-sm text-gray-600">Report {currentReport} of {totalReports}</span>
              <button onClick={() => setCurrentReport(Math.min(totalReports, currentReport + 1))} className="p-1 hover:bg-gray-100 rounded" disabled={currentReport === totalReports}>→</button>
            </div>
            <div className="bg-red-500 p-2 rounded"><button onClick={addNewReport} className="text-white">+</button></div>
          </div>
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
            <h3 className="text-lg font-semibold text-green-900 mb-3">1. General Cleanliness and Hygiene</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all work surfaces clean, disinfected, and free from clutter?" yesNoField="surfaces_clean" commentField="surfaces_clean_comment" yesNoValue={data.surfaces_clean} commentValue={data.surfaces_clean_comment} onYesNoChange={(v) => handleChange('surfaces_clean', v)} onCommentChange={(v) => handleChange('surfaces_clean_comment', v)} />
              <YesNoQuestion label="Is the flooring clean, intact, and non-slip?" yesNoField="flooring_safe" commentField="flooring_safe_comment" yesNoValue={data.flooring_safe} commentValue={data.flooring_safe_comment} onYesNoChange={(v) => handleChange('flooring_safe', v)} onCommentChange={(v) => handleChange('flooring_safe_comment', v)} />
              <YesNoQuestion label="Are walls, ceilings, light fittings, and vents clean and in good repair?" yesNoField="walls_ceiling_good" commentField="walls_ceiling_good_comment" yesNoValue={data.walls_ceiling_good} commentValue={data.walls_ceiling_good_comment} onYesNoChange={(v) => handleChange('walls_ceiling_good', v)} onCommentChange={(v) => handleChange('walls_ceiling_good_comment', v)} />
              <YesNoQuestion label="Are sinks clean and designated for handwashing, food prep, or equipment washing?" yesNoField="sinks_designated" commentField="sinks_designated_comment" yesNoValue={data.sinks_designated} commentValue={data.sinks_designated_comment} onYesNoChange={(v) => handleChange('sinks_designated', v)} onCommentChange={(v) => handleChange('sinks_designated_comment', v)} />
              <YesNoQuestion label="Are waste bins clean, covered, and emptied regularly?" yesNoField="bins_clean" commentField="bins_clean_comment" yesNoValue={data.bins_clean} commentValue={data.bins_clean_comment} onYesNoChange={(v) => handleChange('bins_clean', v)} onCommentChange={(v) => handleChange('bins_clean_comment', v)} />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">2. Food Storage and Labelling</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are fridges and freezers clean, organised, and within safe temperature range?" yesNoField="fridges_clean_temp" commentField="fridges_clean_temp_comment" yesNoValue={data.fridges_clean_temp} commentValue={data.fridges_clean_temp_comment} onYesNoChange={(v) => handleChange('fridges_clean_temp', v)} onCommentChange={(v) => handleChange('fridges_clean_temp_comment', v)} />
              <YesNoQuestion label="Are fridge (≤ 5°C) and freezer (≤ -18°C) temperatures monitored and recorded daily?" yesNoField="temps_monitored_recorded" commentField="temps_monitored_recorded_comment" yesNoValue={data.temps_monitored_recorded} commentValue={data.temps_monitored_recorded_comment} onYesNoChange={(v) => handleChange('temps_monitored_recorded', v)} onCommentChange={(v) => handleChange('temps_monitored_recorded_comment', v)} />
              <YesNoQuestion label="Are dry goods stored off the floor and in sealed, labelled containers?" yesNoField="dry_goods_stored" commentField="dry_goods_stored_comment" yesNoValue={data.dry_goods_stored} commentValue={data.dry_goods_stored_comment} onYesNoChange={(v) => handleChange('dry_goods_stored', v)} onCommentChange={(v) => handleChange('dry_goods_stored_comment', v)} />
              <YesNoQuestion label="Are all opened food items dated and labelled correctly?" yesNoField="opened_items_dated" commentField="opened_items_dated_comment" yesNoValue={data.opened_items_dated} commentValue={data.opened_items_dated_comment} onYesNoChange={(v) => handleChange('opened_items_dated', v)} onCommentChange={(v) => handleChange('opened_items_dated_comment', v)} />
              <YesNoQuestion label="Is raw food stored separately from cooked/ready-to-eat foods?" yesNoField="raw_stored_separately" commentField="raw_stored_separately_comment" yesNoValue={data.raw_stored_separately} commentValue={data.raw_stored_separately_comment} onYesNoChange={(v) => handleChange('raw_stored_separately', v)} onCommentChange={(v) => handleChange('raw_stored_separately_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">3. Equipment and Utensils</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is kitchen equipment (e.g. ovens, microwaves, blenders) clean and in good working order?" yesNoField="equipment_clean_working" commentField="equipment_clean_working_comment" yesNoValue={data.equipment_clean_working} commentValue={data.equipment_clean_working_comment} onYesNoChange={(v) => handleChange('equipment_clean_working', v)} onCommentChange={(v) => handleChange('equipment_clean_working_comment', v)} />
              <YesNoQuestion label="Are chopping boards colour-coded and used appropriately?" yesNoField="chopping_boards_coloured" commentField="chopping_boards_coloured_comment" yesNoValue={data.chopping_boards_coloured} commentValue={data.chopping_boards_coloured_comment} onYesNoChange={(v) => handleChange('chopping_boards_coloured', v)} onCommentChange={(v) => handleChange('chopping_boards_coloured_comment', v)} />
              <YesNoQuestion label="Are knives and utensils clean, stored safely, and in good condition?" yesNoField="knives_utensils_safe" commentField="knives_utensils_safe_comment" yesNoValue={data.knives_utensils_safe} commentValue={data.knives_utensils_safe_comment} onYesNoChange={(v) => handleChange('knives_utensils_safe', v)} onCommentChange={(v) => handleChange('knives_utensils_safe_comment', v)} />
              <YesNoQuestion label="Are kettles, toasters, microwaves, and small appliances in kitchenettes clean and safe?" yesNoField="small_appliances_clean" commentField="small_appliances_clean_comment" yesNoValue={data.small_appliances_clean} commentValue={data.small_appliances_clean_comment} onYesNoChange={(v) => handleChange('small_appliances_clean', v)} onCommentChange={(v) => handleChange('small_appliances_clean_comment', v)} />
              <YesNoQuestion label="Is dishwasher or manual washing system (e.g. 2/3 sink method) used and effective?" yesNoField="dishwasher_effective" commentField="dishwasher_effective_comment" yesNoValue={data.dishwasher_effective} commentValue={data.dishwasher_effective_comment} onYesNoChange={(v) => handleChange('dishwasher_effective', v)} onCommentChange={(v) => handleChange('dishwasher_effective_comment', v)} />
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">4. Personal Hygiene and Handwashing</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are handwashing sinks available, with hot water, soap, and paper towels?" yesNoField="handwashing_sinks" commentField="handwashing_sinks_comment" yesNoValue={data.handwashing_sinks} commentValue={data.handwashing_sinks_comment} onYesNoChange={(v) => handleChange('handwashing_sinks', v)} onCommentChange={(v) => handleChange('handwashing_sinks_comment', v)} />
              <YesNoQuestion label="Are staff observed following good hand hygiene practices?" yesNoField="staff_hand_hygiene_observed" commentField="staff_hand_hygiene_observed_comment" yesNoValue={data.staff_hand_hygiene_observed} commentValue={data.staff_hand_hygiene_observed_comment} onYesNoChange={(v) => handleChange('staff_hand_hygiene_observed', v)} onCommentChange={(v) => handleChange('staff_hand_hygiene_observed_comment', v)} />
              <YesNoQuestion label="Are disposable gloves, aprons, and hairnets worn where appropriate?" yesNoField="ppe_worn_where_appropriate" commentField="ppe_worn_where_appropriate_comment" yesNoValue={data.ppe_worn_where_appropriate} commentValue={data.ppe_worn_where_appropriate_comment} onYesNoChange={(v) => handleChange('ppe_worn_where_appropriate', v)} onCommentChange={(v) => handleChange('ppe_worn_where_appropriate_comment', v)} />
              <YesNoQuestion label="Are staff changing PPE between tasks to avoid cross-contamination?" yesNoField="ppe_changed_between_tasks" commentField="ppe_changed_between_tasks_comment" yesNoValue={data.ppe_changed_between_tasks} commentValue={data.ppe_changed_between_tasks_comment} onYesNoChange={(v) => handleChange('ppe_changed_between_tasks', v)} onCommentChange={(v) => handleChange('ppe_changed_between_tasks_comment', v)} />
              <YesNoQuestion label="Are hand hygiene and PPE posters displayed in food areas?" yesNoField="posters_displayed_food" commentField="posters_displayed_food_comment" yesNoValue={data.posters_displayed_food} commentValue={data.posters_displayed_food_comment} onYesNoChange={(v) => handleChange('posters_displayed_food', v)} onCommentChange={(v) => handleChange('posters_displayed_food_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">5. Kitchenette Safety (Resident/Visitor Areas)</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are kitchenettes clean, tidy, and free from hazards?" yesNoField="kitchenettes_clean_hazard_free" commentField="kitchenettes_clean_hazard_free_comment" yesNoValue={data.kitchenettes_clean_hazard_free} commentValue={data.kitchenettes_clean_hazard_free_comment} onYesNoChange={(v) => handleChange('kitchenettes_clean_hazard_free', v)} onCommentChange={(v) => handleChange('kitchenettes_clean_hazard_free_comment', v)} />
              <YesNoQuestion label="Is food stored safely in kitchenettes (e.g. labelled, sealed, no out-of-date items)?" yesNoField="kitchenette_food_stored_safe" commentField="kitchenette_food_stored_safe_comment" yesNoValue={data.kitchenette_food_stored_safe} commentValue={data.kitchenette_food_stored_safe_comment} onYesNoChange={(v) => handleChange('kitchenette_food_stored_safe', v)} onCommentChange={(v) => handleChange('kitchenette_food_stored_safe_comment', v)} />
              <YesNoQuestion label="Are cleaning products stored separately and safely (not under sinks)?" yesNoField="cleaning_products_stored" commentField="cleaning_products_stored_comment" yesNoValue={data.cleaning_products_stored} commentValue={data.cleaning_products_stored_comment} onYesNoChange={(v) => handleChange('cleaning_products_stored', v)} onCommentChange={(v) => handleChange('cleaning_products_stored_comment', v)} />
              <YesNoQuestion label="Are appliances (microwaves, kettles) PAT tested and working safely?" yesNoField="appliances_pat" commentField="appliances_pat_comment" yesNoValue={data.appliances_pat} commentValue={data.appliances_pat_comment} onYesNoChange={(v) => handleChange('appliances_pat', v)} onCommentChange={(v) => handleChange('appliances_pat_comment', v)} />
              <YesNoQuestion label="Is resident use of kitchenettes risk-assessed and supported where appropriate?" yesNoField="resident_use_risk_assessed" commentField="resident_use_risk_assessed_comment" yesNoValue={data.resident_use_risk_assessed} commentValue={data.resident_use_risk_assessed_comment} onYesNoChange={(v) => handleChange('resident_use_risk_assessed', v)} onCommentChange={(v) => handleChange('resident_use_risk_assessed_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">6. Pest Control</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are there any signs of pests (droppings, gnaw marks, insects)?" yesNoField="signs_of_pests" commentField="signs_of_pests_comment" yesNoValue={data.signs_of_pests} commentValue={data.signs_of_pests_comment} onYesNoChange={(v) => handleChange('signs_of_pests', v)} onCommentChange={(v) => handleChange('signs_of_pests_comment', v)} />
              <YesNoQuestion label="Are external doors and windows sealed or fitted with fly screens?" yesNoField="doors_windows_sealed" commentField="doors_windows_sealed_comment" yesNoValue={data.doors_windows_sealed} commentValue={data.doors_windows_sealed_comment} onYesNoChange={(v) => handleChange('doors_windows_sealed', v)} onCommentChange={(v) => handleChange('doors_windows_sealed_comment', v)} />
              <YesNoQuestion label="Is a pest control contract in place and up to date?" yesNoField="pest_contract_in_place" commentField="pest_contract_in_place_comment" yesNoValue={data.pest_contract_in_place} commentValue={data.pest_contract_in_place_comment} onYesNoChange={(v) => handleChange('pest_contract_in_place', v)} onCommentChange={(v) => handleChange('pest_contract_in_place_comment', v)} />
              <YesNoQuestion label="Are food items and waste stored in pest-proof containers?" yesNoField="pest_proof_storage" commentField="pest_proof_storage_comment" yesNoValue={data.pest_proof_storage} commentValue={data.pest_proof_storage_comment} onYesNoChange={(v) => handleChange('pest_proof_storage', v)} onCommentChange={(v) => handleChange('pest_proof_storage_comment', v)} />
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-emerald-900 mb-3">7. Allergens and Dietary Needs</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are allergen posters and information clearly displayed?" yesNoField="allergens_info_displayed" commentField="allergens_info_displayed_comment" yesNoValue={data.allergens_info_displayed} commentValue={data.allergens_info_displayed_comment} onYesNoChange={(v) => handleChange('allergens_info_displayed', v)} onCommentChange={(v) => handleChange('allergens_info_displayed_comment', v)} />
              <YesNoQuestion label="Are special diets (e.g. gluten-free, diabetic, fortified) stored and handled separately?" yesNoField="special_diets_separated" commentField="special_diets_separated_comment" yesNoValue={data.special_diets_separated} commentValue={data.special_diets_separated_comment} onYesNoChange={(v) => handleChange('special_diets_separated', v)} onCommentChange={(v) => handleChange('special_diets_separated_comment', v)} />
              <YesNoQuestion label="Is cross-contamination of allergen foods avoided during prep and storage?" yesNoField="cross_contamination_avoided" commentField="cross_contamination_avoided_comment" yesNoValue={data.cross_contamination_avoided} commentValue={data.cross_contamination_avoided_comment} onYesNoChange={(v) => handleChange('cross_contamination_avoided', v)} onCommentChange={(v) => handleChange('cross_contamination_avoided_comment', v)} />
            </div>
          </div>

          <div className="bg-sky-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-sky-900 mb-3">8. Documentation and Records</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are cleaning schedules completed, signed, and up to date?" yesNoField="cleaning_schedules_signed" commentField="cleaning_schedules_signed_comment" yesNoValue={data.cleaning_schedules_signed} commentValue={data.cleaning_schedules_signed_comment} onYesNoChange={(v) => handleChange('cleaning_schedules_signed', v)} onCommentChange={(v) => handleChange('cleaning_schedules_signed_comment', v)} />
              <YesNoQuestion label="Are fridge/freezer temperature logs maintained accurately?" yesNoField="temp_logs_maintained" commentField="temp_logs_maintained_comment" yesNoValue={data.temp_logs_maintained} commentValue={data.temp_logs_maintained_comment} onYesNoChange={(v) => handleChange('temp_logs_maintained', v)} onCommentChange={(v) => handleChange('temp_logs_maintained_comment', v)} />
              <YesNoQuestion label="Is food delivery and stock rotation recorded?" yesNoField="deliveries_stock_rotation" commentField="deliveries_stock_rotation_comment" yesNoValue={data.deliveries_stock_rotation} commentValue={data.deliveries_stock_rotation_comment} onYesNoChange={(v) => handleChange('deliveries_stock_rotation', v)} onCommentChange={(v) => handleChange('deliveries_stock_rotation_comment', v)} />
              <YesNoQuestion label="Are food hygiene certificates/training records for staff up to date?" yesNoField="staff_food_training" commentField="staff_food_training_comment" yesNoValue={data.staff_food_training} commentValue={data.staff_food_training_comment} onYesNoChange={(v) => handleChange('staff_food_training', v)} onCommentChange={(v) => handleChange('staff_food_training_comment', v)} />
            </div>
          </div>

          <div className="bg-rose-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-rose-900 mb-3">9. Waste Management</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are food waste bins available, clean, and emptied regularly?" yesNoField="food_waste_bins" commentField="food_waste_bins_comment" yesNoValue={data.food_waste_bins} commentValue={data.food_waste_bins_comment} onYesNoChange={(v) => handleChange('food_waste_bins', v)} onCommentChange={(v) => handleChange('food_waste_bins_comment', v)} />
              <YesNoQuestion label="Are clinical or incontinence waste bins kept separate from food areas?" yesNoField="clinical_waste_separate" commentField="clinical_waste_separate_comment" yesNoValue={data.clinical_waste_separate} commentValue={data.clinical_waste_separate_comment} onYesNoChange={(v) => handleChange('clinical_waste_separate', v)} onCommentChange={(v) => handleChange('clinical_waste_separate_comment', v)} />
              <YesNoQuestion label="Is recycling being managed according to local authority policy?" yesNoField="recycling_managed" commentField="recycling_managed_comment" yesNoValue={data.recycling_managed} commentValue={data.recycling_managed_comment} onYesNoChange={(v) => handleChange('recycling_managed', v)} onCommentChange={(v) => handleChange('recycling_managed_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">10. Compliance and Risk Management</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is the last Environmental Health (EHO) inspection available and actions completed?" yesNoField="last_eho_actions_completed" commentField="last_eho_actions_completed_comment" yesNoValue={data.last_eho_actions_completed} commentValue={data.last_eho_actions_completed_comment} onYesNoChange={(v) => handleChange('last_eho_actions_completed', v)} onCommentChange={(v) => handleChange('last_eho_actions_completed_comment', v)} />
              <YesNoQuestion label="Is the Food Hygiene Rating displayed publicly (main kitchen)?" yesNoField="food_hygiene_rating_displayed" commentField="food_hygiene_rating_displayed_comment" yesNoValue={data.food_hygiene_rating_displayed} commentValue={data.food_hygiene_rating_displayed_comment} onYesNoChange={(v) => handleChange('food_hygiene_rating_displayed', v)} onCommentChange={(v) => handleChange('food_hygiene_rating_displayed_comment', v)} />
              <YesNoQuestion label="Are staff trained in food safety (minimum Level 2 Food Hygiene)?" yesNoField="staff_food_safety_trained" commentField="staff_food_safety_trained_comment" yesNoValue={data.staff_food_safety_trained} commentValue={data.staff_food_safety_trained_comment} onYesNoChange={(v) => handleChange('staff_food_safety_trained', v)} onCommentChange={(v) => handleChange('staff_food_safety_trained_comment', v)} />
              <YesNoQuestion label="Is there a cleaning risk assessment in place for both kitchen and kitchenettes?" yesNoField="cleaning_risk_assessment" commentField="cleaning_risk_assessment_comment" yesNoValue={data.cleaning_risk_assessment} commentValue={data.cleaning_risk_assessment_comment} onYesNoChange={(v) => handleChange('cleaning_risk_assessment', v)} onCommentChange={(v) => handleChange('cleaning_risk_assessment_comment', v)} />
              <YesNoQuestion label="Are COSHH sheets available for any cleaning chemicals used?" yesNoField="coshh_sheets_available" commentField="coshh_sheets_available_comment" yesNoValue={data.coshh_sheets_available} commentValue={data.coshh_sheets_available_comment} onYesNoChange={(v) => handleChange('coshh_sheets_available', v)} onCommentChange={(v) => handleChange('coshh_sheets_available_comment', v)} />
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button onClick={() => setShowModal(true)} disabled={saving} className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Complete Audit'}</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Completed</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan based on this audit?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50">No, thanks</button>
              <button onClick={() => handleModalCreate(true)} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create Action Plan'}</button>
              <button onClick={() => handleModalCreate(false)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save and Close'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
