import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  trial_started_at: string;
  subscription_status: "trialing" | "active" | "canceled" | "expired";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

export interface SubscriptionState {
  loading: boolean;
  profile: Profile | null;
  isTrialing: boolean;
  isPremium: boolean;
  isCanceled: boolean;
  isExpired: boolean;
  daysLeft: number;
  trialEnd: Date | null;
  refetch: () => void;
}

const TRIAL_DAYS = 7;

export function useSubscription(user: User | null): SubscriptionState {
  const [loading, setLoading]   = useState(true);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [tick,    setTick]      = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data as Profile | null);
        setLoading(false);
      });
  }, [user?.id, tick]);

  const refetch = () => setTick(t => t + 1);

  if (loading || !profile) {
    return { loading, profile: null, isTrialing: false, isPremium: false, isCanceled: false, isExpired: false, daysLeft: 0, trialEnd: null, refetch };
  }

  const now      = new Date();
  const trialEnd = new Date(new Date(profile.trial_started_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const msLeft   = trialEnd.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  const periodEnd  = profile.current_period_end ? new Date(profile.current_period_end) : null;
  const isTrialing = profile.subscription_status === "trialing" && now < trialEnd;
  // Canceled-but-not-expired: still has access until period end
  const isCanceled = profile.subscription_status === "canceled" && !!periodEnd && now < periodEnd;
  const isPremium  = profile.subscription_status === "active" || isCanceled;
  const isExpired  = !isTrialing && !isPremium;

  return { loading, profile, isTrialing, isPremium, isCanceled, isExpired, daysLeft, trialEnd, refetch };
}
