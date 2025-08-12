"use client";

import { Slack, MessageCircle, Mail, FileText, Send, Bot } from "lucide-react";

const integrations = [
  {
    name: "Slack",
    icon: Slack,
    description: "Send files, summaries, and notifications to your team channels."
  },
  {
    name: "Chat Platforms",
    icon: MessageCircle,
    description: "Share document insights and automate workflows in Discord, Teams, and more."
  },
  {
    name: "Email",
    icon: Mail,
    description: "Automatically email files, summaries, or alerts to stakeholders."
  }
];

const actions = [
  {
    icon: FileText,
    label: "Send Document"
  },
  {
    icon: Send,
    label: "Share Summary"
  },
  {
    icon: Bot,
    label: "Automate Workflow"
  }
];

export function IntegrationsShowcase() {
  return (
    <section className="w-full py-24 md:py-32 bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 md:px-8 flex flex-col items-center">
        <span className="text-primary font-semibold text-sm mb-2 block">Integrations</span>
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white text-center">
          Connect Docuflow to your favorite platforms
        </h2>
        <p className="text-lg text-slate-700 dark:text-slate-300 mb-10 text-center max-w-2xl">
          Use Doc, your agentic AI assistant, to send files, summaries, and automate actions directly in Slack, Discord, Email, and more. Keep your team in sync—wherever they work.
        </p>
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          {integrations.map(({ name, icon: Icon, description }) => (
            <div key={name} className="flex flex-col items-center bg-slate-50 dark:bg-slate-900 rounded-xl shadow-lg p-6 min-w-[220px] max-w-xs border border-slate-200 dark:border-slate-800">
              <Icon size={40} className="text-primary mb-3" />
              <div className="font-bold text-lg mb-1 text-slate-900 dark:text-white">{name}</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm text-center">{description}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {actions.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-primary/90 dark:bg-primary/80 rounded-full px-5 py-2 text-white font-semibold text-base shadow-sm">
              <Icon size={20} className="text-white" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
