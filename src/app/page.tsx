
import { AnimatedHeroBg } from '@/components/landing/animated-hero-bg';
import { NewsletterSignup } from '@/components/landing/newsletter-signup';
import { HeroProductDemo } from '@/components/landing/hero-product-demo';
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { BottomFeatures } from "@/components/landing/bottom-features";
import { Pricing } from '@/components/landing/pricing';
import { DetailedFeatures } from '@/components/landing/detailed-features';
import { Footer } from '@/components/landing/footer';
import { PlatformShowcaseCarousel } from '@/components/landing/platform-showcase-carousel';
// import { WaitlistSignup } from '@/components/landing/waitlist-signup';
import { ConversationalChat } from '@/components/landing/conversational-chat';

export default function Page() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <header className="px-4 lg:px-6 h-16 flex items-center sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
                <a href="#" className="flex items-center justify-center gap-2">
                    <img
                        src="/Neurodiversity_Symbol.svg"
                        alt="DocuFlow Logo"
                        width={24}
                        height={24}
                        className="w-6 h-6 object-contain"
                    />
                    <span className="text-xl font-semibold font-headline">DocuFlow AI</span>
                </a>
                <nav className="ml-auto hidden lg:flex gap-4 sm:gap-6 items-center">
                    <a href="#features" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80">Features</a>
                    <a href="#pricing" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80">For Care Homes</a>
                    <a href="/login" className="text-sm font-medium hover:underline underline-offset-4 text-foreground/80">Sign In</a>
                    <button className="bg-primary hover:bg-primary/90 animate-pulse focus:animate-none shadow-lg shadow-primary/20 rounded px-4 py-2 text-sm font-semibold text-primary-foreground ml-2">
                        <a href="/signup">Try Your Policies</a>
                    </button>
                </nav>
            </header>

            <main className="flex-1">
            
                <section className="w-full py-24 md:py-40 lg:py-52 relative overflow-hidden">
                    <AnimatedHeroBg />
                    <div className="container px-4 md:px-6">
                        <div className="grid gap-16 lg:grid-cols-2 items-center">
                            <div className="flex flex-col justify-center space-y-8 relative z-10">
                                                                <div className="inline-block self-start">
                                                                    <img
                                                                        src="/Neurodiversity_Symbol.svg"
                                                                        alt="Neurodiversity Symbol"
                                                                        width={44}
                                                                        height={22}
                                                                        style={{ opacity: 0.3, filter: 'blur(0.5px)', width: '44px', height: 'auto' }}
                                                                    />
                                                                </div>
                                <h1 className="text-5xl font-extrabold font-headline tracking-tighter sm:text-6xl xl:text-7xl/none drop-shadow-lg">
                                    AI-Powered <br/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 animate-gradient-text">
                                        Compliance Hub
                                    </span>
                                </h1>
                                <p className="max-w-[600px] text-muted-foreground md:text-2xl font-medium">
                                    Interact with your homes compliance
                                </p>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{backgroundColor: '#ea68a2'}}>Simple</span>
                                    <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{backgroundColor: '#f7a43f'}}>Effective</span>
                                    <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{backgroundColor: '#339cdc'}}>Inclusive</span>
                                    <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{backgroundColor: '#3abb99'}}>celebrating diversity</span>
                                </div>
                                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                                    <button className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 animate-glow rounded px-6 py-3 text-lg font-semibold text-primary-foreground flex items-center">
                                        <a href="/signup">Try it out <span className="ml-2">→</span></a>
                                    </button>
                                    <button className="border border-primary rounded px-6 py-3 text-lg font-semibold text-primary">
                                        <a href="#">See How It Works</a>
                                    </button>
                                </div>
                                <span className="text-xs text-muted-foreground mt-1">No setup required • Upload and search instantly</span>
                                <div className="flex items-center gap-4 pt-6">
                                    <div className="flex -space-x-2">
                                        {/* ...avatars... */}
                                    </div>
                                    <div>
                                        <p className="font-semibold">500+ care organizations trust us</p>
                                        <p className="text-sm text-muted-foreground">Search millions of policy documents daily</p>
                                    </div>
                                </div>
                            </div>
                                            {/* Animated product demo visual */}
                                            <div className="relative z-10 flex items-center justify-center">
                                                <HeroProductDemo />
                                            </div>
                        </div>
                    </div>
                </section>

                {/* Why Use Docuflow Section */}
                <section className="w-full py-20 md:py-32 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
                            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                Why Docuflow?
                            </div>
                            <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">Transform How You Handle Documents</h2>
                            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                Stop wrestling with scattered files and endless searches. Docuflow brings intelligence to your document workflow.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-6">
                                    <span className="text-2xl">⏰</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4 font-headline">Stop Wasting Time</h3>
                                <p className="text-muted-foreground">
                                    No more digging through folders or scanning documents manually. Find any information in seconds with intelligent AI search.
                                </p>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
                                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mb-6">
                                    <span className="text-2xl">🎯</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4 font-headline">Stay Compliant</h3>
                                <p className="text-muted-foreground">
                                    Never miss critical deadlines or compliance requirements. Our AI automatically tracks important dates and obligations.
                                </p>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-6">
                                    <span className="text-2xl">🚀</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4 font-headline">Work Smarter</h3>
                                <p className="text-muted-foreground">
                                    Chat with your documents like talking to a colleague. Get summaries, extract data, and generate reports instantly.
                                </p>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-6">
                                    <span className="text-2xl">🔒</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4 font-headline">Keep Data Secure</h3>
                                <p className="text-muted-foreground">
                                    Enterprise-grade security ensures your sensitive documents stay protected while remaining easily accessible to your team.
                                </p>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-6">
                                    <span className="text-2xl">📊</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4 font-headline">Gain Insights</h3>
                                <p className="text-muted-foreground">
                                    Turn your document library into actionable intelligence. Spot trends, identify risks, and make data-driven decisions.
                                </p>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-6">
                                    <span className="text-2xl">⚡</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4 font-headline">Start Immediately</h3>
                                <p className="text-muted-foreground">
                                    No complex setup or training required. Upload your documents and start chatting with them in minutes, not months.
                                </p>
                            </div>
                        </div>
                        
                        <div className="text-center mt-16">
                            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-3">
                                <span className="text-primary font-semibold">Ready to transform your workflow?</span>
                                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm">
                                    <a href="/signup">Try Docuflow Free</a>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="py-12" />

                {/* Original Features Section */}
                <section id="features" className="w-full py-20 md:py-32 lg:py-40 bg-muted/20">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                AI Policy Assistant
                            </div>
                            <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">Meet Doc - Your Policy & Procedure Assistant</h2>
                            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                Ask questions about your care policies, get instant guidance on procedures, and find the exact information you need—all through a natural, chat-based interface designed for care professionals.
                            </p>
                        </div>
                        <div className="mx-auto grid max-w-5xl items-start gap-12 lg:max-w-none lg:grid-cols-2 lg:gap-16 mt-12">
                            <Hero />
                            <div className="flex flex-col justify-center space-y-4">
                                <Features />
                            </div>
                        </div>
                        <div className="mt-16">
                            <BottomFeatures />
                        </div>
                    </div>
                </section>

        <DetailedFeatures />
        <div className="py-8" />
    <PlatformShowcaseCarousel />
            <div className="py-8" />

                
            </main>
            <Footer />
        </div>
    );
}
