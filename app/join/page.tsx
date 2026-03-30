'use client';
export const runtime = 'edge';
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Business } from "@/lib/types";

import { getSupabase } from '@/lib/supabase';
type Step = "phone" | "otp" | "submitting";

const COUNTRY_CODES = [
  // Primary markets at top
  { code: "+61", flag: "🇦🇺", name: "Australia", placeholder: "412 345 678" },
  { code: "+64", flag: "🇳🇿", name: "New Zealand", placholder: "21 123 4567" },
  { code: "+1", flag: "🇺🇸", name: "United States", placeholder: "555 123 4567" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom", placeholder: "7911 123456" },
  { code: "+1", flag: "🇨🇦", name: "Canada", placeholder: "555 123 4567" },
  // Other countries alphabetically
  { code: "+55", flag: "🇧🇷", name: "Brazil", placeholder: "11 91234 5678" },
  { code: "+33", flag: "🇫🇷", name: "France", placeholder: "6 12 34 56 78" },
  { code: "+49", flag: "🇩🇪", name: "Germany", placeholder: "151 12345678" },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong", placeholder: "9123 4567" },
  { code: "+91", flag: "🇮🇳", name: "India", placeholder: "98765 43210" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia", placeholder: "812 345 6789" },
  { code: "+353", flag: "🇮🇪", name: "Ireland", placeholder: "85 123 4567" },
  { code: "+39", flag: "🇮🇹", name: "Italy", placeholder: "312 345 6789" },
  { code: "+81", flag: "🇯🇵", name: "Japan", placeholder: "90 1234 5678" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia", placeholder: "12 345 6789" },
  { code: "+52", flag: "🇲🇽", name: "Mexico", placeholder: "55 1234 5678" },
  { code: "+63", flag: "🇵🇭", name: "Philippines", placeholder: "917 123 4567" },
  { code: "+65", flag: "🇸🇬", name: "Singapore", placeholder: "9123 4567" },
  { code: "+27", flag: "🇿🇦", name: "South Africa", placeholder: "71 123 4567" },
  { code: "+82", flag: "🇰🇷", name: "South Korea", placeholder: "10 1234 5678" },
  { code: "+34", flag: "🇪🇸", name: "Spain", placeholder: "612 345 678" },
  { code: "+66", flag: "🇹🇭", name: "Thailand", placeholder: "81 234 5678" },
  { code: "+971", flag: "🇦🇪", name: "UAE", placeholder: "50 123 4567" },
];

function detectCountryCode(): string {
  if (typeof window === "undefined") return "+61";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz.startsWith("Australia")) return "+61";
  if (tz.startsWith("Europe/London")) return "+44";
  if (tz.startsWith("America")) return "+1";
  if (tz.startsWith("Pacific/Auckland")) return "+64";
  if (tz.startsWith("Europe/Dublin")) return "+353";
  if (tz.startsWith("Asia/Singapore")) return "+65";
  if (tz.startsWith("Asia/Hong_Kong")) return "+852";
  if (tz.startsWith("Asia/Dubai")) return "+971";
  if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "+91";
  if (tz.startsWith("Africa/Johannesburg")) return "+27";
  return "+61"; // default to AU
}

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get("b") || "";

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+61");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hp, setHp] = useState(""); // honeypot for bots
  useEffect(() => {
    // Auto-detect country code from timezone
    setCountryCode(detectCountryCode());
  }, []);

  useEffect(() => {
    if (!slug) return;

    // Check if already enrolled
    const existingId = localStorage.getItem(`loyalty_${slug}_cid`);
    if (existingId) {
      router.replace(`/card/?b=${slug}`);
      return;
    }

    async function loadBusiness() {
      const { data } = await getSupabase()
        .from("businesses_public")
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
  function buildE164(): string {
    // Strip leading zero (common in AU/UK local format) and all non-digits
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    return countryCode + digits;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSendingOtp(true);
    setError("");

    const cleanPhone = buildE164();

    try {
      const res = await fetch("/api/sms/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, hp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not send code. Please try again.");
        setSendingOtp(false);
        return;
      }

      setStep("otp");
    } catch {
      setError("Could not send code. Check your number and try again.");
    }
    setSendingOtp(false);
  }
  async function handleVerifyAndJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!business || !otpCode.trim()) return;
    setVerifying(true);
    setError("");

    const cleanPhone = buildE164();

    // Verify OTP
    try {
      const verifyRes = await fetch("/api/sms/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, code: otpCode.trim() }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || "Invalid code. Please try again.");
        setVerifying(false);
        return;
      }
    } catch {
      setError("Verification failed. Please try again.");
      setVerifying(false);
      return;
    }
    // Phone verified - now create/find customer via secure API route
    setStep("submitting");
    setSubmitting(true);

    try {
      const joinRes = await fetch("/api/loyalty/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          phone: cleanPhone,
          name: name.trim(),
        }),
      });
      const joinData = await joinRes.json();

      if (!joinRes.ok || !joinData.success) {
        setError(joinData.error || "Couldn't sign you up. Please try again.");
        setStep("otp");
        setSubmitting(false);
        setVerifying(false);
        return;
      }

      const customerId = joinData.customerId;

      if (joinData.existing) {
        localStorage.setItem(`loyalty_${slug}_cid`, customerId);
        router.push(`/card/?b=${slug}`);
        return;
      }

      localStorage.setItem(`loyalty_${slug}_cid`, customerId);

      // Send SMS card link (fire and forget)
      fetch("/api/sms/send-card-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          businessSlug: slug,
          customerId,
          businessName: business.name,
        }),
      }).catch((err) => console.error("SMS send failed (non-blocking):", err));

      router.push(`/card/?b=${slug}`);
    } catch {
      setError("Couldn't sign you up. Please try again.");
      setStep("otp");
      setSubmitting(false);
      setVerifying(false);
    }
  }

  async function handleResendOtp() {
    setSendingOtp(true);
    setError("");
    const cleanPhone = buildE164();
    try {
      const res = await fetch("/api/sms/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, hp }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Could not resend code.");
      } else {
        setError("");
        setOtpCode("");
      }
    } catch {
      setError("Could not resend code.");
    }
    setSendingOtp(false);
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
      >        <div className="text-4xl mb-2">☕</div>
        <h1 className="text-2xl font-bold">{business.name}</h1>
        <p className="text-white/80 mt-1 text-sm">Loyalty Programme</p>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-sm">
          {/* Stamp preview */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4 text-center">
            <p className="text-gray-500 text-xs mb-1">
              1 stamp per: <span className="font-medium text-gray-700">{business.stamp_earn_description}</span>
            </p>
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
                      ? "text-white"                      : "border-gray-200"
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

          {/* Form - Step 1: Phone + Name */}
          {step === "phone" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-1">Join for free</h2>
              <p className="text-gray-500 text-sm mb-4">No app needed - just verify your number.</p>

              <form onSubmit={handleSendOtp} className="space-y-3">
                {/* Honeypot - invisible to humans, bots fill this in */}
                <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={hp}                    onChange={(e) => setHp(e.target.value)}
                  />
                </div>
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
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-28 shrink-0 px-2 py-2.5 border border-gray-200 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                      style={{ "--tw-ring-color": business.brand_color } as React.CSSProperties}
                    >
                      {COUNTRY_CODES.map((c, i) => (
                        <option key={`${c.code}-${c.name}`} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      autoComplete="tel-national"
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ "--tw-ring-color": business.brand_color } as React.CSSProperties}
                      placeholder={COUNTRY_CODES.find(c => c.code === countryCode)?.placeholder || "412 345 678"}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">We'll send a verification code to this number</p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sendingOtp || !phone.trim()}
                  className="w-full text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                  style={{ backgroundColor: business.brand_color }}
                >
                  {sendingOtp ? "Sending code..." : "Send verification code"}
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-3">
                Free to join · No app needed
              </p>
            </div>
          )}

          {/* Form - Step 2: OTP verification */}
          {step === "otp" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100">              <h2 className="font-semibold text-gray-900 mb-1">Verify your number</h2>
              <p className="text-gray-500 text-sm mb-4">
                Enter the 4-digit code we sent to <strong>{countryCode} {phone}</strong>
              </p>

              <form onSubmit={handleVerifyAndJoin} className="space-y-3">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    className="w-full px-3 py-4 border border-gray-200 rounded-lg text-gray-900 text-center text-3xl font-bold tracking-[0.5em] placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ "--tw-ring-color": business.brand_color } as React.CSSProperties}
                    placeholder="----"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifying || otpCode.length < 4}                  className="w-full text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                  style={{ backgroundColor: business.brand_color }}
                >
                  {verifying ? "Verifying..." : "Verify & join ☕"}
                </button>
              </form>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => { setStep("phone"); setError(""); setOtpCode(""); }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ← Change number
                </button>
                <button
                  onClick={handleResendOtp}
                  disabled={sendingOtp}
                  className="text-xs hover:underline disabled:opacity-50"
                  style={{ color: business.brand_color }}
                >
                  {sendingOtp ? "Sending..." : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* Submitting state */}
          {step === "submitting" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
              <div className="text-2xl animate-pulse mb-2">☕</div>              <p className="text-gray-600 text-sm">Setting up your card...</p>
            </div>
          )}
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
