'use client';
export const runtime = 'edge';
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Business, Customer } from "@/lib/types";

import { getSupabase } from '@/lib/supabase';
function StaffStampContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("c") || "";
  const slug = searchParams.get("b") || "";

  const [business, setBusiness] = useState<Business | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // PIN gate — set to true to re-enable for production
  const PIN_GATE_ENABLED = false;
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [unlocked, setUnlocked] = useState(!PIN_GATE_ENABLED);

  // Stamp state
  const [stamping, setStamping] = useState(false);
  const [stamped, setStamped] = useState(false);

  function maskPhone(phone: string) {
    if (phone.length < 6) return phone;
    return phone.slice(0, -4).replace(/./g, "•") + phone.slice(-4);
  }

  useEffect(() => {
    if (!customerId || !slug) {
      setError("Invalid link.");
      setLoading(false);
      return;
    }

    async function loadData() {
      const [bizRes, custRes] = await Promise.all([
        getSupabase().from("businesses").select("*").eq("slug", slug).single(),
        getSupabase().from("customers").select("*").eq("id", customerId).single(),
      ]);

      if (!bizRes.data) {
        setError("Business not found.");
        setLoading(false);
        return;
      }
      if (!custRes.data) {
        setError("Customer not found.");
        setLoading(false);
        return;
      }

      setBusiness(bizRes.data as Business);
      setCustomer(custRes.data as Customer);
      setLoading(false);
    }
    loadData();
  }, [customerId, slug]);

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

  async function handleAddStamp() {
    if (!customer || !business) return;
    setStamping(true);

    try {
      const res = await fetch("/api/loyalty/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, businessId: business.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't add stamp. Please try again.");
        setStamping(false);
        return;
      }

      setCustomer({ ...customer, stamps: data.newStamps });
      setStamped(true);
    } catch {
      setError("Couldn't add stamp. Please try again.");
    }
    setStamping(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-amber-400 text-2xl animate-pulse">☕</div>
      </div>
    );
  }

  if (error || !business || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-gray-600">{error || "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  const isCardComplete = customer.stamps >= business.reward_stamps_needed;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="text-white px-4 pt-10 pb-6"
        style={{ backgroundColor: business.brand_color }}
      >
        <div className="max-w-sm mx-auto">
          <p className="text-white/70 text-sm">Staff — stamp customer</p>
          <h1 className="text-xl font-bold mt-0.5">{business.name}</h1>
        </div>
      </div>

      <div className="max-w-sm mx-auto p-4">
        {/* PIN gate */}
        {!unlocked ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mt-4">
            <h2 className="font-semibold text-gray-900 mb-1">Staff PIN required</h2>
            <p className="text-gray-500 text-sm mb-5">
              Enter your 4-digit staff PIN to continue.
            </p>
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
          <div className="space-y-4 mt-4">
            {/* Customer info */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: business.brand_color }}
                >
                  {customer.name ? customer.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{customer.name || "Guest"}</div>
                  <div className="text-gray-400 text-xs">{maskPhone(customer.phone)}</div>
                </div>
              </div>

              {/* Stamp progress */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Array.from({ length: business.reward_stamps_needed }).map((_, i) => {
                  const stamped = i < Math.min(customer.stamps, business.reward_stamps_needed);
                  return (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs"
                      style={
                        stamped
                          ? { backgroundColor: business.brand_color, borderColor: business.brand_color, color: "white" }
                          : { borderColor: "#e5e7eb" }
                      }
                    >
                      {stamped ? "☕" : ""}
                    </div>
                  );
                })}
              </div>

              <p className="text-sm text-gray-500">
                {customer.stamps} / {business.reward_stamps_needed} stamps
                {isCardComplete && (
                  <span className="text-amber-600 font-medium ml-2">— Card complete! 🎉</span>
                )}
              </p>
            </div>

            {/* Double stamps banner */}
            {business.double_stamps_active && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-2xl px-4 py-2.5 text-sm text-yellow-800 font-semibold text-center">
                ⚡ Double stamps active — this adds 2 stamps
              </div>
            )}

            {/* Stamp action */}
            {!stamped ? (
              <button
                onClick={handleAddStamp}
                disabled={stamping}
                className="w-full text-white font-bold py-4 rounded-2xl text-lg transition-opacity disabled:opacity-50 shadow-sm"
                style={{ backgroundColor: business.brand_color }}
              >
                {stamping
                  ? "Adding…"
                  : business.double_stamps_active
                  ? "✓ Add 2 stamps"
                  : "✓ Add stamp"}
              </button>
            ) : (
              <div
                className="rounded-2xl p-5 text-center border"
                style={{ backgroundColor: business.brand_color + "15", borderColor: business.brand_color + "40" }}
              >
                <div className="text-4xl mb-2">☕</div>
                <p
                  className="font-bold text-lg"
                  style={{ color: business.brand_color }}
                >
                  Stamp added!
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {customer.name || "Customer"} now has{" "}
                  <strong>
                    {customer.stamps} / {business.reward_stamps_needed}
                  </strong>{" "}
                  stamps
                </p>
                {customer.stamps >= business.reward_stamps_needed && (
                  <p className="text-amber-600 text-sm font-medium mt-2">
                    🎉 Card complete — they can claim their reward!
                  </p>
                )}
                <button
                  onClick={() => window.history.back()}
                  className="mt-4 text-white font-semibold py-3 px-6 rounded-xl text-sm"
                  style={{ backgroundColor: business.brand_color }}
                >
                  ← Back to staff dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffStampPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-amber-400 text-2xl animate-pulse">☕</div>
        </div>
      }
    >
      <StaffStampContent />
    </Suspense>
  );
}
