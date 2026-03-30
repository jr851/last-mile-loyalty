import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-6">
          L
        </div>
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-slate-300 mb-8">
          This page could not be found. It may have been moved or no longer exists.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
