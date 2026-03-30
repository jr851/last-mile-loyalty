'use client';
export const runtime = 'edge';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBusiness, generateSlug, generateStaffPin, getBusinessForOwner } from "@/lib/auth";

import { getSupabase } from '@/lib/supabase';
const BRAND_COLOURS = [
  { name: "Amber", value: "#F59E0B" },
  { name: "Brown", value: "#92400E" },
  { name: "Teal", value: "#0D9488" },
  { name: "Indigo", value: "#4F46E5" },
  { name: "Rose", value: "#E11D48" },
  { name: "Emerald", value: "#059669" },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1 fields
  const [businessName, setBusinessName] = useState("");
  const [brandColor, setBrandColor] = useState("#F59E0B");
  // Step 2 fields
  const [stampsNeeded, setStampsNeeded] = useState(8);
  const [rewardDescription, setRewardDescription] = useState("Free coffee");
  const [stampEarnDescription, setStampEarnDescription] = useState("Any purchase");

  useEffect(() => {
    async function checkAuth() {
      const { data } = await getSupabase().auth.getSession();
      if (!data.session) {
        router.push("/auth/login");
        return;
      }
      // Block unverified users
      if (!data.session.user.email_confirmed_at) {
        router.push("/auth/check-email");
        return;
      }
      const uid = data.session.user.id;
      setUserId(uid);

      // If they already have a business, go straight to dashboard
      const existing = await getBusinessForOwner(uid);
      if (existing) {
        router.push("/dashboard");
        return;
      }

      setLoading(false);
    }
    checkAuth();
  }, [router]);

  async function handleFinish() {
    if (!userId) return;
    setSaving(true);    setError("");

    const slug = generateSlug(businessName);
    const staffPin = generateStaffPin();

    const { error: createError } = await createBusiness(userId, {
      name: businessName,
      slug,
      brand_color: brandColor,
      reward_stamps_needed: stampsNeeded,
      reward_description: rewardDescription,
      stamp_earn_description: stampEarnDescription.trim() || "Any purchase",
      staff_pin: staffPin,
    });

    if (createError) {
      setError("Could not save your business. Please try again.");
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-400 text-2xl">☕</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">☕</div>
          <h1 className="text-2xl font-bold text-amber-900">Set up your programme</h1>
          <p className="text-amber-700 mt-1">Two quick steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= s ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-400"
                }`}
              >
                {s}
              </div>
              {i < 1 && (
                <div className={`h-0.5 w-8 ${step > s ? "bg-amber-400" : "bg-amber-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">

          {/* Step 1: Business details */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Your business</h2>
                <p className="text-sm text-gray-500">Tell us about your business</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  placeholder="e.g. The Corner Store"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand colour
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {BRAND_COLOURS.map((colour) => (                    <button
                      key={colour.value}
                      type="button"
                      onClick={() => setBrandColor(colour.value)}
                      className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
                        brandColor === colour.value
                          ? "border-gray-800 scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: colour.value }}
                      title={colour.name}
                    />
                  ))}
                </div>
                <div
                  className="mt-3 rounded-lg p-3 text-white text-sm font-medium text-center"
                  style={{ backgroundColor: brandColor }}
                >
                  {businessName || "Your Business Name"} - Loyalty Card
                </div>
              </div>

              <button
                type="button"
                disabled={!businessName.trim()}
                onClick={() => { setStep(2); setError(""); }}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:text-amber-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Next
              </button>
            </div>          )}

          {/* Step 2: Reward details */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Your reward</h2>
                <p className="text-sm text-gray-500">What do customers earn, and when?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stamps needed for a reward
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStampsNeeded(Math.max(3, stampsNeeded - 1))}
                    className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-lg hover:bg-amber-200 transition-colors flex items-center justify-center"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-3xl font-bold text-amber-600">{stampsNeeded}</div>
                    <div className="text-xs text-gray-500">stamps</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStampsNeeded(Math.min(20, stampsNeeded + 1))}
                    className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-lg hover:bg-amber-200 transition-colors flex items-center justify-center"                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-1">
                  We recommend 8-10 for most businesses
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What earns a stamp?
                </label>
                <input
                  type="text"
                  value={stampEarnDescription}
                  onChange={(e) => setStampEarnDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  placeholder="e.g. Any purchase, Buy any drink, Spend $10+"
                  maxLength={80}
                />
                <p className="text-xs text-gray-400 mt-1">
                  This tells customers what they need to do to earn each stamp
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What's the reward?
                </label>                <input
                  type="text"
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  placeholder="e.g. Free coffee of your choice"
                  maxLength={80}
                />
              </div>

              {/* Preview card */}
              <div
                className="rounded-xl p-4 text-white"
                style={{ backgroundColor: brandColor }}
              >
                <div className="font-semibold mb-2">{businessName}</div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Array.from({ length: stampsNeeded }).map((_, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-white/60 flex items-center justify-center text-xs"
                    >
                      {i < 3 ? "☕" : ""}
                    </div>
                  ))}
                </div>
                <div className="text-white/80 text-xs">
                  1 stamp per: {stampEarnDescription}
                </div>
                <div className="text-white/80 text-xs mt-0.5">
                  Collect {stampsNeeded} stamps → {rewardDescription}                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(""); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!rewardDescription.trim() || saving}
                  onClick={handleFinish}
                  className="flex-2 flex-grow bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:text-amber-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {saving ? "Saving..." : "Launch! 🚀"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
