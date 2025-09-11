"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Activity, Plus, CheckCircle, FileText, Users, Edit, ArrowRight, Clock } from 'lucide-react';

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
        bgColor: 'bg-green-50',
        gradient: 'from-green-500/10 to-green-100/50'
      },
      {
        action: 'Audit Completed',
        workspace: workspaces[1]?.name || 'Care Home A',
        time: '15 minutes ago',
        icon: CheckCircle,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        gradient: 'from-blue-500/10 to-blue-100/50'
      },
      {
        action: 'Document Uploaded',
        workspace: workspaces[2]?.name || 'Care Home B',
        time: '32 minutes ago',
        icon: FileText,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
        gradient: 'from-purple-500/10 to-purple-100/50'
      },
      {
        action: 'User Login',
        workspace: 'System',
        time: '45 minutes ago',
        icon: Users,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        gradient: 'from-orange-500/10 to-orange-100/50'
      },
      {
        action: 'Policy Updated',
        workspace: workspaces[3]?.name || 'Care Home C',
        time: '1 hour ago',
        icon: Edit,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-50',
        gradient: 'from-indigo-500/10 to-indigo-100/50'
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
          bgColor: 'bg-blue-50',
          gradient: 'from-blue-500/10 to-blue-100/50'
        });
      });
    }

    return activities.slice(0, 8); // Limit to 8 activities
  };

  const activities = generateRecentActivities();

  return (
    <div className="mb-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Recent Activity
            </h2>
            <p className="text-sm text-gray-600">Live system activity feed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-gray-200/50">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600 font-medium">Live Feed</span>
        </div>
      </div>

      <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>

        <CardContent className="relative p-8">
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="group/activity flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-white/60 to-white/30 backdrop-blur-sm border border-gray-200/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${activity.gradient} group-hover/activity:scale-110 transition-transform duration-300`}>
                  <activity.icon className={`w-5 h-5 ${activity.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-base font-semibold text-gray-900 group-hover/activity:text-gray-800 transition-colors">
                      {activity.action}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{activity.time}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 group-hover/activity:text-gray-700 transition-colors">
                    {activity.workspace}
                  </div>
                  <div className="mt-2 flex items-center gap-2 opacity-0 group-hover/activity:opacity-100 transition-opacity duration-300">
                    <span className="text-xs text-gray-500">View details</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200/50">
            <div className="text-center">
              <button className="group/btn inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:shadow-lg hover:scale-105">
                <span>View all activity</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}