"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical, CheckCircle, XCircle, Crown, Zap, BookOpen,
  Brain, Layers, BarChart2, FileDown, FolderOpen, MessageCircle,
  Loader2, ArrowLeft, ChevronDown, ChevronUp, Microscope,
  Calendar, Tag, Gift, Copy, Check,
} from "lucide-react";
import { clsx } from "clsx";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = "monthly" | "annual";

interface CouponResult {
  valid: boolean;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  description?: string;
  error?: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const BASE_PRICES: Record<Plan, number> = { monthly: 2000, annual: 18000 };

function discountedPrice(plan: Plan, coupon: CouponResult | null): number {
  const base = BASE_PRICES[plan];
  if (!coupon?.valid || !coupon.discountValue) return base;
  return coupon.discountType === "percent"
    ? Math.round(base * (1 - coupon.discountValue / 100))
    : Math.max(0, base - coupon.discountValue);
}

const FEATURES = [
  {
    category: "AI Analysis",
    items: [
      { label: "AI-powered slide analysis",           free: true,  premium: true  },
      { label: "Dual-pipeline (Gemini + Claude)",     free: true,  premium: true  },
      { label: "Unlimited analyses per month",        free: false, premium: true  },
      { label: "Follow-up questions on any slide",    free: true,  premium: true  },
      { label: "Context-grounded AI answers",         free: true,  premium: true  },
    ],
  },
  {
    category: "Study Tools",
    items: [
      { label: "Flashcard mode (full deck)",          free: true,  premium: true  },
      { label: "Quiz mode (18 questions)",            free: true,  premium: true  },
      { label: "Session & per-card timers (OSCE)",   free: true,  premium: true  },
      { label: "Spaced repetition (SM-2 algorithm)", free: true,  premium: true  },
      { label: "Review schedule saved across devices",free: false, premium: true  },
    ],
  },
  {
    category: "Slide Library & Cases",
    items: [
      { label: "Curated slide library access",       free: true,  premium: true  },
      { label: "Save cases to My Cases",             free: false, premium: true  },
      { label: "Full analysis history",              free: false, premium: true  },
      { label: "PDF export of any analysis",         free: false, premium: true  },
    ],
  },
  {
    category: "Progress & Reporting",
    items: [
      { label: "Progress tracking dashboard",        free: true,  premium: true  },
      { label: "Confidence score history",           free: false, premium: true  },
      { label: "Per-category performance breakdown", free: false, premium: true  },
    ],
  },
];

const FAQS = [
  {
    q: "What happens after my 7-day trial?",
    a: "After your trial ends, you'll lose access to AI analysis and premium features. Your account and any saved data remain intact — simply subscribe to restore full access.",
  },
  {
    q: "What's the difference between Monthly and Annual?",
    a: "Both plans unlock identical features. Annual billing costs ₦18,000 upfront (₦1,500/month equivalent) — saving you ₦6,000 compared to paying monthly. Monthly is ₦2,000/month with no long-term commitment.",
  },
  {
    q: "Do Annual plans auto-renew?",
    a: "Currently subscriptions are one-time payments per period. You'll receive a reminder before your Annual plan expires so you can renew at the same discounted rate.",
  },
  {
    q: "How does the referral program work?",
    a: "Share your unique referral link from the pricing page. When a friend subscribes for the first time using your link, they get 20% off their first month and you get 30 free days added to your subscription — automatically.",
  },
  {
    q: "Is my payment secure?",
    a: "Yes. Payments are processed securely through Flutterwave, a leading payment platform. PathoLearn never stores your card details.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. You can cancel your subscription at any time from your account settings. You'll retain access until the end of your current billing period.",
  },
  {
    q: "What currencies are accepted?",
    a: "We currently accept Nigerian Naira (₦) via Flutterwave, which supports cards, bank transfer, and USSD payment methods.",
  },
  {
    q: "Do I need a Premium account to use the flashcards and quiz?",
    a: "No — flashcards, quiz mode, and the slide library are available on the free trial. Premium unlocks unlimited AI analyses, case saving, PDF export, and cross-device spaced repetition sync.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();

  const [user, setUser]                 = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [subscribing, setSubscribing]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [openFaq, setOpenFaq]           = useState<number | null>(null);

  // Coupon
  const [couponInput, setCouponInput]     = useState("");
  const [couponResult, setCouponResult]   = useState<CouponResult | null>(null);
  const [validatingCoupon, setValidating] = useState(false);

  // Referral — incoming (someone referred this user)
  const [incomingRef, setIncomingRef] = useState<string | null>(null);

  // Referral — outgoing (user's own share link)
  const [myReferralLink, setMyReferralLink]   = useState<string | null>(null);
  const [referralCount, setReferralCount]     = useState(0);
  const [copyStatus, setCopyStatus]           = useState<"idle" | "copied">("idle");

  // ── On mount: auth, incoming ref code, and own referral code ──────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);

      if (u && data.session?.access_token) {
        fetch("/api/referral-code", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        })
          .then(r => r.json())
          .then(d => {
            if (d.referralLink) setMyReferralLink(d.referralLink);
            if (typeof d.referralCount === "number") setReferralCount(d.referralCount);
          })
          .catch(() => {});
      }
    });

    // Read ?ref=CODE from URL, persist to localStorage
    const params = new URLSearchParams(window.location.search);
    const ref    = params.get("ref");
    if (ref) {
      localStorage.setItem("patholearn_ref", ref.toUpperCase().trim());
      window.history.replaceState({}, "", window.location.pathname);
    }
    const stored = localStorage.getItem("patholearn_ref");
    if (stored) setIncomingRef(stored);
  }, []);

  // ── Coupon ─────────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidating(true);
    setCouponResult(null);
    try {
      const res  = await fetch("/api/validate-coupon", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: couponInput }),
      });
      const data = await res.json();
      setCouponResult(data);
    } catch {
      setCouponResult({ valid: false, error: "Could not validate coupon" });
    } finally {
      setValidating(false);
    }
  };

  // ── Subscribe ──────────────────────────────────────────────────────────────
  const handleSubscribe = async (plan: Plan) => {
    if (!user) { router.push("/"); return; }
    setSubscribing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { userId: user.id, email: user.email, plan };
      if (couponResult?.valid)       body.couponCode   = couponInput.toUpperCase().trim();
      else if (incomingRef)          body.referralCode = incomingRef;

      const res  = await fetch("/api/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.paymentLink) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.paymentLink;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubscribing(false);
    }
  };

  // ── Copy referral link ─────────────────────────────────────────────────────
  const copyLink = () => {
    if (!myReferralLink) return;
    navigator.clipboard.writeText(myReferralLink).then(() => {
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    });
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const appliedCoupon   = couponResult?.valid ? couponResult : null;
  const monthlyDisplay  = discountedPrice("monthly", appliedCoupon);
  const annualDisplay   = discountedPrice("annual",  appliedCoupon);
  const annualPerMonth  = Math.round(annualDisplay / 12);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Nav */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to app</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Patho<span className="text-primary-600">Learn</span></span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-24">

        {/* Hero */}
        <section className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 mb-5">
            <Zap className="w-3.5 h-3.5" /> Simple, transparent pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-4">
            Learn histopathology<br />at your own pace
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            Start free for 7 days. No credit card required. Upgrade when you&apos;re ready to unlock everything.
          </p>
        </section>

        {/* Referral incoming banner */}
        {incomingRef && (
          <div className="max-w-5xl mx-auto -mb-16">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
              <Gift className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700">
                <span className="font-semibold">Referral discount detected.</span>{" "}
                You&apos;ll get <span className="font-semibold">20% off your first month</span> — applied automatically at checkout.
              </p>
            </div>
          </div>
        )}

        {/* ── Pricing cards ── */}
        <section className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">

          {/* Free Trial */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7 flex flex-col">
            <div className="mb-5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Microscope className="w-5 h-5 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Free Trial</h2>
              <p className="text-sm text-slate-500">Everything you need to get started</p>
            </div>

            <div className="mb-5">
              <span className="text-4xl font-bold text-slate-900">₦0</span>
              <span className="text-slate-500 ml-2 text-sm">for 7 days</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-5 text-xs text-slate-600 border border-slate-100">
              Full access to AI analysis and all study tools. No payment needed.
            </div>

            <ul className="space-y-2.5 mb-7 flex-1">
              {[
                { icon: Microscope,    text: "AI slide analysis"             },
                { icon: MessageCircle, text: "Follow-up questions on slides" },
                { icon: Layers,        text: "Full flashcard deck"           },
                { icon: Brain,         text: "Quiz mode — 18 questions"      },
                { icon: BookOpen,      text: "Curated slide library"         },
                { icon: BarChart2,     text: "Progress tracking"             },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {text}
                </li>
              ))}
              {["Save cases to My Cases", "PDF export", "Cross-device spaced repetition"].map(text => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-400">
                  <XCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => router.push("/")}
              className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              Start free trial
            </button>
          </div>

          {/* Monthly */}
          <div className={clsx(
            "bg-white rounded-2xl border-2 p-7 flex flex-col transition-all",
            selectedPlan === "monthly" ? "border-primary-400 shadow-md" : "border-slate-200"
          )}>
            <div className="mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                <Crown className="w-5 h-5 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Premium Monthly</h2>
              <p className="text-sm text-slate-500">Flexible, cancel anytime</p>
            </div>

            <div className="mb-5">
              {appliedCoupon && monthlyDisplay !== BASE_PRICES.monthly ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">₦{monthlyDisplay.toLocaleString()}</span>
                  <span className="text-slate-400 line-through text-sm">₦{BASE_PRICES.monthly.toLocaleString()}</span>
                  <span className="text-slate-500 text-sm">/ month</span>
                </div>
              ) : (
                <>
                  <span className="text-4xl font-bold text-slate-900">₦{BASE_PRICES.monthly.toLocaleString()}</span>
                  <span className="text-slate-500 ml-2 text-sm">/ month</span>
                </>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-5 text-xs text-slate-600 border border-slate-100">
              Cancel anytime. Access continues until end of billing period.
            </div>

            <ul className="space-y-2.5 mb-7 flex-1">
              {[
                { icon: Microscope,    text: "Unlimited AI analyses"                  },
                { icon: MessageCircle, text: "Context-grounded follow-up questions"   },
                { icon: Layers,        text: "Full flashcard deck + spaced repetition"},
                { icon: Brain,         text: "Quiz mode with timed OSCE simulation"   },
                { icon: BookOpen,      text: "Curated slide library"                  },
                { icon: FolderOpen,    text: "Save cases to My Cases"                 },
                { icon: FileDown,      text: "PDF export of every analysis"           },
                { icon: BarChart2,     text: "Full progress & confidence tracking"    },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            {error && selectedPlan === "monthly" && (
              <p className="text-xs text-red-500 text-center mb-3">{error}</p>
            )}

            <button
              onClick={() => { setSelectedPlan("monthly"); handleSubscribe("monthly"); }}
              disabled={subscribing}
              className="w-full py-3 rounded-xl border-2 border-primary-500 text-primary-700 font-bold text-sm hover:bg-primary-50 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {subscribing && selectedPlan === "monthly"
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                : <><Crown className="w-4 h-4" /> {user ? "Get Monthly" : "Sign in to upgrade"}</>}
            </button>
          </div>

          {/* Annual — Best Value */}
          <div className={clsx(
            "relative rounded-2xl p-7 flex flex-col text-white shadow-xl",
            "bg-gradient-to-br from-primary-600 to-patho-purple",
          )}>
            <div className="absolute top-4 right-4">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white tracking-wider uppercase">
                Best Value
              </span>
            </div>

            <div className="mb-5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-1">Premium Annual</h2>
              <p className="text-sm text-white/70">Save ₦6,000 — pay once a year</p>
            </div>

            <div className="mb-5">
              {appliedCoupon && annualDisplay !== BASE_PRICES.annual ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">₦{annualDisplay.toLocaleString()}</span>
                    <span className="text-white/50 line-through text-sm">₦{BASE_PRICES.annual.toLocaleString()}</span>
                    <span className="text-white/70 text-sm">/ year</span>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">₦{annualPerMonth.toLocaleString()}/month equivalent</p>
                </div>
              ) : (
                <div>
                  <span className="text-4xl font-bold">₦18,000</span>
                  <span className="text-white/70 ml-2 text-sm">/ year</span>
                  <p className="text-xs text-white/60 mt-0.5">₦1,500/month — 25% off monthly price</p>
                </div>
              )}
            </div>

            <div className="bg-white/10 rounded-xl p-3 mb-5 text-xs text-white/80 border border-white/20">
              All Premium features. One payment, 12 months of access.
            </div>

            <ul className="space-y-2.5 mb-7 flex-1">
              {[
                { icon: Microscope,    text: "Unlimited AI analyses"                  },
                { icon: MessageCircle, text: "Context-grounded follow-up questions"   },
                { icon: Layers,        text: "Full flashcard deck + spaced repetition"},
                { icon: Brain,         text: "Quiz mode with timed OSCE simulation"   },
                { icon: BookOpen,      text: "Curated slide library"                  },
                { icon: FolderOpen,    text: "Save cases to My Cases"                 },
                { icon: FileDown,      text: "PDF export of every analysis"           },
                { icon: BarChart2,     text: "Full progress & confidence tracking"    },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white">
                  <CheckCircle className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                  <Icon className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            {error && selectedPlan === "annual" && (
              <p className="text-xs text-red-200 text-center mb-3">{error}</p>
            )}

            <button
              onClick={() => { setSelectedPlan("annual"); handleSubscribe("annual"); }}
              disabled={subscribing}
              className="w-full py-3 rounded-xl bg-white text-primary-700 font-bold text-sm hover:bg-white/90 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {subscribing && selectedPlan === "annual"
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                : <><Calendar className="w-4 h-4" /> {user ? "Get Annual — Best Value" : "Sign in to upgrade"}</>}
            </button>

            <p className="text-center text-xs text-white/50 mt-3">Secure payment via Flutterwave</p>
          </div>
        </section>

        {/* ── Coupon code ── */}
        <section className="max-w-md mx-auto -mt-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Have a coupon code?
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={e => { setCouponInput(e.target.value); setCouponResult(null); }}
                onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                placeholder="Enter code (e.g. WELCOME20)"
                className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 uppercase placeholder:normal-case placeholder:text-slate-400"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={validatingCoupon || !couponInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </button>
            </div>

            {couponResult?.valid && (
              <p className="mt-2.5 text-sm text-emerald-600 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span><span className="font-semibold">{couponResult.description}</span> applied to both plans above.</span>
              </p>
            )}
            {couponResult && !couponResult.valid && (
              <p className="mt-2.5 text-sm text-red-500 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {couponResult.error ?? "Invalid coupon code"}
              </p>
            )}
          </div>
        </section>

        {/* ── Referral share (logged-in users only) ── */}
        {user && myReferralLink && (
          <section className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-2xl border border-primary-100 p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Invite friends, earn free days</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Share your link. When a friend subscribes for the first time, they get{" "}
                    <span className="font-semibold text-slate-700">20% off their first month</span> and
                    you get <span className="font-semibold text-slate-700">30 free days</span> added to your plan — automatically.
                    {referralCount > 0 && (
                      <span className="ml-1 text-primary-600 font-semibold">
                        You&apos;ve referred {referralCount} friend{referralCount !== 1 ? "s" : ""} so far.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={myReferralLink}
                      className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-xl border border-primary-200 bg-white text-slate-700 focus:outline-none select-all"
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={copyLink}
                      className={clsx(
                        "px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all",
                        copyStatus === "copied"
                          ? "bg-emerald-500 text-white"
                          : "bg-primary-600 text-white hover:bg-primary-700"
                      )}
                    >
                      {copyStatus === "copied"
                        ? <><Check className="w-4 h-4" /> Copied!</>
                        : <><Copy className="w-4 h-4" /> Copy link</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Feature comparison table ── */}
        <section className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Everything compared</h2>
          <p className="text-sm text-slate-500 text-center mb-10">Monthly and Annual unlock identical features.</p>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50">
              <div className="px-6 py-4 text-sm font-semibold text-slate-500">Feature</div>
              <div className="px-6 py-4 text-sm font-semibold text-slate-700 text-center border-l border-slate-100">Free Trial</div>
              <div className="px-6 py-4 text-sm font-semibold text-primary-700 text-center border-l border-slate-100 flex items-center justify-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Premium
              </div>
            </div>

            {FEATURES.map((section) => (
              <div key={section.category}>
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 border-t">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{section.category}</p>
                </div>
                {section.items.map((item, ii) => (
                  <div
                    key={item.label}
                    className={clsx(
                      "grid grid-cols-3 border-b border-slate-50",
                      ii % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    )}
                  >
                    <div className="px-6 py-3.5 text-sm text-slate-700">{item.label}</div>
                    <div className="px-6 py-3.5 flex items-center justify-center border-l border-slate-100">
                      {item.free
                        ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                        : <XCircle className="w-4 h-4 text-slate-200" />}
                    </div>
                    <div className="px-6 py-3.5 flex items-center justify-center border-l border-slate-100">
                      {item.premium
                        ? <CheckCircle className="w-4 h-4 text-primary-500" />
                        : <XCircle className="w-4 h-4 text-slate-200" />}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-800 pr-4">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="text-center bg-gradient-to-br from-primary-600 to-patho-purple rounded-2xl p-12 max-w-4xl mx-auto text-white">
          <Crown className="w-10 h-10 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl font-bold mb-3">Ready to go Premium?</h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Join students using PathoLearn to master histopathology. Unlimited AI analysis, OSCE-ready timers,
            and full progress tracking.
          </p>
          {error && <p className="text-xs text-red-200 mb-4">{error}</p>}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => handleSubscribe("annual")}
              disabled={subscribing}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-primary-700 font-bold text-sm hover:bg-white/90 disabled:opacity-60 transition-all shadow-lg"
            >
              {subscribing && selectedPlan === "annual"
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                : <><Calendar className="w-4 h-4" /> {user ? "Get Annual — ₦18,000/yr" : "Sign in to upgrade"}</>}
            </button>
            <button
              onClick={() => handleSubscribe("monthly")}
              disabled={subscribing}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 disabled:opacity-60 transition-all border border-white/20"
            >
              {subscribing && selectedPlan === "monthly"
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                : <><Crown className="w-4 h-4" /> {user ? "Get Monthly — ₦2,000/mo" : "Sign in to upgrade"}</>}
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 pb-8 space-y-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center">
              <FlaskConical className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-600">PathoLearn</span>
          </div>
          <p>AI-powered histopathology learning for medical students.</p>
          <p>Payments processed securely by Flutterwave.</p>
        </footer>

      </main>
    </div>
  );
}
