'use client';
import React, { useState } from 'react';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';

interface MealtimeData {
  home: string;
  date: string;
  personCompletingAudit: string;

  // 1 Preparation and Environment
  dining_area_set: string;
  dining_area_set_comment: string;
  environment_calm: string;
  environment_calm_comment: string;
  adequate_seating: string;
  adequate_seating_comment: string;
  tables_well_presented: string;
  tables_well_presented_comment: string;
  room_well_lit: string;
  room_well_lit_comment: string;

  // 2 Resident Choice and Dignity
  residents_offered_handwash: string;
  residents_offered_handwash_comment: string;
  residents_offered_choice: string;
  residents_offered_choice_comment: string;
  menus_accessible: string;
  menus_accessible_comment: string;
  dietary_needs_identified: string;
  dietary_needs_identified_comment: string;
  residents_encouraged_choice: string;
  residents_encouraged_choice_comment: string;
  dignity_maintained: string;
  dignity_maintained_comment: string;

  // 3 Staff Interaction and Support
  staff_available_attentive: string;
  staff_available_attentive_comment: string;
  staff_support_sensitivity: string;
  staff_support_sensitivity_comment: string;
  assistance_discreet: string;
  assistance_discreet_comment: string;
  staff_eye_level_engagement: string;
  staff_eye_level_engagement_comment: string;
  iddsi_checked: string;
  iddsi_checked_comment: string;

  // 4 Nutrition and Hydration
  adequate_portions: string;
  adequate_portions_comment: string;
  drinks_offered: string;
  drinks_offered_comment: string;
  residents_encouraged_eat_drink: string;
  residents_encouraged_eat_drink_comment: string;
  fortified_correct: string;
  fortified_correct_comment: string;
  intake_monitored: string;
  intake_monitored_comment: string;

  // 5 Mealtime Experience
  residents_enjoying: string;
  residents_enjoying_comment: string;
  social_interaction: string;
  social_interaction_comment: string;
  time_to_eat: string;
  time_to_eat_comment: string;
  meals_served_correct_temp: string;
  meals_served_correct_temp_comment: string;
  second_helpings_offered: string;
  second_helpings_offered_comment: string;

  // 6 Cleanliness, Hygiene and Safety
  staff_ppe_if_required: string;
  staff_ppe_if_required_comment: string;
  hygienic_serving: string;
  hygienic_serving_comment: string;
  spills_cleaned: string;
  spills_cleaned_comment: string;
  food_hygiene_followed: string;
  food_hygiene_followed_comment: string;
  kitchen_clean: string;
  kitchen_clean_comment: string;

  // 7 After the Meal
  mouth_care_supported: string;
  mouth_care_supported_comment: string;
  areas_cleaned_promptly: string;
  areas_cleaned_promptly_comment: string;
  residents_choices_next: string;
  residents_choices_next_comment: string;
  feedback_gathered: string;
  feedback_gathered_comment: string;
}

