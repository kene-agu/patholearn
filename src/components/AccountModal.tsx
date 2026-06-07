"use client";

import { useState } from "react";
import {
  X, Crown, Clock, AlertTriangle, Trash2, LogOut, CheckCircle,
  Loader2, Mail, RotateCcw, Bell, BellOff, Microscope, FileText,
  Layers, MessageSquare, Brain, LayoutTemplate,
} from "lucide-react";
import { clsx } from "clsx";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/authedFetch";
import type { SubscriptionState } from "@/lib/useSubscription";
import { PRICES, formatPrice } from "@/lib/pricing";
import { usePushNotifications } from "@/lib/usePushNotifications";

interface AccountModalProps {
  user: SupabaseUser;
  subscription: SubscriptionState;
  onClose: () => void;
  onLogout: () => void;
}

const TRIAL_DAYS = 14;

const PREMIUM_FEATURES = [
  { icon: Microscope,    label: "Unlimited AI analyses" },
  { icon: LayoutTemplate, label: "Infographic summaries" },
  { icon: FileText,      label: "PDF export & saved cases" },
  { icon: Layers,        label: "Full flashcard deck" },
  { icon: MessageSquare, label: "AI tutor chat" },
  { icon: Brain,         label: "Quiz mode" },
];

function StatusBadge({ subscription }: { subscription: SubscriptionState }) {
  if (subscription.isCanceled) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-xs font-semibold">
        <Crown className="w-3.5 h-3.5 text-amber-300" /> Expires soon
      </span>
    );
  }
  if (subscription.isPremium) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-xs font-semibold">
        <Crown className="w-3.5 h-3.5" /> Premium
      </span>
    );
  }
  if (subscription.isTrialing) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" /> Free Trial
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-400/30 text-xs font-semibold">
      <AlertTriangle className="w-3.5 h-3.5" /> Expired
    </span>
  );
}

