import Link from 'next/link'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { HelpCircle, PlayCircle, Search, BookOpen, Users, FileText, Settings, BarChart3, MessageSquare, ExternalLink, Shield, ChevronRight, Play, Video, BrainCircuit, Zap, Calendar, CheckCircle2, Sparkles, Mail, Phone, Clock } from 'lucide-react'

export default function HelpPage() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [ticketSubmitted, setTicketSubmitted] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <HelpCircle className="w-4 h-4" />
              Help Center
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Find answers and get
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                expert support
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
              Comprehensive guides, tutorials, and support to help you master CG-360 and ensure compliance excellence.
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search help articles..."
                  className="pl-12 pr-4 py-4 border-slate-200/50 bg-white/50 backdrop-blur-sm focus:border-blue-300 focus:ring-blue-200 rounded-xl shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
        {/* Tabs */}
        <Tabs defaultValue="help" className="w-full">
          <TabsList className="grid h-auto items-center w-full max-w-md grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm mb-12">
            <TabsTrigger value="help" className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <HelpCircle className="w-4 h-4" />
              Help & FAQ
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <PlayCircle className="w-4 h-4" />
              Tutorial Videos
            </TabsTrigger>
          </TabsList>

          {/* Help & FAQ Tab */}
          <TabsContent value="help" className="space-y-12">
            {/* Quick Start Guide */}
            <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="pb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Quick Start Guide</CardTitle>
                    <CardDescription className="text-lg">
                      Get up and running with CG-360 in just a few minutes
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-sm">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-slate-900 mb-2">Create Your Workspace</h4>
                        <p className="text-slate-600">Set up your first workspace to organise your compliance documents and team members efficiently.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-sm">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-slate-900 mb-2">Invite Your Team</h4>
                        <p className="text-slate-600">Add team members and assign appropriate roles and permissions for seamless collaboration.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-sm">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-slate-900 mb-2">Upload Documents</h4>
                        <p className="text-slate-600">Start by uploading your policies, procedures, and compliance documents to get organised.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-sm">4</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-slate-900 mb-2">Set Up Audits</h4>
                        <p className="text-slate-600">Configure audit schedules and assign responsibilities to maintain continuous compliance.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-sm">5</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-slate-900 mb-2">Monitor Compliance</h4>
                        <p className="text-slate-600">Use powerful dashboards and reports to track compliance status and identify improvement areas.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Guides */}
            <div>
              <h2 className="text-3xl font-bold text-center mb-12">Feature Guides</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group hover:border-blue-200/50">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">Team Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-6">
                      Learn how to invite team members, assign roles, and manage permissions effectively.
                    </p>
                    <Button variant="outline" className="w-full border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200">
                      View Guide
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group hover:border-green-200/50">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">Document Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-6">
                      Upload, organise, and version control your compliance documents with ease.
                    </p>
                    <Button variant="outline" className="w-full border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors duration-200">
                      View Guide
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group hover:border-purple-200/50">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">Audits & Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-6">
                      Conduct comprehensive audits and maintain regulatory compliance standards.
                    </p>
                    <Button variant="outline" className="w-full border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors duration-200">
                      View Guide
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group hover:border-slate-200/50">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-500 to-slate-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Settings className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">Settings & Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-6">
                      Customise your workspace settings and configure system preferences.
                    </p>
                    <Button variant="outline" className="w-full border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors duration-200">
                      View Guide
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group hover:border-cyan-200/50">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <BrainCircuit className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">AI Chat Assistant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-6">
                      Get instant answers to compliance questions using our AI assistant.
                    </p>
                    <Button variant="outline" className="w-full border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 transition-colors duration-200">
                      View Guide
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group hover:border-pink-200/50">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">Reporting & Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-6">
                      Generate compliance reports and track key performance indicators.
                    </p>
                    <Button variant="outline" className="w-full border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-colors duration-200">
                      View Guide
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Frequently Asked Questions */}
            <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="pb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Frequently Asked Questions</CardTitle>
                    <CardDescription className="text-lg">
                      Common questions and answers about using CG-360
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="border-b border-slate-200/50 pb-6">
                  <h4 className="font-semibold text-lg text-slate-900 mb-3">How do I invite teammates to my workspace?</h4>
                  <p className="text-slate-600 leading-relaxed">Go to Settings → Team Management and use the "Invite Member" button to send email invitations with customisable roles and permissions.</p>
                </div>

                <div className="border-b border-slate-200/50 pb-6">
                  <h4 className="font-semibold text-lg text-slate-900 mb-3">How do I connect documents to policies or audits?</h4>
                  <p className="text-slate-600 leading-relaxed">Use the document linking feature in the file browser. Right-click on any document and select "Link to Policy" or "Link to Audit" from the context menu.</p>
                </div>

                <div className="border-b border-slate-200/50 pb-6">
                  <h4 className="font-semibold text-lg text-slate-900 mb-3">Can I export reports in different formats?</h4>
                  <p className="text-slate-600 leading-relaxed">Yes! CG-360 supports PDF, Excel, and CSV exports. Look for the export options in audit results, compliance reports, and analytics dashboards.</p>
                </div>

                <div className="border-b border-slate-200/50 pb-6">
                  <h4 className="font-semibold text-lg text-slate-900 mb-3">How do I set up automated audit reminders?</h4>
                  <p className="text-slate-600 leading-relaxed">Configure audit schedules in the Audits section. Set recurrence patterns (daily, weekly, monthly) and assign team members to receive automated notifications.</p>
                </div>

                <div className="border-b border-slate-200/50 pb-6">
                  <h4 className="font-semibold text-lg text-slate-900 mb-3">What file types are supported for uploads?</h4>
                  <p className="text-slate-600 leading-relaxed">CG-360 supports PDF, Word documents (.doc, .docx), Excel spreadsheets (.xls, .xlsx), PowerPoint presentations, images (JPG, PNG, GIF), and text files.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-lg text-slate-900 mb-3">Is my data secure and compliant?</h4>
                  <p className="text-slate-600 leading-relaxed">Absolutely. CG-360 uses enterprise-grade encryption, regular security audits, and complies with GDPR, HIPAA, and other relevant standards. All data is stored securely in the cloud.</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white shadow-2xl rounded-3xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
              <CardHeader className="pb-8 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Still Need Help?</CardTitle>
                    <CardDescription className="text-blue-100 text-lg">
                      Our support team is here to help you succeed
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={() => setIsContactModalOpen(true)} className="bg-white text-blue-600 hover:bg-slate-100 font-semibold shadow-xl">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" asChild className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                    <Link href="mailto:support@cg360.co.uk">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Us
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                    <Link href="/help-centre" target="_blank">
                      Public Documentation <ExternalLink className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tutorial Videos Tab */}
          <TabsContent value="tutorials" className="space-y-12">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Video className="w-4 h-4" />
                Video Tutorials
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Step-by-step video guides</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">Watch our comprehensive video tutorials to master CG-360 features and best practices.</p>
            </div>

            {/* Getting Started Videos */}
            <div>
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                Getting Started
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
                      <PlayCircle className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">Welcome to CG-360</h4>
                      <p className="text-slate-600 mb-4 leading-relaxed">
                        Overview of the platform and key features to get you started quickly.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">5 min</span>
                        <Button size="sm" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg">
                          Watch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20"></div>
                      <PlayCircle className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">Setting Up Your Workspace</h4>
                      <p className="text-slate-600 mb-4 leading-relaxed">
                        Create and configure your first workspace for optimal organization.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">8 min</span>
                        <Button size="sm" className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg">
                          Watch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-blue-500/20"></div>
                      <PlayCircle className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">Inviting Team Members</h4>
                      <p className="text-slate-600 mb-4 leading-relaxed">
                        Add and manage your team effectively with proper roles and permissions.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">6 min</span>
                        <Button size="sm" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg">
                          Watch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Advanced Features */}
            <div>
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                Advanced Features
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20"></div>
                      <PlayCircle className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">Audit Management Deep Dive</h4>
                      <p className="text-slate-600 mb-4 leading-relaxed">
                        Advanced audit configuration and comprehensive reporting techniques.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">12 min</span>
                        <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
                          Watch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20"></div>
                      <PlayCircle className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">Document Linking & Versioning</h4>
                      <p className="text-slate-600 mb-4 leading-relaxed">
                        Connect documents to policies and track changes with version control.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">10 min</span>
                        <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg">
                          Watch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20"></div>
                      <PlayCircle className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">Using the AI Assistant</h4>
                      <p className="text-slate-600 mb-4 leading-relaxed">
                        Get the most out of our AI compliance assistant for instant answers.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">7 min</span>
                        <Button size="sm" className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg">
                          Watch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-blue-500/20"></div>
                      <PlayCircle className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">Custom Reporting</h4>
                      <p className="text-slate-600 mb-4 leading-relaxed">
                        Create and schedule custom compliance reports for stakeholders.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">9 min</span>
                        <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg">
                          Watch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-cyan-500/20"></div>
                      <PlayCircle className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">Integration Setup</h4>
                      <p className="text-slate-600 mb-4 leading-relaxed">
                        Connect CG-360 with your existing systems and workflows.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">11 min</span>
                        <Button size="sm" className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg">
                          Watch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20"></div>
                      <PlayCircle className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">Troubleshooting Common Issues</h4>
                      <p className="text-slate-600 mb-4 leading-relaxed">
                        Solutions to frequently encountered problems and error resolution.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">8 min</span>
                        <Button size="sm" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg">
                          Watch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Video Playlist */}
            <Card className="bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="pb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Complete Training Playlist</CardTitle>
                    <CardDescription className="text-lg">
                      Follow our comprehensive training series to become a CG-360 expert
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-4 border border-slate-200/50 rounded-xl hover:border-blue-200/50 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Platform Overview</h4>
                        <p className="text-slate-600 text-sm">Understanding CG-360's core concepts and architecture</p>
                      </div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium">15 min</span>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-slate-200/50 rounded-xl hover:border-purple-200/50 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Daily Workflow</h4>
                        <p className="text-slate-600 text-sm">How to use CG-360 effectively in your daily routine</p>
                      </div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium">20 min</span>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-slate-200/50 rounded-xl hover:border-green-200/50 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Advanced Compliance Management</h4>
                        <p className="text-slate-600 text-sm">Master advanced compliance features and best practices</p>
                      </div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium">25 min</span>
                  </div>
                </div>

                <div className="text-center">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300">
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Start Training Playlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Contact Support Modal - Ticket System */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              Open a Support Ticket
            </DialogTitle>
            <DialogDescription className="text-lg">
              Please fill out the form below and our support team will get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          {ticketSubmitted ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Ticket Submitted</h3>
              <p className="text-slate-700 mb-4">Thank you! Your support request has been received. We'll be in touch soon.</p>
              <Button onClick={() => { setTicketSubmitted(false); setIsContactModalOpen(false); }} className="bg-blue-600 text-white">Close</Button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={e => {
              e.preventDefault();
              setTicketSubmitted(true);
            }}>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-900 mb-2">Subject</label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  required
                  className="bg-white/80 border-slate-200/50"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-900 mb-2">Description</label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Please describe your issue in detail"
                  required
                  rows={5}
                  className="bg-white/80 border-slate-200/50"
                />
              </div>
              <div>
                <label htmlFor="attachment" className="block text-sm font-medium text-slate-900 mb-2">Attachment (optional)</label>
                <Input
                  id="attachment"
                  type="file"
                  onChange={e => setAttachment(e.target.files?.[0] || null)}
                  className="bg-white/80 border-slate-200/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsContactModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 text-white">
                  Submit Ticket
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}