export default function MealtimeAuditPage() {
  const [showModal, setShowModal] = useState(false);
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [finalComments, setFinalComments] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const [data, setData] = useState<MealtimeData>({
    home: '',
    date: '',
    personCompletingAudit: '',

    dining_area_set: '',
    dining_area_set_comment: '',
    environment_calm: '',
    environment_calm_comment: '',
    adequate_seating: '',
    adequate_seating_comment: '',
    tables_well_presented: '',
    tables_well_presented_comment: '',
    room_well_lit: '',
    room_well_lit_comment: '',

    residents_offered_handwash: '',
    residents_offered_handwash_comment: '',
    residents_offered_choice: '',
    residents_offered_choice_comment: '',
    menus_accessible: '',
    menus_accessible_comment: '',
    dietary_needs_identified: '',
    dietary_needs_identified_comment: '',
    residents_encouraged_choice: '',
    residents_encouraged_choice_comment: '',
    dignity_maintained: '',
    dignity_maintained_comment: '',

    staff_available_attentive: '',
    staff_available_attentive_comment: '',
    staff_support_sensitivity: '',
    staff_support_sensitivity_comment: '',
    assistance_discreet: '',
    assistance_discreet_comment: '',
    staff_eye_level_engagement: '',
    staff_eye_level_engagement_comment: '',
    iddsi_checked: '',
    iddsi_checked_comment: '',

    adequate_portions: '',
    adequate_portions_comment: '',
    drinks_offered: '',
    drinks_offered_comment: '',
    residents_encouraged_eat_drink: '',
    residents_encouraged_eat_drink_comment: '',
    fortified_correct: '',
    fortified_correct_comment: '',
    intake_monitored: '',
    intake_monitored_comment: '',

    residents_enjoying: '',
    residents_enjoying_comment: '',
    social_interaction: '',
    social_interaction_comment: '',
    time_to_eat: '',
    time_to_eat_comment: '',
    meals_served_correct_temp: '',
    meals_served_correct_temp_comment: '',
    second_helpings_offered: '',
    second_helpings_offered_comment: '',

    staff_ppe_if_required: '',
    staff_ppe_if_required_comment: '',
    hygienic_serving: '',
    hygienic_serving_comment: '',
    spills_cleaned: '',
    spills_cleaned_comment: '',
    food_hygiene_followed: '',
    food_hygiene_followed_comment: '',
    kitchen_clean: '',
    kitchen_clean_comment: '',

    mouth_care_supported: '',
    mouth_care_supported_comment: '',
    areas_cleaned_promptly: '',
    areas_cleaned_promptly_comment: '',
    residents_choices_next: '',
    residents_choices_next_comment: '',
    feedback_gathered: '',
    feedback_gathered_comment: '',
  });

  const handleChange = (field: keyof MealtimeData, value: string) => {
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
      {/* per-question comments removed; use final comments textarea */}
    </div>
  );

  const required = [
    'home','date','personCompletingAudit',
    'dining_area_set','environment_calm','adequate_seating','tables_well_presented','room_well_lit',
    'residents_offered_handwash','residents_offered_choice','menus_accessible','dietary_needs_identified','residents_encouraged_choice','dignity_maintained',
    'staff_available_attentive','staff_support_sensitivity','assistance_discreet','staff_eye_level_engagement','iddsi_checked',
    'adequate_portions','drinks_offered','residents_encouraged_eat_drink','fortified_correct','intake_monitored',
    'residents_enjoying','social_interaction','time_to_eat','meals_served_correct_temp','second_helpings_offered',
    'staff_ppe_if_required','hygienic_serving','spills_cleaned','food_hygiene_followed','kitchen_clean',
    'mouth_care_supported','areas_cleaned_promptly','residents_choices_next','feedback_gathered'
  ];

  const validateForm = () => {
  const missing = required.filter(f => !((data as unknown as Record<string, string>)[f]?.trim()));
    setErrors(missing as string[]);
    if (missing.length > 0) {
      const el = document.querySelector(`[data-field="${missing[0]}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return missing.length === 0;
  };

  const activeWorkspaceId = activeWorkspace?.id;

  const handleComplete = () => {
    if (validateForm()) setShowModal(true);
  };

  const handleModalCreate = async (createActionPlan: boolean) => {
    setShowModal(false);
    if (!activeWorkspaceId) return alert('No active workspace selected. Please choose a workspace before saving audits.');

    // Compute yes/no score for mealtime questions
    const YES_NO_FIELDS = [
      'dining_area_set','environment_calm','adequate_seating','tables_well_presented','room_well_lit',
      'residents_offered_handwash','residents_offered_choice','menus_accessible','dietary_needs_identified','residents_encouraged_choice','dignity_maintained',
      'staff_available_attentive','staff_support_sensitivity','assistance_discreet','staff_eye_level_engagement','iddsi_checked',
      'adequate_portions','drinks_offered','residents_encouraged_eat_drink','fortified_correct','intake_monitored',
      'residents_enjoying','social_interaction','time_to_eat','meals_served_correct_temp','second_helpings_offered',
      'staff_ppe_if_required','hygienic_serving','spills_cleaned','food_hygiene_followed','kitchen_clean',
      'mouth_care_supported','areas_cleaned_promptly','residents_choices_next','feedback_gathered'
    ];

    const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + ((data as any)[f] === 'Yes' ? 1 : 0), 0);
    const totalCount = YES_NO_FIELDS.length;
    const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : null;

    const payload = {
      ...data,
      comments: finalComments,
      createActionPlan: !!createActionPlan,
      createdBy: user?.id ?? null,
      workspaceId: activeWorkspaceId,
      // Mirror these computed fields so saveAudit can write a fast-read summary
      auditType: 'mealtime',
      yesCount,
      totalCount,
      scorePercent,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, activeWorkspaceId);
      setSavedAuditId(id);
      const completedAt = data.date || new Date().toISOString();
      await markAuditCompleted(activeWorkspaceId, 'mealtime', completedAt);
      alert('Audit saved');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save mealtime audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Meal Time Audit</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Name of person completing audit</label>
              <input value={data.personCompletingAudit} data-field="personCompletingAudit" onChange={(e) => handleChange('personCompletingAudit', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter auditor name" />
              {errors.includes('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-3">1. Preparation and Environment</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is the dining area clean, tidy, and set up appropriately before mealtime?" yesNoField="dining_area_set" commentField="dining_area_set_comment" yesNoValue={data.dining_area_set} commentValue={data.dining_area_set_comment} onYesNoChange={(v) => handleChange('dining_area_set', v)} onCommentChange={(v) => handleChange('dining_area_set_comment', v)} />
              <YesNoQuestion label="Is the environment calm, relaxed, and free from unnecessary noise?" yesNoField="environment_calm" commentField="environment_calm_comment" yesNoValue={data.environment_calm} commentValue={data.environment_calm_comment} onYesNoChange={(v) => handleChange('environment_calm', v)} onCommentChange={(v) => handleChange('environment_calm_comment', v)} />
              <YesNoQuestion label="Is there adequate seating for all residents who wish to eat in the dining room?" yesNoField="adequate_seating" commentField="adequate_seating_comment" yesNoValue={data.adequate_seating} commentValue={data.adequate_seating_comment} onYesNoChange={(v) => handleChange('adequate_seating', v)} onCommentChange={(v) => handleChange('adequate_seating_comment', v)} />
              <YesNoQuestion label="Are tables clean, well presented, and appropriately laid (e.g. cutlery, napkins)?" yesNoField="tables_well_presented" commentField="tables_well_presented_comment" yesNoValue={data.tables_well_presented} commentValue={data.tables_well_presented_comment} onYesNoChange={(v) => handleChange('tables_well_presented', v)} onCommentChange={(v) => handleChange('tables_well_presented_comment', v)} />
              <YesNoQuestion label="Is the room well lit and at a comfortable temperature?" yesNoField="room_well_lit" commentField="room_well_lit_comment" yesNoValue={data.room_well_lit} commentValue={data.room_well_lit_comment} onYesNoChange={(v) => handleChange('room_well_lit', v)} onCommentChange={(v) => handleChange('room_well_lit_comment', v)} />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">2. Resident Choice and Dignity</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are residents offered to wash their hands?" yesNoField="residents_offered_handwash" commentField="residents_offered_handwash_comment" yesNoValue={data.residents_offered_handwash} commentValue={data.residents_offered_handwash_comment} onYesNoChange={(v) => handleChange('residents_offered_handwash', v)} onCommentChange={(v) => handleChange('residents_offered_handwash_comment', v)} />
              <YesNoQuestion label="Are residents offered a clear choice of meals, including alternatives?" yesNoField="residents_offered_choice" commentField="residents_offered_choice_comment" yesNoValue={data.residents_offered_choice} commentValue={data.residents_offered_choice_comment} onYesNoChange={(v) => handleChange('residents_offered_choice', v)} onCommentChange={(v) => handleChange('residents_offered_choice_comment', v)} />
              <YesNoQuestion label="Are menus available in an accessible format (e.g. large print, pictorial)?" yesNoField="menus_accessible" commentField="menus_accessible_comment" yesNoValue={data.menus_accessible} commentValue={data.menus_accessible_comment} onYesNoChange={(v) => handleChange('menus_accessible', v)} onCommentChange={(v) => handleChange('menus_accessible_comment', v)} />
              <YesNoQuestion label="Are individual dietary needs/preferences/allergies clearly identified and catered for?" yesNoField="dietary_needs_identified" commentField="dietary_needs_identified_comment" yesNoValue={data.dietary_needs_identified} commentValue={data.dietary_needs_identified_comment} onYesNoChange={(v) => handleChange('dietary_needs_identified', v)} onCommentChange={(v) => handleChange('dietary_needs_identified_comment', v)} />
              <YesNoQuestion label="Are residents encouraged to make independent choices where possible?" yesNoField="residents_encouraged_choice" commentField="residents_encouraged_choice_comment" yesNoValue={data.residents_encouraged_choice} commentValue={data.residents_encouraged_choice_comment} onYesNoChange={(v) => handleChange('residents_encouraged_choice', v)} onCommentChange={(v) => handleChange('residents_encouraged_choice_comment', v)} />
              <YesNoQuestion label="Is dignity maintained throughout the mealtime (e.g. no plastic aprons unless requested)?" yesNoField="dignity_maintained" commentField="dignity_maintained_comment" yesNoValue={data.dignity_maintained} commentValue={data.dignity_maintained_comment} onYesNoChange={(v) => handleChange('dignity_maintained', v)} onCommentChange={(v) => handleChange('dignity_maintained_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">3. Staff Interaction and Support</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are staff available and attentive during the meal?" yesNoField="staff_available_attentive" commentField="staff_available_attentive_comment" yesNoValue={data.staff_available_attentive} commentValue={data.staff_available_attentive_comment} onYesNoChange={(v) => handleChange('staff_available_attentive', v)} onCommentChange={(v) => handleChange('staff_available_attentive_comment', v)} />
              <YesNoQuestion label="Do staff support residents with sensitivity and respect (e.g. not rushing)?" yesNoField="staff_support_sensitivity" commentField="staff_support_sensitivity_comment" yesNoValue={data.staff_support_sensitivity} commentValue={data.staff_support_sensitivity_comment} onYesNoChange={(v) => handleChange('staff_support_sensitivity', v)} onCommentChange={(v) => handleChange('staff_support_sensitivity_comment', v)} />
              <YesNoQuestion label="Are residents offered assistance discreetly if needed (e.g. cutting food, feeding)?" yesNoField="assistance_discreet" commentField="assistance_discreet_comment" yesNoValue={data.assistance_discreet} commentValue={data.assistance_discreet_comment} onYesNoChange={(v) => handleChange('assistance_discreet', v)} onCommentChange={(v) => handleChange('assistance_discreet_comment', v)} />
              <YesNoQuestion label="Are staff sitting at eye level and engaging positively with residents during assistance?" yesNoField="staff_eye_level_engagement" commentField="staff_eye_level_engagement_comment" yesNoValue={data.staff_eye_level_engagement} commentValue={data.staff_eye_level_engagement_comment} onYesNoChange={(v) => handleChange('staff_eye_level_engagement', v)} onCommentChange={(v) => handleChange('staff_eye_level_engagement_comment', v)} />
              <YesNoQuestion label="Are IDDSI levels known by staff and checked thoroughly before serving food/drink?" yesNoField="iddsi_checked" commentField="iddsi_checked_comment" yesNoValue={data.iddsi_checked} commentValue={data.iddsi_checked_comment} onYesNoChange={(v) => handleChange('iddsi_checked', v)} onCommentChange={(v) => handleChange('iddsi_checked_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">4. Nutrition and Hydration</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are residents offered adequate portions that meet their needs?" yesNoField="adequate_portions" commentField="adequate_portions_comment" yesNoValue={data.adequate_portions} commentValue={data.adequate_portions_comment} onYesNoChange={(v) => handleChange('adequate_portions', v)} onCommentChange={(v) => handleChange('adequate_portions_comment', v)} />
              <YesNoQuestion label="Are drinks (water/juice/tea etc.) offered before, during, and after the meal?" yesNoField="drinks_offered" commentField="drinks_offered_comment" yesNoValue={data.drinks_offered} commentValue={data.drinks_offered_comment} onYesNoChange={(v) => handleChange('drinks_offered', v)} onCommentChange={(v) => handleChange('drinks_offered_comment', v)} />
              <YesNoQuestion label="Are residents encouraged to drink and eat sufficiently?" yesNoField="residents_encouraged_eat_drink" commentField="residents_encouraged_eat_drink_comment" yesNoValue={data.residents_encouraged_eat_drink} commentValue={data.residents_encouraged_eat_drink_comment} onYesNoChange={(v) => handleChange('residents_encouraged_eat_drink', v)} onCommentChange={(v) => handleChange('residents_encouraged_eat_drink_comment', v)} />
              <YesNoQuestion label="Are any fortified meals, supplements or texture-modified diets delivered correctly?" yesNoField="fortified_correct" commentField="fortified_correct_comment" yesNoValue={data.fortified_correct} commentValue={data.fortified_correct_comment} onYesNoChange={(v) => handleChange('fortified_correct', v)} onCommentChange={(v) => handleChange('fortified_correct_comment', v)} />
              <YesNoQuestion label="Are residents monitored for food/fluid intake where necessary (e.g. fluid/food charts)?" yesNoField="intake_monitored" commentField="intake_monitored_comment" yesNoValue={data.intake_monitored} commentValue={data.intake_monitored_comment} onYesNoChange={(v) => handleChange('intake_monitored', v)} onCommentChange={(v) => handleChange('intake_monitored_comment', v)} />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-3">5. Mealtime Experience</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are residents enjoying their meals and the overall experience?" yesNoField="residents_enjoying" commentField="residents_enjoying_comment" yesNoValue={data.residents_enjoying} commentValue={data.residents_enjoying_comment} onYesNoChange={(v) => handleChange('residents_enjoying', v)} onCommentChange={(v) => handleChange('residents_enjoying_comment', v)} />
              <YesNoQuestion label="Is there social interaction among residents and staff during meals?" yesNoField="social_interaction" commentField="social_interaction_comment" yesNoValue={data.social_interaction} commentValue={data.social_interaction_comment} onYesNoChange={(v) => handleChange('social_interaction', v)} onCommentChange={(v) => handleChange('social_interaction_comment', v)} />
              <YesNoQuestion label="Are residents given enough time to eat at their own pace?" yesNoField="time_to_eat" commentField="time_to_eat_comment" yesNoValue={data.time_to_eat} commentValue={data.time_to_eat_comment} onYesNoChange={(v) => handleChange('time_to_eat', v)} onCommentChange={(v) => handleChange('time_to_eat_comment', v)} />
              <YesNoQuestion label="Are meals served at the correct temperature?" yesNoField="meals_served_correct_temp" commentField="meals_served_correct_temp_comment" yesNoValue={data.meals_served_correct_temp} commentValue={data.meals_served_correct_temp_comment} onYesNoChange={(v) => handleChange('meals_served_correct_temp', v)} onCommentChange={(v) => handleChange('meals_served_correct_temp_comment', v)} />
              <YesNoQuestion label="Are second helpings or alternative meals offered if a resident dislikes the first option?" yesNoField="second_helpings_offered" commentField="second_helpings_offered_comment" yesNoValue={data.second_helpings_offered} commentValue={data.second_helpings_offered_comment} onYesNoChange={(v) => handleChange('second_helpings_offered', v)} onCommentChange={(v) => handleChange('second_helpings_offered_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">6. Cleanliness, Hygiene and Safety</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are staff wearing correct PPE if required (e.g. aprons, gloves where appropriate)?" yesNoField="staff_ppe_if_required" commentField="staff_ppe_if_required_comment" yesNoValue={data.staff_ppe_if_required} commentValue={data.staff_ppe_if_required_comment} onYesNoChange={(v) => handleChange('staff_ppe_if_required', v)} onCommentChange={(v) => handleChange('staff_ppe_if_required_comment', v)} />
              <YesNoQuestion label="Is food served in a hygienic manner with appropriate utensils?" yesNoField="hygienic_serving" commentField="hygienic_serving_comment" yesNoValue={data.hygienic_serving} commentValue={data.hygienic_serving_comment} onYesNoChange={(v) => handleChange('hygienic_serving', v)} onCommentChange={(v) => handleChange('hygienic_serving_comment', v)} />
              <YesNoQuestion label="Are spills cleaned promptly and safely?" yesNoField="spills_cleaned" commentField="spills_cleaned_comment" yesNoValue={data.spills_cleaned} commentValue={data.spills_cleaned_comment} onYesNoChange={(v) => handleChange('spills_cleaned', v)} onCommentChange={(v) => handleChange('spills_cleaned_comment', v)} />
              <YesNoQuestion label="Are food safety and hygiene standards visibly followed?" yesNoField="food_hygiene_followed" commentField="food_hygiene_followed_comment" yesNoValue={data.food_hygiene_followed} commentValue={data.food_hygiene_followed_comment} onYesNoChange={(v) => handleChange('food_hygiene_followed', v)} onCommentChange={(v) => handleChange('food_hygiene_followed_comment', v)} />
              <YesNoQuestion label="Is the kitchen clean, and staff compliant with infection control?" yesNoField="kitchen_clean" commentField="kitchen_clean_comment" yesNoValue={data.kitchen_clean} commentValue={data.kitchen_clean_comment} onYesNoChange={(v) => handleChange('kitchen_clean', v)} onCommentChange={(v) => handleChange('kitchen_clean_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">7. After the Meal</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are residents supported with mouth care if required?" yesNoField="mouth_care_supported" commentField="mouth_care_supported_comment" yesNoValue={data.mouth_care_supported} commentValue={data.mouth_care_supported_comment} onYesNoChange={(v) => handleChange('mouth_care_supported', v)} onCommentChange={(v) => handleChange('mouth_care_supported_comment', v)} />
              <YesNoQuestion label="Are dining areas cleaned promptly and returned to a tidy state?" yesNoField="areas_cleaned_promptly" commentField="areas_cleaned_promptly_comment" yesNoValue={data.areas_cleaned_promptly} commentValue={data.areas_cleaned_promptly_comment} onYesNoChange={(v) => handleChange('areas_cleaned_promptly', v)} onCommentChange={(v) => handleChange('areas_cleaned_promptly_comment', v)} />
              <YesNoQuestion label="Are residents given choices about what to do next (e.g. return to lounge, rest)?" yesNoField="residents_choices_next" commentField="residents_choices_next_comment" yesNoValue={data.residents_choices_next} commentValue={data.residents_choices_next_comment} onYesNoChange={(v) => handleChange('residents_choices_next', v)} onCommentChange={(v) => handleChange('residents_choices_next_comment', v)} />
              <YesNoQuestion label="Is feedback on the meal (likes/dislikes) gathered and acted upon?" yesNoField="feedback_gathered" commentField="feedback_gathered_comment" yesNoValue={data.feedback_gathered} commentValue={data.feedback_gathered_comment} onYesNoChange={(v) => handleChange('feedback_gathered', v)} onCommentChange={(v) => handleChange('feedback_gathered_comment', v)} />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} rows={4} placeholder="Final comments for this audit" className="w-full p-2 border rounded resize-none mt-2" />
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
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">No, thanks</button>
              <button onClick={() => handleModalCreate(false)} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">{saving ? 'Saving...' : 'Save Audit'}</button>
              <button onClick={() => handleModalCreate(true)} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">{saving ? 'Saving...' : 'Save & Create Action Plan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
