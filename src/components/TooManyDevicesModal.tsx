"use client";

import { Monitor, LogOut } from "lucide-react";

interface Props {
  deviceCount: number;
  onKickAndClaim: () => void;
  onLogout: () => void;
}

export default function TooManyDevicesModal({ deviceCount, onKickAndClaim, onLogout }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
          <Monitor className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Too many active devices
        </h2>

        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
          Your account is currently active on{" "}
          <strong className="text-slate-700 dark:text-slate-300">{deviceCount} devices</strong>.{" "}
          PathoLearn allows a maximum of <strong className="text-slate-700 dark:text-slate-300">2 simultaneous sessions</strong>.
          Log out the oldest session to use this device, or sign out here.
        </p>

        <div className="space-y-3">
          <button
            onClick={onKickAndClaim}
            className="w-full py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-colors"
          >
            Log out oldest session &amp; continue
          </button>

          <button
            onClick={onLogout}
            className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out of this device
          </button>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-5 leading-relaxed">
          The oldest inactive session will be removed. That device will be prompted to sign in again on next use.
        </p>
      </div>
    </div>
  );
}
