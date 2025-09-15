'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<boolean[]>(Array(7).fill(false));

  const toggleSection = (index: number) => {
    setOpenSections(prev => prev.map((open, i) => i === index ? !open : open));
  };

  // Section definitions with guidance text
  const sections = [
    {
      title: "1. Preparation and Environment",
      guidance: "Assess the setup and atmosphere of the dining area before mealtime begins, ensuring a comfortable and welcoming environment for residents.",
      questions: [
        { label: "Is the dining area clean, tidy, and set up appropriately before mealtime?", yesNoField: "dining_area_set" },
        { label: "Is the environment calm, relaxed, and free from unnecessary noise?", yesNoField: "environment_calm" },
        { label: "Is there adequate seating for all residents who wish to eat in the dining room?", yesNoField: "adequate_seating" },
        { label: "Are tables clean, well presented, and appropriately laid (e.g. cutlery, napkins)?", yesNoField: "tables_well_presented" },
        { label: "Is the room well lit and at a comfortable temperature?", yesNoField: "room_well_lit" }
      ]
    },
    {
      title: "2. Resident Choice and Dignity",
      guidance: "Evaluate how well residents are offered choices and how their dignity is maintained throughout the mealtime process.",
      questions: [
        { label: "Are residents offered to wash their hands?", yesNoField: "residents_offered_handwash" },
        { label: "Are residents offered a clear choice of meals, including alternatives?", yesNoField: "residents_offered_choice" },
        { label: "Are menus available in an accessible format (e.g. large print, pictorial)?", yesNoField: "menus_accessible" },
        { label: "Are individual dietary needs/preferences/allergies clearly identified and catered for?", yesNoField: "dietary_needs_identified" },
        { label: "Are residents encouraged to make independent choices where possible?", yesNoField: "residents_encouraged_choice" },
        { label: "Is dignity maintained throughout the mealtime (e.g. no plastic aprons unless requested)?", yesNoField: "dignity_maintained" }
      ]
    },
    {
      title: "3. Staff Interaction and Support",
      guidance: "Observe staff interactions with residents during mealtime, focusing on attentiveness, sensitivity, and appropriate assistance.",
      questions: [
        { label: "Are staff available and attentive during the meal?", yesNoField: "staff_available_attentive" },
        { label: "Do staff support residents with sensitivity and respect (e.g. not rushing)?", yesNoField: "staff_support_sensitivity" },
        { label: "Are residents offered assistance discreetly if needed (e.g. cutting food, feeding)?", yesNoField: "assistance_discreet" },
        { label: "Are staff sitting at eye level and engaging positively with residents during assistance?", yesNoField: "staff_eye_level_engagement" },
        { label: "Are IDDSI levels known by staff and checked thoroughly before serving food/drink?", yesNoField: "iddsi_checked" }
      ]
    },
    {
      title: "4. Nutrition and Hydration",
      guidance: "Check that residents receive adequate nutrition and hydration, with appropriate monitoring and encouragement.",
      questions: [
        { label: "Are residents offered adequate portions that meet their needs?", yesNoField: "adequate_portions" },
        { label: "Are drinks (water/juice/tea etc.) offered before, during, and after the meal?", yesNoField: "drinks_offered" },
        { label: "Are residents encouraged to drink and eat sufficiently?", yesNoField: "residents_encouraged_eat_drink" },
        { label: "Are any fortified meals, supplements or texture-modified diets delivered correctly?", yesNoField: "fortified_correct" },
        { label: "Are residents monitored for food/fluid intake where necessary (e.g. fluid/food charts)?", yesNoField: "intake_monitored" }
      ]
    },
    {
      title: "5. Mealtime Experience",
      guidance: "Assess the overall mealtime experience, including enjoyment, social interaction, timing, and food quality.",
      questions: [
        { label: "Are residents enjoying their meals and the overall experience?", yesNoField: "residents_enjoying" },
        { label: "Is there social interaction among residents and staff during meals?", yesNoField: "social_interaction" },
        { label: "Are residents given enough time to eat at their own pace?", yesNoField: "time_to_eat" },
        { label: "Are meals served at the correct temperature?", yesNoField: "meals_served_correct_temp" },
        { label: "Are second helpings or alternative meals offered if a resident dislikes the first option?", yesNoField: "second_helpings_offered" }
      ]
    },
    {
      title: "6. Cleanliness, Hygiene and Safety",
      guidance: "Verify hygiene standards, PPE usage, food safety practices, and general cleanliness during mealtime.",
      questions: [
        { label: "Are staff wearing correct PPE if required (e.g. aprons, gloves where appropriate)?", yesNoField: "staff_ppe_if_required" },
        { label: "Is food served in a hygienic manner with appropriate utensils?", yesNoField: "hygienic_serving" },
        { label: "Are spills cleaned promptly and safely?", yesNoField: "spills_cleaned" },
        { label: "Are food safety and hygiene standards visibly followed?", yesNoField: "food_hygiene_followed" },
        { label: "Is the kitchen clean, and staff compliant with infection control?", yesNoField: "kitchen_clean" }
      ]
    },
    {
      title: "7. After the Meal",
      guidance: "Check post-meal care, cleanup procedures, resident choices for next activities, and feedback collection.",
      questions: [
        { label: "Are residents supported with mouth care if required?", yesNoField: "mouth_care_supported" },
        { label: "Are dining areas cleaned promptly and returned to a tidy state?", yesNoField: "areas_cleaned_promptly" },
        { label: "Are residents given choices about what to do next (e.g. return to lounge, rest)?", yesNoField: "residents_choices_next" },
        { label: "Is feedback on the meal (likes/dislikes) gathered and acted upon?", yesNoField: "feedback_gathered" }
      ]
    }
  ];

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

  // Helper functions
  const getFieldError = (fieldName: string) => {
    return errors.find(error => error.includes(fieldName));
  };

  const getFieldClassName = (fieldName: string) => {
    const hasError = getFieldError(fieldName);
    return hasError
      ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  };

  const handleYesNoChange = (fieldName: string, value: string) => {
    setData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Clear any errors for this field
    setErrors(prev => prev.filter(error => !error.includes(fieldName)));
  };

  const handleChange = (field: keyof MealtimeData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

  const YesNoQuestion = ({ label, yesNoField }: { label: string; yesNoField: string; }) => (
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
                checked={data[yesNoField as keyof MealtimeData] === 'Yes'}
                onChange={(e) => handleYesNoChange(yesNoField, e.target.value)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={yesNoField}
                value="No"
                checked={data[yesNoField as keyof MealtimeData] === 'No'}
                onChange={(e) => handleYesNoChange(yesNoField, e.target.value)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
          {getFieldError(yesNoField) && (
            <p className="text-red-600 text-sm font-medium">This field is required</p>
          )}
        </div>
      </div>
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
  <div className="w-full p-10 bg-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Mealtime Audit</h1>
          <p className="mb-4 text-slate-500">Comprehensive assessment of mealtime processes and resident experience. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
              <Input
                value={data.home}
                onChange={(e) => handleChange('home', e.target.value)}
                className={getFieldClassName('home')}
                placeholder="Enter home name"
              />
              {getFieldError('home') && (
                <p className="text-red-600 text-sm font-medium mt-1">This field is required</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <Input
                type="date"
                value={data.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={getFieldClassName('date')}
              />
              {getFieldError('date') && (
                <p className="text-red-600 text-sm font-medium mt-1">This field is required</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Person Completing the Audit</label>
              <Input
                value={data.personCompletingAudit}
                onChange={(e) => handleChange('personCompletingAudit', e.target.value)}
                className={getFieldClassName('personCompletingAudit')}
                placeholder="Enter auditor name"
              />
              {getFieldError('personCompletingAudit') && (
                <p className="text-red-600 text-sm font-medium mt-1">This field is required</p>
              )}
            </div>
          </div>
        </div>

        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="space-y-4">
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
