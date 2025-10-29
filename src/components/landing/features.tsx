
import { Mic, Search, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
    {
        icon: <Bot className="w-6 h-6" />, 
        title: 'Natural Language Chat',
        description: 'Chat with Eli like a human colleague. Ask questions naturally and get conversational responses about your documents.',
        examples: [
            "What contracts expire soon?",
            "Can you summarize last month's reports?",
            "Show me invoices over ten thousand"
        ],
    },
    {
        icon: <Search className="w-6 h-6" />, 
        title: 'Intelligent Search',
        description: "Search by meaning, not just keywords. Ask 'show me contracts expiring soon' and get exactly what you need.",
        examples: [
            "Contracts expiring in next 3 months",
            "Invoices from Q2 over £10K",
            "Documents mentioning sustainability"
        ],
    },
    {
        icon: <Bot className="w-6 h-6" />, 
        title: 'Instant Summaries',
        description: 'Get comprehensive summaries of any document or group of documents in seconds through voice or text.',
        examples: [
            "Summarize all meeting notes from January",
            "Key points from vendor contracts",
            "Financial highlights from reports"
        ],
    },
    {
        icon: <Bot className="w-6 h-6" />, 
        title: 'Agentic Actions',
        description: 'Go beyond chat: Doc can send documents, grant or revoke access, create teams, and automate workflows—all from the chat.',
        examples: [
            "Send the latest contract to Priya",
            "Grant access to the Finance team for Q2 reports",
            "Revoke access for ex-employees",
            "Create a new team: Project Alpha",
            "Share this folder with Alex and Sam",
            "Export all invoices as CSV",
            "Set a reminder for contract renewal",
            "Invite a new user to the workspace"
        ],
    },
];

export function Features() {
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h3 className="text-2xl font-bold font-headline">Just Chat with Eli</h3>
                <p className="mt-2 text-muted-foreground">
                    Eli is your conversational AI assistant who understands your documents inside and out. Simply chat with Eli like you would a colleague—ask questions naturally, request summaries, or explore your document library through conversation.<br />
                    <span className="block mt-2 font-semibold text-primary">Now with agentic actions: send documents, manage access, create teams, and automate tasks—all from chat.</span>
                </p>
            </div>
            {features.map((feature, i) => (
                <Card key={i} className="bg-background/50 border-border/50">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            {feature.icon}
                        </div>
                        <CardTitle className="font-headline">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{feature.description}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {feature.examples.map(ex => <Badge variant="secondary" key={ex}>{ex}</Badge>)}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
