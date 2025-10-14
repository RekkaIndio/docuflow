
"use client";

import Link from 'next/link';
import { useEffect, useState, useRef, useLayoutEffect, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import {
  ArrowRight,
  CheckCircle2,
  UploadCloud,
  Cpu,
  Tag,
  FolderSync,
  Folder,
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
  DollarSign,
  AlertTriangle,
  Puzzle,
  Layers,
  CreditCard,
  BadgeCheck,
  PoundSterling
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

  // Ref + measurement for the central CG-360 card so connectors stop at its outer edge
  const centerRef = useRef<HTMLDivElement | null>(null);
  const [centerSize, setCenterSize] = useState({ width: 260, height: 140 });
  const orbitRef = useRef<HTMLDivElement | null>(null);
  const [orbitSize, setOrbitSize] = useState({ width: 0, height: 0 });
  // Refs and sizes for each orbit node so we can compute where lines should stop
  const moduleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [moduleSizes, setModuleSizes] = useState<Record<string, { width: number; height: number }>>({});
  // Hero visual refs for parallax and micro-interaction
  const heroRef = useRef<HTMLDivElement | null>(null);
  const heroCardRef = useRef<HTMLDivElement | null>(null);
  const heroRaf = useRef<number | null>(null);

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

  // Observe all elements with animation classes (add fade-only class for connectors)
  const animatedElements = document.querySelectorAll('.animate-on-scroll, .animate-on-scroll-left, .animate-on-scroll-right, .animate-on-scroll-scale, .animate-fade-in');
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

  useEffect(() => {
    if (!centerRef.current) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setCenterSize({ width: rect.width, height: rect.height });
    });

    ro.observe(centerRef.current);

    // initial measurement
    const rect = centerRef.current.getBoundingClientRect();
    setCenterSize({ width: rect.width, height: rect.height });

    const handleResize = () => {
      if (centerRef.current) {
        const r = centerRef.current.getBoundingClientRect();
        setCenterSize({ width: r.width, height: r.height });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!orbitRef.current) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setOrbitSize({ width: rect.width, height: rect.height });
    });

    ro.observe(orbitRef.current);

    // initial measurement
    const rect = orbitRef.current.getBoundingClientRect();
    setOrbitSize({ width: rect.width, height: rect.height });

    const handleResize = () => {
      if (orbitRef.current) {
        const r = orbitRef.current.getBoundingClientRect();
        setOrbitSize({ width: r.width, height: r.height });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useLayoutEffect(() => {
    const latestSizes: Record<string, { width: number; height: number }> = {};
    Object.entries(moduleRefs.current).forEach(([id, el]) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      latestSizes[id] = { width: rect.width, height: rect.height };
    });

    setModuleSizes((prev) => {
      const next: Record<string, { width: number; height: number }> = { ...prev };
      let mutated = false;

      // update or add nodes
      Object.entries(latestSizes).forEach(([id, size]) => {
        const existing = prev[id];
        const widthChanged = !existing || Math.abs(existing.width - size.width) > 0.5;
        const heightChanged = !existing || Math.abs(existing.height - size.height) > 0.5;
        if (widthChanged || heightChanged) {
          next[id] = size;
          mutated = true;
        }
      });

      // remove nodes that no longer exist
      Object.keys(prev).forEach((id) => {
        if (!(id in latestSizes) && id in next) {
          delete next[id];
          mutated = true;
        }
      });

      return mutated ? next : prev;
    });
  }, [orbitSize.width, orbitSize.height, centerSize.width, centerSize.height]);

  // Orbit module definitions for the comparison visual — angles in degrees, radius in px from centre
  // Evenly space 6 nodes around a single ring so they're visually connected and aligned
  const orbitRadius = 220; // px
  const orbitModules = [
    { id: 'm1', title: 'Module 01', desc: 'Details revealed during migration planning.', angle: -60, radius: orbitRadius, icon: Folder },
    { id: 'm2', title: 'Module 02', desc: 'See how signals flow in the private demo.', angle: 0, radius: orbitRadius, icon: FolderSync },
    { id: 'm3', title: 'Module 03', desc: 'Experience the human layer live with us.', angle: 60, radius: orbitRadius, icon: Users },
    { id: 'm4', title: 'Module 04', desc: 'Reserved: reveal during inspection walk-through.', angle: 120, radius: orbitRadius, icon: FileText },
    { id: 'm5', title: 'Module 05', desc: 'Guided tour unlocks the governance layer.', angle: 180, radius: orbitRadius, icon: Shield },
    { id: 'm6', title: 'Module 06', desc: 'Future-facing analytics previewed on call.', angle: 240, radius: orbitRadius, icon: BarChart3 },
  ];

  const featureCards = [
    {
      id: 'feature-docs',
      title: 'Smart Document Management',
      description: 'AI-powered document processing with automatic categorisation, version control, and compliance tracking. Never lose track of important paperwork again.',
      icon: FileText,
      accentGradient: 'from-blue-500 to-blue-600',
      hoverBorder: 'hover:border-blue-200/50',
      glow: 'from-blue-400/20 via-blue-500/10 to-transparent'
    },
    {
      id: 'feature-ai',
      title: 'AI Compliance Assistant',
      description: 'Get instant answers to compliance questions, automated policy reviews, and intelligent recommendations tailored to your care home\'s needs.',
      icon: BrainCircuit,
      accentGradient: 'from-purple-500 to-purple-600',
      hoverBorder: 'hover:border-purple-200/50',
      glow: 'from-purple-400/20 via-purple-500/10 to-transparent'
    },
    {
      id: 'feature-analytics',
      title: 'Real-time Analytics',
      description: 'Comprehensive dashboards showing compliance status, staffing ratios, and operational insights. Make data-driven decisions with confidence.',
      icon: BarChart3,
      accentGradient: 'from-cyan-500 to-cyan-600',
      hoverBorder: 'hover:border-cyan-200/50',
      glow: 'from-cyan-400/20 via-cyan-500/10 to-transparent'
    },
    {
      id: 'feature-staff',
      title: 'Staff Management',
      description: 'Streamline team management and oversight to keep your workforce organised, supported, and compliant.',
      icon: Users,
      accentGradient: 'from-green-500 to-green-600',
      hoverBorder: 'hover:border-green-200/50',
      glow: 'from-green-400/18 via-green-500/10 to-transparent'
    },
    {
      id: 'feature-inspection',
      title: 'Inspection Access',
      description: 'Give inspectors controlled, time-limited access to exactly what they need — securely and on your terms.No printing, no file uploads — just instant visibility for the right people, at the right time.',
      icon: Shield,
      accentGradient: 'from-orange-500 to-orange-600',
      hoverBorder: 'hover:border-orange-200/50',
      glow: 'from-orange-400/20 via-amber-500/10 to-transparent'
    },
    {
      id: 'feature-automation',
      title: 'Automation Engine',
      description: 'Automate routine compliance tasks, generate reports, and receive alerts. Focus on resident care while we handle the paperwork.',
      icon: Zap,
      accentGradient: 'from-pink-500 to-pink-600',
      hoverBorder: 'hover:border-pink-200/50',
      glow: 'from-pink-400/20 via-pink-500/10 to-transparent'
    }
  ];

  const migrationProofPoints = [
    {
      id: 'proof-implementation',
      eyebrow: 'Implementation',
      title: 'Live in 2 weeks',
      body: 'Structured onboarding, data migration, and automation setup handled with you — not handed over.',
      legacyNote: 'Legacy: 12+ weeks + consultancy'
    },
    {
      id: 'proof-support',
      eyebrow: 'Support',
      title: 'Unlimited guidance',
      body: 'In-app coaching, inspection rehearsal kits, and an expert team on-call without extra line items.',
      legacyNote: 'Legacy: paid refresher days'
    },
    {
      id: 'proof-value',
      eyebrow: 'Value',
      title: 'All-inclusive pricing',
      body: 'One subscription covers compliance, AI, secure storage, and updates — no surprised finance teams.',
      legacyNote: 'Legacy: bolt-ons + uplift fees'
    }
  ];

  const roiHighlights = [
    {
      id: 'roi-policy',
      icon: FileText,
      accentGradient: 'from-green-500 to-blue-500',
      title: 'Policy Management',
      description: 'Streamlined creation, updates, and management of care home policies with version control and approval workflows.'
    },
    {
      id: 'roi-staff',
      icon: Users,
      accentGradient: 'from-blue-500 to-purple-500',
      title: 'Staff Management',
      description: 'Complete staff records along with supervision management to ensure compliance and up-to-date certifications.'
    },
    {
      id: 'roi-compliance',
      icon: Shield,
      accentGradient: 'from-purple-500 to-pink-500',
      title: 'Compliance Tracking',
      description: 'Automated compliance monitoring and audit preparation to meet CQC standards and maintain inspection readiness.'
    },
    {
      id: 'roi-trends',
      icon: TrendingUp,
      accentGradient: 'from-green-500 to-emerald-500',
      title: 'Trend Tracking',
      description: 'Monitor compliance trends, performance metrics, and operational insights over time for proactive improvements.'
    }
  ];

  const transparencySteps = [
    {
      id: 'step-setup',
      icon: UploadCloud,
      accentGradient: 'from-blue-500 to-blue-600',
      title: '2 Week Setup',
      subtitle: 'Fast Implementation',
      description: 'Complete setup and in just 2 weeks with full transparency throughout the process'
    },
    {
      id: 'step-updates',
      icon: MessageSquare,
      accentGradient: 'from-purple-500 to-purple-600',
      title: 'Monthly Updates',
      subtitle: 'Feedback & Communication',
      description: 'Regular check-ins and transparent updates with all stakeholders to ensure optimal performance'
    },
    {
      id: 'step-support',
      icon: TrendingUp,
      accentGradient: 'from-green-500 to-green-600',
      title: 'Continuous Support',
      subtitle: 'Ongoing Optimisation',
      description: 'Transparent reporting and continuous platform improvements to maximize your compliance efficiency'
    }
  ];

  const fallbackModuleSize = { width: 160, height: 44 };
  const moduleGeometry = orbitModules.reduce<Record<string, { angleRad: number; support: number; width: number; height: number }>>((acc, module) => {
    const angleRad = (module.angle * Math.PI) / 180;
    const measured = moduleSizes[module.id];
    const width = measured?.width ?? fallbackModuleSize.width;
    const height = measured?.height ?? fallbackModuleSize.height;
    const support = (width / 2) * Math.abs(Math.cos(angleRad)) + (height / 2) * Math.abs(Math.sin(angleRad));
    acc[module.id] = { angleRad, support, width, height };
    return acc;
  }, {});
  const maxSupportDistance = Object.values(moduleGeometry).reduce((max, geom) => Math.max(max, geom.support), 0);
  const centerRadius = Math.max(centerSize.width, centerSize.height) / 2 + 12;
  const minGapBetweenCenterAndModule = 48;
  const ringRadius = Math.max(orbitRadius, centerRadius + maxSupportDistance + minGapBetweenCenterAndModule);

  useEffect(() => {
    // Add parallax tilt to the hero visual; avoid running when reduced-motion is requested
    if (!heroRef.current || !heroCardRef.current) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const el = heroRef.current;
    const card = heroCardRef.current;
    let rafId: number | null = null;
    const maxTilt = 8; // degrees for rotateX/rotateY
    const maxTranslate = 10; // pixels for subtle parallax movement

    const applyTransform = (nx: number, ny: number) => {
      const tiltX = Math.max(-maxTilt, Math.min(maxTilt, ny * -maxTilt));
      const tiltY = Math.max(-maxTilt, Math.min(maxTilt, nx * maxTilt));
      const translateX = Math.round(nx * maxTranslate);
      const translateY = Math.round(ny * maxTranslate);
      card.style.transform = `translate3d(${translateX}px, ${translateY}px, 0px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    };

    const onMove = (ev: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = ((ev.clientX - rect.left) / rect.width - 0.5) * 2; // -1..1
      const ny = ((ev.clientY - rect.top) / rect.height - 0.5) * 2; // -1..1
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => applyTransform(nx, ny));
      heroRaf.current = rafId;
    };

    const onLeave = () => {
      if (rafId) cancelAnimationFrame(rafId);
      card.style.transform = 'translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg)';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      if (rafId) cancelAnimationFrame(rafId);
      heroRaf.current = null;
    };
  }, []);

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
                    Say goodbye to fragmented systems 
                    <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent animate-gradient-x">
                      & compliance headaches.
                    </span>
                  </h1>

                  <p className="text-xl text-slate-600 leading-relaxed max-w-lg">
                    With CG-360, it’s all about integration, not fragmentation — bringing every aspect of care home compliance and governance together in one simple, intelligent, connected platform.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    onClick={openCalendlyModal}
                    className="cta-glow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Book Your Free Demo
                  </Button>
                </div>
              </div>

              {/* Hero Visual with parallax, ring, and micro-interactions */}
              <div ref={heroRef} className="relative hero-visual">
                <div className="hero-ring pointer-events-none -z-10" aria-hidden />

                <div className="relative transform scale-125 hero-scale">
                  <div ref={heroCardRef} className="hero-card relative rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden">
                    <img
                      src="/heroimage.png"
                      alt="CG-360 Platform Dashboard"
                      className="w-full h-auto object-cover"
                      style={{
                        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.02) 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.02) 100%)',
                        opacity: 0.92
                      }}
                    />
                    <div className="hero-glint pointer-events-none" aria-hidden />
                  </div>
                </div>

                {/* Decorative chips — purely visual */}
                <div className="hidden lg:block absolute -top-6 -left-6 hero-chip animate-float-slow" aria-hidden>
                  <div className="w-12 h-12 rounded-lg bg-white/6 border border-white/10 flex items-center justify-center shadow-md">
                    <FileText className="w-5 h-5 text-white/80" />
                  </div>
                </div>

                <div className="hidden lg:block absolute -top-8 -right-8 hero-chip animate-float-medium" aria-hidden>
                  <div className="w-10 h-10 rounded-full bg-white/6 border border-white/10 flex items-center justify-center shadow-md">
                    <Users className="w-4 h-4 text-white/80" />
                  </div>
                </div>

                <div className="hidden lg:block absolute -bottom-6 -left-8 hero-chip animate-float-slow" aria-hidden>
                  <div className="w-14 h-14 rounded-lg bg-white/6 border border-white/10 flex items-center justify-center shadow-md">
                    <Shield className="w-6 h-6 text-white/80" />
                  </div>
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
                Outstanding compliance
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  made simple
                </span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                From document management to automated reporting, CG-360 brings together everything you need for confident, efficient compliance.              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featureCards.map((feature, index) => {
                const Icon = feature.icon as any;
                const staggerStyle = { '--scroll-delay': `${index * 0.08}s` } as CSSProperties;

                return (
                  <div
                    key={feature.id}
                    className={`animate-on-scroll group relative overflow-hidden rounded-2xl border border-slate-200/40 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${feature.hoverBorder}`}
                    style={staggerStyle}
                  >
                    <span className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br ${feature.glow}`} aria-hidden />
                    <div className="relative z-10">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.accentGradient} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-[1.08]`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-4 text-slate-900">{feature.title}</h3>
                      <p className="text-slate-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
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

        {/* Comparison Section */}
        <section id="comparison" className="relative py-24 bg-slate-950 text-white overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_60%)]"></div>
            <div className="absolute -bottom-24 right-12 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute -top-20 left-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl animate-pulse"></div>
            <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-medium text-blue-200 animate-on-scroll">
                <Sparkles className="w-4 h-4" />
                Why modern care homes switch
              </div>
              <h2 className="mt-6 text-4xl lg:text-5xl font-bold leading-tight">
                Old systems slow you down.
                <span className="block font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-purple-300">
                  CG-360 keeps everything in flow.
                </span>
              </h2>
              <p className="mt-6 text-lg text-slate-200">
                Legacy compliance tools were built for another era. CG-360 gives you a connected, AI-powered hub that replaces bolt-ons, manual workarounds, and hidden training fees with clarity and speed.
              </p>
            </div>

            <div className="grid xl:grid-cols-[minmax(0,360px)_1fr] gap-10 items-center">
              <div className="animate-on-scroll-left bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute -top-24 -right-8 w-48 h-48 bg-gradient-to-br from-amber-400/30 to-red-500/30 rounded-full blur-3xl"></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">The legacy stack</h3>
                    <p className="text-sm text-slate-300">Fragmented, reactive, and expensive to maintain.</p>
                  </div>
                </div>
                <ul className="space-y-5 relative z-10">
                  <li className="flex items-start gap-4">
                    <div className="mt-1">
                      <Layers className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="font-semibold">Disconnected tools everywhere</p>
                      <p className="text-slate-300">HR files in one system, policies in another, audits in spreadsheets — nothing talks to each other when you need evidence fast.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="mt-1">
                      <Puzzle className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="font-semibold">Not built for care home reality</p>
                      <p className="text-slate-300">Generic compliance portals struggle with CQC nuance, forcing teams to improvise risky workarounds.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="mt-1">
                      <CreditCard className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="font-semibold">Bolt-ons add up quickly</p>
                      <p className="text-slate-300">Want analytics, document storage, or inspection portals? Those are extra modules with extra invoices.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="mt-1">
                      <Clock className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="font-semibold">Training sold separately</p>
                      <p className="text-slate-300">Teams pay for classroom days, then wait weeks for “configuration” before they can do the basics.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="mt-1">
                      <PoundSterling className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="font-semibold">Opaque renewal costs</p>
                      <p className="text-slate-300">Annual price hikes and consultancy retainers make budgeting unpredictable.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div ref={orbitRef} className="animate-on-scroll-right relative flex items-center justify-center h-[520px]">
                <div className="absolute inset-0 rounded-[48px] bg-gradient-to-br from-blue-600/40 via-purple-600/30 to-cyan-500/30 blur-3xl"></div>
                <div className="absolute inset-10 border border-white/10 rounded-[40px] opacity-40"></div>
                <div className="absolute inset-[18%] rounded-full border border-white/10"></div>
                <div className="absolute inset-[32%] rounded-full border border-white/10 opacity-60"></div>

                <div ref={centerRef} className="relative z-20 max-w-[260px] text-center px-6 py-9 bg-white/12 border border-white/15 rounded-[28px] shadow-[0_22px_70px_-36px_rgba(59,130,246,0.65)] backdrop-blur-xl glow-ring">
                  <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.32em] text-blue-100/70 mb-5">
                    <BadgeCheck className="w-4 h-4" />
                    CG-360
                  </div>
                  <h3 className="text-xl font-semibold">Unified compliance command centre</h3>
                  <p className="mt-3 text-xs text-blue-100/80">
                    The full suite lives here — revealed in guided sessions. Seamless, intelligent, and orchestrated for modern care teams.
                  </p>
                  {/* Teaser content removed to keep platform details private; book a demo to learn more. */}
                </div>

                {orbitModules.map((m) => {
                  const Icon = m.icon as any;
                  const geometry = moduleGeometry[m.id] ?? {
                    angleRad: (m.angle * Math.PI) / 180,
                    support: (fallbackModuleSize.width / 2) * Math.abs(Math.cos((m.angle * Math.PI) / 180)) + (fallbackModuleSize.height / 2) * Math.abs(Math.sin((m.angle * Math.PI) / 180)),
                    width: fallbackModuleSize.width,
                    height: fallbackModuleSize.height
                  };
                  const { angleRad, support: supportDistance } = geometry;

                  const effectiveRadius = Math.max(ringRadius, centerRadius + supportDistance + minGapBetweenCenterAndModule);
                  const connectorLen = Math.max(16, effectiveRadius - centerRadius - supportDistance);
                  // place module center at the effective radius so the line (which ends at
                  // effectiveRadius - supportDistance) meets the module inner edge
                  const nodeX = Math.cos(angleRad) * effectiveRadius;
                  const nodeY = Math.sin(angleRad) * effectiveRadius;
                  const startX = Math.cos(angleRad) * centerRadius;
                  const startY = Math.sin(angleRad) * centerRadius;

                  const formatPosition = (value: number) => `calc(50% ${value >= 0 ? '+' : '-'} ${Math.abs(value).toFixed(2)}px)`;
                  const nodeLeft = formatPosition(nodeX);
                  const nodeTop = formatPosition(nodeY);
                  const startLeft = formatPosition(startX);
                  const startTop = formatPosition(startY);

                  return (
                    <div key={m.id} className="hidden md:block connector animate-fade-in" style={{ position: 'absolute', inset: 0 }}>
                      {/* connector line: starts at central-card edge and extends outward to the module */}
                      <div
                        className="line absolute"
                        style={{
                          left: startLeft,
                          top: startTop,
                          width: `${connectorLen}px`,
                          transform: `translateY(-50%) rotate(${m.angle}deg)`,
                          transformOrigin: '0 50%',
                          height: '2px'
                        }}
                        aria-hidden
                      />

                      {/* node placed at the final orbit position */}
                      <div
                        className="orbit-node"
                        style={{ left: nodeLeft, top: nodeTop, transform: 'translate(-50%, -50%)' }}
                      >
                          <div
                            ref={(el) => {
                              if (el) {
                                moduleRefs.current[m.id] = el;
                                const rect = el.getBoundingClientRect();
                                setModuleSizes((prev) => {
                                  const prevEntry = prev[m.id];
                                  const widthChanged = !prevEntry || Math.abs(prevEntry.width - rect.width) > 0.5;
                                  const heightChanged = !prevEntry || Math.abs(prevEntry.height - rect.height) > 0.5;
                                  if (!widthChanged && !heightChanged) {
                                    return prev;
                                  }
                                  return {
                                    ...prev,
                                    [m.id]: { width: rect.width, height: rect.height }
                                  };
                                });
                              } else {
                                delete moduleRefs.current[m.id];
                              }
                            }}
                            className="rounded-2xl bg-white/10 border border-white/20 px-3 py-2 backdrop-blur-xl shadow-lg text-left max-w-[200px] z-10 flex items-center gap-3 overflow-hidden min-h-[44px]"
                          >
                          <div className="flex-shrink-0 w-8 h-8 rounded-md bg-white/6 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-blue-100" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight">{m.title}</p>
                            <p className="text-[11px] text-blue-100/60 leading-tight whitespace-normal break-words">{m.desc}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {migrationProofPoints.map((point, index) => {
                const staggerStyle = { '--scroll-delay': `${index * 0.08}s` } as CSSProperties;
                return (
                  <div
                    key={point.id}
                    className="animate-on-scroll group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    style={staggerStyle}
                  >
                    <span className="pointer-events-none absolute inset-[-30%] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.32),_transparent_65%)]" aria-hidden />
                    <div className="relative z-10">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-300">{point.eyebrow}</span>
                      <h4 className="mt-4 text-lg font-semibold">{point.title}</h4>
                      <p className="mt-2 text-sm text-slate-300">{point.body}</p>
                      <div className="mt-4 flex items-center gap-3 text-blue-200/80">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-xs">{point.legacyNote}</span>
                        <div className="flex-1 h-px bg-white/10"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-3 bg-white/10 px-6 py-4 rounded-2xl border border-white/20 shadow-2xl animate-on-scroll">
                <span className="text-base font-medium text-blue-100">Ready to leave legacy software behind?</span>
                <Button
                  size="lg"
                  onClick={openCalendlyModal}
                  className="bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-2xl"
                >
                  Book a migration call
                  <ArrowRight className="w-5 h-5 ml-2" />
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
                Generate comprehensive inspection evidence in minutes. Show inspectors exactly what they need to see, when they need to see it.
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
                      <h3 className="text-xl font-bold mb-2 text-slate-900">Instant Evidence Readiness</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Inspection documentation in seconds. Every policy, record, and compliance check organised and ready for review.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900">Live Compliance Oversight</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Stay inspection-ready every day with real-time dashboards that show your compliance position across all key areas. Clear insights help you spot gaps early and keep every standard on track.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900">Smart Alerts & Reminders</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Never miss a deadline or requirement again. Automated alerts and reminders keep your team informed, proactive, and always prepared for inspection.
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
              {roiHighlights.map((highlight, index) => {
                const Icon = highlight.icon as any;
                const staggerStyle = { '--scroll-delay': `${index * 0.08}s` } as CSSProperties;

                return (
                  <div
                    key={highlight.id}
                    className="animate-on-scroll-scale group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-8 text-center shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    style={staggerStyle}
                  >
                    <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_70%)]" aria-hidden />
                    <div className="relative z-10">
                      <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-r ${highlight.accentGradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.06]`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 mb-2">{highlight.title}</div>
                      <p className="text-sm text-slate-500">{highlight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Platform Overview */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">How CG-360 Works</h3>
                  <p className="text-slate-600">Transparent implementation with ongoing support</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {transparencySteps.map((step, index) => {
                    const Icon = step.icon as any;
                    const staggerStyle = { '--scroll-delay': `${index * 0.08}s` } as CSSProperties;

                    return (
                      <div
                        key={step.id}
                        className="animate-on-scroll-scale group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 p-6 text-center shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        style={staggerStyle}
                      >
                        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_70%)]" aria-hidden />
                        <div className="relative z-10">
                          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${step.accentGradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.06]`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <div className="text-lg font-bold text-slate-900 mb-1">{step.title}</div>
                          <div className="text-sm font-medium text-slate-700 mb-2">{step.subtitle}</div>
                          <p className="text-sm text-slate-500">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
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
