"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/authedFetch";
import { CheckCircle, XCircle, Loader2, Microscope } from "lucide-react";

type State = "verifying" | "success" | "failed";

function PaymentSuccess() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [state, setState] = useState<State>("verifying");

  useEffect(() => {
    // Flutterwave redirects with ?status=successful&tx_ref=xxx&transaction_id=xxx
    const status         = searchParams.get("status");
    const transaction_id = searchParams.get("transaction_id");

    if (status !== "successful" || !transaction_id) {
      setState("failed");
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setState("failed"); return; }

      const res = await authedFetch("/api/verify-payment", {
        method: "POST",
        body:   JSON.stringify({ transaction_id, userId: session.user.id }),
      });

      if (res.ok) {
        setState("success");
        setTimeout(() => router.push("/"), 3000);
      } else {
        setState("failed");
      }
    });
  }, [searchParams, router]);

  return (
    <>
      {state === "verifying" && (
        <>
          <Loader2 className="w-14 h-14 text-primary-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Verifying payment…</h2>
          <p className="text-sm text-slate-500">Please wait while we confirm your subscription.</p>
        </>
      )}

      {state === "success" && (
        <>
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">You&apos;re now Premium!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Your subscription is active. Enjoy unlimited AI slide analysis.
          </p>
          <p className="text-xs text-slate-400">Redirecting you back to PathoLearn…</p>
        </>
      )}

      {state === "failed" && (
        <>
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Payment not confirmed</h2>
          <p className="text-sm text-slate-500 mb-6">
            We couldn&apos;t verify your payment. If you were charged, please contact support.
          </p>
          <button onClick={() => router.push("/")} className="btn-primary w-full py-2.5 text-sm">
            Back to PathoLearn
          </button>
        </>
      )}
    </>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-8 text-center">

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center">
            <Microscope className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">Patho<span className="text-primary-600">Learn</span></span>
        </div>

        <Suspense fallback={
          <>
            <Loader2 className="w-14 h-14 text-primary-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Loading…</h2>
          </>
        }>
          <PaymentSuccess />
        </Suspense>

      </div>
    </div>
  );
}
