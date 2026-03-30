import { Zap, Lock, Smartphone, Users, TrendingUp, CheckCircle, QrCode, CreditCard, BarChart3, UserCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import MobileNav from './components/MobileNav';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center font-bold">L</div>
            <span className="font-bold text-lg">Last Mile Loyalty</span>
          </div>
          {/* Desktop nav links */}
          <div className="hidden md:flex gap-4">
            <Link href="/pricing" className="px-4 py-2 rounded hover:bg-slate-700">Pricing</Link>
            <Link href="/auth/login" className="px-4 py-2 rounded hover:bg-slate-700">Business Sign In</Link>
            <Link href="/auth/signup" className="px-4 py-2 bg-teal-600 rounded hover:bg-teal-700">Get Started</Link>
          </div>
          {/* Mobile hamburger */}
          <MobileNav />
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">Keep them coming back &#8212; big brand loyalty, neighbourhood scale</h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-8">Digital loyalty programme with Apple & Google Wallet integration. Built by enterprise loyalty experts for independent businesses.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="px-8 py-3 bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold">Trial Free Tier</Link>
            <Link href="#how-it-works" className="px-8 py-3 border border-slate-600 rounded-lg hover:border-slate-400">Learn More</Link>
          </div>
          <p className="text-sm text-slate-400 mt-4">Free tier covers up to 50 active members. No credit card required. Set up in 5 minutes.</p>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg bg-slate-700/50 border border-slate-600">
              <Smartphone className="w-8 h-8 text-teal-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">Mobile-First</h3>
              <p className="text-slate-300">Passes work on Apple Wallet & Google Pay. Customers always have their card &#8212; no app to download, no account to create.</p>
            </div>
            <div className="p-6 rounded-lg bg-slate-700/50 border border-slate-600">
              <TrendingUp className="w-8 h-8 text-teal-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">Increase Visits</h3>
              <p className="text-slate-300">Smart notifications bring customers back at just the right time.</p>
            </div>
            <div className="p-6 rounded-lg bg-slate-700/50 border border-slate-600">
              <Lock className="w-8 h-8 text-teal-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">Enterprise Standards</h3>
              <p className="text-slate-300">Built with the same technology and standards used by Australia's leading retail loyalty programmes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Business Owner */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Set up in under five minutes</h2>
          <p className="text-lg text-slate-300 text-center mb-12 max-w-2xl mx-auto">Getting your loyalty programme running is simple. No technical skills required, no hardware to buy.</p>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center font-bold text-lg">1</div>
              <div>
                <h3 className="font-bold text-lg mb-1">Sign up and customise</h3>
                <p className="text-slate-300">Head to lastmileloyalty.com and create your business. Set your business name, brand colour, and how many stamps earn a reward.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center font-bold text-lg">2</div>
              <div>
                <h3 className="font-bold text-lg mb-1">Print your counter card</h3>
                <p className="text-slate-300">Your dashboard generates a QR code and a printable card for your counter. Place it where customers can see it.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center font-bold text-lg">3</div>
              <div>
                <h3 className="font-bold text-lg mb-1">Stamp customers</h3>
                <p className="text-slate-300">Customers show their digital card and your staff adds a stamp from their phone or tablet. Quick and easy for everyone.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center font-bold text-lg">4</div>
              <div>
                <h3 className="font-bold text-lg mb-1">Confirm rewards</h3>
                <p className="text-slate-300">When a customer earns their reward, they show a short code. Staff enters it and the card resets automatically. No fuss.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Customer Journey */}
      <section className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Effortless for your customers</h2>
          <p className="text-lg text-slate-300 text-center mb-12 max-w-2xl mx-auto">No app to download. No account to create. No passwords to remember. Just scan, save, and start earning.</p>
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex-1 text-center p-6">
              <div className="w-14 h-14 bg-teal-600/20 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="font-bold mb-2">Scan the QR code</h3>
              <p className="text-slate-300 text-sm">Customer scans the code on your counter card with their phone camera. Takes under 30 seconds to join.</p>
            </div>
            <div className="hidden md:flex items-center pt-10">
              <ArrowRight className="w-6 h-6 text-slate-500" />
            </div>
            <div className="flex-1 text-center p-6">
              <div className="w-14 h-14 bg-teal-600/20 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="font-bold mb-2">Save to wallet</h3>
              <p className="text-slate-300 text-sm">They enter their name and mobile, then save their loyalty card straight to Apple Wallet or Google Wallet.</p>
            </div>
            <div className="hidden md:flex items-center pt-10">
              <ArrowRight className="w-6 h-6 text-slate-500" />
            </div>
            <div className="flex-1 text-center p-6">
              <div className="w-14 h-14 bg-teal-600/20 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="font-bold mb-2">Earn rewards</h3>
              <p className="text-slate-300 text-sm">Every visit, they show their card to collect a stamp. Once they hit the target, they claim their reward and the card resets.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why businesses choose Last Mile Loyalty</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4 p-5 rounded-lg bg-slate-800/50 border border-slate-700">
              <CheckCircle className="w-6 h-6 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">No app for customers to download</h3>
                <p className="text-slate-400 text-sm">Cards live in Apple Wallet and Google Wallet, so customers always have them. No friction, no forgotten cards.</p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-lg bg-slate-800/50 border border-slate-700">
              <CheckCircle className="w-6 h-6 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">No hardware needed</h3>
                <p className="text-slate-400 text-sm">Staff stamp customers using any phone or tablet. All you need is the printed counter card with your QR code.</p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-lg bg-slate-800/50 border border-slate-700">
              <CheckCircle className="w-6 h-6 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">Live dashboard</h3>
                <p className="text-slate-400 text-sm">Track customer sign-ups, stamps, and rewards in real time. See how your programme is performing at a glance.</p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-lg bg-slate-800/50 border border-slate-700">
              <CheckCircle className="w-6 h-6 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">Free to start</h3>
                <p className="text-slate-400 text-sm">The free tier supports up to 50 active members with full stamp and reward tracking. No credit card required.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About / Founder */}
      <section className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Built by loyalty experts</h2>
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-shrink-0">
              <div className="w-40 h-40 rounded-2xl overflow-hidden bg-slate-700 border border-slate-600">
                <Image src="/founder.png" alt="Jonathan Reeve, Founder" width={160} height={160} className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Jonathan Reeve</h3>
              <p className="text-teal-400 mb-4">Founder</p>
              <p className="text-slate-300 mb-4">
                With 25 years in retail and the last decade leading loyalty strategy at Eagle Eye &#8212; working with some of Australia's biggest brands including Woolworths and Endeavour Group &#8212; Jonathan built Last Mile Loyalty to bring enterprise-grade loyalty tools to independent businesses.
              </p>
              <p className="text-slate-300">
                The same expertise that powers loyalty programmes for major retailers is now available to your local cafe, barbershop, or boutique. No complexity, no big budgets &#8212; just smart loyalty that works.
              </p>
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
