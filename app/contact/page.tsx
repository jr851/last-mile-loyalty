'use client';
export const runtime = 'edge';
import { useState } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send message.');
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError('Failed to send message. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
      {/* Nav */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center font-bold">L</div>
            <span className="font-bold text-lg">Last Mile Loyalty</span>
          </Link>
          <div className="hidden md:flex gap-4">
            <Link href="/pricing" className="px-4 py-2 rounded hover:bg-slate-700">Pricing</Link>
            <Link href="/auth/login" className="px-4 py-2 rounded hover:bg-slate-700">Sign In</Link>
            <Link href="/auth/signup" className="px-4 py-2 bg-teal-600 rounded hover:bg-teal-700">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 px-4 py-16">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl font-bold text-center mb-2">Get in touch</h1>
          <p className="text-slate-400 text-center mb-10">
            Have a question or want to learn more? Drop us a message and we'll get back to you within one business day.
          </p>

          {sent ? (
            <div className="bg-teal-900/30 border border-teal-700/50 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">✉️</div>
              <h2 className="text-xl font-bold text-white mb-2">Message sent!</h2>
              <p className="text-slate-400">Thanks for reaching out. We'll be in touch shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="How can we help?"
                />
              </div>
              {error && (
                <div className="bg-red-900/30 text-red-400 text-sm px-3 py-2 rounded-lg border border-red-800/50">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Sending...' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
