"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { signOut, getBusinessForOwner } from "@/lib/auth";
import type { Business } from "@/lib/types";

interface Stats {
  totalCustomers: number;
  newToday: number;
  rewardsRedeemed: number;
}

type Tab = "overview" | "qr" | "staff" | "offers";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<Stats>({ totalCustomers: 0, newToday: 0, rewardsRedeemed: 0 });
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showPin, setShowPin] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  // Offers tab state
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastSaving, setBroadcastSaving] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState("");
  const [doubleStampsLoading, setDoubleStampsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.push("/auth/login"); return; }

      const biz = await getBusinessForOwner(data.session.user.id);
      if (!biz) { router.push("/setup"); return; }
      setBusiness(biz);
      setBroadcastText(biz.active_broadcast ?? "");

      const today = new Date().toISOString().split("T")[0];
      const [customersRes, redemptionsRes] = await Promise.all([
        supabase.from("customers").select("id, created_at").eq("business_id", biz.id),
        supabase.from("redemptions").select("id").eq("business_id", biz.id).not("confirmed_at", "is", null),
      ]);
      const customers = customersRes.data || [];
      setStats({
        totalCustomers: customers.length,
        newToday: customers.filter((c) => c.created_at?.startsWith(today)).length,
        rewardsRedeemed: redemptionsRes.data?.length || 0,
      });
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopyMessage(label);
      setTimeout(() => setCopyMessage(""), 2000);
    });
  }

  // ── Offers actions ──────────────────────────────────────────────────────────

  async function handleToggleDoubleStamps() {
    if (!business) return;
    setDoubleStampsLoading(true);
    const next = !business.double_stamps_active;
    const { error } = await supabase
      .from("businesses")
      .update({ double_stamps_active: next })
      .eq("id", business.id);
    if (!error) setBusiness({ ...business, double_stamps_active: next });
    setDoubleStampsLoading(false);
  }

  async function handleSaveBroadcast() {
    if (!business) return;
    setBroadcastSaving(true);
    setBroadcastStatus("");
    const msg = broadcastText.trim() || null;
    const { error } = await supabase
      .from("businesses")
      .update({ active_broadcast: msg })
      .eq("id", business.id);
    if (!error) {
      setBusiness({ ...business, active_broadcast: msg });
      setBroadcastStatus(msg ? "Message live on all customer cards ✓" : "Message cleared ✓");
      setTimeout(() => setBroadcastStatus(""), 3000);
    }
    setBroadcastSaving(false);
  }

  // ── Loading / guard ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-amber-400 text-2xl animate-pulse">☕</div>
      </div>
    );
  }
  if (!business) return null;

  const enrolUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/?b=${business.slug}`
      : `https://loyalty-app-cld.pages.dev/join/?b=${business.slug}`;

  const staffUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/staff/?b=${business.slug}`
      : `https://loyalty-app-cld.pages.dev/staff/?b=${business.slug}`;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "qr",       label: "QR Code" },
    { id: "staff",    label: "Staff" },
    { id: "offers",   label: "Offers" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="text-white px-4 pt-10 pb-6" style={{ backgroundColor: business.brand_color }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm mb-0.5">Your loyalty dashboard</p>
              <h1 className="text-2xl font-bold">{business.name}</h1>
            </div>
            <button onClick={handleSignOut} className="text-white/70 hover:text-white text-sm mt-1">
              Sign out
            </button>
          </div>

          {/* Active offers badges */}
          {(business.double_stamps_active || business.active_broadcast) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {business.double_stamps_active && (
                <span className="bg-white/25 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  ⚡ Double stamps active
                </span>
              )}
              {business.active_broadcast && (
                <span className="bg-white/25 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  📣 Broadcast live
                </span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <div className="text-white/80 text-xs mt-0.5">Members</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{stats.newToday}</div>
              <div className="text-white/80 text-xs mt-0.5">New today</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{stats.rewardsRedeemed}</div>
              <div className="text-white/80 text-xs mt-0.5">Redeemed</div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                activeTab === id ? "border-b-2" : "text-gray-500 hover:text-gray-700"
              }`}
              style={activeTab === id ? { borderBottomColor: business.brand_color, color: business.brand_color } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3">Your programme</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stamps to reward</span>
                  <span className="font-medium">{business.reward_stamps_needed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reward</span>
                  <span className="font-medium">{business.reward_description}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Join link</span>
                  <span className="text-xs text-amber-600 truncate max-w-[180px]">{enrolUrl}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab("qr")}
                className="bg-white rounded-2xl p-4 border border-gray-100 text-left hover:border-amber-200 transition-colors"
              >
                <div className="text-2xl mb-2">📲</div>
                <div className="font-medium text-gray-900 text-sm">Customer QR</div>
                <div className="text-gray-500 text-xs mt-0.5">Share to enrol customers</div>
              </button>
              <button
                onClick={() => setActiveTab("offers")}
                className="bg-white rounded-2xl p-4 border border-gray-100 text-left hover:border-amber-200 transition-colors"
              >
                <div className="text-2xl mb-2">📣</div>
                <div className="font-medium text-gray-900 text-sm">Run an offer</div>
                <div className="text-gray-500 text-xs mt-0.5">Double stamps or broadcast</div>
              </button>
            </div>

            {stats.totalCustomers === 0 && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <h3 className="font-semibold text-amber-900 mb-1">🚀 Ready to launch?</h3>
                <p className="text-amber-700 text-sm">
                  Your programme is live. Share your QR code or join link to start enrolling customers.
                </p>
                <button
                  onClick={() => setActiveTab("qr")}
                  className="mt-3 text-sm font-medium text-amber-600 hover:text-amber-700"
                >
                  See your QR code →
                </button>
              </div>
            )}
          </>
        )}

        {/* ── QR CODE ──────────────────────────────────────────────────────── */}
        {activeTab === "qr" && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
            <h2 className="font-semibold text-gray-900 mb-1">Customer enrolment QR</h2>
            <p className="text-gray-500 text-sm mb-5">
              Print this or show it on a tablet. Customers scan to join your loyalty programme.
            </p>
            <div className="inline-block rounded-2xl p-4" style={{ backgroundColor: business.brand_color }}>
              <div className="bg-white rounded-xl p-3">
                <QRCodeSVG value={enrolUrl} size={180} fgColor="#1f2937" bgColor="#ffffff" level="M" />
              </div>
              <div className="text-white text-sm font-semibold mt-2">{business.name}</div>
              <div className="text-white/70 text-xs">Scan to join loyalty programme</div>
            </div>
            <div className="mt-5 space-y-2">
              <button
                onClick={() => copyText(enrolUrl, "Link copied!")}
                className="w-full border border-gray-200 hover:border-amber-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {copyMessage === "Link copied!" ? "✓ Copied!" : "📋 Copy join link"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3 break-all">{enrolUrl}</p>
          </div>
        )}

        {/* ── STAFF ────────────────────────────────────────────────────────── */}
        {activeTab === "staff" && (
          <>
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-1">Staff access</h2>
              <p className="text-gray-500 text-sm mb-4">
                Share this link with your team. They'll use it to add stamps and redeem rewards.
                PIN-protected — only your staff can access it.
              </p>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-600 font-mono break-all mb-3">
                {staffUrl}
              </div>
              <button
                onClick={() => copyText(staffUrl, "Staff link copied!")}
                className="w-full border border-gray-200 hover:border-amber-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors mb-4"
              >
                {copyMessage === "Staff link copied!" ? "✓ Copied!" : "📋 Copy staff link"}
              </button>
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Staff PIN</div>
                    <div className="text-xs text-gray-500 mt-0.5">Share with your team</div>
                  </div>
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="text-sm font-medium"
                    style={{ color: business.brand_color }}
                  >
                    {showPin ? "Hide" : "Reveal"}
                  </button>
                </div>
                {showPin && (
                  <div
                    className="mt-3 text-center text-3xl font-bold tracking-widest rounded-xl py-3"
                    style={{ backgroundColor: business.brand_color + "20", color: business.brand_color }}
                  >
                    {business.staff_pin}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-sm text-amber-800">
              <strong>Tip:</strong> Save the staff link to your phone's home screen for quick access.
              In Safari, tap Share → Add to Home Screen.
            </div>
          </>
        )}

        {/* ── OFFERS ───────────────────────────────────────────────────────── */}
        {activeTab === "offers" && (
          <>
            {/* Double stamps */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">⚡</span>
                    <h2 className="font-semibold text-gray-900">Double stamps</h2>
                  </div>
                  <p className="text-sm text-gray-500">
                    Every stamp counts double — great for a slow day or a special promotion.
                    Staff see a banner reminding them when it's active.
                  </p>
                </div>
                {/* Toggle */}
                <button
                  onClick={handleToggleDoubleStamps}
                  disabled={doubleStampsLoading}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    business.double_stamps_active ? "bg-green-500" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      business.double_stamps_active ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {business.double_stamps_active && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-800 font-medium text-center">
                  ⚡ Active now — each visit adds 2 stamps
                </div>
              )}
            </div>

            {/* Broadcast message */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📣</span>
                <h2 className="font-semibold text-gray-900">Broadcast message</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Write a message and it'll appear as a banner on every customer's loyalty card
                the next time they open it. Leave blank to clear.
              </p>

              <textarea
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                rows={3}
                maxLength={160}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": business.brand_color } as React.CSSProperties}
                placeholder={`e.g. "Double stamps all this week — Thurs to Sat! ☕☕"`}
              />
              <div className="flex justify-between items-center mt-1 mb-3">
                <span className="text-xs text-gray-400">{broadcastText.length}/160</span>
                {business.active_broadcast && (
                  <span className="text-xs text-green-600 font-medium">● Message currently live</span>
                )}
              </div>

              {broadcastStatus && (
                <div className="mb-3 text-sm text-green-700 font-medium text-center">
                  {broadcastStatus}
                </div>
              )}

              <div className="flex gap-2">
                {business.active_broadcast && (
                  <button
                    onClick={() => { setBroadcastText(""); handleSaveBroadcast(); }}
                    className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:border-red-200 hover:text-red-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleSaveBroadcast}
                  disabled={broadcastSaving}
                  className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: business.brand_color }}
                >
                  {broadcastSaving
                    ? "Saving…"
                    : broadcastText.trim()
                    ? "Send to all members"
                    : "Clear message"}
                </button>
              </div>

              <div className="mt-4 bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-xs text-amber-700">
                  <strong>How it works:</strong> The message appears as a banner at the top of
                  every customer's card page. It shows until you clear it. No SMS costs — instant and free.
                </p>
              </div>
            </div>

            {/* Ideas */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Offer ideas
              </p>
              <div className="space-y-1.5">
                {[
                  "Double stamps all week — come in Thu–Sat! ☕☕",
                  "Free cake slice with any hot drink this Friday 🎂",
                  "Happy hour 2–4pm — stamp on every drink! ⏰",
                  "Thanks for being a loyal customer — 20% off today ❤️",
                ].map((idea) => (
                  <button
                    key={idea}
                    onClick={() => setBroadcastText(idea)}
                    className="w-full text-left text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100 hover:border-amber-200 transition-colors"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
