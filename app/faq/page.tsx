'use client';
export const runtime = 'edge';
import { useState } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Do my customers need to download an app?',
    answer: 'No. Loyalty cards are saved directly to Apple Wallet or Google Wallet, which are already on their phones. Customers scan a QR code, enter their name and mobile number, and their card is saved in seconds. No app download, no account creation, no passwords.',
  },
  {
    question: 'How do customers earn stamps?',
    answer: 'When a customer makes a qualifying purchase, they show their digital loyalty card (from their phone wallet) to your staff. Your staff opens the stamp page on any phone or tablet and taps to add a stamp. The customer\'s wallet card updates automatically.',
  },
  {
    question: 'What happens when a customer earns their reward?',
    answer: 'When a customer reaches the required number of stamps, their card shows a reward code. They show this to your staff, who enters it to confirm the redemption. The card then resets and they can start earning again.',
  },
  {
    question: 'What equipment do I need?',
    answer: 'Just a printed counter card with your QR code (we generate this for you) and any phone or tablet for staff to stamp customers. No special hardware, no POS integration required.',
  },
  {
    question: 'Is there really a free plan?',
    answer: 'Yes. The free plan supports up to 50 active members with full stamp and reward tracking. No credit card required, no time limit. It\'s perfect for trying out the system or for very small businesses.',
  },
  {
    question: 'Can I customise my loyalty programme?',
    answer: 'Absolutely. You choose your business name, brand colour, how many stamps earn a reward, and what the reward is. Your customers\' wallet cards are branded with your colour scheme.',
  },
  {
    question: 'How is this different from a paper stamp card?',
    answer: 'Digital cards can\'t be lost, forged, or left at home. You also get a live dashboard showing sign-ups, stamps, and redemptions, so you can see exactly how your programme is performing. Paid plans add push notifications, segmentation, and analytics.',
  },
  {
    question: 'What does "built by enterprise loyalty experts" mean?',
    answer: 'Last Mile Loyalty was built by Jonathan Reeve, who has spent over a decade leading loyalty strategy at Eagle Eye, working with some of Australia\'s largest brands. The same thinking that powers programmes for major retailers is now available to independent businesses.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes. You can change plans at any time from your dashboard. If you upgrade, you\'ll be charged the difference pro-rata. If you downgrade, the change takes effect at the end of your current billing period.',
  },
  {
    question: 'How do I get support?',
    answer: 'Log in to your dashboard and use the Contact Us form to reach our team. We aim to respond within one business day. Paid plans include priority support.',
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-700/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex items-start justify-between gap-4"
      >
        <span className="font-medium text-white">{item.question}</span>
        <span className="text-slate-500 text-xl shrink-0 mt-0.5">{open ? '\u2212' : '+'}</span>
      </button>
      {open && (
        <div className="pb-5 text-slate-400 text-sm leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-2">Frequently asked questions</h1>
          <p className="text-slate-400 text-center mb-10">
            Everything you need to know about Last Mile Loyalty.
          </p>

          <div className="bg-slate-800/80 rounded-2xl border border-slate-700 px-6">
            {faqs.map((faq, i) => (
              <FAQAccordion key={i} item={faq} />
            ))}
          </div>

          <div className="text-center mt-10">
            <p className="text-slate-400 mb-4">Still have questions? Log in to your dashboard to contact us.</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
