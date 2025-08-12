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
      // Filter for documents with a renewalDate in the future or today
      const now = new Date();
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
      <h2 className="text-2xl font-bold mb-4">Upcoming Renewals</h2>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-muted-foreground">No upcoming renewals found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {documents.map(doc => {
            const renewalDate = doc.renewalDate ? new Date(doc.renewalDate) : null;
            const isSoon = renewalDate && (renewalDate.getTime() - Date.now()) < 1000 * 60 * 60 * 24 * 30; // within 30 days
            return (
              <button
                key={doc.id}
                className={`group text-left focus:outline-none transition-transform hover:-translate-y-1`}
                onClick={() => onSelectDocument?.(doc)}
                style={{ width: '100%' }}
              >
                <Card className={`h-full border-2 ${isSoon ? 'border-red-500' : 'border-primary/40'} group-hover:shadow-lg transition-shadow`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="truncate flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary/60" />
                      {doc.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`text-lg font-bold ${isSoon ? 'text-red-600' : 'text-primary'} bg-primary/10 px-2 py-1 rounded mb-1`}>
                        {renewalDate ? renewalDate.toLocaleDateString() : "-"}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Renewal Date</span>
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
