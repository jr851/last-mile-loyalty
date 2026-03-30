import Link from 'next/link';
import Footer from '../components/Footer';

export default function PrivacyPage() {
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
        <div className="max-w-2xl mx-auto prose prose-invert prose-slate">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-slate-400 text-sm mb-8">Last updated: 31 March 2026</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. Who we are</h2>
          <p className="text-slate-300 mb-4">
            Last Mile Loyalty Pty Ltd (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the lastmileloyalty.com website and digital loyalty platform. We are committed to protecting the privacy of our users, including both business operators and their customers.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. Information we collect</h2>
          <p className="text-slate-300 mb-2">We collect the following types of information:</p>
          <p className="text-slate-300 mb-4">
            <strong className="text-white">Business operators:</strong> email address, business name, and programme configuration when you create an account. Payment information is processed securely by Stripe and is not stored on our servers.
          </p>
          <p className="text-slate-300 mb-4">
            <strong className="text-white">Customers of businesses:</strong> name and mobile phone number when you join a loyalty programme, plus stamp and reward activity.
          </p>
          <p className="text-slate-300 mb-4">
            <strong className="text-white">Website visitors:</strong> anonymous usage analytics via Cloudflare Web Analytics (no cookies, no personal data).
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. How we use your information</h2>
          <p className="text-slate-300 mb-4">
            We use information to operate the loyalty platform, send transactional SMS messages (such as card links and reward notifications), process payments, and improve our service. We do not sell personal information to third parties.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. Data storage and security</h2>
          <p className="text-slate-300 mb-4">
            Data is stored securely in Supabase (hosted on AWS in the Sydney region). We use row-level security policies to ensure that business data is only accessible to the account owner. All connections use TLS encryption.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. Third-party services</h2>
          <p className="text-slate-300 mb-4">
            We use Stripe for payment processing, Twilio for SMS delivery, Cloudflare for hosting and analytics, and Apple/Google Wallet for digital pass delivery. Each of these services has its own privacy policy.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. Your rights</h2>
          <p className="text-slate-300 mb-4">
            You may request access to, correction of, or deletion of your personal information at any time by contacting us. Business operators can delete their account and all associated data from their dashboard. Customers can request removal by contacting the business or by emailing us directly.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">7. Changes to this policy</h2>
          <p className="text-slate-300 mb-4">
            We may update this policy from time to time. We will notify registered users of material changes via email.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">8. Contact us</h2>
          <p className="text-slate-300 mb-4">
            If you have questions about this privacy policy, please <Link href="/contact" className="text-teal-400 hover:underline">contact us</Link>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
