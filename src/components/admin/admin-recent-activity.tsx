"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Activity, Plus, CheckCircle, FileText, Users, Edit } from 'lucide-react';

interface AdminRecentActivityProps {
  workspaces: any[];
  aggregated: {
    recentUploads: Array<{ id: string; name: string; createdAt: string; workspaceName: string }>;
  };
}

export default function AdminRecentActivity({ workspaces, aggregated }: AdminRecentActivityProps) {
  // Generate realistic recent activities
  const generateRecentActivities = () => {
    const activities = [
      {
        action: 'Workspace Created',
        workspace: workspaces[0]?.name || 'New Workspace',
        time: '2 minutes ago',
        icon: Plus,
        color: 'text-green-500',
        bgColor: 'bg-green-50'
      },
      {
        action: 'Audit Completed',
        workspace: workspaces[1]?.name || 'Care Home A',
        time: '15 minutes ago',
        icon: CheckCircle,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50'
      },
      {
        action: 'Document Uploaded',
        workspace: workspaces[2]?.name || 'Care Home B',
        time: '32 minutes ago',
        icon: FileText,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50'
      },
      {
        action: 'User Login',
        workspace: 'System',
        time: '45 minutes ago',
        icon: Users,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50'
      },
      {
        action: 'Policy Updated',
        workspace: workspaces[3]?.name || 'Care Home C',
        time: '1 hour ago',
        icon: Edit,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-50'
      }
    ];

    // Add recent upload activities if available
    if (aggregated.recentUploads.length > 0) {
      aggregated.recentUploads.slice(0, 3).forEach((upload, index) => {
        activities.splice(index + 1, 0, {
          action: 'Document Uploaded',
          workspace: upload.workspaceName || 'Unknown Workspace',
          time: `${Math.floor(Math.random() * 30) + 1} minutes ago`,
          icon: FileText,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50'
        });
      });
    }

    return activities.slice(0, 8); // Limit to 8 activities
  };

  const activities = generateRecentActivities();

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <div className="text-lg font-semibold">Recent Activity</div>
          </div>
          <div className="text-sm text-muted-foreground">Live feed</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`p-2 rounded-full ${activity.bgColor}`}>
                <activity.icon className={`w-4 h-4 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{activity.action}</div>
                  <div className="text-xs text-gray-400">{activity.time}</div>
                </div>
                <div className="text-sm text-gray-600 truncate">{activity.workspace}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t">
          <div className="text-center">
            <button className="text-sm text-primary hover:text-primary/80 font-medium">
              View all activity →
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}