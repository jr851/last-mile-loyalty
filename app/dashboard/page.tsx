'use client';
export const runtime = 'edge';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Business {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  reward_stamps_needed: number;
  reward_description: string;
  stamp_earn_description: string;
  staff_pin: string;
}

interface DashboardStats {
  totalCustomers: number;
  totalStamps: number;
  totalRedemptions: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ totalCustomers: 0, totalStamps: 0, totalRedemptions: 0 });
  const [copied, setCopied] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

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
        return;
      }

      setUser(session.user);

      // Load business
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .single();

      if (biz) {
        setBusiness(biz as Business);

        // Load stats
        const [custResult, redemptionResult] = await Promise.all([
          supabase.from('customers').select('id, stamps', { count: 'exact' }).eq('business_id', biz.id),
          supabase.from('redemptions').select('id', { count: 'exact' }).eq('business_id', biz.id),
        ]);

        const customers = custResult.data || [];
        const totalStamps = customers.reduce((sum: number, c: any) => sum + (c.stamps || 0), 0);

        setStats({
          totalCustomers: custResult.count || 0,
          totalStamps,
          totalRedemptions: redemptionResult.count || 0,
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/auth/login');
    }
  }

  async function handleSignOut() {
    const { getClientSupabase } = await import('@/lib/client-supabase');
    const supabase = getClientSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/auth/login');
  }

  async function handleSavePin() {
    if (!newPin || newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    try {
      const { getClientSupabase } = await import('@/lib/client-supabase');
      const supabase = getClientSupabase();

      const { error } = await supabase
        .from('businesses')
        .update({ staff_pin: newPin })
        .eq('id', business?.id);

      if (error) {
        setPinError('Failed to update PIN. Please try again.');
        return;
      }

      setBusiness({ ...business!, staff_pin: newPin });
      setNewPin('');
      setChangingPin(false);
      setPinError('');
      setPinSuccess(true);
      setTimeout(() => setPinSuccess(false), 2000);
    } catch (error) {
      setPinError('Failed to update PIN. Please try again.');
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400 text-2xl animate-pulse">Loading...</div></div>;
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="text-4xl mb-4">☕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">No programme yet</h1>
          <p className="text-gray-500 mb-6">Set up your loyalty programme to start collecting customers.</p>
          <Link href="/setup" className="inline-block px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors">
            Set up programme
          </Link>
        </div>
      </div>
    );
  }

  const joinUrl = `https://lastmileloyalty.com/join?b=${business.slug}`;
  const staffUrl = `https://lastmileloyalty.com/s/?b=${business.slug}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: business.brand_color }}>
              {business.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-gray-900">{business.name}</h1>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
            <p className="text-xs text-gray-500 mt-1">Customers</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.totalStamps}</p>
            <p className="text-xs text-gray-500 mt-1">Stamps issued</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.totalRedemptions}</p>
            <p className="text-xs text-gray-500 mt-1">Rewards redeemed</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 mb-1">Quick links</h2>
            <p className="text-sm text-gray-500">Share these with your team and customers.</p>
          </div>

          {/* Customer join link */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">Customer join link</p>
              <p className="text-xs text-gray-400 truncate">{joinUrl}</p>
            </div>
            <button
              onClick={() => copyToClipboard(joinUrl, 'join')}
              className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ backgroundColor: copied === 'join' ? '#10b981' : business.brand_color, color: 'white' }}
            >
              {copied === 'join' ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Staff stamp page */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">Staff stamp page</p>
              <p className="text-xs text-gray-400 truncate">{staffUrl}</p>
            </div>
            <button
              onClick={() => copyToClipboard(staffUrl, 'staff')}
              className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ backgroundColor: copied === 'staff' ? '#10b981' : business.brand_color, color: 'white' }}
            >
              {copied === 'staff' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Programme details */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Programme details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Stamp earned per</p>
              <p className="text-gray-900">{business.stamp_earn_description}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Stamps needed</p>
              <p className="text-gray-900">{business.reward_stamps_needed}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400 text-xs">Reward</p>
              <p className="text-gray-900">{business.reward_description}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Brand colour</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: business.brand_color }} />
                <span className="text-gray-900">{business.brand_color}</span>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Slug</p>
              <p className="text-gray-900">{business.slug}</p>
            </div>
          </div>
        </div>

        {/* Settings - Staff PIN */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Settings</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Staff PIN</p>
                <p className="text-gray-900 font-mono tracking-widest">
                  {showPin ? business.staff_pin : '••••'}
                </p>
              </div>
              <button
                onClick={() => setShowPin(!showPin)}
                className="text-xs px-2 py-1 text-teal-600 hover:text-teal-700 font-medium"
              >
                {showPin ? 'Hide' : 'Show'}
              </button>
            </div>

            {changingPin ? (
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  value={newPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setNewPin(val);
                    setPinError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                />
                {pinError && (
                  <p className="text-xs text-red-600">{pinError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePin}
                    className="flex-1 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setChangingPin(false);
                      setNewPin('');
                      setPinError('');
                    }}
                    className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setChangingPin(true);
                  setNewPin('');
                  setPinError('');
                }}
                className="text-xs px-3 py-1.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Change PIN
              </button>
            )}
            {pinSuccess && (
              <p className="text-xs text-green-600">PIN updated successfully</p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-3 gap-4">
          <Link href="/setup" className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:border-gray-300 transition-colors">
            <div className="text-xl mb-1">⚙️</div>
            <p className="text-sm font-medium text-gray-900">Edit programme</p>
          </Link>
          <Link href={`/s/?b=${business.slug}`} className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:border-gray-300 transition-colors">
            <div className="text-xl mb-1">⭐</div>
            <p className="text-sm font-medium text-gray-900">Stamp customers</p>
          </Link>
          <Link href="/contact" className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:border-gray-300 transition-colors">
            <div className="text-xl mb-1">💬</div>
            <p className="text-sm font-medium text-gray-900">Contact support</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
