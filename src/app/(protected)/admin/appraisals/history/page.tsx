"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, User, Calendar, Search, Filter, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Appraisal } from "@/types";

export default function AppraisalsHistoryPage() {
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [filteredAppraisals, setFilteredAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");

  useEffect(() => {
    fetchAppraisals();
  }, []);

  useEffect(() => {
    filterAppraisals();
  }, [appraisals, searchTerm, statusFilter, workspaceFilter]);

  const fetchAppraisals = async () => {
    try {
      const response = await fetch('/api/admin/appraisals');
      if (response.ok) {
        const data = await response.json();
        setAppraisals(data.appraisals);
      }
    } catch (error) {
      console.error('Failed to fetch appraisals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAppraisals = () => {
    let filtered = appraisals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(appraisal =>
        appraisal.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appraisal.appraiser.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appraisal.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(appraisal => appraisal.status === statusFilter);
    }

    // Workspace filter
    if (workspaceFilter !== "all") {
      filtered = filtered.filter(appraisal => appraisal.workspaceId === workspaceFilter);
    }

    setFilteredAppraisals(filtered);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appraisals...</p>
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
                <Link href="/admin/appraisals">
                  <Button variant="secondary" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to New Appraisal
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Appraisal History</h1>
                  <p className="text-blue-100 text-lg">View and search previous appraisals</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/20 to-transparent rounded-b-2xl"></div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Filter className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Search & Filter</h2>
                  <p className="text-sm text-muted-foreground">Find specific appraisals</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Search by name, appraiser, or role..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspace">Workspace</Label>
                  <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All workspaces" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Workspaces</SelectItem>
                      {/* TODO: Populate with actual workspaces */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Appraisals ({filteredAppraisals.length})
              </h2>
            </div>

            {filteredAppraisals.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No appraisals found</h3>
                  <p className="text-gray-500">
                    {appraisals.length === 0
                      ? "No appraisals have been created yet."
                      : "Try adjusting your search criteria."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredAppraisals.map((appraisal) => (
                  <Card key={appraisal.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{appraisal.managerName}</h3>
                            <p className="text-sm text-muted-foreground">{appraisal.role}</p>
                            <p className="text-sm text-muted-foreground">
                              Appraiser: {appraisal.appraiser}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {formatDate(appraisal.appraisalDate)}
                            </span>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appraisal.status)}`}>
                            {appraisal.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Period: {appraisal.periodCovered}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/appraisals/${appraisal.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}