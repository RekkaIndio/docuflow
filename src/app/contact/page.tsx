"use client";

import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';
import { useCalendly } from '@/context/calendly-context';

export default function ContactPage() {
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
          <Link href="/about" className="text-sm font-medium hover:underline">About</Link>
          <Link href="/login" className="text-sm font-medium hover:underline">Sign In</Link>
          <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <button onClick={openCalendlyModal}>Book Demo</button>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <div className="mb-8">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Get in Touch
                </h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Have questions about CG-360? Need support or want to learn more?
                  We're here to help. Choose how you'd like to connect with us.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12">
                {/* Contact Information */}
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-6">Contact Information</h2>
                    <p className="text-slate-600 mb-8">
                      Choose the most appropriate way to reach us. For product demos and sales inquiries,
                      we recommend booking a call directly.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Email Support</h3>
                        <p className="text-slate-600 mb-2">For general inquiries and support</p>
                        <a href="mailto:support@cg360.co.uk" className="text-blue-600 hover:underline">
                          support@cg360.co.uk
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Book a Demo</h3>
                        <p className="text-slate-600 mb-2">See CG-360 in action with a personalized demo</p>
                        <Button
                          onClick={openCalendlyModal}
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          Schedule Demo
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Emergency Support</h3>
                        <p className="text-slate-600 mb-2">For urgent technical issues</p>
                        <p className="text-slate-900 font-medium">Available 24/7</p>
                      </div>
                    </div>
                  </div>

                  {/* Response Time Info */}
                  <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-3">Response Times</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">General inquiries:</span>
                          <span className="font-medium">Within 24 hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Technical support:</span>
                          <span className="font-medium">Within 4 hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Demo requests:</span>
                          <span className="font-medium">Within 2 hours</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact Form */}
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-2xl">Send us a Message</CardTitle>
                    <CardDescription>
                      Fill out the form below and we'll get back to you as soon as possible.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Smith" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" placeholder="john@carehome.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactType">How can we help you?</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="demo">Request a Demo</SelectItem>
                          <SelectItem value="support">Technical Support</SelectItem>
                          <SelectItem value="sales">Sales Information</SelectItem>
                          <SelectItem value="partnership">Partnership Opportunities</SelectItem>
                          <SelectItem value="feedback">Feedback & Suggestions</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us more about your inquiry..."
                        className="min-h-[120px]"
                      />
                    </div>

                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Send Message
                    </Button>

                    <p className="text-sm text-slate-500 text-center">
                      By submitting this form, you agree to our{' '}
                      <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                      {' '}and{' '}
                      <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-slate-50">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                <p className="text-lg text-slate-600">
                  Quick answers to common questions about CG-360.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">How quickly can I get started?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">
                      Most care homes are up and running within 2 weeks. Our implementation team
                      handles staff training to ensure a smooth transition.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Do you offer training?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">
                      Yes! We provide comprehensive training for all staff levels, from basic
                      user training to advanced administrator workshops.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Is my data secure?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">
                      Absolutely. We use enterprise-grade encryption, comply with GDPR, and
                      undergo regular security audits to protect your sensitive information.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">
                      Yes, you can cancel your subscription at any time. We offer flexible
                      pricing with no long-term contracts or hidden fees.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}