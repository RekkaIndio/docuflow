"use client"

import { useMemo, useState } from 'react'
import { faqs } from '@/content/help/faqs'
import Link from 'next/link'
import Accordion from '@/components/help/Accordion'
import FAQCard from '@/components/help/FAQCard'

function HelpGrid({ items, searchQuery }: { items: Array<{ id: string; question: string; answer: string; category?: string }>, searchQuery?: string }) {
  if (items.length === 0) return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-lg font-semibold text-muted-foreground mb-2">No results found</h3>
      <p className="text-sm text-muted-foreground">Try different keywords or contact support for help.</p>
    </div>
  )

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      {items.map((f) => (
        <FAQCard key={f.id} question={f.question} answer={f.answer} category={f.category} searchQuery={searchQuery} />
      ))}
    </div>
  )
}

export default function HelpPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | 'all'>('all')

  const categories = useMemo(() => {
    const s = new Set<string>()
    faqs.forEach((f) => f.category && s.add(f.category))
    return ['all', ...Array.from(s).sort()]
  }, [])

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    return faqs.filter((f) => {
      const fc = f.category
      if (category !== 'all' && fc !== category) return false
      if (!q) return true
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    })
  }, [query, category])

  const topQuestions = results.slice(0, 6)

  return (
    <div className="min-h-screen">
      <div className="w-full py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold font-headline text-foreground mb-4">
            Help Centre
          </h1>
          <p className="text-lg text-muted-foreground mx-auto">
            Find answers to common questions, browse our knowledge base, or get in touch with our support team.
          </p>
        </div>

        <div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Search and Filter Section */}
            <div className="bg-card rounded-lg p-6 shadow-md border">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3 relative">
                  <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
                    Search Help Articles
                  </label>
                  <div className="relative">
                    <input
                      id="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search for answers, e.g. invite, billing, security..."
                      className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      aria-describedby="search-help"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <p id="search-help" className="sr-only">Search through our help articles and FAQs</p>
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    aria-describedby="category-help"
                  >
                    {categories.map((c) => (
                      <option value={c} key={c}>
                        {c === 'all' ? 'All Categories' : c}
                      </option>
                    ))}
                  </select>
                  <p id="category-help" className="sr-only">Filter help articles by category</p>
                </div>
              </div>
            </div>

            {/* Top Questions */}
            <Accordion title={`Top Questions ${query || category !== 'all' ? '(Filtered)' : ''}`} defaultOpen>
              <HelpGrid items={topQuestions} searchQuery={query} />
            </Accordion>

            {/* All Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold font-headline text-foreground">
                  All Articles ({results.length})
                </h2>
                {results.length > 6 && (
                  <span className="text-sm text-muted-foreground">
                    Showing all matching results
                  </span>
                )}
              </div>
              <HelpGrid items={results} searchQuery={query} />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-2">
            <div className="sticky top-8 space-y-6">
              {/* Contact Support Card */}
              <div className="bg-card rounded-lg p-6 shadow-md border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Contact Support</h3>
                </div>
                <form action="/api/help/contact" method="post" className="space-y-4">
                  <div>
                    <input
                      name="name"
                      placeholder="Your name"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <input
                      name="email"
                      type="email"
                      placeholder="Your email"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <input
                      name="subject"
                      placeholder="Subject"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <textarea
                      name="message"
                      placeholder="How can we help you?"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
                      rows={4}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Send Message
                  </button>
                </form>
              </div>

              {/* Quick Links */}
              <div className="bg-card rounded-lg p-6 shadow-md border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Quick Links</h3>
                <div className="space-y-3">
                  <Link
                    href="/privacy"
                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Privacy Policy
                  </Link>
                  <Link
                    href="/terms"
                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
        </div>
      </div>
    </div>
  )
}