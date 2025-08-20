
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { ArrowRight, CheckCircle2, UploadCloud, BrainCircuit, MessageSquare, Briefcase, Landmark, FlaskConical, Twitter, Github, Linkedin } from 'lucide-react';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { AnimatedHeroBg } from './landing/animated-hero-bg';
import { TrustedByBar } from './landing/trusted-by-bar';
import { TestimonialCarousel } from './landing/testimonial-carousel';
import { DetailedFeatures } from './landing/detailed-features';
// import { BottomFeatures } from './landing/bottom-features';
import { DashboardPreview } from './landing/dashboard-preview';
import { NewsletterSignup } from './landing/newsletter-signup';

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground dark relative">
      <header className="px-4 lg:px-6 h-16 flex items-center sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <Link href="#" className="flex items-center justify-center gap-2">
          <Logo className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold font-headline">DocuFlow AI</span>
        </Link>
        <nav className="ml-auto hidden lg:flex gap-4 sm:gap-6 items-center">
          <Link href="#" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80">
            Features
          </Link>
          <Link href="#" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80">
            For Care Homes
          </Link>
          <Link href="#" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80">
            Pricing
          </Link>
          <Link href="#" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80">
            Demo
          </Link>
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80">
            Sign In
          </Link>
          <Button asChild className="bg-primary hover:bg-primary/90 animate-pulse focus:animate-none shadow-lg shadow-primary/20">
            <Link href="/signup">Try Your Policies</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-24 md:py-40 lg:py-52 relative overflow-hidden">
          <AnimatedHeroBg />
          <div className="container px-4 md:px-6">
            <div className="grid gap-16 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-8 relative z-10">
                <div className="inline-block self-start">
                  <Image
                    src="/Neurodiversity_Symbol.svg"
                    alt="Neurodiversity Symbol"
                    width={44}
                    height={22}
                    className="opacity-30 w-11 h-auto drop-shadow-sm"
                    style={{ filter: 'blur(0.5px)' }}
                    priority
                  />
                </div>
                <h1 className="text-5xl font-extrabold font-headline tracking-tighter sm:text-6xl xl:text-7xl/none drop-shadow-lg">
                  AI-Powered <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 animate-gradient-text">
                    Care Policies Hub
                  </span>
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-2xl font-medium">
                  Interact with your homes compliance documents
                </p>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Button size="lg" asChild className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 animate-glow">
                    <Link href="/signup">
                      Try Your Policies
                      <ArrowRight className="ml-2 h-5 w-5 animate-bounce-x" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="#">
                      See How It Works
                    </Link>
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground mt-1">No setup required • Upload and search instantly</span>
                <div className="flex items-center gap-4 pt-6">
                  <div className="flex -space-x-2">
                    <Image src="https://i.pravatar.cc/150?u=a" width={40} height={40} alt="User" className="rounded-full border-2 border-background" />
                    <Image src="https://i.pravatar.cc/150?u=b" width={40} height={40} alt="User" className="rounded-full border-2 border-background" />
                    <Image src="https://i.pravatar.cc/150?u=c" width={40} height={40} alt="User" className="rounded-full border-2 border-background" />
                    <Image src="https://i.pravatar.cc/150?u=d" width={40} height={40} alt="User" className="rounded-full border-2 border-background" />
                  </div>
                </div>
              </div>
              {/* Replace with interactive demo or video preview in future */}
              <div className="relative z-10 flex items-center justify-center">
                {/* Placeholder for interactive demo or video */}
                <div className="w-full h-[400px] md:h-[480px] bg-muted/30 rounded-3xl flex items-center justify-center border-2 border-dashed border-primary/30 shadow-xl">
                  <span className="text-lg text-muted-foreground">[Product Demo Coming Soon]</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <TrustedByBar />
        <TestimonialCarousel />
        {/* Add more whitespace between sections for premium feel */}
        <div className="py-12" />
  <DetailedFeatures />
  <div className="py-8" />
  {/* <BottomFeatures /> */}
  <div className="py-8" />
  <DashboardPreview />
  <div className="py-8" />
  <NewsletterSignup />
      </main>
    </div>
  );
}
