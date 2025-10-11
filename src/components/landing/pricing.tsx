
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const plans = [
    {
        name: 'Starter',
        price: 'Free',
        priceDetail: 'forever',
        description: 'Perfect for individuals and small projects',
        features: [
            '1 workspace',
            '100 documents/month',
            'Basic AI analysis',
            'Standard templates',
            'Email support'
        ],
        buttonText: 'Start Free',
        buttonVariant: 'outline',
        href: '/signup',
    },
    {
        name: 'Professional',
        price: '$49',
        priceDetail: '/month',
        description: 'Best for growing businesses',
        features: [
            '5 workspaces',
            '5,000 documents/month',
            'Advanced AI analysis',
            'Custom workflows',
            'Priority support',
            'Team collaboration',
            'API access',
        ],
        buttonText: 'Start Trial',
        buttonVariant: 'default',
        isMostPopular: true,
        href: '/signup',
    },
    {
        name: 'Workspace',
        price: '£20',
        priceDetail: '/month per workspace',
        description: 'For scaling your operations',
        features: [
            'Dedicated workspace',
            'Unlimited documents',
            'Advanced AI analysis',
            'Priority email support',
            'Team collaboration'
        ],
        buttonText: 'Add Workspace',
        buttonVariant: 'outline',
        href: '/signup',
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        priceDetail: 'pricing',
        description: 'For large organizations',
        features: [
            'Unlimited workspaces',
            'Unlimited documents',
            'Custom AI models',
            'Advanced security',
            'Dedicated support',
            'SSO & compliance',
        ],
        buttonText: 'Contact Sales',
        buttonVariant: 'outline',
        href: '#',
    }
]

export function Pricing() {
    return (
        <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                   Simple Pricing
                </div>
                <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">Choo</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
                {plans.map((plan) => (
                    <Card key={plan.name} className={cn(
                        "flex flex-col",
                        plan.isMostPopular ? "border-primary shadow-lg shadow-primary/20" : ""
                    )}>
                        {plan.isMostPopular && (
                            <div className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider text-center py-1 rounded-t-lg">Most Popular</div>
                        )}
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-headline">{plan.name}</CardTitle>
                            <p className="text-4xl font-bold">
                                {plan.price}
                                {plan.priceDetail && <span className="text-sm font-normal text-muted-foreground ml-1">{plan.priceDetail}</span>}
                            </p>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-green-500" />
                                        <span className="text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <div className="p-6">
                           <Button asChild className="w-full" variant={plan.isMostPopular ? 'default' : 'outline'}>
                                <Link href={plan.href}>{plan.buttonText}</Link>
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
