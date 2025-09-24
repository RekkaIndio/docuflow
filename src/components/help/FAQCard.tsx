"use client"

import React, { useState } from 'react'

type Props = {
  question: string
  answer: string
  category?: string
  searchQuery?: string
}

// Utility function to highlight search terms
function highlightText(text: string, query: string) {
  if (!query.trim()) return text

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export default function FAQCard({ question, answer, category, searchQuery }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <article className="p-5 rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-200 border border-border group cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {highlightText(question, searchQuery || '')}
          </h4>
          <div className={`mt-2 text-sm text-muted-foreground transition-all duration-300 ${isExpanded ? 'line-clamp-none' : 'line-clamp-3'}`}>
            {highlightText(answer, searchQuery || '')}
          </div>
          {answer.length > 150 && (
            <button
              className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {category && (
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full whitespace-nowrap">
              {category}
            </div>
          )}
          <div className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </div>
        </div>
      </div>
    </article>
  )
}
