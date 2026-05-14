import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { authedFetch } from "./authedFetch";

export interface ReferralData {
  code: string | null;
  referralLink: string | null;
  referralCount: number;
  loading: boolean;
}

// Module-level cache so the link is only fetched once per session across
// every component that uses this hook.
let cached: ReferralData | null = null;
let inflight: Promise<ReferralData> | null = null;
const listeners = new Set<(d: ReferralData) => void>();

async function fetchReferral(): Promise<ReferralData> {
  const res = await authedFetch("/api/referral-code");
  if (!res.ok) {
    return { code: null, referralLink: null, referralCount: 0, loading: false };
  }
  const data = await res.json();
  return {
    code: data.code ?? null,
    referralLink: data.referralLink ?? null,
    referralCount: typeof data.referralCount === "number" ? data.referralCount : 0,
    loading: false,
  };
}

export function useReferral(user: User | null): ReferralData {
  const [data, setData] = useState<ReferralData>(
    cached ?? { code: null, referralLink: null, referralCount: 0, loading: !!user }
  );

  useEffect(() => {
    if (!user) {
      setData({ code: null, referralLink: null, referralCount: 0, loading: false });
      return;
    }
    if (cached) { setData(cached); return; }

    const sub = (d: ReferralData) => setData(d);
    listeners.add(sub);

    if (!inflight) {
      inflight = fetchReferral().then(d => {
        cached = d;
        listeners.forEach(l => l(d));
        inflight = null;
        return d;
      });
    }

    return () => { listeners.delete(sub); };
  }, [user?.id]);

  return data;
}
