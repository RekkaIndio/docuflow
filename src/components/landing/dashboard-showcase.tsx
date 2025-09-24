import React from 'react';
import { FileText, Calendar, Search, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useCalendly } from '@/context/calendly-context';

export function DashboardShowcase() {
  const { openCalendlyModal } = useCalendly();
  return (
    <section className="w-full py-20 md:py-28 bg-gradient-to-br from-white/80 to-slate-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container px-4 md:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold font-headline">Inside CG-360</h3>
            <p className="text-slate-700 mt-1">A quick look at your policy intelligence dashboard — everything your team needs to stay compliant and proactive.</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <button onClick={openCalendlyModal} className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold">Request demo</button>
            <a href="/signup" className="px-4 py-2 rounded border border-border text-sm font-medium">Start free</a>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left: Dashboard card */}
          <div className="lg:col-span-8">
            <div className="bg-background/90 border border-border/30 rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <img src="/Neurodiversity_Symbol.png" alt="logo" width={28} height={28} className="w-7 h-7 object-contain" />
                  <div>
                    <div className="font-semibold">CG-360 Dashboard</div>
                    <div className="text-xs text-slate-700">Overview • Updated 2 mins ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-700 flex items-center gap-2"><Calendar className="w-4 h-4" /> Mar 2025</div>
                  <div className="text-xs text-slate-700 flex items-center gap-2"><Search className="w-4 h-4" /> Search documents</div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-white shadow-sm"><FileText className="w-5 h-5 text-purple-600" /></div>
                      <div>
                        <div className="text-2xl font-bold">1,248</div>
                        <div className="text-xs text-muted-foreground">Documents indexed</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-white shadow-sm"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                      <div>
                        <div className="text-2xl font-bold">32</div>
                        <div className="text-xs text-muted-foreground">Policies due soon</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-white shadow-sm"><Users className="w-5 h-5 text-sky-600" /></div>
                      <div>
                        <div className="text-2xl font-bold">14</div>
                        <div className="text-xs text-muted-foreground">Active users</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <div className="rounded-lg border border-border/20 bg-gradient-to-br from-white/60 to-muted/10 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="font-semibold">Compliance trend</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> 6% vs last month</div>
                      </div>
                      {/* Simple SVG line chart */}
                      <div className="w-full h-40">
                        <svg viewBox="0 0 200 80" className="w-full h-full">
                          <defs>
                            <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d="M0,60 L20,50 L40,45 L60,30 L80,35 L100,28 L120,20 L140,18 L160,22 L180,16 L200,12" fill="url(#g1)" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500" /> Policies up-to-date</div>
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Reviewed this month</div>
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> Due soon</div>
                      </div>
                    </div>
                  </div>

                  <div className="">
                    <div className="rounded-lg border border-border/20 bg-background/80 p-4">
                      <div className="font-semibold mb-2">Activity</div>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-3">
                          <div className="mt-1"><Clock className="w-4 h-4" /></div>
                          <div>
                            <div className="text-xs">2m ago</div>
                            <div className="">Policy <span className="font-semibold text-primary">Safeguarding-Adults-Policy.pdf</span> marked reviewed</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1"><Clock className="w-4 h-4" /></div>
                          <div>
                            <div className="text-xs">1h ago</div>
                            <div className="">New document imported: <span className="font-semibold">Admission-Checklist.docx</span></div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1"><Clock className="w-4 h-4" /></div>
                          <div>
                            <div className="text-xs">Yesterday</div>
                            <div className="">3 policies flagged as <span className="font-semibold text-orange-500">Due soon</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-right">
                        <a href="#" className="text-xs text-primary font-medium">View all activity →</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Recent documents */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="bg-background/90 border border-border/30 rounded-2xl p-4 shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold">Recent documents</div>
                  <div className="text-xs text-muted-foreground">Showing 5</div>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Safeguarding-Adults-Policy.pdf', status: 'current', date: 'Mar 2024' },
                    { name: 'Medicine-Policy-v3.2.pdf', status: 'due', date: 'Mar 15, 2025' },
                    { name: 'Visitor-Policy-2024.pdf', status: 'current', date: 'Dec 2024' },
                    { name: 'Admission-Checklist.docx', status: 'new', date: 'Today' },
                    { name: 'Care-Plan-Template.docx', status: 'review', date: 'Feb 2025' },
                  ].map((d, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="p-2 rounded bg-white shadow-sm"><FileText className="w-5 h-5 text-orange-500" /></div>
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs text-muted-foreground">{d.date}</div>
                      </div>
                      <div className="text-xs">
                        {d.status === 'due' ? <span className="text-xs text-orange-600 font-semibold">Due Soon</span> : null}
                        {d.status === 'current' ? <span className="text-xs text-green-600 font-semibold">Current</span> : null}
                        {d.status === 'new' ? <span className="text-xs text-blue-600 font-semibold">New</span> : null}
                        {d.status === 'review' ? <span className="text-xs text-muted-foreground font-semibold">Needs review</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center">
                  <a href="#" className="text-sm font-medium text-primary">Open Document Library →</a>
                </div>
              </div>

              <div className="bg-background/90 border border-border/30 rounded-2xl p-4 shadow">
                <div className="font-semibold mb-2">Upcoming renewals</div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-orange-500" /><div>Medicine Policy</div></div>
                    <div className="text-xs text-orange-600 font-semibold">Mar 15, 2025</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-orange-500" /><div>Fire Safety Policy</div></div>
                    <div className="text-xs text-muted-foreground">Apr 2, 2025</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-orange-500" /><div>Visitor Policy</div></div>
                    <div className="text-xs text-muted-foreground">Dec 2024</div>
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <a href="#" className="text-xs text-primary font-medium">Manage renewals →</a>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default DashboardShowcase;
