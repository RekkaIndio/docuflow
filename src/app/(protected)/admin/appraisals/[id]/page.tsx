"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { Appraisal } from "@/types";

interface AppraisalDetailsPageProps {
  params: {
    id: string;
  };
}

export default function AppraisalDetailsPage({ params }: AppraisalDetailsPageProps) {
  const [appraisal, setAppraisal] = useState<Appraisal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // params may be a Promise in some Next.js versions — unwrap it inside the async
  // fetch routine to avoid accessing params.id synchronously.
  useEffect(() => {
    fetchAppraisal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAppraisal = async () => {
    try {
      // params can be a Promise in some Next.js setups. Await if needed.
      // We avoid directly reading params.id at top-level to prevent the console warning.
  const maybePromise: any = params as any;
  const resolvedParams: any = typeof maybePromise?.then === 'function' ? await maybePromise : maybePromise;
      const id = resolvedParams?.id;
      if (!id) {
        setError('Invalid appraisal id');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/appraisals/${id}`);
      if (response.ok) {
        const data = await response.json();
        setAppraisal(data.appraisal);
      } else {
        setError('Failed to load appraisal');
      }
    } catch (error) {
      console.error('Failed to fetch appraisal:', error);
      setError('Failed to load appraisal');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getObjectiveStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'partially':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'not-achieved':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appraisal...</p>
        </div>
      </div>
    );
  }

  if (error || !appraisal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{error || 'Appraisal not found'}</p>
          <Link href="/admin/appraisals/history">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden shadow-lg mb-8 rounded-b-2xl">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="relative z-10 px-6 py-8 md:px-8 md:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <Link href="/admin/appraisals/history">
                  <Button variant="secondary" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to History
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Appraisal Details</h1>
                  <p className="text-blue-100 text-lg">{appraisal.managerName} - {appraisal.role}</p>
                </div>
              </div>
              <Badge className={`${getStatusColor(appraisal.status)} text-sm px-3 py-1`}>
                {appraisal.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/20 to-transparent rounded-b-2xl"></div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Basic Information */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Basic Information</h2>
                  <p className="text-sm text-muted-foreground">Appraisal details and participants</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Manager Details</h3>
                  <p className="text-sm text-gray-600"><strong>Name:</strong> {appraisal.managerName}</p>
                  <p className="text-sm text-gray-600"><strong>Role:</strong> {appraisal.role}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Appraisal Details</h3>
                  <p className="text-sm text-gray-600"><strong>Appraiser:</strong> {appraisal.appraiser}</p>
                  <p className="text-sm text-gray-600"><strong>Date:</strong> {formatDate(appraisal.appraisalDate)}</p>
                  <p className="text-sm text-gray-600"><strong>Period Covered:</strong> {appraisal.periodCovered}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Previous Objectives */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Previous Objectives</h2>
                  <p className="text-sm text-muted-foreground">Review of previous performance objectives</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {appraisal.previousObjectives.map((obj, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getObjectiveStatusIcon(obj.status)}
                      <span className="font-medium capitalize">{obj.status}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2"><strong>Objective:</strong> {obj.objective}</p>
                    <p className="text-sm text-gray-600"><strong>Comments:</strong> {obj.comments}</p>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700"><strong>Overall Comments:</strong> {appraisal.previousObjectivesOverallComments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Performance Areas */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Key Performance Areas</h2>
                  <p className="text-sm text-muted-foreground">Assessment of core performance areas</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Care Quality & Compliance</h3>
                  <p className="text-sm text-gray-600">{appraisal.careQualityCompliance}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Leadership & People Management</h3>
                  <p className="text-sm text-gray-600">{appraisal.leadershipPeopleManagement}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Resident Outcomes & Engagement</h3>
                  <p className="text-sm text-gray-600">{appraisal.residentOutcomesEngagement}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Business & Operational Performance</h3>
                  <p className="text-sm text-gray-600">{appraisal.businessOperationalPerformance}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strengths and Development */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Strengths & Development</h2>
                  <p className="text-sm text-muted-foreground">Achievements and areas for improvement</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Strengths & Achievements</h3>
                  <p className="text-sm text-gray-600">{appraisal.strengthsAchievements}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Development Needs</h3>
                  <p className="text-sm text-gray-600">{appraisal.developmentNeeds}</p>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Next Objectives</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {appraisal.nextObjectives.map((objective, index) => (
                    <li key={index}>{objective}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Career Development */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Career Development</h2>
                  <p className="text-sm text-muted-foreground">Training and career progression</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Training Completed</h3>
                  <p className="text-sm text-gray-600">{appraisal.trainingCompleted}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Training Required</h3>
                  <p className="text-sm text-gray-600">{appraisal.trainingRequired}</p>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Career Aspirations</h3>
                <p className="text-sm text-gray-600">{appraisal.careerAspirations}</p>
              </div>
            </CardContent>
          </Card>

          {/* Wellbeing */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Wellbeing</h2>
                  <p className="text-sm text-muted-foreground">Support and wellbeing assessment</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Managing Demands</h3>
                  <p className="text-sm text-gray-600">{appraisal.managingDemands}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Senior Management Support</h3>
                  <p className="text-sm text-gray-600">{appraisal.seniorManagementSupport}</p>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Reasonable Adjustments</h3>
                <p className="text-sm text-gray-600">{appraisal.reasonableAdjustments}</p>
              </div>
            </CardContent>
          </Card>

          {/* Overall Outcome */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Overall Outcome</h2>
                  <p className="text-sm text-muted-foreground">Final assessment and ratings</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Overall Rating</h3>
                <Badge variant="outline" className="text-lg px-4 py-2 capitalize">
                  {appraisal.overallRating.replace('-', ' ')}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Appraiser Summary</h3>
                  <p className="text-sm text-gray-600">{appraisal.summaryCommentsAppraiser}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Appraisee Summary</h3>
                  <p className="text-sm text-gray-600">{appraisal.summaryCommentsAppraisee}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signatures */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Signatures</h2>
                  <p className="text-sm text-muted-foreground">Approval and confirmation</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Manager Signature</h3>
                  <p className="text-sm text-gray-600">{appraisal.managerSignature}</p>
                  <p className="text-sm text-gray-500">Date: {formatDate(appraisal.managerSignatureDate)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Appraiser Signature</h3>
                  <p className="text-sm text-gray-600">{appraisal.appraiserSignature}</p>
                  <p className="text-sm text-gray-500">Date: {formatDate(appraisal.appraiserSignatureDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}