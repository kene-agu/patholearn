"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, Loader2, FlaskConical } from "lucide-react";

type State = "verifying" | "success" | "failed";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [state, setState] = useState<State>("verifying");

  useEffect(() => {
    const status        = searchParams.get("status");
    const transactionId = searchParams.get("transaction_id");

    if (status !== "successful" || !transactionId) {
      setState("failed");
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setState("failed"); return; }

      const res = await fetch("/api/verify-payment", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ transactionId, userId: session.user.id }),
      });

      if (res.ok) {
        setState("success");
        // Redirect to home after 3 seconds
        setTimeout(() => router.push("/"), 3000);
      } else {
        setState("failed");
      }
    });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">Patho<span className="text-primary-600">Learn</span></span>
        </div>

        {state === "verifying" && (
          <>
            <Loader2 className="w-14 h-14 text-primary-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying payment…</h2>
            <p className="text-sm text-slate-500">Please wait while we confirm your subscription.</p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">You&apos;re now Premium!</h2>
            <p className="text-sm text-slate-500 mb-6">
              Your subscription is active. Enjoy unlimited AI slide analysis.
            </p>
            <p className="text-xs text-slate-400">Redirecting you back to PathoLearn…</p>
          </>
        )}

        {state === "failed" && (
          <>
            <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Payment not confirmed</h2>
            <p className="text-sm text-slate-500 mb-6">
              We couldn&apos;t verify your payment. If you were charged, please contact support.
            </p>
            <button
              onClick={() => router.push("/")}
              className="btn-primary w-full py-2.5 text-sm"
            >
              Back to PathoLearn
            </button>
          </>
        )}

      </div>
    </div>
  );
}
