"use client"

import { useMemo, useState } from 'react'
import { faqs } from '@/content/help/faqs'
import Link from 'next/link'
import Accordion from '@/components/help/Accordion'
import FAQCard from '@/components/help/FAQCard'

function HelpGrid({ items }: { items: Array<{ id: string; question: string; answer: string; category?: string }> }) {
  if (items.length === 0) return <div className="text-sm text-muted-foreground">No results — try different keywords or contact support.</div>

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {items.map((f) => (
        <FAQCard key={f.id} question={f.question} answer={f.answer} category={f.category} />
      ))}
    </div>
  )
}
export default function HelpPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | 'all'>('all')

  const categories = useMemo(() => {
    const s = new Set<string>()
    faqs.forEach((f) => (f as any).category && s.add((f as any).category))
    return ['all', ...Array.from(s)]
  }, [])

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    return faqs.filter((f) => {
      const fc = (f as any).category as string | undefined
      if (category !== 'all' && fc !== category) return false
      if (!q) return true
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    })
  }, [query, category])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold mb-4">Help Centre</h1>
        <p className="text-slate-700 mb-6">Search our help articles or browse frequently asked questions. Use categories to narrow down results.</p>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for answers, e.g. invite, billing" className="col-span-2 w-full border rounded-md px-3 py-2" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded-md px-3 py-2">
            {categories.map((c) => (
              <option value={c} key={c}>{c === 'all' ? 'All categories' : c}</option>
            ))}
          </select>
        </div>

        <Accordion title="Top questions" defaultOpen>
          <HelpGrid items={results.slice(0, 6)} />
        </Accordion>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">All matching articles</h2>
          <HelpGrid items={results} />
        </div>
      </div>

      <aside className="lg:col-span-1">
        <div className="sticky top-24">
          <div className="p-4 rounded-lg bg-white shadow-sm border">
            <h3 className="text-lg font-semibold mb-3">Contact Support</h3>
            <form action="/api/help/contact" method="post" className="space-y-3">
              <input name="name" placeholder="Your name" className="w-full border rounded-md px-3 py-2" required />
              <input name="email" type="email" placeholder="Your email" className="w-full border rounded-md px-3 py-2" required />
              <input name="subject" placeholder="Subject" className="w-full border rounded-md px-3 py-2" required />
              <textarea name="message" placeholder="Message" className="w-full border rounded-md px-3 py-2 h-28" required />
              <div className="flex items-center gap-3">
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md">Send Message</button>
                <a className="text-sm text-slate-500" href="mailto:jamie@cg360.co.uk">Or email jamie@cg360.co.uk</a>
              </div>
            </form>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>You can also visit <Link href="/privacy" className="underline">Privacy Policy</Link> and <Link href="/terms" className="underline">Terms</Link>.</p>
          </div>
        </div>
      </aside>
    </div>
  )
}
