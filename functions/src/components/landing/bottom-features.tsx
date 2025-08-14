
import { Mic, Search, BarChart2, CalendarClock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const features = [
    {
        icon: <Mic className="w-8 h-8 text-primary" />,
        title: 'Voice Chat',
        description: 'Talk naturally with Doc about your documents',
    },
    {
        icon: <Search className="w-8 h-8 text-primary" />,
        title: 'Smart Search',
        description: 'Find documents by content, not just filename',
    },
    {
        icon: <BarChart2 className="w-8 h-8 text-primary" />,
        title: 'Generate Reports',
        description: 'Instant insights across your document library',
    },
    {
        icon: <CalendarClock className="w-8 h-8 text-primary" />,
        title: 'Track Deadlines',
        description: 'Never miss important dates from contracts',
    },
]

export function BottomFeatures() {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
                <Card key={i} className="bg-white border-border/50">
                    <CardHeader>
                        {feature.icon}
                        <CardTitle className="mt-4 font-headline">{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                </Card>
            ))}
        </div>
    )
}
