
"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import {
  ArrowRight,
  CheckCircle2,
  UploadCloud,
  Cpu,
  Tag,
  FolderSync,
  Bell,
  Share2,
  MessageSquare,
  BrainCircuit,
  Shield,
  FileText,
  Users,
  BarChart3,
  Calendar,
  Mail,
  Zap,
  Star,
  Award,
  Heart,
  Building2,
  Sparkles,
  ChevronRight,
  Play,
  X,
  Twitter,
  Github,
  Linkedin,
  TrendingUp
} from 'lucide-react';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { AnimatedHeroBg } from '@/components/landing/animated-hero-bg';
import { TrustedByBar } from '@/components/landing/trusted-by-bar';
import { TestimonialCarousel } from '@/components/landing/testimonial-carousel';
import { DetailedFeatures } from '@/components/landing/detailed-features';
import { DashboardPreview } from '@/components/landing/dashboard-preview';
import { NewsletterSignup } from '@/components/landing/newsletter-signup';

export default function Page() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleIconClick = (modalType: string) => {
    setActiveModal(activeModal === modalType ? null : modalType);
  };

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
        }
      });
    }, observerOptions);

    // Observe all elements with animation classes
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .animate-on-scroll-left, .animate-on-scroll-right, .animate-on-scroll-scale');
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground dark relative">
      {/* Enhanced Header with better navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <Link href="#" className="flex items-center justify-center gap-2">
          <Logo className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold font-headline">DocuFlow AI</span>
        </Link>
        <nav className="ml-auto hidden lg:flex gap-4 sm:gap-6 items-center">
          <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80 transition-colors">
            Features
          </Link>
          <Link href="#compliance" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80 transition-colors">
            Compliance
          </Link>
          <Link href="#pricing" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80 transition-colors">
            Pricing
          </Link>
          <Link href="#demo" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80 transition-colors">
            Demo
          </Link>
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80 transition-colors">
            Sign In
          </Link>
          <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30">
            <Link href="/signup">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Enhanced Hero Section */}
        <section className="w-full pt-16 md:pt-24 lg:pt-32 pb-32 md:pb-48 lg:pb-64 relative overflow-hidden">
          <AnimatedHeroBg />
          <div className="w-full px-40 md:px-44 lg:px-64 xl:px-80 2xl:px-80 relative z-10">
                        <div className="grid gap-16 lg:gap-20 lg:grid-cols-7 items-center min-h-[600px] lg:min-h-[700px]">
              <div className="lg:col-span-2 flex flex-col justify-center space-y-8">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium w-fit">
                  <Sparkles className="w-4 h-4" />
                  AI-Powered Care Home Compliance
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl font-extrabold font-headline tracking-tighter drop-shadow-lg leading-tight">
                  Transform Care Home
                  <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-text">
                    Document Management
                  </span>
                </h1>

                <p className="max-w-[500px] text-muted-foreground md:text-xl font-medium leading-relaxed">
                  Automate compliance, extract insights, and chat with your documents using AI.
                  Built specifically for care homes with CQC compliance, audits, and resident care management.
                </p>

                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Button size="lg" asChild className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 hover:scale-105">
                    <Link href="/signup">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5 animate-bounce-x" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="border-2 hover:bg-primary/5 transition-all duration-300">
                    <Link href="#demo">
                      Watch Demo
                      <Play className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center gap-6 pt-6">
                  <div className="flex -space-x-2">
                    <Avatar className="border-2 border-background">
                      <AvatarImage src="https://i.pravatar.cc/150?u=care1" />
                      <AvatarFallback>CH</AvatarFallback>
                    </Avatar>
                    <Avatar className="border-2 border-background">
                      <AvatarImage src="https://i.pravatar.cc/150?u=care2" />
                      <AvatarFallback>MC</AvatarFallback>
                    </Avatar>
                    <Avatar className="border-2 border-background">
                      <AvatarImage src="https://i.pravatar.cc/150?u=care3" />
                      <AvatarFallback>RC</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview - Takes up 5 columns for maximum space */}
              <div className="lg:col-span-5 relative z-10 flex items-center justify-center w-full">
                <div className="relative w-full h-[500px] md:h-[600px] lg:h-[650px] bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-3xl border border-primary/20 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>

                  {/* Complete Dashboard Interface */}
                  <div className="relative h-full flex">
                    {/* Sidebar */}
                    <div className="w-16 md:w-20 bg-background/95 backdrop-blur-sm border-r border-border/20 flex flex-col items-center py-4 space-y-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Logo className="w-5 h-5 text-primary" />
                      </div>

                      <div className="flex flex-col space-y-3">
                        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors" onClick={() => handleIconClick('documents')}>
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => handleIconClick('folders')}>
                          <FolderSync className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => handleIconClick('staff')}>
                          <Users className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => handleIconClick('analytics')}>
                          <BarChart3 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => handleIconClick('compliance')}>
                          <Shield className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => handleIconClick('chat')}>
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-6 md:p-8">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold">Dashboard</h3>
                          <p className="text-sm text-muted-foreground">Welcome back, Sarah</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <Shield className="w-3 h-3 mr-1" />
                            CQC Compliant
                          </Badge>
                          <Avatar className="w-8 h-8">
                            <AvatarImage src="https://i.pravatar.cc/150?u=sarah" />
                            <AvatarFallback>SM</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Documents</span>
                            </div>
                            <div className="text-2xl font-bold text-primary">1,247</div>
                            <p className="text-xs text-muted-foreground">+12 this week</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Compliance</span>
                            </div>
                            <div className="text-2xl font-bold text-primary">98%</div>
                            <p className="text-xs text-muted-foreground">Excellent</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Staff</span>
                            </div>
                            <div className="text-2xl font-bold text-primary">42</div>
                            <p className="text-xs text-muted-foreground">All trained</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">AI Insights</span>
                            </div>
                            <div className="text-2xl font-bold text-primary">23</div>
                            <p className="text-xs text-muted-foreground">This month</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Main Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Recent Documents */}
                        <Card className="md:col-span-2 bg-background/80 backdrop-blur-sm border-primary/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Recent Documents
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Staff Training Records Q3</p>
                                <p className="text-xs text-muted-foreground">Updated 2 hours ago</p>
                              </div>
                              <Badge variant="secondary" className="text-xs">PDF</Badge>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <Shield className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">CQC Inspection Report</p>
                                <p className="text-xs text-muted-foreground">Updated yesterday</p>
                              </div>
                              <Badge variant="secondary" className="text-xs">DOC</Badge>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Users className="w-4 h-4 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Resident Care Plans</p>
                                <p className="text-xs text-muted-foreground">Updated 3 days ago</p>
                              </div>
                              <Badge variant="secondary" className="text-xs">XLS</Badge>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Quick Actions & AI Chat */}
                        <div className="space-y-6">
                          {/* Quick Actions */}
                          <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <Button size="sm" className="w-full justify-start text-xs h-8">
                                <UploadCloud className="w-3 h-3 mr-2" />
                                Upload Document
                              </Button>
                              <Button size="sm" variant="outline" className="w-full justify-start text-xs h-8">
                                <MessageSquare className="w-3 h-3 mr-2" />
                                Ask AI Assistant
                              </Button>
                              <Button size="sm" variant="outline" className="w-full justify-start text-xs h-8">
                                <Shield className="w-3 h-3 mr-2" />
                                Run Compliance Check
                              </Button>
                            </CardContent>
                          </Card>

                          {/* AI Assistant Preview */}
                          <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <BrainCircuit className="w-4 h-4 text-primary" />
                                AI Assistant
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="bg-muted/50 rounded-lg p-3 mb-3">
                                <p className="text-xs text-muted-foreground mb-2">
                                  "Your medication audit is due in 3 days. I've prepared a checklist..."
                                </p>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                                    View
                                  </Button>
                                  <Button size="sm" className="text-xs h-6 px-2 bg-primary/90">
                                    Ask More
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Compliance Status Bar */}
                      <div className="mt-8">
                        <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium">Compliance Status</span>
                              <span className="text-sm text-muted-foreground">98% Complete</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 mb-3">
                              <div className="bg-green-500 h-2 rounded-full" style={{width: '98%'}}></div>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Next audit: March 15, 2025</span>
                              <span>2 items pending</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>

                  {/* Demo Badge */}
                  <div className="absolute top-4 right-4">
                    <Button size="sm" variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      <Play className="w-3 h-3 mr-1" />
                      Interactive Demo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Benefits Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16 animate-on-scroll">
              <Badge variant="outline" className="mb-4">
                Why Choose DocuFlow AI
              </Badge>
              <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl mb-4">
                Built for Care Homes, Powered by AI
              </h2>
              <p className="max-w-[800px] mx-auto text-muted-foreground md:text-xl">
                Streamline compliance, reduce administrative burden, and improve resident care with intelligent document management.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">CQC Compliance</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Automated compliance tracking, audit preparation, and regulatory reporting.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BrainCircuit className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">AI-Powered Insights</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Extract key information, generate summaries, and get actionable insights from documents.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Team Collaboration</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Secure document sharing, role-based permissions, and real-time collaboration.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Time Savings</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Reduce administrative time by 60% with automated document processing and organization.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16 animate-on-scroll">
              <Badge variant="outline" className="mb-4">
                Powerful Features
              </Badge>
              <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl mb-4">
                Everything You Need for Care Home Compliance
              </h2>
              <p className="max-w-[800px] mx-auto text-muted-foreground md:text-xl">
                Comprehensive tools designed specifically for care home operations and regulatory requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group animate-on-scroll-left">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <UploadCloud className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Smart Document Upload</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Upload PDFs, Word docs, Excel files, and more. Our AI automatically extracts data, generates tags, and organizes everything.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Multi-format support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Automatic categorization
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Bulk upload capability
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group animate-on-scroll-scale">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">AI Document Chat</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Ask questions about your documents in natural language. Get instant answers from individual files or entire folders.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Natural language queries
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Cross-document analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Compliance insights
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group animate-on-scroll-right">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Compliance Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Track CQC requirements, manage audits, and maintain compliance records with automated workflows.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      CQC compliance tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Automated audit prep
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Regulatory reporting
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group animate-on-scroll-left">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <FolderSync className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Hierarchical Organization</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Organize documents in intuitive folder structures designed for care home operations and compliance needs.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Care home specific folders
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Automatic tagging
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Quick search & filter
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group animate-on-scroll-scale">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Smart Notifications</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Never miss important deadlines, audit dates, or compliance requirements with intelligent notifications.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Deadline reminders
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Compliance alerts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Document updates
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group animate-on-scroll-right">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Analytics & Reporting</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Get insights into your compliance status, document activity, and operational efficiency with detailed reports.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Compliance dashboards
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Performance metrics
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Custom reports
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Compliance Section */}
        <section id="compliance" className="w-full py-20 md:py-32 lg:py-40 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16 animate-on-scroll">
              <Badge variant="outline" className="mb-4">
                Regulatory Compliance
              </Badge>
              <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl mb-4">
                Stay Ahead of CQC Requirements
              </h2>
              <p className="max-w-[800px] mx-auto text-muted-foreground md:text-xl">
                Comprehensive compliance tools designed to meet and exceed regulatory standards for care homes.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 animate-on-scroll-left">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">CQC Audit Preparation</h3>
                    <p className="text-muted-foreground">
                      Automated audit checklists, evidence gathering, and compliance gap analysis to ensure you're always inspection-ready.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Policy Management</h3>
                    <p className="text-muted-foreground">
                      Maintain up-to-date policies across all care domains with version control, approval workflows, and staff training tracking.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Staff Compliance</h3>
                    <p className="text-muted-foreground">
                      Track staff qualifications, training records, appraisals, and competency assessments with automated reminders.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Resident Care Records</h3>
                    <p className="text-muted-foreground">
                      Comprehensive resident documentation, care planning, and quality assurance with AI-powered insights.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative animate-on-scroll-right">
                <Card className="bg-background/80 backdrop-blur-sm border-primary/20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Compliance Dashboard
                    </CardTitle>
                    <CardDescription>
                      Real-time view of your compliance status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">CQC Standards</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">98% Compliant</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{width: '98%'}}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">47</div>
                        <div className="text-xs text-muted-foreground">Active Policies</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">156</div>
                        <div className="text-xs text-muted-foreground">Staff Records</div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span>Next Audit Due</span>
                        <span className="font-medium">March 15, 2025</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <TrustedByBar />
        <TestimonialCarousel />
        <DashboardPreview />
        <NewsletterSignup />

        {/* Interactive Modals */}
        <Dialog open={activeModal === 'documents'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Document Management</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Comprehensive document management for care home compliance
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-primary" />
                      Key Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Smart document upload & processing
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Automatic categorization & tagging
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Version control & audit trails
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Bulk operations & batch processing
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Supported Formats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">PDF</Badge>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">DOC</Badge>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">XLS</Badge>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">JPG</Badge>
                      <Badge variant="secondary" className="bg-pink-100 text-pink-800">PNG</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <BrainCircuit className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg mb-2">AI-Powered Processing</h4>
                      <p className="text-muted-foreground">
                        Our advanced AI automatically extracts key information, identifies document types,
                        and ensures compliance requirements are met with intelligent document analysis.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'folders'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FolderSync className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Hierarchical Organization</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Intelligent folder structures designed for care home operations
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Care Home Structure
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Policies & Procedures
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Staff Records & Training
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Resident Care Plans
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        CQC Inspection Reports
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Health & Safety Documents
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Smart Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Auto-organization
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Quick search & filter
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Access permissions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Audit trails
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Compliance-First Design</h4>
                      <p className="text-muted-foreground">
                        Folder structures are pre-configured to match CQC requirements and care home
                        operational needs, ensuring you stay organized and compliant.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'staff'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Staff Management</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Complete staff compliance and training management system
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Staff Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Qualifications & certifications
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Training records & appraisals
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        DBS checks & references
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Contract & employment details
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Compliance Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Mandatory training deadlines
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Competency assessments
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Renewal reminders
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Audit preparation
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Bell className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Automated Compliance</h4>
                      <p className="text-muted-foreground">
                        Never miss a training deadline or certification renewal with intelligent notifications
                        and automated tracking across your entire staff team.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'analytics'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Analytics & Reporting</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Comprehensive insights into your care home operations
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Compliance Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Compliance status overview
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Audit readiness scores
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Risk assessment reports
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Trend analysis
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Operational Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Document activity metrics
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Staff training completion
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Process efficiency reports
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Custom dashboards
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <BrainCircuit className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg mb-2">AI-Powered Insights</h4>
                      <p className="text-muted-foreground">
                        Get actionable recommendations and predictive analytics to improve compliance
                        and operational efficiency with intelligent data analysis.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'compliance'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Compliance Management</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Automated CQC compliance tracking and audit preparation
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      CQC Standards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Safe care & treatment
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Effective care & treatment
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Caring & compassionate
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Responsive care & treatment
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Well-led care
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Automated Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Compliance checklists
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Evidence gathering
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Gap analysis reports
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Audit preparation
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Award className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Inspection Ready</h4>
                      <p className="text-muted-foreground">
                        Maintain 100% compliance with automated tracking, intelligent reminders,
                        and comprehensive audit preparation tools designed for CQC standards.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'chat'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">AI Document Chat</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Natural language queries about your documents and compliance data
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Query Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Document content questions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Compliance status inquiries
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Policy interpretation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Training requirements
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-primary" />
                      AI Capabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Cross-document analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Compliance insights
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Summarization & extraction
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Contextual recommendations
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <BrainCircuit className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Intelligent Assistant</h4>
                      <p className="text-muted-foreground">
                        Ask questions in natural language and get instant, accurate answers from your
                        entire document library and compliance data with advanced AI understanding.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
