import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  name: string;
  type?: string;
  createdAt: string;
  workspaceName?: string;
  owner?: { name: string | null };
  fileType?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  title?: string;
  maxItems?: number;
  className?: string;
}

export default function ActivityFeed({ 
  items, 
  title = "Recent Activity", 
  maxItems = 10,
  className = ""
}: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  const getFileTypeColor = (fileType?: string) => {
    const colors: Record<string, string> = {
      pdf: 'bg-red-100 text-red-700',
      doc: 'bg-blue-100 text-blue-700',
      docx: 'bg-blue-100 text-blue-700',
      xlsx: 'bg-green-100 text-green-700',
      csv: 'bg-yellow-100 text-yellow-700',
      txt: 'bg-gray-100 text-gray-700',
    };
    return colors[fileType || ''] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {displayItems.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No recent activity
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems.map((item) => (
              <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium truncate" title={item.name}>
                      {item.name}
                    </p>
                    {item.fileType && (
                      <Badge variant="secondary" className={`text-xs ${getFileTypeColor(item.fileType)}`}>
                        {item.fileType.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    {item.workspaceName && (
                      <span className="truncate" title={item.workspaceName}>
                        {item.workspaceName}
                      </span>
                    )}
                    {item.owner?.name && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          by {item.owner.name}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span title={new Date(item.createdAt).toLocaleString()}>
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}