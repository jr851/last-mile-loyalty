'use client';
export const runtime = 'edge';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { getClientSupabase } = await import('@/lib/client-supabase');
      const supabase = getClientSupabase();
      
      if (!supabase) {
        router.push('/auth/login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/auth/login');
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <p className="text-slate-300">Welcome, {user?.email}</p>
      <Link href="/auth/login" className="mt-8 inline-block px-4 py-2 bg-teal-600 rounded hover:bg-teal-700">Sign Out</Link>
    </div>
  );
}
