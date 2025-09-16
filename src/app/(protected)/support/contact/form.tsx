'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      await new Promise((r) => setTimeout(r, 700))
      setStatus('sent')
      setName('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === 'sent' && <div className="p-3 bg-green-50 text-green-800 rounded">Thanks — your message has been sent.</div>}
      {status === 'error' && <div className="p-3 bg-red-50 text-red-800 rounded">Something went wrong — please try again later.</div>}

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded border px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full rounded border px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="w-full rounded border px-3 py-2" />
      </div>

      <div>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-white" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  )
}
