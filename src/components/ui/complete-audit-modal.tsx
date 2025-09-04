import React from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateActionPlan: () => void;
}

export default function CompleteAuditModal({ open, onClose, onCreateActionPlan }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div role="dialog" aria-modal="true" className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Audit Completed</h3>
        <p className="text-gray-600 mb-6">Would you like to create an action plan based on this audit?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">No, thanks</button>
          <button onClick={() => { onCreateActionPlan(); onClose(); }} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Create Action Plan</button>
        </div>
      </div>
    </div>
  );
}
