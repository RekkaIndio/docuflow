"use client";

import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore - marked types may not be available
import { marked } from 'marked';

interface PolicyMeta {
  title?: string;
  version?: string;
  effectiveDate?: string;
  reviewDate?: string;
  appliesTo?: string;
  [key: string]: string | undefined;
}

interface PolicyEditorProps {
  policyContent: string;
  policyMeta: PolicyMeta;
  onSave?: (filledPolicy: string, filledMeta: PolicyMeta, assignedTeams?: string[]) => void;
  onGeneratePDF?: (filledPolicy: string, filledMeta: PolicyMeta) => void;
  teams?: { id: string; name: string }[];
  teamsLoading?: boolean;
  teamsError?: string | null;
}

interface PlaceholderField {
  id: string;
  placeholder: string;
  value: string;
  label: string;
  type: 'text' | 'date' | 'textarea';
}

export default function PolicyEditor({ policyContent, policyMeta, onSave, onGeneratePDF, teams = [], teamsLoading = false, teamsError = null }: PolicyEditorProps) {
  // State for assigned teams
  const [assignedTeams, setAssignedTeams] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract all placeholder fields from the policy content and metadata
  const placeholderFields = useMemo(() => {
    const fields: PlaceholderField[] = [];
    const placeholderRegex = /\[([^\]]+)\]/g;
    const foundPlaceholders = new Set<string>();

    // Check content for placeholders
    const contentMatches = policyContent.matchAll(placeholderRegex);
    for (const match of contentMatches) {
      const placeholder = match[1];
      if (!foundPlaceholders.has(placeholder)) {
        foundPlaceholders.add(placeholder);
        
        let type: 'text' | 'date' | 'textarea' = 'text';
        let label = placeholder;
        
        // Determine field type based on placeholder content
        if (placeholder.toLowerCase().includes('date') || placeholder.toLowerCase().includes('Date')) {
          // Customize labels and types for different date types
          if (placeholder.toLowerCase().includes('insert date]') || placeholder === 'Insert Date') {
            label = 'Effective Date';
            type = 'date'; // Use date picker for effective date
          } else if (placeholder.toLowerCase().includes('usually annually') || placeholder.includes('– usually annually')) {
            label = 'Renewal Date';
            type = 'text'; // Use custom month/year for renewal date
          } else {
            label = placeholder.replace(/Insert\s+/i, '').replace(/\s*–.*$/, '');
            type = 'date'; // Default to date picker for other dates
          }
        } else if (placeholder.toLowerCase().includes('care home') || 
                   placeholder.toLowerCase().includes('CARE HOME')) {
          label = 'Care Home Name';
        } else if (placeholder.toLowerCase().includes('data') || 
                   placeholder.toLowerCase().includes('Data')) {
          label = 'Data/Information';
        } else {
          // Clean up the label
          label = placeholder.replace(/^Insert\s+/i, '').replace(/^INSERT\s+/i, '');
        }

        fields.push({
          id: `placeholder_${fields.length}`,
          placeholder,
          value: '',
          label,
          type
        });
      }
    }

    // Check metadata for placeholders
    Object.entries(policyMeta).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const metaMatches = value.matchAll(placeholderRegex);
        for (const match of metaMatches) {
          const placeholder = match[1];
          if (!foundPlaceholders.has(placeholder)) {
            foundPlaceholders.add(placeholder);
            
            let type: 'text' | 'date' | 'textarea' = 'text';
            let label = placeholder;
            
            if (placeholder.toLowerCase().includes('date')) {
              type = 'date';
              label = `${key} - ${placeholder.replace(/Insert\s+/i, '')}`;
            } else {
              label = `${key} - ${placeholder.replace(/^Insert\s+/i, '').replace(/^INSERT\s+/i, '')}`;
            }

            fields.push({
              id: `meta_${key}_${fields.length}`,
              placeholder,
              value: '',
              label,
              type
            });
          }
        }
      }
    });

    return fields;
  }, [policyContent, policyMeta]);

  // Initialize form data when placeholders change
  useEffect(() => {
    const initialData: Record<string, string> = {};
    placeholderFields.forEach(field => {
      initialData[field.placeholder] = '';
    });
    setFormData(initialData);
  }, [placeholderFields]);

  // Replace placeholders in content with form values
  const filledContent = useMemo(() => {
    let content = policyContent;
    Object.entries(formData).forEach(([placeholder, value]) => {
      const regex = new RegExp(`\\[${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
      content = content.replace(regex, value || `[${placeholder}]`);
    });
    return content;
  }, [policyContent, formData]);

  // Replace placeholders in metadata with form values
  const filledMeta = useMemo(() => {
    const meta = { ...policyMeta };
    Object.entries(meta).forEach(([key, value]) => {
      if (typeof value === 'string') {
        Object.entries(formData).forEach(([placeholder, formValue]) => {
          const regex = new RegExp(`\\[${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
          (meta as any)[key] = value.replace(regex, formValue || `[${placeholder}]`);
        });
      }
    });
    return meta;
  }, [policyMeta, formData]);

  // Validation logic
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    placeholderFields.forEach(field => {
      const value = formData[field.placeholder]?.trim();
      
      // Mark required fields - fields containing "Date" or "CARE HOME" are typically required
      const isRequired = field.placeholder.toLowerCase().includes('date') || 
                        field.placeholder.toLowerCase().includes('care home') ||
                        field.placeholder.toLowerCase().includes('data');
      
      if (isRequired && (!value || value.length === 0)) {
        errors[field.placeholder] = `${field.label} is required`;
      }
      
      // Validate date fields
      if (field.type === 'date' && value && value.length > 0) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors[field.placeholder] = 'Please enter a valid date';
        }
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (placeholder: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [placeholder]: value
    }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[placeholder]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[placeholder];
        return newErrors;
      });
    }
  };

  const handleSave = () => {
    if (validateForm()) {
      // Normalize dates in meta before sending so server and listing read consistent YYYY-MM-DD
      const metaToSend: Record<string, any> = { ...filledMeta };
      // If the template provides a Renewal Date placeholder (stored as MM/YYYY in formData), prefer that
      try {
        // find any placeholder fields labelled Renewal Date
        const renewalField = placeholderFields.find(f => f.label === 'Renewal Date');
        if (renewalField) {
          const val = formData[renewalField.placeholder];
          if (val && typeof val === 'string') {
            const m = val.trim();
            const mmyyyy = m.match(/^(\d{1,2})\/(\d{4})$/);
            if (mmyyyy) {
              const month = String(mmyyyy[1]).padStart(2, '0');
              const year = mmyyyy[2];
              metaToSend.reviewDate = `${year}-${month}-01`;
            } else {
              // fallback: try to parse freeform value
              const parsed = new Date(m);
              if (!isNaN(parsed.getTime())) {
                const y = parsed.getFullYear();
                const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                const dd = String(parsed.getDate()).padStart(2, '0');
                metaToSend.reviewDate = `${y}-${mm}-${dd}`;
              }
            }
          }
        }

        // Also normalize any keys in meta that look like review/effective dates
        Object.keys(metaToSend).forEach((k) => {
          const lower = String(k).toLowerCase();
          if (lower.includes('review') || lower.includes('renewal') || lower.includes('effective')) {
            const raw = metaToSend[k];
            if (raw && typeof raw === 'string') {
              const mmYYYY = String(raw).trim().match(/^(\d{1,2})\/(\d{4})$/);
              if (mmYYYY) {
                const month = String(mmYYYY[1]).padStart(2, '0');
                const year = mmYYYY[2];
                metaToSend[k] = `${year}-${month}-01`;
              } else {
                // try Date parse fallback
                const attempt = new Date(String(raw));
                if (!isNaN(attempt.getTime())) {
                  const y = attempt.getFullYear();
                  const mm = String(attempt.getMonth() + 1).padStart(2, '0');
                  const dd = String(attempt.getDate()).padStart(2, '0');
                  metaToSend[k] = `${y}-${mm}-${dd}`;
                }
              }
            }
          }
        });
      } catch (e) {
        // Don't block saving if normalization fails
        console.warn('Date normalization failed in PolicyEditor.save', e);
      }

      onSave?.(filledContent, metaToSend, assignedTeams);
    }
  };

  const handleGeneratePDF = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields before generating the PDF.');
      return;
    }
    
    setIsGenerating(true);
    try {
      // Normalize meta similarly to save to ensure publication includes normalized reviewDate
      const metaToSend: Record<string, any> = { ...filledMeta };
      try {
        const renewalField = placeholderFields.find(f => f.label === 'Renewal Date');
        if (renewalField) {
          const val = formData[renewalField.placeholder];
          if (val && typeof val === 'string') {
            const m = val.trim();
            const mmyyyy = m.match(/^(\d{1,2})\/(\d{4})$/);
            if (mmyyyy) {
              const month = String(mmyyyy[1]).padStart(2, '0');
              const year = mmyyyy[2];
              metaToSend.reviewDate = `${year}-${month}-01`;
            } else {
              const parsed = new Date(m);
              if (!isNaN(parsed.getTime())) {
                const y = parsed.getFullYear();
                const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                const dd = String(parsed.getDate()).padStart(2, '0');
                metaToSend.reviewDate = `${y}-${mm}-${dd}`;
              }
            }
          }
        }
        Object.keys(metaToSend).forEach((k) => {
          const lower = String(k).toLowerCase();
          if (lower.includes('review') || lower.includes('renewal') || lower.includes('effective')) {
            const raw = metaToSend[k];
            if (raw && typeof raw === 'string') {
              const mmYYYY = String(raw).trim().match(/^(\d{1,2})\/(\d{4})$/);
              if (mmYYYY) {
                const month = String(mmYYYY[1]).padStart(2, '0');
                const year = mmYYYY[2];
                metaToSend[k] = `${year}-${month}-01`;
              } else {
                const attempt = new Date(String(raw));
                if (!isNaN(attempt.getTime())) {
                  const y = attempt.getFullYear();
                  const mm = String(attempt.getMonth() + 1).padStart(2, '0');
                  const dd = String(attempt.getDate()).padStart(2, '0');
                  metaToSend[k] = `${y}-${mm}-${dd}`;
                }
              }
            }
          }
        });
      } catch (e) {
        console.warn('Date normalization failed in PolicyEditor.generate', e);
      }

      await onGeneratePDF?.(filledContent, metaToSend);
    } finally {
      setIsGenerating(false);
    }
  };

  const previewHtml = useMemo(() => {
    // Configure marked for better policy document rendering
    const renderer = new marked.Renderer();
    
    // Custom heading renderer to handle numbered sections
    renderer.heading = function(text: string, level: number) {
      // Check if heading starts with a number (like "2. Purpose", "5.1 Ordering")
      const numberedMatch = text.match(/^(\d+(?:\.\d+)?)\.\s*(.+)$/);
      if (numberedMatch) {
        const [, number, title] = numberedMatch;
        if (level <= 2) {
          return `<h${level} class="numbered-heading level-${level}" style="margin-top: 32px; margin-bottom: 16px;"><strong>${number}. ${title}</strong></h${level}>`;
        }
        return `<h${level} class="numbered-heading level-${level}"><strong>${number}. ${title}</strong></h${level}>`;
      }
      return `<h${level} class="level-${level}"><strong>${text}</strong></h${level}>`;
    };

    // Custom paragraph renderer to handle indentation
    renderer.paragraph = function(text: string) {
      // Check if this paragraph contains role titles (ends with :)
      if (text.match(/^[A-Za-z\s]+(\([^)]+\))?:\s*$/)) {
        return `<p class="role-title"><strong>${text}</strong></p>`;
      }
      // Regular paragraph with content indentation
      return `<p class="policy-content">${text}</p>`;
    };

    // Custom list renderer to handle bullets properly
    renderer.list = function(body: string, ordered: boolean) {
      const tag = ordered ? 'ol' : 'ul';
      const className = ordered ? 'policy-ordered-list' : 'policy-unordered-list';
      return `<${tag} class="${className}">${body}</${tag}>`;
    };

    renderer.listitem = function(text: string) {
      // Only make the first part (before any description) bold
      const colonMatch = text.match(/^([^:]+:)(.*)$/);
      if (colonMatch) {
        const [, boldPart, restPart] = colonMatch;
        return `<li class="policy-list-item"><strong>${boldPart}</strong>${restPart}</li>`;
      }
      return `<li class="policy-list-item">${text}</li>`;
    };

    // Configure marked options
    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true
    });

    // Parse the markdown to HTML first
    let htmlContent = marked.parse(filledContent);
    
    // Now apply highlighting to the HTML content
    placeholderFields.forEach(field => {
      const value = formData[field.placeholder];
      if (value && value.trim() && value.trim().length >= 3) { // Only highlight if 3+ characters
        // Use word boundaries to avoid partial matches
        const highlightStyle = 'background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 4px; padding: 2px 6px; font-weight: bold; color: #92400e; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);';
        const escapedValue = value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundaries to match complete words only
        const regex = new RegExp(`\\b${escapedValue}\\b`, 'gi');
        htmlContent = htmlContent.replace(regex, `<span style="${highlightStyle}">${value.trim()}</span>`);
      }
    });

    return htmlContent;
  }, [filledContent, formData, placeholderFields]);

  return (
    <div className="w-full px-0 py-0">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 px-6 py-6">
        {/* Form Section */}
        <div className="xl:col-span-2 space-y-6">

          <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Team Assignment UI removed from here; only present in the main form below */}
            <h2 className="text-lg font-semibold mb-4">Required Information</h2>
            {placeholderFields.length === 0 ? (
              <p className="text-gray-500">No editable fields found in this policy.</p>
            ) : (
              <>
                {Object.keys(validationErrors).length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800 text-sm font-medium">Please fix the following errors:</p>
                    <ul className="mt-1 text-red-700 text-sm list-disc list-inside">
                      {Object.values(validationErrors).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-blue-800 text-sm">
                    This policy contains <strong>{placeholderFields.length}</strong> customisable field{placeholderFields.length !== 1 ? 's' : ''}. 
                    Fields marked with <span className="text-red-500">*</span> are required.
                  </p>
                </div>
                
                <div className="space-y-4">
                {/* Teams checkboxes for intuitive multi-selection, styled as a card */}
                <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Assign to Teams</label>
                  <div className="flex flex-wrap gap-3">
                    {(teams && teams.length > 0 ? teams : [
                      { id: 'management', name: 'Management' },
                      { id: 'nurses', name: 'Nurses' },
                      { id: 'ctm', name: 'CTM' },
                      { id: 'domestic', name: 'Domestic' },
                      { id: 'maintenance', name: 'Maintenance' },
                      { id: 'kitchen', name: 'Kitchen' },
                      { id: 'activities', name: 'Activities' },
                    ]).map((team: any) => (
                      <label
                        key={team.id}
                        className={
                          `flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm transition-colors cursor-pointer hover:border-blue-400 ${assignedTeams.includes(team.id) ? 'ring-2 ring-blue-200 border-blue-400' : ''}`
                        }
                        style={{ minWidth: 120 }}
                      >
                        <input
                          type="checkbox"
                          value={team.id}
                          checked={assignedTeams.includes(team.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setAssignedTeams(prev => [...prev, team.id]);
                            } else {
                              setAssignedTeams(prev => prev.filter(t => t !== team.id));
                            }
                          }}
                          className="accent-blue-600 w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-gray-700 font-medium">{team.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Select one or more teams to assign this policy to.</p>
                </div>
                {placeholderFields.filter(field => field.label !== 'e.g., 3 or 6 months' && field.placeholder !== 'e.g., 3 or 6 months').map((field) => {
                  const hasError = validationErrors[field.placeholder];
                  const isRequired = field.placeholder.toLowerCase().includes('date') || 
                                   field.placeholder.toLowerCase().includes('care home') ||
                                   field.placeholder.toLowerCase().includes('data');
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.placeholder] || ''}
                          onChange={(e) => handleFieldChange(field.placeholder, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          rows={3}
                        />
                      ) : field.label === 'Renewal Date' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                            <select
                              value={formData[field.placeholder]?.split('/')[0] || ''}
                              onChange={(e) => {
                                const currentValue = formData[field.placeholder] || '/';
                                const year = currentValue.split('/')[1] || new Date().getFullYear();
                                handleFieldChange(field.placeholder, `${e.target.value}/${year}`);
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                            >
                              <option value="">Month</option>
                              <option value="01">January</option>
                              <option value="02">February</option>
                              <option value="03">March</option>
                              <option value="04">April</option>
                              <option value="05">May</option>
                              <option value="06">June</option>
                              <option value="07">July</option>
                              <option value="08">August</option>
                              <option value="09">September</option>
                              <option value="10">October</option>
                              <option value="11">November</option>
                              <option value="12">December</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                            <select
                              value={formData[field.placeholder]?.split('/')[1] || ''}
                              onChange={(e) => {
                                const currentValue = formData[field.placeholder] || '/';
                                const month = currentValue.split('/')[0] || '';
                                handleFieldChange(field.placeholder, `${month}/${e.target.value}`);
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                            >
                              <option value="">Year</option>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() + i;
                                return <option key={year} value={year}>{year}</option>;
                              })}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.placeholder] || ''}
                          onChange={(e) => handleFieldChange(field.placeholder, e.target.value)}
                          placeholder={field.type === 'date' ? '' : `Enter ${field.label.toLowerCase()}`}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                      )}
                      {hasError && (
                        <p className="text-red-500 text-xs mt-1">{hasError}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Replaces: [{field.placeholder}]
                      </p>
                    </div>
                  );
                })}
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                disabled={isGenerating}
              >
                Save Draft
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Publishing...
                  </>
                ) : (
                  'Publish & Download PDF'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Section - Always Visible */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border h-fit sticky top-6">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Policy Preview</h2>
              <p className="text-sm text-gray-600 mt-1">Live preview of your customised policy</p>
            </div>
            <div className="p-6">
              <div className="prose prose-sm max-w-none">
                {/* DocuFlow Header */}
                <div className="policy-header" style={{
                  background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                  borderBottom: '2px solid #1f2937',
                  padding: '20px',
                  marginBottom: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '8px 8px 0 0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                      src="/Neurodiversity_Symbol.png" 
                      alt="CG360 Logo" 
                      style={{ 
                        height: '40px',
                        width: 'auto'
                      }}
                    />
                    <div>
                      <h1 style={{
                        margin: '0',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        fontFamily: 'Arial, sans-serif'
                      }}>
                        CG360
                      </h1>
                      <p style={{
                        margin: '0',
                        fontSize: '12px',
                        color: '#e5e7eb',
                        fontFamily: 'Arial, sans-serif'
                      }}>
                        Policy Management System
                      </p>
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: '12px',
                    color: '#e5e7eb',
                    fontFamily: 'Arial, sans-serif'
                  }}>
                    <p style={{ margin: '0' }}>Generated: {new Date().toLocaleDateString()}</p>
                    <p style={{ margin: '0' }}>Version: 1.0</p>
                  </div>
                </div>
                
                <div
                  className="policy-preview border border-blue-200 rounded p-2 min-h-[300px] focus:outline-none"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={true}
                  onInput={e => {
                    // Update the policy content state with the edited HTML/markdown
                    // You may want to convert HTML back to markdown if needed
                    // For now, just update the raw HTML as the new policy content
                    // @ts-ignore
                    if (typeof setPolicyContent === 'function') setPolicyContent(e.currentTarget.innerText);
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .policy-preview {
          font-family: 'Arial', 'Helvetica', sans-serif;
          line-height: 1.5;
          color: #000;
          background-color: #fff;
          max-width: none;
          font-size: 14px;
        }
        
        /* Main title - typically H1 */
        .policy-preview h1 {
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0 15px 0;
          color: #000;
          text-align: center;
        }
        
        /* Section headings with numbers - H2 */
        .policy-preview h2 {
          font-size: 16px;
          font-weight: bold;
          margin: 32px 0 16px 0;
          color: #000;
        }
        
        /* Sub-section headings - H3 */
        .policy-preview h3 {
          font-size: 15px;
          font-weight: bold;
          margin: 24px 0 12px 0;
          color: #000;
        }
        
        /* Sub-sub-section headings - H4 */
        .policy-preview h4 {
          font-size: 14px;
          font-weight: bold;
          margin: 20px 0 8px 0;
          color: #000;
        }
        
        /* Role titles (like "Registered Manager:", "Responsible Staff:") */
        .policy-preview .role-title {
          margin: 20px 0 8px 20px;
          line-height: 1.6;
          font-weight: bold;
          color: #000;
        }
        
        /* Regular content paragraphs - indented under sections */
        .policy-preview .policy-content {
          margin: 16px 0 16px 20px;
          line-height: 1.6;
          text-align: left;
        }
        
        /* Special case for paragraphs directly after H1 (no indent) */
        .policy-preview h1 + .policy-content {
          margin-left: 0;
          text-align: center;
        }
        
        /* Content that follows role titles should be indented more */
        .policy-preview .role-title + .policy-content {
          margin-left: 40px;
          margin-top: 8px;
        }
        
        /* Unordered lists (bullet points) - indent under sections */
        .policy-preview .policy-unordered-list {
          margin: 20px 0 24px 20px;
          padding-left: 0;
          list-style: none;
        }
        
        .policy-preview .policy-unordered-list .policy-list-item {
          margin: 12px 0;
          padding-left: 15px;
          position: relative;
          line-height: 1.6;
        }
        
        .policy-preview .policy-unordered-list .policy-list-item::before {
          content: "•";
          position: absolute;
          left: 0;
          font-weight: bold;
          color: #000;
        }
        
        /* Ordered lists (numbered) - indent under sections */
        .policy-preview .policy-ordered-list {
          margin: 20px 0 24px 20px;
          padding-left: 0;
          list-style: none;
          counter-reset: item;
        }
        
        .policy-preview .policy-ordered-list .policy-list-item {
          margin: 12px 0;
          padding-left: 25px;
          position: relative;
          line-height: 1.6;
          counter-increment: item;
        }
        
        .policy-preview .policy-ordered-list .policy-list-item::before {
          content: counter(item) ".";
          position: absolute;
          left: 0;
          font-weight: bold;
          color: #000;
        }
        
        /* Handle legacy ul/ol that don't have our classes - also indent */
        .policy-preview ul:not(.policy-unordered-list) {
          margin: 20px 0 24px 20px;
          padding-left: 0;
          list-style: none;
        }
        
        .policy-preview ul:not(.policy-unordered-list) li {
          margin: 12px 0;
          padding-left: 15px;
          position: relative;
          line-height: 1.6;
        }
        
        .policy-preview ul:not(.policy-unordered-list) li::before {
          content: "•";
          position: absolute;
          left: 0;
          font-weight: bold;
          color: #000;
        }
        
        .policy-preview ol:not(.policy-ordered-list) {
          margin: 20px 0 24px 20px;
          padding-left: 0;
          list-style: none;
          counter-reset: item;
        }
        
        .policy-preview ol:not(.policy-ordered-list) li {
          margin: 12px 0;
          padding-left: 25px;
          position: relative;
          line-height: 1.6;
          counter-increment: item;
        }
        
        .policy-preview ol:not(.policy-ordered-list) li::before {
          content: counter(item) ".";
          position: absolute;
          left: 0;
          font-weight: bold;
          color: #000;
        }
        
        /* Text formatting */
        .policy-preview strong {
          font-weight: bold;
          color: #000;
        }
        
        .policy-preview em {
          font-style: italic;
          color: #000;
        }
        
        /* Tables - also indent */
        .policy-preview table {
          width: calc(100% - 20px);
          margin: 12px 0 12px 20px;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        .policy-preview th,
        .policy-preview td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
        }
        
        .policy-preview th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        /* Blockquotes - also indent */
        .policy-preview blockquote {
          margin: 10px 0 10px 20px;
          padding: 0;
          border: none;
          background: none;
          font-style: normal;
        }
        
        /* Horizontal rules */
        .policy-preview hr {
          border: none;
          border-top: 1px solid #000;
          margin: 15px 0;
        }
        
        /* Highlighted fields - show user feedback for filled placeholders */
        .policy-preview .highlighted-field {
          background-color: #fef3c7 !important;
          border: 1px solid #f59e0b !important;
          border-radius: 3px !important;
          padding: 1px 4px !important;
          font-weight: 600 !important;
          color: #92400e !important;
          box-shadow: 0 1px 2px rgba(245, 158, 11, 0.1) !important;
          display: inline !important;
        }
        
        /* More specific selectors to ensure highlighting works everywhere */
        .policy-preview p .highlighted-field,
        .policy-preview li .highlighted-field,
        .policy-preview h1 .highlighted-field,
        .policy-preview h2 .highlighted-field,
        .policy-preview h3 .highlighted-field,
        .policy-preview h4 .highlighted-field,
        .policy-preview strong .highlighted-field,
        .policy-preview .policy-content .highlighted-field {
          background-color: #fef3c7 !important;
          border: 1px solid #f59e0b !important;
          border-radius: 3px !important;
          padding: 1px 4px !important;
          font-weight: 600 !important;
          color: #92400e !important;
          box-shadow: 0 1px 2px rgba(245, 158, 11, 0.1) !important;
          display: inline !important;
        }
      `}</style>
    </div>
  );
}