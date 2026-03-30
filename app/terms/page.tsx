import Link from 'next/link';
import Footer from '../components/Footer';

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
          <p className="text-slate-400 text-sm mb-8">Last updated: 31 March 2026</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. Acceptance of terms</h2>
          <p className="text-slate-300 mb-4">
            By accessing or using lastmileloyalty.com (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. Description of service</h2>
          <p className="text-slate-300 mb-4">
            Last Mile Loyalty provides a digital loyalty programme platform that enables businesses to create and manage stamp-based reward cards for their customers. The Service includes a web-based dashboard, digital wallet pass integration, and customer management tools.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. Account registration</h2>
          <p className="text-slate-300 mb-4">
            You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to create a business account.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. Free and paid plans</h2>
          <p className="text-slate-300 mb-4">
            The free plan is available indefinitely with the features and limits described on our pricing page. Paid plans are billed monthly or annually as selected. All prices are in Australian Dollars (AUD). You may cancel at any time; cancellation takes effect at the end of the current billing period.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. Acceptable use</h2>
          <p className="text-slate-300 mb-4">
            You agree not to use the Service for any unlawful purpose, to distribute spam or unsolicited messages, to impersonate another person or business, or to attempt to gain unauthorised access to any part of the Service.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. Data and privacy</h2>
          <p className="text-slate-300 mb-4">
            Your use of the Service is also governed by our <Link href="/privacy" className="text-teal-400 hover:underline">Privacy Policy</Link>. As a business operator, you are responsible for ensuring that your use of customer data complies with applicable privacy laws, including the Australian Privacy Act 1988.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">7. Intellectual property</h2>
          <p className="text-slate-300 mb-4">
            The Service, including its design, code, and content, is owned by Last Mile Loyalty Pty Ltd. You retain ownership of any content you upload (such as your business name and branding).
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">8. Limitation of liability</h2>
          <p className="text-slate-300 mb-4">
            The Service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">9. Changes to terms</h2>
          <p className="text-slate-300 mb-4">
            We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms. We will notify registered users of material changes via email.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">10. Governing law</h2>
          <p className="text-slate-300 mb-4">
            These terms are governed by the laws of New South Wales, Australia. Any disputes shall be subject to the exclusive jurisdiction of the courts of New South Wales.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-3">11. Contact</h2>
          <p className="text-slate-300 mb-4">
            Questions about these terms? Please <Link href="/contact" className="text-teal-400 hover:underline">contact us</Link>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
