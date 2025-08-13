import React, { useEffect, useState } from "react";
import type { Document } from "@/lib/types";
import { searchDocumentsInWorkspace } from "@/lib/firestore";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


interface RenewalsViewProps {
  workspaceId: string;
  onSelectDocument?: (doc: Document) => void;
}

export function RenewalsView({ workspaceId, onSelectDocument }: RenewalsViewProps) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    async function fetchRenewals() {
      setLoading(true);
      const docs = await searchDocumentsInWorkspace(workspaceId, "");
      // Filter for documents with a renewalDate
      const withRenewal = docs.filter(doc => doc.renewalDate);
      withRenewal.sort((a, b) => {
        if (!a.renewalDate) return 1;
        if (!b.renewalDate) return -1;
        return new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime();
      });
      setDocuments(withRenewal);
      setLoading(false);
    }
    fetchRenewals();
  }, [workspaceId]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Policy Renewals</h2>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-muted-foreground">No renewals found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {documents.map(doc => {
            const renewalDate = doc.renewalDate ? new Date(doc.renewalDate) : null;
            const now = new Date();
            const daysDiff = renewalDate ? Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
            
            // Traffic light system
            let status: 'overdue' | 'upcoming' | 'future' = 'future';
            if (daysDiff !== null) {
              if (daysDiff < 0) {
                status = 'overdue';
              } else if (daysDiff <= 30) {
                status = 'upcoming';
              }
            }

            const getStatusColors = (status: string) => {
              switch (status) {
                case 'overdue':
                  return {
                    border: 'border-red-500',
                    indicator: 'bg-red-500',
                    dateText: 'text-red-600',
                    dateBg: 'bg-red-50 border border-red-200',
                    label: 'OVERDUE'
                  };
                case 'upcoming':
                  return {
                    border: 'border-orange-500',
                    indicator: 'bg-orange-500',
                    dateText: 'text-orange-600',
                    dateBg: 'bg-orange-50 border border-orange-200',
                    label: 'DUE SOON'
                  };
                default:
                  return {
                    border: 'border-green-500',
                    indicator: 'bg-green-500',
                    dateText: 'text-green-600',
                    dateBg: 'bg-green-50 border border-green-200',
                    label: 'FUTURE'
                  };
              }
            };

            const colors = getStatusColors(status);

            return (
              <button
                key={doc.id}
                className={`group text-left focus:outline-none transition-transform hover:-translate-y-1`}
                onClick={() => onSelectDocument?.(doc)}
                style={{ width: '100%' }}
              >
                <Card className={`h-full border-2 ${colors.border} group-hover:shadow-lg transition-shadow`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="truncate flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${colors.indicator} shadow-sm`} />
                      {doc.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`text-lg font-bold ${colors.dateText} ${colors.dateBg} px-3 py-1 rounded mb-1`}>
                        {renewalDate ? renewalDate.toLocaleDateString() : "-"}
                      </span>
                      <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${colors.dateBg} ${colors.dateText}`}>
                        {colors.label}
                      </span>
                      {daysDiff !== null && (
                        <span className="text-xs text-muted-foreground">
                          {daysDiff < 0 
                            ? `${Math.abs(daysDiff)} days overdue` 
                            : daysDiff === 0 
                            ? 'Due today' 
                            : `${daysDiff} days remaining`}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">Uploaded: {(() => {
                        const d = typeof doc.createdAt === 'string' || typeof doc.createdAt === 'number'
                          ? new Date(doc.createdAt)
                          : null;
                        return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : '-';
                      })()}</span>
                      <span className="text-xs text-muted-foreground">Type: {doc.fileType}</span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
