import React from 'react';

type Props = {
  finalComments: string;
  setFinalComments: (v: string) => void;
  saving?: boolean;
};

export default function AuditFooter({ finalComments, setFinalComments, saving = false }: Props) {
  return (
    <div className="border-l-4 border-gray-300 pl-4 mt-6">
      <h3 className="text-md font-medium text-gray-800 mb-2">Final Comments</h3>
      <textarea
        name="finalComments"
        value={finalComments}
        onChange={(e) => setFinalComments(e.target.value)}
        placeholder="Any final comments or observations about this audit..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-24 resize-none"
      />
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-md transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Complete Audit'}
        </button>
      </div>
    </div>
  );
}