export default function AccountModal({ user, subscription, onClose, onLogout }: AccountModalProps) {
  const [deleting,          setDeleting]          = useState(false);
  const [confirmText,       setConfirmText]        = useState("");
  const [showConfirm,       setShowConfirm]        = useState(false);
  const [deleteError,       setDeleteError]        = useState<string | null>(null);
  const [subscribing,       setSubscribing]        = useState(false);
  const [subscribeError,    setSubscribeError]     = useState<string | null>(null);
  const [cancelling,        setCancelling]         = useState(false);
  const [showCancelConfirm, setShowCancelConfirm]  = useState(false);
  const [reactivating,      setReactivating]       = useState(false);

  const push = usePushNotifications(user);

  const handleUpgrade = async () => {
    setSubscribing(true);
    setSubscribeError(null);
    try {
      const res  = await authedFetch("/api/subscribe", {
        method: "POST",
        body:   JSON.stringify({ userId: user.id, email: user.email, plan: "monthly" }),
      });
      const data = await res.json();
      if (!res.ok || !data.paymentLink) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.paymentLink;
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : "Something went wrong");
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await authedFetch("/api/cancel-subscription", {
        method: "POST",
        body:   JSON.stringify({ userId: user.id }),
      });
      if (res.ok) { setShowCancelConfirm(false); subscription.refetch(); }
    } catch { /* silent */ } finally { setCancelling(false); }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const res = await authedFetch("/api/reactivate-subscription", {
        method: "POST",
        body:   JSON.stringify({ userId: user.id }),
      });
      if (res.ok) subscription.refetch();
    } catch { /* silent */ } finally { setReactivating(false); }
  };

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== "delete") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await supabase.from("flashcard_reviews").delete().eq("user_id", user.id);
      await supabase.from("slide_history").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.signOut();
      onLogout();
    } catch {
      setDeleteError("Failed to delete account. Please contact support.");
      setDeleting(false);
    }
  };

  const name     = (user.user_metadata?.full_name as string) || "User";
  const email    = user.email ?? "";
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const isGoogle = user.app_metadata?.provider === "google";

  const trialPct = subscription.isTrialing
    ? Math.round(((TRIAL_DAYS - subscription.daysLeft) / TRIAL_DAYS) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Gradient hero header ── */}
        <div className="relative bg-gradient-to-br from-primary-600 via-violet-600 to-indigo-700 px-6 pt-6 pb-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
            {initials}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white leading-tight truncate">{name}</h2>
              <p className="flex items-center gap-1.5 text-sm text-white/70 mt-1 truncate">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{email}</span>
              </p>
              {isGoogle && (
                <span className="inline-flex items-center gap-1 mt-2 text-[10px] text-white/60 font-medium">
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path fill="#fff" fillOpacity=".8" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#fff" fillOpacity=".8" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fff" fillOpacity=".8" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#fff" fillOpacity=".8" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Signed in with Google
                </span>
              )}
            </div>
            {subscription.loading
              ? <div className="h-7 w-24 rounded-full bg-white/20 animate-pulse flex-shrink-0" />
              : <div className="flex-shrink-0"><StatusBadge subscription={subscription} /></div>}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[65vh]">

          {/* ── Subscription section ── */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 space-y-4">

            {/* Trialing */}
            {subscription.isTrialing && (
              <>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{subscription.daysLeft} day{subscription.daysLeft !== 1 ? "s" : ""} remaining</span>
                    <span>Trial ends {subscription.trialEnd?.toLocaleDateString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        subscription.daysLeft <= 2 ? "bg-red-400" : subscription.daysLeft <= 4 ? "bg-amber-400" : "bg-primary-500"
                      )}
                      style={{ width: `${trialPct}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/40 p-4">
                  <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-0.5">You&apos;re on the free trial</p>
                  <p className="text-xs text-primary-600 dark:text-primary-400">Full AI analysis included. Subscribe before your trial ends to keep access.</p>
                </div>
                {subscribeError && <p className="text-xs text-red-600 text-center">{subscribeError}</p>}
                <button
                  onClick={handleUpgrade}
                  disabled={subscribing}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-2xl disabled:opacity-60 text-sm font-semibold"
                >
                  {subscribing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                    : <><Crown className="w-4 h-4" /> Upgrade to Premium — {formatPrice(PRICES.monthly)}/mo</>}
                </button>
              </>
            )}

            {/* Premium active */}
            {subscription.isPremium && (
              <div className="space-y-4">
                {subscription.isCanceled ? (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                      <Crown className="w-3.5 h-3.5 text-amber-500" /> Renewal cancelled
                    </p>
                    {subscription.profile?.current_period_end && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Access expires <strong>{new Date(subscription.profile.current_period_end).toLocaleDateString()}</strong>. No further charges.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/40 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0">
                      <Crown className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Premium active</p>
                      {subscription.profile?.current_period_end && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Renews {new Date(subscription.profile.current_period_end).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Feature grid */}
                <div className="grid grid-cols-2 gap-2">
                  {PREMIUM_FEATURES.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight">{label}</span>
                    </div>
                  ))}
                </div>

                {subscription.isCanceled ? (
                  <button
                    onClick={handleReactivate}
                    disabled={reactivating}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                  >
                    {reactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><RotateCcw className="w-3.5 h-3.5" /> Undo cancellation</>}
                  </button>
                ) : !showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors py-1"
                  >
                    Cancel automatic renewal
                  </button>
                ) : (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 space-y-3">
                    <p className="text-xs text-red-700 dark:text-red-400">
                      Your access stays active until{" "}
                      <strong>{subscription.profile?.current_period_end ? new Date(subscription.profile.current_period_end).toLocaleDateString() : "period end"}</strong>.
                      No charges after that.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowCancelConfirm(false)} className="flex-1 btn-secondary text-xs py-1.5 rounded-xl">Keep plan</button>
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes, cancel"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Expired */}
            {subscription.isExpired && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-700/40 p-4">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-0.5">Trial expired</p>
                  <p className="text-xs text-red-600 dark:text-red-400">Subscribe to continue using AI-powered slide analysis.</p>
                </div>
                {subscribeError && <p className="text-xs text-red-600 text-center">{subscribeError}</p>}
                <button
                  onClick={handleUpgrade}
                  disabled={subscribing}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-2xl disabled:opacity-60 text-sm font-semibold"
                >
                  {subscribing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                    : <><Crown className="w-4 h-4" /> Subscribe — {formatPrice(PRICES.monthly)}/month</>}
                </button>
              </div>
            )}
          </div>

          {/* ── Push Notifications ── */}
          {push.isSupported && (
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={clsx(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                    push.isSubscribed
                      ? "bg-primary-100 dark:bg-primary-900/40"
                      : "bg-slate-100 dark:bg-slate-800"
                  )}>
                    {push.isSubscribed
                      ? <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      : <BellOff className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                      Push Notifications
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {push.isSubscribed ? "On — study reminders active" : "Off — enable study reminders"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                  disabled={push.isLoading}
                  className={clsx(
                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50",
                    push.isSubscribed
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                  )}
                >
                  {push.isLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : push.isSubscribed
                    ? <><BellOff className="w-3.5 h-3.5" /> Disable</>
                    : <><Bell className="w-3.5 h-3.5" /> Enable</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Sign out ── */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => { onLogout(); onClose(); }}
              className="w-full flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>

          {/* ── Danger zone ── */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">Danger Zone</p>
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full flex items-center gap-2 text-sm text-red-600 hover:text-red-700 py-2 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-100 dark:border-red-900/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete my account
              </button>
            ) : (
              <div className="space-y-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    This permanently deletes your account, all saved cases, flashcard progress, and review history. This cannot be undone.
                  </p>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Type <strong>delete</strong> to confirm:</p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="delete"
                  className="input w-full text-sm rounded-xl"
                />
                {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowConfirm(false); setConfirmText(""); }}
                    className="flex-1 btn-secondary text-sm py-2 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={confirmText.toLowerCase() !== "delete" || deleting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
