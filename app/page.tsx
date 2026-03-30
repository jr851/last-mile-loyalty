import { Zap, Lock, Smartphone, Users, TrendingUp, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm md:text-base text-slate-200">Keep them coming back — big brand loyalty, neighbourhood scale</span>
          </div>
          <div className="flex gap-4">
            <Link href="/auth/login" className="px-4 py-2 rounded hover:bg-slate-700">Business Sign In</Link>
            <Link href="/auth/signup" className="px-4 py-2 bg-teal-600 rounded hover:bg-teal-700">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">Turn every customer into a regular</h1>
          <p className="text-xl text-slate-300 mb-8">Digital loyalty programme with Apple & Google Wallet integration. Built by enterprise loyalty experts for independent businesses.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup" className="px-8 py-3 bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold">Trial Free Tier</Link>
            <Link href="#how-it-works" className="px-8 py-3 border border-slate-600 rounded-lg hover:border-slate-400">Learn More</Link>
          </div>
          <p className="text-sm text-slate-400 mt-4">Free tier covers up to 50 active members. No credit card required. Set up in 5 minutes.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg bg-slate-700/50 border border-slate-600">
              <Smartphone className="w-8 h-8 text-teal-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">Mobile-First</h3>
              <p className="text-slate-300">Passes work on Apple Wallet & Google Pay. Customers always have their card.</p>
            </div>
            <div className="p-6 rounded-lg bg-slate-700/50 border border-slate-600">
              <TrendingUp className="w-8 h-8 text-teal-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">Increase Visits</h3>
              <p className="text-slate-300">Smart notifications bring customers back. Average 3.2x more repeat visits.</p>
            </div>
            <div className="p-6 rounded-lg bg-slate-700/50 border border-slate-600">
              <Lock className="w-8 h-8 text-teal-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">Enterprise Standards</h3>
              <p className="text-slate-300">Built with the same standards as leading retail loyalty systems.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-lg text-slate-300 mb-8">Join the businesses already using Last Mile Loyalty to keep customers coming back.</p>
          <Link href="/auth/signup" className="inline-block px-8 py-3 bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold text-lg">Trial Free Tier</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-8 px-4 text-center text-slate-400">
        <p>&copy; 2026 Last Mile Loyalty. Built for independent businesses.</p>
      </footer>
    </div>
  );
}
