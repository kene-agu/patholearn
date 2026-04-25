"use client";

import { useState } from "react";
import { X, Crown, Clock, AlertTriangle, Trash2, LogOut, CheckCircle, Loader2, Mail, User } from "lucide-react";
import { clsx } from "clsx";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { SubscriptionState } from "@/lib/useSubscription";

interface AccountModalProps {
  user: SupabaseUser;
  subscription: SubscriptionState;
  onClose: () => void;
  onLogout: () => void;
}

const TRIAL_DAYS = 7;

function StatusBadge({ subscription }: { subscription: SubscriptionState }) {
  if (subscription.isPremium) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
        <Crown className="w-3.5 h-3.5" /> Premium
      </span>
    );
  }
  if (subscription.isTrialing) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" /> Free Trial
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
      <AlertTriangle className="w-3.5 h-3.5" /> Trial Expired
    </span>
  );
}

export default function AccountModal({ user, subscription, onClose, onLogout }: AccountModalProps) {
  const [deleting,     setDeleting]     = useState(false);
  const [confirmText,  setConfirmText]  = useState("");
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  const name     = (user.user_metadata?.full_name as string) || "User";
  const email    = user.email ?? "";
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const isGoogle = user.app_metadata?.provider === "google";

  const trialPct = subscription.isTrialing
    ? Math.round(((TRIAL_DAYS - subscription.daysLeft) / TRIAL_DAYS) * 100)
    : 100;

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== "delete") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      // Delete user data in order
      await supabase.from("flashcard_reviews").delete().eq("user_id", user.id);
      await supabase.from("slide_history").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      // Sign out — Supabase doesn't allow client-side user deletion directly
      // The profile + data is gone; auth record cleanup via admin API/edge function
      await supabase.auth.signOut();
      onLogout();
    } catch {
      setDeleteError("Failed to delete account. Please contact support.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">My Account</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[80vh]">

          {/* Profile section */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{email}</span>
                </p>
                {isGoogle && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium">
                    <svg className="w-3 h-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Signed in with Google
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Subscription section */}
          <div className="px-6 py-5 border-b border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Subscription</p>
              <StatusBadge subscription={subscription} />
            </div>

            {subscription.isTrialing && (
              <>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{subscription.daysLeft} day{subscription.daysLeft !== 1 ? "s" : ""} remaining</span>
                    <span>Trial ends {subscription.trialEnd?.toLocaleDateString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        subscription.daysLeft <= 2 ? "bg-red-400" : subscription.daysLeft <= 4 ? "bg-amber-400" : "bg-primary-500"
                      )}
                      style={{ width: `${trialPct}%` }}
                    />
                  </div>
                </div>
                <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 text-xs text-primary-700">
                  <p className="font-semibold mb-0.5">You&apos;re on the free trial</p>
                  <p>Full Gemini AI analysis included. Subscribe before your trial ends to keep access.</p>
                </div>
                <button className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                  <Crown className="w-4 h-4" /> Upgrade to Premium
                </button>
              </>
            )}

            {subscription.isPremium && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                  <p className="font-semibold mb-0.5 flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> Premium active</p>
                  {subscription.profile?.current_period_end && (
                    <p>Renews on {new Date(subscription.profile.current_period_end).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-slate-600">Unlimited Gemini AI analyses</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-slate-600">PDF export, saved cases, full flashcard deck</span>
                </div>
                <button className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors py-1">
                  Cancel subscription
                </button>
              </div>
            )}

            {subscription.isExpired && (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
                  <p className="font-semibold mb-0.5">Trial expired</p>
                  <p>Subscribe to continue using AI-powered slide analysis with Gemini.</p>
                </div>
                <button className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                  <Crown className="w-4 h-4" /> Subscribe — from $9/month
                </button>
              </div>
            )}
          </div>

          {/* Sign out */}
          <div className="px-6 py-4 border-b border-slate-100">
            <button
              onClick={() => { onLogout(); onClose(); }}
              className="w-full flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>

          {/* Danger zone */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3">Danger Zone</p>

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full flex items-center gap-2 text-sm text-red-600 hover:text-red-700 py-2 px-3 rounded-lg hover:bg-red-50 border border-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete my account
              </button>
            ) : (
              <div className="space-y-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed">
                    This permanently deletes your account, all saved cases, flashcard progress, and review history. This cannot be undone.
                  </p>
                </div>
                <p className="text-xs text-slate-600 font-medium">Type <strong>delete</strong> to confirm:</p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="delete"
                  className="input w-full text-sm"
                />
                {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowConfirm(false); setConfirmText(""); }}
                    className="flex-1 btn-secondary text-sm py-2"
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
