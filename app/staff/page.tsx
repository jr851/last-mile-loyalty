'use client';
export const runtime = 'edge';
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Business, Customer } from "@/lib/types";

import { getSupabase } from '@/lib/supabase';
type Tab = "stamp" | "redeem";

function StaffContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("b") || "";

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // PIN gate — set to true to re-enable for production
  const PIN_GATE_ENABLED = true;
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [unlocked, setUnlocked] = useState(!PIN_GATE_ENABLED);

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>("stamp");

  // Stamp tab state
  const [phoneInput, setPhoneInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [stamping, setStamping] = useState(false);
  const [stampResult, setStampResult] = useState<string | null>(null);

  // Redeem tab state
  const [codeInput, setCodeInput] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [redeemResult, setRedeemResult] = useState<{ name: string; reward: string } | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!slug) {
      setError("No business specified in the link.");
      setLoading(false);
      return;
    }
    async function loadBusiness() {
      const { data } = await getSupabase()
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!data) {
        setError("Business not found. Check your link.");
        setLoading(false);
        return;
      }
      setBusiness(data as Business);
      setLoading(false);
    }
    loadBusiness();
  }, [slug]);

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    if (pinInput === business.staff_pin) {
      setUnlocked(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Try again.");
      setPinInput("");
    }
  }

  // ----- STAMP TAB -----
  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    setLookupError("");
    setFoundCustomer(null);
    setStampResult(null);

    const cleanPhone = phoneInput.replace(/\s/g, "");
    const { data } = await getSupabase()
      .from("customers")
      .select("*")
      .eq("business_id", business.id)
      .eq("phone", cleanPhone)
      .single();

    if (!data) {
      setLookupError("No customer found with that number.");
      return;
    }
    setFoundCustomer(data as Customer);
  }

  async function handleAddStamp() {
    if (!foundCustomer || !business) return;
    setStamping(true);
    setStampResult(null);

    try {
      const res = await fetch("/api/loyalty/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: foundCustomer.id, businessId: business.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLookupError(data.error || "Couldn't add stamp. Please try again.");
        setStamping(false);
        return;
      }

      const updated = { ...foundCustomer, stamps: data.newStamps };
      setFoundCustomer(updated);

      const displayName = foundCustomer.name ? foundCustomer.name.split(" ")[0] : "Customer";
      if (data.isComplete) {
        setStampResult(`${data.stampsAdded > 1 ? "2 stamps added! 🎉" : "Stamped! 🎉"} ${displayName} has completed their card.`);
      } else {
        setStampResult(`${data.stampsAdded > 1 ? "2 stamps" : "Stamped"}! ${displayName} now has ${data.newStamps} stamp${data.newStamps !== 1 ? "s" : ""}.`);
      }
    } catch {
      setLookupError("Couldn't add stamp. Please try again.");
    }
    setStamping(false);

    setTimeout(() => {
      setPhoneInput("");
      setFoundCustomer(null);
      setStampResult(null);
    }, 3000);
  }

  // ----- REDEEM TAB -----
  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    setRedeemError("");
    setRedeemResult(null);
    setRedeeming(true);

    const code = codeInput.trim();
    if (!/^\d{3}$/.test(code)) {
      setRedeemError("Enter the 3-digit code from the customer's screen.");
      setRedeeming(false);
      return;
    }

    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, businessId: business.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setRedeemError(data.error || "Code not found or already used. Ask the customer to try again.");
        setRedeeming(false);
        return;
      }

      setRedeemResult({
        name: data.customerName || "Customer",
        reward: data.reward || business.reward_description,
      });
    } catch {
      setRedeemError("Something went wrong. Please try again.");
    }
    setCodeInput("");
    setRedeeming(false);
  }

  // ----- RENDER -----

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-amber-400 text-2xl animate-pulse">☕</div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-gray-600">{error || "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="text-white px-4 pt-10 pb-6"
        style={{ backgroundColor: business.brand_color }}
      >
        <div className="max-w-sm mx-auto">
          <p className="text-white/70 text-sm">Staff dashboard</p>
          <h1 className="text-xl font-bold mt-0.5">{business.name}</h1>
        </div>
      </div>

      <div className="max-w-sm mx-auto p-4">
        {/* PIN gate */}
        {!unlocked ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mt-4">
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🔒</div>
              <h2 className="font-semibold text-gray-900">Staff PIN</h2>
              <p className="text-gray-500 text-sm mt-1">
                Enter your 4-digit PIN to access staff tools
              </p>
            </div>
            <form onSubmit={handlePinSubmit} className="space-y-3">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.slice(0, 4))}
                className="w-full px-3 py-3 border border-gray-200 rounded-lg text-gray-900 text-center text-2xl tracking-widest font-bold focus:outline-none focus:ring-2"
                placeholder="••••"
                maxLength={4}
                autoFocus
              />
              {pinError && (
                <p className="text-red-600 text-sm text-center">{pinError}</p>
              )}
              <button
                type="submit"
                disabled={pinInput.length !== 4}
                className="w-full text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-40"
                style={{ backgroundColor: business.brand_color }}
              >
                Unlock
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-4">
              <div className="flex border-b border-gray-100">
                {(["stamp", "redeem"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setFoundCustomer(null);
                      setPhoneInput("");
                      setLookupError("");
                      setStampResult(null);
                      setCodeInput("");
                      setRedeemError("");
                      setRedeemResult(null);
                    }}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab ? "border-b-2" : "text-gray-500"
                    }`}
                    style={
                      activeTab === tab
                        ? { borderBottomColor: business.brand_color, color: business.brand_color }
                        : {}
                    }
                  >
                    {tab === "stamp" ? "➕ Add Stamp" : "🎁 Redeem Reward"}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* STAMP TAB */}
                {activeTab === "stamp" && (
                  <div className="space-y-4">
                    {/* Double stamps active banner */}
                    {business.double_stamps_active && (
                      <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-2.5 text-sm text-yellow-800 font-semibold text-center">
                        ⚡ Double stamps active — each scan adds 2
                      </div>
                    )}

                    {/* Primary: QR scan instruction */}
                    <div
                      className="rounded-xl p-4 border text-center"
                      style={{ backgroundColor: business.brand_color + "10", borderColor: business.brand_color + "30" }}
                    >
                      <div className="text-3xl mb-2">📷</div>
                      <p className="font-semibold text-gray-900 text-sm mb-1">Scan the customer's QR code</p>
                      <p className="text-gray-500 text-xs mb-3">
                        Ask the customer to open their loyalty card and show you the QR.
                        Scan it with your phone's camera to go straight to the stamp screen.
                      </p>
                      <p className="text-xs font-medium" style={{ color: business.brand_color }}>
                        Camera app → point at QR → tap the link
                      </p>
                    </div>

                    {/* Secondary: phone fallback */}
                    <details className="group">
                      <summary className="text-sm text-gray-500 cursor-pointer select-none list-none flex items-center gap-1">
                        <span className="group-open:hidden">▶</span>
                        <span className="hidden group-open:inline">▼</span>
                        <span>Customer doesn't have their QR? Look up by phone</span>
                      </summary>

                      <div className="mt-3 space-y-3">
                        {!foundCustomer && (
                          <form onSubmit={handleLookup} className="space-y-3">
                            <input
                              type="tel"
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm"
                              placeholder="Customer mobile number"
                            />
                            {lookupError && (
                              <p className="text-red-600 text-xs">{lookupError}</p>
                            )}
                            <button
                              type="submit"
                              disabled={!phoneInput.trim()}
                              className="w-full text-white font-semibold py-2.5 rounded-lg transition-opacity disabled:opacity-40 text-sm"
                              style={{ backgroundColor: business.brand_color }}
                            >
                              Find customer
                            </button>
                          </form>
                        )}

                        {foundCustomer && !stampResult && (
                          <div className="space-y-3">
                            <div
                              className="rounded-xl p-3 border"
                              style={{ backgroundColor: business.brand_color + "10", borderColor: business.brand_color + "30" }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                  style={{ backgroundColor: business.brand_color }}
                                >
                                  {foundCustomer.name ? foundCustomer.name.charAt(0).toUpperCase() : "?"}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 text-sm">{foundCustomer.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {foundCustomer.stamps} / {business.reward_stamps_needed} stamps
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setFoundCustomer(null); setPhoneInput(""); }}
                                className="flex-1 bg-gray-100 text-gray-600 font-medium py-2 rounded-lg text-sm"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleAddStamp}
                                disabled={stamping}
                                className="flex-grow text-white font-semibold py-2 rounded-lg transition-opacity disabled:opacity-50 text-sm"
                                style={{ backgroundColor: business.brand_color }}
                              >
                                {stamping
                                  ? "Adding…"
                                  : business.double_stamps_active
                                  ? "✓ Add 2 stamps"
                                  : "✓ Add stamp"}
                              </button>
                            </div>
                          </div>
                        )}

                        {stampResult && (
                          <div
                            className="rounded-xl p-3 text-center border"
                            style={{ backgroundColor: business.brand_color + "10", borderColor: business.brand_color + "30" }}
                          >
                            <div className="text-xl mb-1">☕</div>
                            <p className="font-medium text-sm" style={{ color: business.brand_color }}>
                              {stampResult}
                            </p>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                {/* REDEEM TAB */}
                {activeTab === "redeem" && (
                  <div className="space-y-4">
                    <p className="text-gray-500 text-sm">
                      Enter the 3-digit code shown on the customer's phone to confirm their reward.
                    </p>

                    {!redeemResult ? (
                      <form onSubmit={handleRedeem} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Redemption code
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value.slice(0, 3))}
                            className="w-full px-3 py-4 border border-gray-200 rounded-lg text-gray-900 text-center text-4xl font-bold tracking-widest font-mono focus:outline-none focus:ring-2"
                            placeholder="000"
                            maxLength={3}
                            autoFocus
                          />
                        </div>
                        {redeemError && (
                          <p className="text-red-600 text-sm">{redeemError}</p>
                        )}
                        <button
                          type="submit"
                          disabled={codeInput.length !== 3 || redeeming}
                          className="w-full text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-40"
                          style={{ backgroundColor: business.brand_color }}
                        >
                          {redeeming ? "Confirming…" : "Confirm reward"}
                        </button>
                      </form>
                    ) : (
                      <div
                        className="rounded-2xl p-5 text-center border"
                        style={{ backgroundColor: business.brand_color + "15", borderColor: business.brand_color + "40" }}
                      >
                        <div className="text-4xl mb-2">🎉</div>
                        <p
                          className="font-bold text-lg mb-1"
                          style={{ color: business.brand_color }}
                        >
                          Reward confirmed!
                        </p>
                        <p className="text-gray-600 text-sm">
                          Give <strong>{redeemResult.name.split(" ")[0]}</strong> their{" "}
                          <strong>{redeemResult.reward}</strong>
                        </p>
                        <button
                          onClick={() => { setRedeemResult(null); setCodeInput(""); }}
                          className="mt-4 text-sm font-medium"
                          style={{ color: business.brand_color }}
                        >
                          Done — redeem another →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tip */}
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 text-xs text-amber-700 mt-4">
              <strong>Tip:</strong> Save this page to your home screen for quick access. In Safari, tap Share → Add to Home Screen.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StaffPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-amber-400 text-2xl animate-pulse">☕</div>
        </div>
      }
    >
      <StaffContent />
    </Suspense>
  );
}
