"use client";

import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Shield, Zap, Target, Award, Quote } from 'lucide-react';
import { useCalendly } from '@/context/calendly-context';

export default function AboutPage() {
  const { openCalendlyModal } = useCalendly();
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900">
      <header className="px-4 lg:px-6 h-16 flex items-center sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur-sm">
        <Link href="/" className="flex items-center justify-center gap-3">
          <Logo className="h-7 w-7 text-primary" />
          <span className="text-2xl font-extrabold font-headline tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CG-360</span>
        </Link>
        <nav className="ml-auto hidden lg:flex gap-4 sm:gap-6 items-center">
          <Link href="/" className="text-sm font-medium hover:underline">Home</Link>
          <Link href="/contact" className="text-sm font-medium hover:underline">Contact</Link>
          <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openCalendlyModal();
              }}
            >
              Book a Demo
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <div className="mb-8">
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">
                  Meet the Team
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  The People Behind CG-360
                </h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  We're a passionate team of healthcare technology experts and compliance specialists
                  who believe that care home governance should be effortless, not overwhelming.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Story</h2>
                <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                  Born from real-world experience in care home operations, CG-360 was created to solve
                  the compliance challenges that care providers face every day.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-16">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <Heart className="w-6 h-6 text-red-600" />
                    </div>
                    <CardTitle className="text-xl">The Problem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      We witnessed firsthand how care home managers spent countless hours on paperwork,
                      struggling with complex compliance requirements, and sacrificing precious time
                      that could be spent caring for residents. Even with the systems that are supposed
                      to help, compliance still felt like a burden.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">The Solution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      We combined our expertise in healthcare compliance with AI technology
                      to create CG-360 - a platform that makes compliance management intelligent,
                      automated, and actually enjoyable to use. Data drives everything we do,
                      empowering care homes to not only meet regulatory standards but exceed them,
                      all while focusing on what truly matters - delivering exceptional care.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              {/* Quote Section */}
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 md:p-12 text-center">
                <Quote className="w-12 h-12 text-slate-400 mx-auto mb-6" />
                <blockquote className="text-2xl md:text-3xl font-medium text-slate-700 mb-6 max-w-4xl mx-auto leading-relaxed">
                  "Compliance shouldn't be a burden - it should be your competitive advantage.
                  When compliance is effortless, care quality improves."
                </blockquote>
                <cite className="text-slate-600 font-medium">- Leigh-Anne Kettle, Founder & CEO</cite>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 bg-slate-50">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Our Team</h2>
                <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                  A diverse group of experts united by a shared mission to transform
                  care home compliance through technology.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Team Member 1 */}
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden">
                      <img
                        src="/leigannekettle.jpeg"
                        alt="Leigh-Anne Kettle"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardTitle className="text-xl">Leigh-Anne Kettle</CardTitle>
                    <CardDescription className="text-primary font-medium">CEO</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">
                      15+ years in care home and compliance management, passionate about improving care quality through technology. 
                      Extensive experience in senior management roles in the care sector.
                    </p>
                  </CardContent>
                </Card>

                {/* Team Member 3 */}
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden">
                      <img
                        src="/HelenCooke.png"
                        alt="Helen Cooke"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardTitle className="text-xl">Helen Cooke</CardTitle>
                    <CardDescription className="text-primary font-medium">CPO</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">
                      40+ years in the care sector as a nurse with extensive experience in senior management and operations. 
                      Nominated Individual, Operations Director, expert in driving operational excellence and transforming services.
                    </p>
                  </CardContent>
                </Card>

                      {/* Team Member 4 */}
                  <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden">
                      <img
                        src="/Jamie Mason-Wright.jpeg"
                        alt="Jamie Mason Wright"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardTitle className="text-xl">Jamie Mason Wright</CardTitle>
                    <CardDescription className="text-primary font-medium">CTO</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">
                      10+ years in software development. Former Antler alumni and startup founder with extensive web and mobile experience. 
                      Built and scaled retail and business applications to 6 different countries.
                    </p>
                  </CardContent>
                </Card>
                
              </div>
            </div>
          </div>
        </section>

        {/* Why We Built This Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Why We Built CG-360</h2>
                <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                  Every feature, every line of code, is designed with one purpose:
                  to make compliance management effortless so you can focus on what matters most.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">Regulatory Confidence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 text-sm">
                      Stay ahead of CQC requirements with automated compliance checking
                      and intelligent risk assessment.
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle className="text-lg">Focus on Care</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 text-sm">
                      Reduce administrative burden by up to 70%, giving you more time
                      to provide exceptional resident care.
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Target className="w-8 h-8 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">Quality Improvement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 text-sm">
                      Use data-driven insights to continuously improve care quality
                      and operational efficiency.
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Award className="w-8 h-8 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">Peace of Mind</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 text-sm">
                      Sleep better knowing your compliance is always up-to-date
                      and audit-ready.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 bg-gradient-to-r from-primary/5 to-purple-50">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Compliance?</h2>
              <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                Book your free demo today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline" size="lg" className="px-8">
                  <Link
                    href="#"
                    onClick={e => {
                      e.preventDefault();
                      openCalendlyModal();
                    }}
                    className="bg-primary text-white hover:bg-primary/90 font-semibold rounded-lg px-8 py-3 transition-colors shadow-lg shadow-primary/20"
                  >
                    Book a Demo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}