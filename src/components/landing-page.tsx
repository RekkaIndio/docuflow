
import Link from 'next/link';
import { useEffect } from 'react';
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
  Linkedin
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

import { AnimatedHeroBg } from './landing/animated-hero-bg';
import { TrustedByBar } from './landing/trusted-by-bar';
import { TestimonialCarousel } from './landing/testimonial-carousel';
import { DetailedFeatures } from './landing/detailed-features';
import { DashboardPreview } from './landing/dashboard-preview';
import { NewsletterSignup } from './landing/newsletter-signup';

export function LandingPage() {
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
        <section className="w-full py-24 md:py-40 lg:py-52 relative overflow-hidden">
          <AnimatedHeroBg />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-16 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-8">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium w-fit">
                  <Sparkles className="w-4 h-4" />
                  AI-Powered Care Home Compliance
                </div>

                <h1 className="text-5xl font-extrabold font-headline tracking-tighter sm:text-6xl xl:text-7xl/none drop-shadow-lg">
                  Transform Care Home
                  <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-text">
                    Document Management
                  </span>
                </h1>

                <p className="max-w-[600px] text-muted-foreground md:text-2xl font-medium leading-relaxed">
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
              </div>

              {/* Interactive Demo Preview */}
              <div className="relative z-10 flex items-center justify-center">
                <div className="relative w-full h-[400px] md:h-[480px] bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-3xl border border-primary/20 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>

                  {/* Mock Dashboard Interface */}
                  <div className="relative h-full p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Logo className="h-6 w-6 text-primary" />
                        <span className="font-semibold">DocuFlow AI</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Shield className="w-3 h-3 mr-1" />
                        CQC Compliant
                      </Badge>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-4 mb-4">
                      <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Active Audits
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-primary">12</div>
                          <p className="text-xs text-muted-foreground">3 due this week</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            AI Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-primary">47</div>
                          <p className="text-xs text-muted-foreground">New this month</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <BrainCircuit className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">AI Assistant</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        "I've analyzed your latest audit report. Key findings: Staff training compliance at 98%, medication management needs attention..."
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          Ask Question
                        </Button>
                        <Button size="sm" className="text-xs h-7 bg-primary/90">
                          View Report
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4">
                    <Button size="sm" variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      <Play className="w-3 h-3 mr-1" />
                      Demo
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
      </main>
    </div>
  );
}
