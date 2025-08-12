
'use client';
import { useState } from 'react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="w-full flex flex-col items-center py-12">
      <div className="bg-background/80 border border-border/30 rounded-2xl px-6 py-8 max-w-xl w-full shadow-lg flex flex-col items-center">
        <h3 className="font-headline text-2xl font-bold mb-2">Get Product Updates</h3>
        <p className="text-muted-foreground mb-6 text-center">Sign up for our newsletter to get the latest on Docuflow AI features, tips, and exclusive offers.</p>
        {submitted ? (
          <div className="text-green-600 font-semibold">Thank you for subscribing!</div>
        ) : (
          <form
            className="flex flex-col sm:flex-row gap-3 w-full justify-center"
            onSubmit={e => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 px-4 py-2 rounded-md border border-border/40 focus:border-primary outline-none bg-background text-foreground"
            />
            <button
              type="submit"
              className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
