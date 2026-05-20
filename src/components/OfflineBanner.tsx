"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Fixed bottom banner that appears when the browser loses network.
 * Listens to the standard `online` / `offline` window events.
 * Shows a brief "Back online" confirmation when the connection returns.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    // navigator.onLine may differ from initial SSR render — sync once mounted
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      setShowRestored(true);
      window.setTimeout(() => setShowRestored(false), 3000);
    };
    const handleOffline = () => {
      setOnline(false);
      setShowRestored(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !showRestored) return null;

  const offline = !online;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] " +
        "px-4 py-2.5 rounded-full shadow-lg text-sm font-medium " +
        "flex items-center gap-2 max-w-[90vw] " +
        (offline
          ? "bg-amber-500 text-white"
          : "bg-emerald-600 text-white")
      }
    >
      {offline ? (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>You&apos;re offline — some features won&apos;t work until you reconnect.</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 flex-shrink-0" />
          <span>Back online.</span>
        </>
      )}
    </div>
  );
}
