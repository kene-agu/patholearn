"use client";

/**
 * React class-based error boundary.
 * Wraps the entire app so any unhandled render crash shows a friendly
 * recovery screen instead of a blank white page.
 */

import React from "react";

interface Props  { children: React.ReactNode }
interface State  { hasError: boolean; message: string }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[PathoLearn] Unhandled render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-6 text-center">
          <p className="text-5xl mb-5">⚠️</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Something went wrong
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1 max-w-sm leading-relaxed">
            PathoLearn hit an unexpected error. Your progress is safe — just reload to continue.
          </p>
          {this.state.message && (
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-6 max-w-sm break-all">
              {this.state.message}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors"
            >
              Reload app
            </button>
            <button
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
