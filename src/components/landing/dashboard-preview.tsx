
import { Folder, FileText, MessageSquare, PanelLeft, Bot, User, Shield, Award, Heart, Users, BarChart3, Calendar, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MockBrowserWindow = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative mx-auto border-slate-800 dark:border-slate-800 bg-slate-800 border-[8px] rounded-t-xl w-full shadow-2xl ${className}`}>
    <div className="relative rounded-lg overflow-hidden bg-background p-4 h-full">
        {/* Browser "buttons" */}
        <div className="absolute top-2 left-2 flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
        </div>
        <div className="pt-4">
            {children}
        </div>
    </div>
  </div>
);


const MockFileBrowser = () => (
    <div className="flex h-[350px] md:h-[450px]">
        <div className="w-16 bg-muted/30 rounded-l-md p-2 flex flex-col items-center gap-4">
            <Logo className="w-7 h-7 text-primary"/>
            <div className="space-y-3">
                <Shield className="w-6 h-6 text-muted-foreground" />
                <Users className="w-6 h-6 text-muted-foreground" />
                <FileText className="w-6 h-6 text-muted-foreground" />
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
            </div>
        </div>
        <div className="flex-1 p-4">
            <h2 className="font-semibold text-lg font-headline">Care Home Compliance Hub</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-muted/30 p-3 rounded-md flex flex-col items-center justify-center text-center gap-2 border border-primary/20">
                    <Shield className="w-8 h-8 text-primary" />
                    <span className="text-xs font-medium truncate">Outstanding Evidence</span>
                </div>
                <div className="bg-muted/30 p-3 rounded-md flex flex-col items-center justify-center text-center gap-2">
                    <FileText className="w-8 h-8 text-blue-400" />
                    <span className="text-xs font-medium truncate">CQC Audit Report</span>
                </div>
                 <div className="bg-muted/30 p-3 rounded-md flex flex-col items-center justify-center text-center gap-2">
                    <Users className="w-8 h-8 text-green-400" />
                    <span className="text-xs font-medium truncate">Staff Records</span>
                </div>
                <div className="bg-muted/30 p-3 rounded-md flex flex-col items-center justify-center text-center gap-2">
                    <Heart className="w-8 h-8 text-red-400" />
                    <span className="text-xs font-medium truncate">Care Plans</span>
                </div>
                <div className="bg-muted/30 p-3 rounded-md flex flex-col items-center justify-center text-center gap-2">
                    <Calendar className="w-8 h-8 text-purple-400" />
                    <span className="text-xs font-medium truncate">Action Plans</span>
                </div>
                <div className="bg-muted/30 p-3 rounded-md flex flex-col items-center justify-center text-center gap-2">
                    <BarChart3 className="w-8 h-8 text-orange-400" />
                    <span className="text-xs font-medium truncate">Quality Metrics</span>
                </div>
            </div>
        </div>
    </div>
)

const MockComplianceDashboard = () => (
    <div className="h-[250px] md:h-[300px] flex flex-col">
        <div className="flex-shrink-0 border-b border-border/50 pb-2 mb-2">
             <h3 className="font-semibold font-headline flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                CQC Compliance Overview
             </h3>
             <p className="text-xs text-muted-foreground">Last updated: 2 hours ago</p>
        </div>
        <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-medium text-green-800">Safe</span>
                        </div>
                        <div className="text-lg font-bold text-green-800 mt-1">98%</div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-800">Caring</span>
                        </div>
                        <div className="text-lg font-bold text-blue-800 mt-1">95%</div>
                    </CardContent>
                </Card>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Next CQC Inspection</span>
                    <Badge variant="outline" className="text-xs">45 days</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                    3 action items pending • 12 policies updated this month
                </div>
            </div>
        </div>
    </div>
)

const MockChatPanel = () => (
    <div className="h-[250px] md:h-[300px] flex flex-col">
        <div className="flex-1 space-y-3 overflow-hidden">
            <div className="flex items-start gap-2">
                <Bot className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-xs bg-muted/50 p-2 rounded-md">
                    <p>I've analyzed your latest medication audit. Found 2 discrepancies in controlled drug records that need attention.</p>
                </div>
            </div>
             <div className="flex items-start gap-2 justify-end">
                <div className="text-xs bg-primary/80 text-primary-foreground p-2 rounded-md">
                    <p>Show me the specific issues and recommendations.</p>
                </div>
                 <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="flex items-start gap-2">
                <Bot className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-xs bg-muted/50 p-2 rounded-md">
                    <p>Issue 1: Missing signature on morphine administration (Room 204, 8:30 AM). Issue 2: Stock count discrepancy for diazepam. Recommendation: Immediate stock take and staff retraining.</p>
                </div>
            </div>
        </div>
         <div className="flex-shrink-0 mt-2">
            <div className="w-full h-8 bg-muted/50 rounded-md"></div>
        </div>
    </div>
)


export function DashboardPreview() {
  return (
    <section className="w-full py-20 md:py-32 lg:py-40">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Care Home Dashboard
          </div>
          <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">See Docuflow in Action</h2>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Explore the clean, intuitive interface designed specifically for care home compliance and document management. From CQC audits to resident care records, everything is organized for regulatory excellence.
          </p>
        </div>

        <MockBrowserWindow className="h-[400px] md:h-[500px]">
            <MockFileBrowser />
        </MockBrowserWindow>

        <div className="relative -mt-16 grid lg:grid-cols-2 gap-8 z-10 px-4 sm:px-8 md:px-12 lg:px-20">
            <MockBrowserWindow className="h-[280px] md:h-[330px]">
                <MockComplianceDashboard />
            </MockBrowserWindow>
             <MockBrowserWindow className="h-[280px] md:h-[330px]">
                <MockChatPanel />
            </MockBrowserWindow>
        </div>
      </div>
    </section>
  );
}
