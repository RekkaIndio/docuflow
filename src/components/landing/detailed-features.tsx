
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadCloud, Cpu, Tag, FolderSync, Bell, Share2 } from "lucide-react";

const featureItems = [
    {
        icon: <UploadCloud className="w-10 h-10 text-primary" />,
        title: "Seamless Document Upload",
        description: "Effortlessly upload documents in various formats including PDF, Word, Excel, CSV, and TXT. Our system handles the rest.",
    },
    {
        icon: <Cpu className="w-10 h-10 text-primary" />,
        title: "Intelligent Data Extraction",
        description: "Our AI engine analyzes your documents, extracts structured data, and converts it into a usable JSON format for queries.",
    },
    {
        icon: <Tag className="w-10 h-10 text-primary" />,
        title: "Automated Tagging & Organisation",
        description: "Documents are automatically tagged and organized into relevant folders based on their content, saving you hours of manual work.",
    },
    {
        icon: <Share2 className="w-10 h-10 text-primary" />,
        title: "Secure Document Sharing",
        description: "Collaborate with your team by sharing documents securely with user-level permissions, ensuring data privacy and control.",
    },
    {
        icon: <FolderSync className="w-10 h-10 text-primary" />,
        title: "Hierarchical Workspaces",
        description: "Organize your documents efficiently within personalized workspaces using a familiar and intuitive folder structure.",
    },
    {
        icon: <Bell className="w-10 h-10 text-primary" />,
        title: "Smart Notifications",
        description: "Get notified about important deadlines, contract renewals, or key events mentioned in your documents so you never miss a beat.",
    },
]


export function DetailedFeatures() {
  return (
    <section className="w-full py-20 md:py-32 lg:py-40 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                Core Features
            </div>
            <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">Everything you need, nothing you don't.</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                From upload to insight, CG-360 provides a comprehensive suite of tools to supercharge your document management.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureItems.map((feature, i) => (
                <Card key={i} className="bg-background/50 border-border/20 hover:border-border/60 transition-colors duration-300 transform hover:-translate-y-1">
                    <CardHeader className="items-center text-center">
                        <div className="p-4 bg-primary/10 rounded-full mb-4">
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
