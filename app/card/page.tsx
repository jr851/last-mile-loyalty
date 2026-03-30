'use client';
export const runtime = 'edge';
import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { Business, Customer } from "@/lib/types";

import { getSupabase } from '@/lib/supabase';
function generateRedemptionCode(): string {
  // 3-digit numeric code (100-999) — easy to read aloud, no ambiguous characters
  return String(Math.floor(Math.random() * 900) + 100);
}

function WalletButtons({ customerId, slug }: { customerId: string; slug: string }) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [loadingWallet, setLoadingWallet] = useState<"apple" | "google" | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPhone|iPad|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));
  }, []);

  // On desktop or unknown, show both
  const showApple = isIOS || (!isIOS && !isAndroid);
  const showGoogle = isAndroid || (!isIOS && !isAndroid);

  async function handleAppleWallet() {
    setWalletError("");
    setLoadingWallet("apple");

    const passUrl = `/api/wallet/apple-pass?customerId=${customerId}&b=${slug}`;

    if (isIOS) {
      // On iOS, Safari must navigate directly to the .pkpass URL
      // so it can intercept the content type and show the native
      // "Add to Apple Wallet" prompt. fetch() bypasses this.
      window.location.href = passUrl;
      // Give it a moment then reset loading state
      setTimeout(() => setLoadingWallet(null), 3000);
      return;
    }

    // On desktop: use fetch so we can show errors gracefully
    try {
      const res = await fetch(passUrl);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Could not generate pass" }));
        setWalletError(data.error || "Could not generate Apple Wallet pass. Try saving this page to your home screen instead.");
        setLoadingWallet(null);
        return;
      }
      // Download the .pkpass file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-loyalty.pkpass`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setWalletError("Could not connect. Please try again.");
    }
    setLoadingWallet(null);
  }

  async function handleGoogleWallet() {
    setWalletError("");
    setLoadingWallet("google");
    try {
      const res = await fetch(`/api/wallet/google-pass?customerId=${customerId}&b=${slug}`, {
        redirect: "manual",
      });
      // The Google endpoint returns a redirect to pay.google.com
      if (res.type === "opaqueredirect" || res.status === 302 || res.status === 307) {
        // Redirect happened, open in new window
        window.location.href = `/api/wallet/google-pass?customerId=${customerId}&b=${slug}`;
        setLoadingWallet(null);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Could not generate pass" }));
        setWalletError(data.error || "Could not generate Google Wallet pass. Try saving this page to your home screen instead.");
        setLoadingWallet(null);
        return;
      }
      // If we got a successful non-redirect response, follow it
      window.location.href = `/api/wallet/google-pass?customerId=${customerId}&b=${slug}`;
    } catch {
      // Network error likely means redirect happened (opaque response) - follow it
      window.location.href = `/api/wallet/google-pass?customerId=${customerId}&b=${slug}`;
    }
    setLoadingWallet(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {showApple && (
          <button
            onClick={handleAppleWallet}
            disabled={loadingWallet !== null}
            className="flex-1 bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-center text-sm transition-colors"
          >
            {loadingWallet === "apple" ? "Loading..." : "Add to Apple Wallet"}
          </button>
        )}
        {showGoogle && (
          <button
            onClick={handleGoogleWallet}
            disabled={loadingWallet !== null}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-center text-sm transition-colors"
          >
            {loadingWallet === "google" ? "Loading..." : "Add to Google Wallet"}
          </button>
        )}
      </div>
      {walletError && (
        <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg border border-amber-200">
          {walletError}
        </div>
      )}
    </div>
  );
}

function CardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get("b") || "";

  const [business, setBusiness] = useState<Business | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);

  const loadData = useCallback(async () => {
    if (!slug) return;

    // Accept customer ID from URL param (e.g. from SMS link) or localStorage
    const urlCustomerId = searchParams.get("c");
    let customerId = localStorage.getItem(`loyalty_${slug}_cid`);

    if (urlCustomerId && !customerId) {
      // Came from SMS link - store the customer ID for future visits
      localStorage.setItem(`loyalty_${slug}_cid`, urlCustomerId);
      customerId = urlCustomerId;
    } else if (urlCustomerId && customerId && urlCustomerId !== customerId) {
      // URL has a different customer ID - trust the URL (newer signup)
      localStorage.setItem(`loyalty_${slug}_cid`, urlCustomerId);
      customerId = urlCustomerId;
    }

    if (!customerId) {
      router.replace(`/join/?b=${slug}`);
      return;
    }

    const [bizRes, custRes] = await Promise.all([
      getSupabase().from("businesses").select("*").eq("slug", slug).single(),
      getSupabase().from("customers").select("*").eq("id", customerId).single(),
    ]);

    if (!bizRes.data || !custRes.data) {
      // Customer or business not found — clear stale data
      localStorage.removeItem(`loyalty_${slug}_cid`);
      router.replace(`/join/?b=${slug}`);
      return;
    }

    setBusiness(bizRes.data as Business);
    setCustomer(custRes.data as Customer);
    setLoading(false);
  }, [slug, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (slug) {
      const dismissed = localStorage.getItem(`loyalty_${slug}_tip_dismissed`);
      if (dismissed) setTipDismissed(true);
    }
  }, [slug]);

  function dismissTip() {
    if (slug) localStorage.setItem(`loyalty_${slug}_tip_dismissed`, "1");
    setTipDismissed(true);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleClaimReward() {
    if (!business || !customer) return;
    setClaiming(true);
    setError("");

    try {
      const res = await fetch("/api/loyalty/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, businessId: business.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't generate your code. Please try again.");
        setClaiming(false);
        return;
      }

      setRedemptionCode(data.code);
    } catch {
      setError("Couldn't generate your code. Please try again.");
    }
    setClaiming(false);
  }

  if (!slug) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <p className="text-amber-700">No loyalty programme specified.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-400 text-2xl animate-pulse">☕</div>
      </div>
    );
  }

  if (!business || !customer) return null;

  const filled = Math.min(customer.stamps, business.reward_stamps_needed);
  const isComplete = customer.stamps >= business.reward_stamps_needed;
  const cardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/?c=${customer.id}&b=${slug}`
      : `https://lastmileloyalty.com/s/?c=${customer.id}&b=${slug}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: business.brand_color + "12" }}>
      {/* Header */}
      <div
        className="text-white px-4 pt-10 pb-6"
        style={{ backgroundColor: business.brand_color }}
      >
        <div className="max-w-sm mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm">Your loyalty card</p>
              <h1 className="text-xl font-bold mt-0.5">{business.name}</h1>
            </div>
            <button
              onClick={handleRefresh}
              className="text-white/70 hover:text-white text-sm mt-1"
              disabled={refreshing}
            >
              {refreshing ? "…" : "Refresh"}
            </button>
          </div>

          <div className="mt-4 bg-white/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{customer.stamps}</div>
              <div className="text-white/80 text-xs">stamps collected</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{business.reward_stamps_needed}</div>
              <div className="text-white/80 text-xs">stamps needed</div>
            </div>
            <div className="text-right">
              <div
                className="text-2xl font-bold"
                style={{ color: isComplete ? "#fde68a" : "rgba(255,255,255,0.5)" }}
              >
                {isComplete ? "🎉" : business.reward_stamps_needed - customer.stamps}
              </div>
              <div className="text-white/80 text-xs">
                {isComplete ? "Ready!" : "to go"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto p-4 space-y-4">
        {/* Broadcast banner */}
        {business.active_broadcast && (
          <div
            className="rounded-2xl px-4 py-3 border text-sm font-medium"
            style={{ backgroundColor: business.brand_color + "18", borderColor: business.brand_color + "40", color: business.brand_color }}
          >
            📣 {business.active_broadcast}
          </div>
        )}

        {/* Double stamps banner */}
        {business.double_stamps_active && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-sm text-yellow-800 font-medium text-center">
            ⚡ Double stamps active — every visit counts twice today!
          </div>
        )}

        {/* Stamp card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              {customer.name ? `Hi ${customer.name.split(" ")[0]} 👋` : "Your card"}
            </h2>
            <span className="text-xs text-gray-400">
              {filled}/{business.reward_stamps_needed} stamps
            </span>
          </div>

          {/* Stamp grid */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: business.reward_stamps_needed }).map((_, i) => {
              const stamped = i < filled;
              return (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all"
                  style={
                    stamped
                      ? {
                          backgroundColor: business.brand_color,
                          borderColor: business.brand_color,
                          color: "white",
                        }
                      : { borderColor: "#e5e7eb", color: "#9ca3af" }
                  }
                >
                  {stamped ? "☕" : ""}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            1 stamp per: <span className="font-medium text-gray-600">{business.stamp_earn_description}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Reward: <span className="font-medium text-gray-600">{business.reward_description}</span>
          </p>
        </div>

        {/* Claim reward */}
        {isComplete && !redemptionCode && (
          <div
            className="rounded-2xl p-5 border text-center"
            style={{ backgroundColor: business.brand_color + "15", borderColor: business.brand_color + "40" }}
          >
            <div className="text-3xl mb-2">🎉</div>
            <h3
              className="font-bold text-lg mb-1"
              style={{ color: business.brand_color }}
            >
              You've earned your reward!
            </h3>
            <p className="text-gray-600 text-sm mb-4">{business.reward_description}</p>
            {error && (
              <p className="text-red-600 text-sm mb-3">{error}</p>
            )}
            {!showClaimConfirm ? (
              <button
                onClick={() => setShowClaimConfirm(true)}
                className="w-full text-white font-semibold py-3 rounded-xl transition-opacity"
                style={{ backgroundColor: business.brand_color }}
              >
                Claim reward →
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 mb-3">
                  Ready to use your reward now? This will generate a code to show the barista.
                </p>
                <button
                  onClick={handleClaimReward}
                  disabled={claiming}
                  className="w-full text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: business.brand_color }}
                >
                  {claiming ? "Generating code..." : "Yes, generate my code"}
                </button>
                <button
                  onClick={() => setShowClaimConfirm(false)}
                  className="w-full text-gray-500 font-medium py-2 text-sm"
                >
                  Not yet, save for later
                </button>
              </div>
            )}
          </div>
        )}

        {/* Show redemption code */}
        {redemptionCode && (
          <div
            className="rounded-2xl p-5 border text-center"
            style={{ backgroundColor: business.brand_color + "15", borderColor: business.brand_color + "40" }}
          >
            <p className="text-sm text-gray-600 mb-2">Tell the barista this code:</p>
            <div
              className="text-7xl font-bold tracking-widest py-4 font-mono"
              style={{ color: business.brand_color }}
            >
              {redemptionCode}
            </div>
            <p className="text-xs text-gray-500 mt-1">Valid for 7 days</p>
          </div>
        )}

        {/* Personal QR for staff to scan */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
          <h3 className="font-medium text-gray-900 mb-1 text-sm">Get stamped</h3>
          <p className="text-gray-400 text-xs mb-4">
            Show this QR to staff on every visit
          </p>
          <div
            className="inline-block rounded-xl p-3"
            style={{ backgroundColor: business.brand_color + "15" }}
          >
            <QRCodeSVG
              value={cardUrl}
              size={140}
              fgColor="#1f2937"
              bgColor="transparent"
              level="M"
            />
          </div>
        </div>

        {/* Wallet buttons */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-medium text-gray-900 mb-1 text-sm">Save your card</h3>
          <p className="text-gray-400 text-xs mb-4">
            Add to your phone wallet for easy access on every visit
          </p>
          <WalletButtons customerId={customer.id} slug={slug} />
          <p className="text-gray-400 text-xs text-center mt-3">
            Or save this page to your home screen: tap Share → Add to Home Screen
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-amber-50 flex items-center justify-center">
          <div className="text-amber-400 text-2xl animate-pulse">☕</div>
        </div>
      }
    >
      <CardContent />
    </Suspense>
  );
}
