"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Business } from "@/lib/types";

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get("b") || "";

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!slug) return;

    // Check if already enrolled
    const existingId = localStorage.getItem(`loyalty_${slug}_cid`);
    if (existingId) {
      router.replace(`/card/?b=${slug}`);
      return;
    }

    async function loadBusiness() {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!data) {
        setError("Programme not found. Check your link and try again.");
        setLoading(false);
        return;
      }
      setBusiness(data as Business);
      setLoading(false);
    }
    loadBusiness();
  }, [slug, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    setSubmitting(true);
    setError("");

    const cleanPhone = phone.replace(/\s/g, "");

    // Check if customer already exists for this business
    const { data: existing } = await supabase
      .from("customers")
      .select("id, stamps")
      .eq("business_id", business.id)
      .eq("phone", cleanPhone)
      .single();

    if (existing) {
      // Already enrolled — save and go to card
      localStorage.setItem(`loyalty_${slug}_cid`, existing.id);
      router.push(`/card/?b=${slug}`);
      return;
    }

    // New customer — create with 1 stamp (first-stamp psychology!)
    const { data: newCustomer, error: insertError } = await supabase
      .from("customers")
      .insert({
        business_id: business.id,
        phone: cleanPhone,
        name: name.trim(),
        stamps: 1,
      })
      .select("id")
      .single();

    if (insertError || !newCustomer) {
      setError("Couldn't sign you up. Please try again.");
      setSubmitting(false);
      return;
    }

    localStorage.setItem(`loyalty_${slug}_cid`, newCustomer.id);
    router.push(`/card/?b=${slug}`);
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

  if (error && !business) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-amber-800 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: business.brand_color + "15" }}>
      {/* Header */}
      <div
        className="text-white px-4 pt-10 pb-8 text-center"
        style={{ backgroundColor: business.brand_color }}
      >
        <div className="text-4xl mb-2">☕</div>
        <h1 className="text-2xl font-bold">{business.name}</h1>
        <p className="text-white/80 mt-1 text-sm">Loyalty Programme</p>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-sm">
          {/* Stamp preview */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4 text-center">
            <p className="text-gray-600 text-sm mb-3">
              Collect <strong>{business.reward_stamps_needed} stamps</strong> to earn:
            </p>
            <p
              className="font-semibold text-lg"
              style={{ color: business.brand_color }}
            >
              {business.reward_description}
            </p>
            {/* Stamp dots preview */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {Array.from({ length: Math.min(business.reward_stamps_needed, 12) }).map((_, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                    i === 0
                      ? "text-white"
                      : "border-gray-200"
                  }`}
                  style={i === 0 ? { backgroundColor: business.brand_color, borderColor: business.brand_color } : {}}
                >
                  {i === 0 ? "☕" : ""}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              You'll get your first stamp when you join!
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-1">Join for free</h2>
            <p className="text-gray-500 text-sm mb-4">No app needed — just save this page.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": business.brand_color } as React.CSSProperties}
                  placeholder="e.g. Sam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  placeholder="e.g. 07700 900123"
                />
                <p className="text-xs text-gray-400 mt-1">Used to identify your card</p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !phone.trim()}
                className="w-full text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                style={{ backgroundColor: business.brand_color }}
              >
                {submitting ? "Joining…" : "Join & get my first stamp ☕"}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-3">
              Free to join · No app needed · Already a member? Just enter your number.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-amber-50 flex items-center justify-center">
          <div className="text-amber-400 text-2xl animate-pulse">☕</div>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
