
"use client";

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
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
  TrendingUp,
  Accessibility,
  Menu,
  Clock,
  DollarSign
} from 'lucide-react';
import { Lock } from 'lucide-react';
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
import { DetailedFeatures } from '@/components/landing/detailed-features';
import { DashboardPreview } from '@/components/landing/dashboard-preview';
import { NewsletterSignup } from '@/components/landing/newsletter-signup';
import { Footer } from '@/components/footer';
import { CalendlyModal } from '@/components/calendly-modal';
import { useCalendly } from '@/context/calendly-context';

export default function Page() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { openCalendlyModal } = useCalendly();

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

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
  <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 relative">
      {/* Enhanced Header with Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="w-full px-4 lg:px-6 h-16 flex items-center justify-between">
          <Link href="#" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <Logo className="h-8 w-8" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CG-360
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200">
              Features
            </Link>
            <Link href="#compliance" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200">
              Compliance
            </Link>
            <Link href="#demo" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200">
              Demo
            </Link>
            <Button
              size="sm"
              onClick={openCalendlyModal}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Book Demo
            </Button>
          </nav>

          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 shadow-lg"
        >
          <div className="px-4 py-6 space-y-4">
            <Link 
              href="#features" 
              className="block text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              href="#compliance" 
              className="block text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Compliance
            </Link>
            <Link 
              href="#demo" 
              className="block text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Demo
            </Link>
            <Button
              size="sm"
              onClick={() => {
                openCalendlyModal();
                setMobileMenuOpen(false);
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Book Demo
            </Button>
          </div>
        </div>
      )}

      <main className="flex-1 pt-16">
        {/* Hero Section - Dramatic Redesign */}
        <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-1/4 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-br from-cyan-400/25 to-blue-400/25 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

            {/* Floating geometric shapes */}
            <div className="absolute top-20 left-20 w-4 h-4 bg-blue-500/40 rotate-45 animate-bounce"></div>
            <div className="absolute top-40 right-32 w-6 h-6 bg-purple-500/30 rounded-full animate-pulse"></div>
            <div className="absolute bottom-32 left-32 w-3 h-3 bg-cyan-500/50 rotate-12 animate-ping"></div>
          </div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
              {/* Hero Content */}
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium border border-blue-200/50">
                  <Sparkles className="w-4 h-4" />
                  AI-Powered Care Home Compliance Platform
                </div>

                <div className="space-y-4">
                  <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                    Transform Your
                    <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent animate-gradient-x">
                      Care Home Compliance
                    </span>
                  </h1>

                  <p className="text-xl text-slate-600 leading-relaxed max-w-lg">
                    Say goodbye to fragmented systems and compliance nightmares. CG-360 brings everything together in one elegant, intelligent platform designed specifically for care homes.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    onClick={openCalendlyModal}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Book Your Free Demo
                  </Button>
                </div>
              </div>

              {/* Hero Visual */}
              <div className="relative">
                <div className="relative rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden transform scale-125">
                  <img
                    src="/heroimage.png"
                    alt="CG-360 Platform Dashboard"
                    className="w-full h-auto object-cover"
                    style={{
                      maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.02) 100%)',
                      WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.02) 100%)',
                      opacity: 0.7
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-slate-400 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* Features Section - Redesigned */}
        <section id="features" className="py-24 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-blue-50/30"></div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                Powerful Capabilities
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Everything you need to
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  excel at compliance
                </span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                From document management to automated reporting, CG-360 provides the complete toolkit for care home compliance excellence.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature Cards */}
              <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200/50 hover:border-blue-200/50 transition-all duration-300 hover:-translate-y-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-900">Smart Document Management</h3>
                <p className="text-slate-600 leading-relaxed">
                  AI-powered document processing with automatic categorisation, version control, and compliance tracking. Never lose track of important paperwork again.
                </p>
              </div>

              <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200/50 hover:border-purple-200/50 transition-all duration-300 hover:-translate-y-2">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BrainCircuit className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-900">AI Compliance Assistant</h3>
                <p className="text-slate-600 leading-relaxed">
                  Get instant answers to compliance questions, automated policy reviews, and intelligent recommendations tailored to your care home's needs.
                </p>
              </div>

              <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200/50 hover:border-cyan-200/50 transition-all duration-300 hover:-translate-y-2">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-900">Real-time Analytics</h3>
                <p className="text-slate-600 leading-relaxed">
                  Comprehensive dashboards showing compliance status, staffing ratios, and operational insights. Make data-driven decisions with confidence.
                </p>
              </div>

              <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200/50 hover:border-green-200/50 transition-all duration-300 hover:-translate-y-2">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-900">Staff Management</h3>
                <p className="text-slate-600 leading-relaxed">
                  Complete staff records, and supervision management. Ensure your team stays compliant and up-to-date with regulations.
                </p>
              </div>

              <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200/50 hover:border-orange-200/50 transition-all duration-300 hover:-translate-y-2">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-900">Inspection Access</h3>
                <p className="text-slate-600 leading-relaxed">
                  Offer inspection level access to your homes compliance and governance. Be prepared for CQC visits with organised evidence and clear compliance documentation.
                </p>
              </div>

              <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200/50 hover:border-pink-200/50 transition-all duration-300 hover:-translate-y-2">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-900">Automation Engine</h3>
                <p className="text-slate-600 leading-relaxed">
                  Automate routine compliance tasks, generate reports, and receive alerts. Focus on resident care while we handle the paperwork.
                </p>
              </div>
            </div>

            {/* CTA in Features */}
            <div className="text-center mt-16">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 border border-blue-100">
                <h3 className="text-2xl font-bold mb-4 text-slate-900">Ready to transform your compliance?</h3>
                <p className="text-slate-600 mb-6">See how CG-360 can streamline your operations and ensure inspection readiness.</p>
                <Button
                  size="lg"
                  onClick={openCalendlyModal}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Book Your Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Compliance Section - Redesigned */}
        <section id="compliance" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-blue-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Shield className="w-4 h-4" />
                Inspection Ready
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Always prepared for
                <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  CQC inspections
                </span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Generate comprehensive inspection evidence packs in minutes. Show inspectors exactly what they need to see, when they need to see it.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Dashboard Mockup */}
              <div className="relative">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8" />
                        <div>
                          <div className="font-bold text-lg">Compliance Dashboard</div>
                          <div className="text-blue-100">Live monitoring active</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">96% Ready</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200/50">
                        <div className="text-2xl font-bold text-blue-600">47</div>
                        <div className="text-xs text-blue-600 font-medium">Active Policies</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200/50">
                        <div className="text-2xl font-bold text-purple-600">156</div>
                        <div className="text-xs text-purple-600 font-medium">Staff Records</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200/50">
                        <div className="text-2xl font-bold text-green-600">8</div>
                        <div className="text-xs text-green-600 font-medium">Open Actions</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">Overall Readiness</span>
                          <span className="text-sm font-bold text-slate-900">96%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-1000" style={{width: '96%'}}></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Next inspection</span>
                        <span className="font-medium text-slate-900">March 15, 2025</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-blue-500 text-white p-3 rounded-2xl shadow-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-2xl shadow-xl">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900">Instant Evidence Packs</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Generate comprehensive inspection documentation in seconds. Every policy, record, and compliance check organised and ready for review.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900">Live Compliance Monitoring</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Real-time dashboards showing your compliance status across all areas. Know exactly where you stand, always.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900">Automated Alerts</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Never miss a deadline or compliance requirement. Smart notifications keep you ahead of inspections and regulations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="w-6 h-6 text-blue-600" />
                    <span className="font-semibold text-slate-900">CQC Inspection Guarantee</span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Our platform is designed to help support care homes with compliance and inspections. With CG-360, you're not just compliant — you're inspection-ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Success Metrics & ROI */}
        <section className="w-full py-24 bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/50 to-purple-50/50"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/20 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <TrendingUp className="w-4 h-4" />
                Increase Efficiency & Cut Costs
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
                CG-360
                <span className="block text-slate-600">
                  Measurable time and cost savings
                </span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Care homes using CG-360 will see significant improvements in efficiency, compliance, and operational costs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div className="text-xl font-bold text-slate-900 mb-2">Policy Management</div>
                <p className="text-sm text-slate-500">Streamlined creation, updates, and management of care home policies with version control and approval workflows.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="text-xl font-bold text-slate-900 mb-2">Staff Management</div>
                <p className="text-sm text-slate-500">Complete staff records along with supervision management to ensure compliance and up-to-date certifications.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="text-xl font-bold text-slate-900 mb-2">Compliance Tracking</div>
                <p className="text-sm text-slate-500">Automated compliance monitoring and audit preparation to meet CQC standards and maintain inspection readiness.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="text-xl font-bold text-slate-900 mb-2">Trend Tracking</div>
                <p className="text-sm text-slate-500">Monitor compliance trends, performance metrics, and operational insights over time for proactive improvements.</p>
              </div>
            </div>

            {/* Platform Overview */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">How CG-360 Works</h3>
                  <p className="text-slate-600">Transparent implementation with ongoing support</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <UploadCloud className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 mb-2">2 Week Setup</div>
                    <div className="text-sm font-medium text-slate-700 mb-2">Fast Implementation</div>
                    <p className="text-sm text-slate-500">Complete setup and in just 2 weeks with full transparency throughout the process</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 mb-2">Monthly Updates</div>
                    <div className="text-sm font-medium text-slate-700 mb-2">Feedback & Communication</div>
                    <p className="text-sm text-slate-500">Regular check-ins and transparent updates with all stakeholders to ensure optimal performance</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 mb-2">Continuous Support</div>
                    <div className="text-sm font-medium text-slate-700 mb-2">Ongoing Optimisation</div>
                    <p className="text-sm text-slate-500">Transparent reporting and continuous platform improvements to maximize your compliance efficiency</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-4">
                    We believe in complete transparency throughout your journey with CG-360.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
                    onClick={openCalendlyModal}
                  >
                    Book Your Free Demo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

  </main>

    {/* Demo CTA (replaces TrustedByBar) */}
    <section id="demo" className="w-full py-24 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 lg:px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Calendar className="w-4 h-4" />
            Free Demo
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            See CG-360 in action
            <span className="block text-blue-100">
              Book your free demo today
            </span>
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Experience how CG-360 transforms compliance management. Our experts will show you how to go from overwhelmed to inspection-ready in minutes.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <Button
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl text-lg"
              onClick={openCalendlyModal}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Your Free Demo
            </Button>
          </div>
        </div>
      </div>
    </section>

  {/* DashboardPreview removed per request */}
  {/* NewsletterSignup kept out for simplified landing */}

    {/* Footer */}
    {/* new Footer component inserted below */}

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
                        Automatic categorisation & tagging
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
                        operational needs, ensuring you stay organised and compliant.
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
  {/* Capability detail dialogs opened from hero icons */}
        <Dialog open={activeModal === 'governance'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Governance</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Maintain clear ownership, versioned policies, and approval workflows so every change is tracked and auditable.
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
                      Policy & Approval Workflows
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Version control and change history
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Approval chains and delegated sign-off
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Policy publishing and staff acknowledgment tracking
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Audit Trails & Accountability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Detailed change logs for policies and documents
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Role-based accountability and ownership maps
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Exportable reports for inspections and governance reviews
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
                      <h4 className="font-semibold text-lg mb-2">Governance Clarity</h4>
                      <p className="text-muted-foreground">
                        Centralise policies, approvals and governance workflows so management and inspectors can clearly see who is responsible and when changes happened.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'security'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Security</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Enterprise-grade controls to protect resident data, meet regulatory expectations, and produce auditable evidence of compliance.
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
                      Data Protection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Encryption at rest and in transit
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Granular role-based access controls
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Secure backups and retention policies
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Monitoring & Audit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Detailed access and activity logs
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Alerts for suspicious activity
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Compliance-ready exportable audit trails
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Lock className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Enterprise-grade Security</h4>
                      <p className="text-muted-foreground">
                        Built with data protection standards in mind — secure access, encrypted storage, and monitoring to keep sensitive resident information safe.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'automation'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Automation</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Reduce manual work with intelligent automations for compliance tasks, reminders, and document generation.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Automated Workflows
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Scheduled audits and task assignments
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Automatic evidence collection for inspections
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Template-driven document generation
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Reminders & Scheduling
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Automated staff notifications and deadlines
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Recurring task scheduling
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Smart escalation for overdue items
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Zap className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Automate Routine Work</h4>
                      <p className="text-muted-foreground">
                        Let CG-360 handle routine compliance operations so staff can prioritise resident care — scheduled checks, reminders and auto-generated evidence reduce manual overhead.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'insights'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Insights</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Actionable analytics and predictive signals to identify risks, resource needs, and improvement opportunities.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Operational Dashboards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        At-a-glance compliance and activity metrics
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Customisable dashboards for managers
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Exportable charts and trend reports
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Predictive Risk Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Early warning signals for deteriorating compliance
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Prioritised recommendations for corrective action
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Integration-ready exports for analytics teams
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
                        Use AI to surface meaningful trends and predict risks so you can take targeted action before issues escalate.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'accessibility'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-sm border-primary/20">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Accessibility className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold font-headline">Accessibility</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Tools and UI designed to be inclusive, ensuring staff and residents of varying needs can access information and complete tasks.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Accessibility className="w-5 h-5 text-primary" />
                      Accessible UI & Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        High-contrast themes and scalable text
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Keyboard navigation and ARIA support
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Screen reader friendly labels and structure
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/20 hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Assistive Tools & Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Built-in text-to-speech and simplified views
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Customisable workflows for diverse user needs
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Training materials and staff guidance
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Accessibility className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Inclusive by Design</h4>
                      <p className="text-muted-foreground">
                        CG-360 is built to be usable by everyone — from high-contrast themes and keyboard-first navigation to assistive tools that help staff access the information they need quickly.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
    <Footer />
  </div>
  );
}
