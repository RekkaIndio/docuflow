
import { Folder, FileText, MessageSquare, PanelLeft, Bot, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';

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
                <Folder className="w-6 h-6 text-muted-foreground" />
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
                <PanelLeft className="w-6 h-6 text-muted-foreground" />
            </div>
        </div>
        <div className="flex-1 p-4">
            <h2 className="font-semibold text-lg font-headline">My Workspace</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-muted/30 p-3 rounded-md flex flex-col items-center justify-center text-center gap-2">
                    <Folder className="w-10 h-10 text-yellow-400" />
                    <span className="text-xs font-medium truncate">Contracts</span>
                </div>
                <div className="bg-muted/30 p-3 rounded-md flex flex-col items-center justify-center text-center gap-2">
                    <Folder className="w-10 h-10 text-yellow-400" />
                    <span className="text-xs font-medium truncate">Invoices</span>
                </div>
                 <div className="bg-muted/30 p-3 rounded-md flex flex-col items-center justify-center text-center gap-2">
                    <FileText className="w-10 h-10 text-blue-400" />
                    <span className="text-xs font-medium truncate">Project Plan.pdf</span>
                </div>
            </div>
        </div>
    </div>
)

const MockDocumentView = () => (
    <div className="h-[250px] md:h-[300px] flex flex-col">
        <div className="flex-shrink-0 border-b border-border/50 pb-2 mb-2">
             <h3 className="font-semibold font-headline">Project Plan.pdf</h3>
             <p className="text-xs text-muted-foreground">Opened by Alex Johnson</p>
        </div>
        <div className="flex-1 overflow-hidden space-y-2">
            <div className="w-3/4 h-3 bg-muted/50 rounded"></div>
            <div className="w-full h-3 bg-muted/50 rounded"></div>
            <div className="w-1/2 h-3 bg-muted/50 rounded"></div>
        </div>
    </div>
)

const MockChatPanel = () => (
    <div className="h-[250px] md:h-[300px] flex flex-col">
        <div className="flex-1 space-y-3 overflow-hidden">
            <div className="flex items-start gap-2">
                <Bot className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-xs bg-muted/50 p-2 rounded-md">
                    <p>I've analyzed "Project Plan.pdf". Key deadlines are in Q3. Would you like me to summarize them?</p>
                </div>
            </div>
             <div className="flex items-start gap-2 justify-end">
                <div className="text-xs bg-primary/80 text-primary-foreground p-2 rounded-md">
                    <p>Yes, please list all deadlines mentioned.</p>
                </div>
                 <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
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
            A Look Inside
          </div>
          <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">See Docuflow in Action</h2>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Explore the clean, intuitive interface that makes managing your documents effortless. From file browsers to chat panels, everything is designed for clarity and speed.
          </p>
        </div>
        
        <MockBrowserWindow className="h-[400px] md:h-[500px]">
            <MockFileBrowser />
        </MockBrowserWindow>

        <div className="relative -mt-16 grid lg:grid-cols-2 gap-8 z-10 px-4 sm:px-8 md:px-12 lg:px-20">
            <MockBrowserWindow className="h-[280px] md:h-[330px]">
                <MockDocumentView />
            </MockBrowserWindow>
             <MockBrowserWindow className="h-[280px] md:h-[330px]">
                <MockChatPanel />
            </MockBrowserWindow>
        </div>
      </div>
    </section>
  );
}
