"use client"

import React from 'react'

type Props = {
  question: string
  answer: string
  category?: string
}

export default function FAQCard({ question, answer, category }: Props) {
  return (
    <article className="p-5 rounded-lg bg-white shadow-sm hover:shadow-md transition border">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-900 truncate">{question}</h4>
          <p className="text-sm text-slate-700 mt-2 line-clamp-4">{answer}</p>
        </div>
        {category ? (
          <div className="text-xs text-slate-700 mt-1 bg-slate-100 px-2 py-1 rounded-full">{category}</div>
        ) : null}
      </div>
    </article>
  )
}
