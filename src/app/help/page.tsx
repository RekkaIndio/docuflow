"use client";

import React, { useState } from 'react';
import { faqs } from '@/content/help/faqs';
import Link from 'next/link';

function SearchAndFaq() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(faqs);

  const handleSearch = (q: string) => {
    setQuery(q);
    const lower = q.toLowerCase().trim();
    if (!lower) return setResults(faqs);
    setResults(faqs.filter(f => f.question.toLowerCase().includes(lower) || f.answer.toLowerCase().includes(lower)));
  };

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Search help articles</label>
        <input value={query} onChange={e => handleSearch(e.target.value)} placeholder="Search for answers, e.g. billing, invite" className="w-full border rounded-md px-3 py-2" />
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Results</h3>
        {results.length === 0 ? (
          <div className="text-sm text-muted-foreground">No results found. Try different keywords or contact support below.</div>
        ) : (
          <ul className="space-y-4">
            {results.map(r => (
              <li key={r.id} className="p-4 border rounded-md">
                <div className="font-semibold">{r.question}</div>
                <div className="text-sm text-slate-700 mt-2">{r.answer}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle'|'sending'|'success'|'error'>('idle');

  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/help/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setStatus('success');
        setForm({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={submit} className="max-w-xl">
      <h3 className="text-lg font-semibold mb-3">Contact Support</h3>
      <div className="grid gap-3">
        <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" className="w-full border rounded-md px-3 py-2" required />
        <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="Your email" className="w-full border rounded-md px-3 py-2" required />
        <input value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="Subject" className="w-full border rounded-md px-3 py-2" required />
        <textarea value={form.message} onChange={e => update('message', e.target.value)} placeholder="Message" className="w-full border rounded-md px-3 py-2 h-28" required />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={status === 'sending'} className="bg-primary text-white px-4 py-2 rounded-md">{status === 'sending' ? 'Sending…' : 'Send Message'}</button>
          {status === 'success' ? <span className="text-sm text-green-600">Sent — we will reply soon.</span> : null}
          {status === 'error' ? <span className="text-sm text-red-600">Failed to send. Try again later.</span> : null}
        </div>
      </div>
    </form>
  );
}

export default function HelpPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold mb-4">Help Centre</h1>
        <p className="text-slate-700 mb-6">Search our help articles or browse frequently asked questions. If you can't find an answer, contact support below.</p>
        <SearchAndFaq />
      </div>
      <aside className="lg:col-span-1">
        <ContactForm />
        <div className="mt-6 text-sm text-muted-foreground">
          <p>For urgent matters email <a href="mailto:jamie@cg360.co.uk" className="underline">jamie@cg360.co.uk</a>.</p>
          <p className="mt-2">You can also visit <Link href="/privacy" className="underline">Privacy Policy</Link> and <Link href="/terms" className="underline">Terms</Link>.</p>
        </div>
      </aside>
    </div>
  );
}
