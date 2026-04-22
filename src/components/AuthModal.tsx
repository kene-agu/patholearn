"use client";

import { useState } from "react";
import { X, Loader2, Mail, Lock, User, FlaskConical, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "signin" | "signup" | "reset";

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode,     setMode]     = useState<Mode>("signin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);

  const clearMessages = () => { setError(null); setSuccess(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();

      } else if (mode === "signup") {
        if (!name.trim()) throw new Error("Please enter your name.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");

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
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      // Make Supabase error messages friendlier
      if (msg.includes("Invalid login credentials")) setError("Incorrect email or password.");
      else if (msg.includes("User already registered")) setError("An account with this email already exists. Sign in instead.");
      else if (msg.includes("Email not confirmed")) setError("Please confirm your email first — check your inbox.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-lg leading-none">Patho</span>
            <span className="font-bold text-primary-600 text-lg leading-none">Learn</span>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {mode === "signin"
            ? "Sign in to track your progress and study history."
            : mode === "signup"
            ? "Free to join. Start learning histopathology with AI."
            : "Enter your email and we'll send a reset link."}
        </p>

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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name — signup only */}
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Full name</label>
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
                    onClick={() => { setMode("reset"); clearMessages(); }}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium mt-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait…</>
              : mode === "signin" ? "Sign in"
              : mode === "signup" ? "Create account"
              : "Send reset link"}
          </button>
        </form>

        {/* Mode switch */}
        <div className="mt-5 text-center text-sm text-slate-500">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => { setMode("signup"); clearMessages(); }} className="text-primary-600 font-medium hover:underline">
                Sign up free
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("signin"); clearMessages(); }} className="text-primary-600 font-medium hover:underline">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
