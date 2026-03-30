'use client';
export const runtime = 'edge';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '../components/Footer';

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleCheckout(planId: string) {
    if (planId === 'free') {
      router.push('/auth/signup');
      return;
    }
    if (planId === 'enterprise') {
      router.push('/contact');
      return;
    }

    setLoadingPlan(planId);
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push(`/auth/signup?plan=${planId}&annual=${isAnnual}`);
        return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId, isAnnual }),
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  }

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Try it out with your first customers',
      monthlyPrice: 0,
      annualPrice: 0,
      memberCap: '50',
      features: [
        'Up to 50 active members',
        'Digital stamp card',
        'SMS enrolment (inbound)',
        'Basic dashboard',
      ],
      cta: 'Start Free',
      highlight: false,
      badge: null,
      note: 'No credit card required',
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for small businesses',
      monthlyPrice: 39,
      annualPrice: 390,
      memberCap: '300',
      features: [
        'Up to 300 active members',
        'Everything in Free',
        'Simple offer types',
        'Push notifications',
        'Birthday reward automation',
        '150 SMS credits/mo',
        'Basic segmentation',
      ],
      cta: 'Get Started',
      highlight: false,
      badge: null,
      note: null,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For serious loyalty programmes',
      monthlyPrice: 99,
      annualPrice: 990,
      memberCap: '1,000',
      features: [
        'Up to 1,000 active members',
        'Everything in Starter',
        'Google reviews integration',
        'AI offer triggers',
        'Personalisation',
        '500 SMS credits/mo',
        'Full visit & spend analytics',
        'Multi-location management',
      ],
      cta: 'Get Started',
      highlight: true,
      badge: 'Most Popular',
      note: null,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Custom solutions at scale',
      monthlyPrice: 299,
      annualPrice: null,
      memberCap: '10,000+',
      features: [
        'First 10,000 active members',
        'Everything in Pro',
        'Unlimited SMS credits',
        'Custom SMS sender ID',
        'API access & Zapier/CRM',
        'Referral programme',
        '+$199/mo per additional 10k band',
      ],
      cta: 'Contact Us',
      highlight: false,
      badge: null,
      note: 'Volume discounts built in',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-16 flex-1">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center font-bold text-white">L</div>
            <span className="font-bold text-lg">Last Mile Loyalty</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-300 mb-8">Start free. Upgrade as you grow.</p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={isAnnual ? 'text-slate-400' : 'font-medium'}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-slate-700"
              aria-label="Toggle annual billing"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                  isAnnual ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={!isAnnual ? 'text-slate-400' : 'font-medium'}>
              Annual {isAnnual && <span className="text-teal-400 text-sm ml-1">Save 2 months</span>}
            </span>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const price = plan.id === 'enterprise'
              ? plan.monthlyPrice
              : isAnnual && plan.annualPrice !== null
                ? Math.round(plan.annualPrice / 12)
                : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={`rounded-xl p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-2 border-teal-500 bg-slate-800/80 relative'
                    : 'border border-slate-700 bg-slate-800/40'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-teal-600 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                <div className="mb-1">
                  {plan.monthlyPrice === 0 ? (
                    <span className="text-3xl font-bold">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">${price}</span>
                      <span className="text-slate-400 text-sm">/mo</span>
                    </>
                  )}
                </div>
                {isAnnual && plan.annualPrice !== null && plan.annualPrice > 0 && (
                  <p className="text-teal-400 text-xs mb-4">
                    ${plan.annualPrice}/yr billed annually
                  </p>
                )}
                {(!isAnnual || plan.annualPrice === null || plan.annualPrice === 0) && (
                  <p className="text-slate-500 text-xs mb-4">
                    {plan.id === 'enterprise' ? 'Billed monthly' : plan.monthlyPrice === 0 ? 'Forever free' : 'Billed monthly'}
                  </p>
                )}

                <div className="text-sm text-slate-300 mb-4 py-2 px-3 bg-slate-700/50 rounded-lg text-center">
                  <span className="font-semibold text-white">{plan.memberCap}</span> active members
                </div>

                <ul className="space-y-2 mb-6 flex-1 text-sm">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-slate-300 flex items-start gap-2">
                      <span className="text-teal-400 mt-0.5 shrink-0">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.note && (
                  <p className="text-xs text-teal-400 mb-3 text-center">{plan.note}</p>
                )}

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loadingPlan !== null}
                  className={`w-full font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 text-sm ${
                    plan.highlight
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : plan.monthlyPrice === 0
                        ? 'bg-white hover:bg-gray-100 text-slate-900'
                        : 'bg-slate-600 hover:bg-slate-500 text-white'
                  }`}
                >
                  {loadingPlan === plan.id ? 'Processing...' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="mt-20 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Feature comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-slate-300">Feature</th>
                  <th className="text-center py-3 px-2 font-semibold text-slate-300">Free</th>
                  <th className="text-center py-3 px-2 font-semibold text-slate-300">Starter</th>
                  <th className="text-center py-3 px-2 font-semibold text-slate-300">Pro</th>
                  <th className="text-center py-3 px-2 font-semibold text-slate-300">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Digital stamp card', tiers: [true, true, true, true] },
                  { feature: 'SMS enrolment (inbound)', tiers: [true, true, true, true] },
                  { feature: 'Basic dashboard', tiers: [true, true, true, true] },
                  { feature: 'Simple offer types', tiers: [false, true, true, true] },
                  { feature: 'Push notifications', tiers: [false, true, true, true] },
                  { feature: 'Birthday reward automation', tiers: [false, true, true, true] },
                  { feature: 'Basic segmentation', tiers: [false, true, true, true] },
                  { feature: 'SMS credits', tiers: [false, '150/mo', '500/mo', 'Unlimited'] },
                  { feature: 'Google reviews integration', tiers: [false, false, true, true] },
                  { feature: 'AI offer triggers', tiers: [false, false, true, true] },
                  { feature: 'Personalisation', tiers: [false, false, true, true] },
                  { feature: 'Full visit & spend analytics', tiers: [false, false, true, true] },
                  { feature: 'Multi-location management', tiers: [false, false, true, true] },
                  { feature: 'Referral programme', tiers: [false, false, false, true] },
                  { feature: 'Custom SMS sender ID', tiers: [false, false, false, true] },
                  { feature: 'API access', tiers: [false, false, false, true] },
                  { feature: 'Zapier / CRM integrations', tiers: [false, false, false, true] },
                                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="py-3 px-4 text-slate-300">{row.feature}</td>
                    {row.tiers.map((included, j) => (
                      <td key={j} className="text-center py-3 px-2">
                        {included === true
                          ? <span className="text-teal-400">&#10003;</span>
                          : included === false
                            ? <span className="text-slate-600">&mdash;</span>
                            : <span className="text-teal-400 text-xs">{included}</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center mt-12 space-y-2">
          <p className="text-slate-400">All paid plans include a 14-day free trial.</p>
          <p className="text-slate-500 text-sm">
            Prices in AUD. Need help choosing?{' '}
            <Link href="/contact" className="text-teal-400 hover:underline">Get in touch</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
