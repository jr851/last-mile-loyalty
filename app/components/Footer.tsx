import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-700 bg-slate-900 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">L</div>
              <span className="font-bold text-white">Last Mile Loyalty</span>
            </Link>
            <p className="text-slate-500 text-sm">Big brand loyalty, neighbourhood scale.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-slate-300 mb-3 text-sm">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" className="text-slate-500 hover:text-slate-300 transition-colors">Pricing</Link></li>
              <li><Link href="/#how-it-works" className="text-slate-500 hover:text-slate-300 transition-colors">How It Works</Link></li>
              <li><Link href="/auth/signup" className="text-slate-500 hover:text-slate-300 transition-colors">Get Started</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-slate-300 mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="text-slate-500 hover:text-slate-300 transition-colors">Contact</Link></li>
              <li><Link href="/faq" className="text-slate-500 hover:text-slate-300 transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-slate-300 mb-3 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-slate-500 hover:text-slate-300 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-slate-500 hover:text-slate-300 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 text-center">
          <p className="text-slate-600 text-sm">&copy; {new Date().getFullYear()} Last Mile Loyalty Pty Ltd. Built for independent businesses.</p>
        </div>
      </div>
    </footer>
  );
}
