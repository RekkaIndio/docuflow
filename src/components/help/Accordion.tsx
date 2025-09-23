"use client"

import { useState, PropsWithChildren } from 'react'

type AccordionProps = {
  title: string
  defaultOpen?: boolean
}

export default function Accordion({ title, defaultOpen = false, children }: PropsWithChildren<AccordionProps>) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg shadow-sm overflow-hidden border">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-white/60 to-slate-50 hover:from-white/80 hover:to-slate-50 transition"
        aria-expanded={open}
      >
        <span className="text-left font-semibold text-slate-900">{title}</span>
        <span className="ml-3 text-sm text-slate-500 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm">
          {open ? '−' : '+'}
        </span>
      </button>
      <div className={`transition-all duration-200 ${open ? 'max-h-screen' : 'max-h-0'} overflow-hidden bg-white`}> 
        <div className="px-5 py-4 text-sm text-slate-700">{children}</div>
      </div>
    </div>
  )
}
