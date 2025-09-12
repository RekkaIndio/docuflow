
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadCloud, Cpu, Tag, FolderSync, Bell, Share2, MessageSquare, BrainCircuit, Shield, FileText, Users, BarChart3, Calendar, Mail, Zap, Award, Heart, Building2 } from "lucide-react";

const featureItems = [
    {
        icon: <BrainCircuit className="w-10 h-10 text-primary" />,
        title: "AI Document Chat",
        description: "Ask questions about your policies, care records, and compliance documents in natural language. Get instant answers from individual files or entire folders.",
    },
    {
        icon: <Cpu className="w-10 h-10 text-primary" />,
        title: "Intelligent Data Extraction",
        description: "Our AI analyzes care records, audit reports, and policies to extract structured data, identify compliance gaps, and generate actionable insights.",
    },
    {
        icon: <Shield className="w-10 h-10 text-primary" />,
        title: "CQC Compliance Automation",
        description: "Automated compliance tracking, audit preparation, and regulatory reporting specifically designed for care home CQC requirements.",
    },
    {
        icon: <FileText className="w-10 h-10 text-primary" />,
        title: "Policy Management System",
        description: "Maintain up-to-date policies across all care domains with version control, approval workflows, and automated staff training tracking.",
    },
    {
        icon: <Users className="w-10 h-10 text-primary" />,
        title: "Staff & Resident Records",
        description: "Comprehensive management of staff qualifications, training records, resident care plans, and competency assessments.",
    },
    {
        icon: <BarChart3 className="w-10 h-10 text-primary" />,
        title: "Compliance Analytics",
        description: "Real-time dashboards showing compliance status, audit readiness, and performance metrics across all regulatory domains.",
    },
    {
        icon: <Calendar className="w-10 h-10 text-primary" />,
        title: "Smart Notifications",
        description: "Never miss important deadlines, audit dates, medication reviews, or staff training renewals with intelligent automated reminders.",
    },
    {
        icon: <Mail className="w-10 h-10 text-primary" />,
        title: "Automated Reporting",
        description: "Generate comprehensive reports for CQC inspections, board meetings, and regulatory submissions with AI-powered content analysis.",
    },
    {
        icon: <FolderSync className="w-10 h-10 text-primary" />,
        title: "Hierarchical Organization",
        description: "Organize documents in care home specific folder structures: Outstanding Evidence, Audits, Complaints, Surveys, Action Plans, and more.",
    },
    {
        icon: <Share2 className="w-10 h-10 text-primary" />,
        title: "Secure Team Collaboration",
        description: "Role-based permissions for managers, care staff, and administrators with secure document sharing and real-time collaboration.",
    },
    {
        icon: <Zap className="w-10 h-10 text-primary" />,
        title: "Bulk Document Processing",
        description: "Upload and process multiple documents simultaneously with automatic categorization, tagging, and data extraction.",
    },
    {
        icon: <Award className="w-10 h-10 text-primary" />,
        title: "Quality Assurance Tools",
        description: "AI-powered quality checks on care documentation, medication management, and compliance records with improvement recommendations.",
    },
]


export function DetailedFeatures() {
  return (
    <section className="w-full py-20 md:py-32 lg:py-40 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                Complete Care Home Solution
            </div>
            <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">Everything Care Homes Need to Excel</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                From resident care records to CQC compliance, DocuFlow AI provides comprehensive tools designed specifically for care home operations.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureItems.map((feature, i) => (
                <Card key={i} className="bg-background/50 border-border/20 hover:border-border/60 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg group">
                    <CardHeader className="items-center text-center">
                        <div className="p-4 bg-primary/10 rounded-full mb-4 group-hover:bg-primary/20 transition-colors">
                             {feature.icon}
                        </div>
                        <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                        <CardDescription className="pt-2">{feature.description}</CardDescription>
                    </CardHeader>
                </Card>
            ))}
        </div>
      </div>
    </section>
  )
}
