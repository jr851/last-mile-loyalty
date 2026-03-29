"use client";

import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-amber-900 mb-2">Check your email</h1>
        <p className="text-amber-700 mb-6">
          We've sent you a confirmation link. Click it to activate your account, then come back here to set up your loyalty programme.
        </p>
        <Link
          href="/auth/login"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
