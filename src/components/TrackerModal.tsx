import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface TrackerModalProps {
  isOpen: boolean;
  role: string;
  month: number;
  year?: number;
  appraisals: string[];
  onClose: () => void;
  onSelectAppraisal: (appraisal: string) => void;
  onViewCompletedAppraisal?: (appraisal: string) => void;
  completionStatus: Record<string, boolean>;
}

const TrackerModal: React.FC<TrackerModalProps> = ({
  isOpen,
  role,
  month,
  year,
  appraisals,
  onClose,
  onSelectAppraisal,
  onViewCompletedAppraisal,
  completionStatus,
}) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-900">
            {role} - {monthNames[month]} {year ?? ''}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Select an appraisal to complete for {monthNames[month]} {year ?? ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {appraisals.map((appraisal) => {
            // Determine whether this appraisal is completed for the displayed month/year
            const isCompleted = (() => {
              if (!completionStatus) return false;
              // Look for new format: slug-YYYY-M
              for (const k of Object.keys(completionStatus)) {
                const newMatch = k.match(/^(.+)-(\d{4})-(\d{1,2})$/);
                if (newMatch) {
                  const slug = newMatch[1];
                  const y = parseInt(newMatch[2], 10);
                  const m = parseInt(newMatch[3], 10);
                  if (slug === appraisal && m === month && y === (year ?? new Date().getFullYear()) && completionStatus[k]) return true;
                }
                const legacyMatch = k.match(/^(.+)-(\d{1,2})$/);
                if (legacyMatch) {
                  const slug = legacyMatch[1];
                  const m = parseInt(legacyMatch[2], 10);
                  // Infer year for legacy entries in the same way the app does
                  const now = new Date();
                  const inferredYear = m <= now.getMonth() ? now.getFullYear() : now.getFullYear() - 1;
                  if (slug === appraisal && m === month && inferredYear === (year ?? now.getFullYear()) && completionStatus[k]) return true;
                }
              }
              return false;
            })();
            return (
              <button
                key={appraisal}
                onClick={() => {
                  if (isCompleted) {
                    if (onViewCompletedAppraisal) onViewCompletedAppraisal(appraisal);
                    return;
                  }
                  onSelectAppraisal(appraisal);
                }}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  isCompleted
                    ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                    <span className="font-medium capitalize">
                      {appraisal.replace(/-/g, ' ').replace('supervision', 'Supervision')}
                    </span>
                  </div>
                  {isCompleted && (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 text-sm font-medium">Completed</span>
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                </div>
                {!isCompleted && (
                  <div className="mt-2 text-sm text-gray-500">
                    Click to start this appraisal
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrackerModal;