
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
import heroImage from '@/assets/heroimage.png';
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
    <div className="flex flex-col min-h-screen bg-white text-foreground dark relative">
      {/* Enhanced Header with better navigation */}
  <header style={{color: '#000'}} className="px-4 lg:px-6 h-16 flex items-center sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur-sm text-black dark:text-slate-100">
        <Link href="#" className="flex items-center justify-center gap-2" style={{color: '#000', opacity: 1}}>
          <Logo className="h-6 w-6 text-primary" />
          <span style={{color: '#000', opacity: 1}} className="text-xl font-semibold font-headline text-black dark:text-slate-100">CG-360 AI</span>
        </Link>
        <nav style={{color: '#000'}} className="ml-auto hidden lg:flex gap-4 sm:gap-6 items-center">
          <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4 text-black dark:text-slate-200 transition-colors" style={{color: '#000', opacity: 1}}>
            Features
          </Link>
          <Link href="#compliance" className="text-sm font-medium hover:underline underline-offset-4 text-black dark:text-slate-200 transition-colors" style={{color: '#000', opacity: 1}}>
            Compliance
          </Link>
          <Link href="#pricing" className="text-sm font-medium hover:underline underline-offset-4 text-black dark:text-slate-200 transition-colors" style={{color: '#000', opacity: 1}}>
            Pricing
          </Link>
          <Link href="#demo" className="text-sm font-medium hover:underline underline-offset-4 text-black dark:text-slate-200 transition-colors" style={{color: '#000', opacity: 1}}>
            Demo
          </Link>
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4 text-black dark:text-slate-200 transition-colors" style={{color: '#000', opacity: 1}}>
            Sign In
          </Link>
          <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30">
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Enhanced Hero Section */}
        <section className="w-full pt-16 md:pt-24 lg:pt-32 pb-32 md:pb-48 lg:pb-64 relative overflow-hidden">
          {/* <AnimatedHeroBg /> -- commented out so the new animated SVG background is visible */}
          {/* Animated hero background (wavy, colorful blobs). Left side is lightened to keep text readable. */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Layered blurred gradient blobs (Tailwind-based) */}
            <div className="absolute -left-48 -top-40 w-[900px] h-[700px] bg-gradient-to-br from-pink-400 via-purple-600 to-cyan-400 opacity-90 rounded-full filter blur-3xl transform-gpu animate-[move1_14s_ease-in-out_infinite]"></div>
            <div className="absolute right-0 -top-28 w-[1100px] h-[800px] bg-gradient-to-br from-cyan-400 via-indigo-500 to-pink-400 opacity-90 rounded-full filter blur-3xl transform-gpu animate-[move2_18s_ease-in-out_infinite]"></div>
            <div className="absolute left-1/4 top-[60%] w-[700px] h-[500px] bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-400 opacity-85 rounded-full filter blur-2xl transform-gpu animate-[move3_22s_ease-in-out_infinite]"></div>

            {/* subtle left fade to keep text readable */}
            <div className="absolute left-0 top-0 w-3/12 h-full bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />

            {/* faint wavy divider as an SVG for polish */}
            <svg className="absolute bottom-0 left-0 w-full h-[240px] pointer-events-none" viewBox="0 0 1920 240" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M0 40 C220 90, 480 0, 980 140 C1480 280, 1800 120, 1920 140 L1920 240 L0 240 Z" fill="#ffffff" opacity="0.08" />
            </svg>
          </div>
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
                    Compliance Management
                  </span>
                </h1>

                <p className="max-w-[500px] text-slate-800 md:text-xl font-medium leading-relaxed">
                  Revolutionise governance in your care home with CG-360. Say goodbye to costly, fragmented platforms—everything you need is in one place. Purpose-built for the care sector, CG-360 ensures effortless CQC compliance while simplifying your operations.
                </p>

                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Button size="lg" variant="outline" asChild className="border-2 hover:bg-primary/5 transition-all duration-300">
                    <Link href="#demo">
                      Book A Demo
                      <Play className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Hero Image - placed to the right of the hero text */}
              <div className="lg:col-span-5 relative z-10 flex items-center justify-center w-full">
                <div className="relative w-full h-[500px] md:h-[600px] lg:h-[650px] bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-3xl border border-primary/20 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>

                  {/* Replaced dashboard preview with a simple hero image for the landing */}
                  <div className="relative h-full flex items-center justify-center">
                    <div
                      className="relative w-full h-full overflow-hidden rounded-3xl"
                      style={{
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%, black 65%, transparent 100%)',
                        maskImage: 'linear-gradient(to right, transparent 0%, black 35%, black 65%, transparent 100%)',
                        // ensure the mask uses the container box
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                      }}
                    >
                      <Image src={heroImage} alt="CG-360 preview" className="object-cover" fill priority />
                    </div>
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
                Why Choose CG-360
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

  </main>

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
    </div>
  );
}
