"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { authedFetch } from "@/lib/authedFetch";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(user: User | null): UsePushNotificationsReturn {
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  // Check current subscription state on mount
  useEffect(() => {
    if (!isSupported || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setIsSubscribed(!!existing);
      } catch {
        // Ignore — unsupported or permission denied
      }
    })();

    return () => { cancelled = true; };
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    setIsLoading(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("[usePushNotifications] Notification permission denied");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("[usePushNotifications] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await authedFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) {
        console.error("[usePushNotifications] Failed to save subscription:", await res.text());
        await subscription.unsubscribe();
        return;
      }

      setIsSubscribed(true);
    } catch (err) {
      console.error("[usePushNotifications] subscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await authedFetch("/api/push/subscribe", {
          method: "DELETE",
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error("[usePushNotifications] unsubscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
