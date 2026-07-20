"use client";

import { useState } from "react";
import { X, Loader2, Mail, Lock, User, Microscope, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

function isInAppBrowser() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /\bwv\b/.test(ua) ||
    /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua) ||
    /FB_IAB|FB4A|FBAN|FBIOS|FBDV|FBSV|FBSS/i.test(ua) ||
    /Instagram/i.test(ua) ||
    /Twitter/i.test(ua) ||
    /Line\//i.test(ua) ||
    /KAKAOTALK/i.test(ua) ||
    /GSA\//i.test(ua) ||
    /Snapchat/i.test(ua) ||
    /TikTok|musical_ly/i.test(ua) ||
    /Pinterest/i.test(ua) ||
    /LinkedIn/i.test(ua) ||
    /Discord/i.test(ua) ||
    /WhatsApp/i.test(ua) ||
    /Slack/i.test(ua)
  );
}

type Mode = "signin" | "signup" | "reset";

interface AuthModalProps {
  onClose?: () => void;
  onSuccess: () => void;
  gated?: boolean;
  // Optional contextual nudge shown above the form — used to make a sign-up
  // prompt feel like a reward ("you've hit your free limit") rather than a wall.
  contextMessage?: string;
  defaultMode?: Mode;
}

export default function AuthModal({ onClose, onSuccess, gated = false, contextMessage, defaultMode = "signin" }: AuthModalProps) {
  const [mode,     setMode]     = useState<Mode>(defaultMode);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState<string | null>(null);
  const [showTerms,   setShowTerms]   = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const clearMessages = () => { setError(null); setSuccess(null); };
  const switchMode = (m: Mode) => { setMode(m); clearMessages(); setAgreedTerms(false); setShowTerms(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    // Local validation happens before we talk to the server, so the catch
    // below only ever handles auth-service errors.
    if (mode === "signup") {
      if (!name.trim()) { setError("Please enter your name so we know what to call you."); return; }
      if (password.length < 6) { setError("Please pick a password with at least 6 characters."); return; }
      if (!agreedTerms) { setError("Please agree to the Terms of Use before creating an account."); return; }
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();

      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        setSuccess("Account created! Check your email to confirm, then sign in.");
        setMode("signin");

      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess("Password reset email sent — check your inbox.");
      }
    } catch (err: unknown) {
      // Translate auth-service errors into plain language — raw messages
      // (and anything we don't recognise) never reach the screen.
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Invalid login credentials")) setError("That email and password don't match. Double-check them, or reset your password below.");
      else if (msg.includes("User already registered")) setError("An account with this email already exists — sign in instead.");
      else if (msg.includes("Email not confirmed")) setError("Please confirm your email first — the link is in your inbox.");
      else if (/rate limit|too many/i.test(msg)) setError("Too many attempts — please wait a minute and try again.");
      else if (/fetch|network/i.test(msg)) setError("We couldn't reach PathoLearn. Please check your connection and try again.");
      else if (msg.toLowerCase().includes("password")) setError("Please pick a password with at least 6 characters.");
      else setError(
        mode === "signin"
          ? "We couldn't sign you in just now. Please try again — if it keeps happening, reset your password."
          : mode === "signup"
          ? "We couldn't create your account just now. Please try again in a moment."
          : "We couldn't send the reset email just now. Please try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={
      gated
        ? "min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-primary-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
        : "fixed inset-0 z-50 flex items-center justify-center p-4"
    }>
      {/* Backdrop — only in modal mode */}
      {!gated && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Modal / Card */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-fade-in">
        {/* Close — hidden in gated mode */}
        {!gated && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center">
            <Microscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-none">Patho</span>
            <span className="font-bold text-primary-600 text-lg leading-none">Learn</span>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {mode === "signin"
            ? "Sign in to track your progress and study history."
            : mode === "signup"
            ? "Free to join. Start learning histopathology with AI."
            : "Enter your email and we'll send a reset link."}
        </p>

        {/* Contextual nudge — e.g. "you've used your free analyses" */}
        {contextMessage && (
          <div className="flex items-start gap-2.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl p-3 mb-4 text-primary-700 dark:text-primary-300 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary-500" />
            {contextMessage}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Google OAuth */}
        {mode !== "reset" && (
          <>
            {isInAppBrowser() ? (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-1 text-amber-800 text-xs">
                <ExternalLink className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Open in your browser to use Google sign-in.</strong>{" "}
                  Tap the <span className="font-semibold">⋮ menu → Open in Chrome / Safari</span>, then sign in with Google.
                  Or use email &amp; password below.
                </span>
              </div>
            ) : (
            <button
              type="button"
              onClick={async () => {
                clearMessages();
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: window.location.origin },
                });
              }}
              className="w-full flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            )}

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name — signup only */}
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearMessages(); }}
                  placeholder="Your name"
                  className="input w-full pl-9 text-sm"
                  required
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
                placeholder="you@example.com"
                className="input w-full pl-9 text-sm"
                required
                autoFocus={mode !== "signup"}
              />
            </div>
          </div>

          {/* Password — not on reset */}
          {mode !== "reset" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-600">Password</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  className="input w-full pl-9 text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Terms checkbox — signup only */}
          {mode === "signup" && (
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary-600 accent-primary-600 flex-shrink-0"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                I have read and agree to the{" "}
                <button type="button" onClick={() => setShowTerms(t => !t)} className="text-primary-600 underline hover:text-primary-700">
                  Terms of Use & Privacy Policy
                </button>
                , and I understand that PathoLearn is for <strong>educational purposes only</strong> and not for clinical diagnosis.
              </span>
            </label>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || (mode === "signup" && !agreedTerms)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium mt-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait…</>
              : mode === "signin" ? "Sign in"
              : mode === "signup" ? "Create account"
              : "Send reset link"}
          </button>

          {/* Terms / disclaimer — shown on signup and signin */}
          {mode !== "reset" && (
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              {mode === "signup" && (
                <>By creating an account, you agree to our{" "}
                <button type="button" onClick={() => setShowTerms(t => !t)} className="underline hover:text-slate-600">
                  Terms of Use
                </button>
                {" & "}
                <button type="button" onClick={() => setShowTerms(t => !t)} className="underline hover:text-slate-600">
                  Privacy Policy
                </button>.<br /></>
              )}
              PathoLearn is for <strong>educational purposes only</strong> and must not be used for clinical diagnosis or patient care.
            </p>
          )}

          {/* Expandable terms panel */}
          {showTerms && (
            <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-4 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed space-y-2">
              <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">Terms of Use & Privacy Policy</p>
              <p><strong>Educational use only.</strong> PathoLearn is an AI-assisted histopathology learning tool intended solely for medical education. It is not a diagnostic tool and must not be used to guide clinical decisions or patient care.</p>
              <p><strong>AI limitations.</strong> Analyses generated by PathoLearn are produced by AI models and may be inaccurate, incomplete, or misleading. Always verify findings with a qualified pathologist.</p>
              <p><strong>Your data.</strong> Slides you upload are processed solely to generate the analysis shown to you. We do not share your data with third parties.</p>
              <p><strong>No liability.</strong> The developers of PathoLearn accept no responsibility for any clinical decisions made based on content from this platform.</p>
              <button type="button" onClick={() => setShowTerms(false)} className="text-primary-600 font-medium hover:underline mt-1">Close</button>
            </div>
          )}
        </form>

        {/* Mode switch */}
        <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => switchMode("signup")} className="text-primary-600 font-medium hover:underline">
                Sign up free
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => switchMode("signin")} className="text-primary-600 font-medium hover:underline">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
