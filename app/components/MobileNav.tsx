'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button -- visible on small screens only */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
        aria-label="Toggle menu"
      >
        <span className={`block w-5 h-0.5 bg-white transition-transform ${open ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-5 h-0.5 bg-white transition-opacity ${open ? 'opacity-0' : ''}`} />
        <span className={`block w-5 h-0.5 bg-white transition-transform ${open ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-700 md:hidden">
          <div className="flex flex-col items-center gap-3 py-4 px-4">
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="w-full text-center px-4 py-2 rounded hover:bg-slate-700"
            >
              Pricing
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="w-full text-center px-4 py-2 rounded hover:bg-slate-700"
            >
              Business Sign In
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setOpen(false)}
              className="w-full text-center px-4 py-2 bg-teal-600 rounded hover:bg-teal-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
