import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// ── Config ──────────────────────────────────────────────────────────────────

const MAX_SESSIONS   = 2;           // max simultaneous devices per account
const HEARTBEAT_MS   = 4 * 60 * 1000; // update last_seen every 4 minutes
const SESSION_TTL_M  = 10;          // sessions silent for >10 min → considered inactive

// ── Device identity ─────────────────────────────────────────────────────────

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem("pl_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("pl_device_id", id);
    }
    return id;
  } catch {
    // localStorage blocked (private mode, etc.) — generate ephemeral ID
    return crypto.randomUUID();
  }
}

function getDeviceHint(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua))          return "Android";
  if (/Mac/i.test(ua))              return "Mac";
  if (/Windows/i.test(ua))          return "Windows";
  if (/Linux/i.test(ua))            return "Linux";
  return "Browser";
}

// ── Types ───────────────────────────────────────────────────────────────────

export type SessionStatus =
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "too_many"; deviceCount: number };

// ── Hook ────────────────────────────────────────────────────────────────────

export function useSessionGuard(user: User | null): {
  sessionStatus: SessionStatus;
  kickAndClaim:  () => Promise<void>;
} {
  const [sessionStatus, setStatus] = useState<SessionStatus>({ kind: "checking" });

  // ── Register / verify this device ─────────────────────────────────────────
  const register = useCallback(async (u: User) => {
    const deviceId   = getOrCreateDeviceId();
    const deviceHint = getDeviceHint();
    const now        = new Date().toISOString();

    // 1. Upsert our session row
    const { error: upsertErr } = await supabase
      .from("user_sessions")
      .upsert(
        { user_id: u.id, device_id: deviceId, device_hint: deviceHint, last_seen: now },
        { onConflict: "user_id,device_id" }
      );

    if (upsertErr) {
      // Table may not exist yet — fail open so the app still works
      console.warn("[session] upsert failed (table may be missing):", upsertErr.message);
      setStatus({ kind: "ok" });
      return;
    }

    // 2. Count distinct active sessions
    const cutoff = new Date(Date.now() - SESSION_TTL_M * 60 * 1000).toISOString();
    const { data, error: selectErr } = await supabase
      .from("user_sessions")
      .select("device_id")
      .eq("user_id", u.id)
      .gte("last_seen", cutoff);

    if (selectErr || !data) {
      setStatus({ kind: "ok" });
      return;
    }

    const activeDevices = new Set(data.map((r) => r.device_id));

    if (activeDevices.size > MAX_SESSIONS) {
      setStatus({ kind: "too_many", deviceCount: activeDevices.size });
    } else {
      setStatus({ kind: "ok" });
    }
  }, []);

  // ── Kick oldest session(s) and claim a slot ────────────────────────────────
  const kickAndClaim = useCallback(async () => {
    if (!user) return;
    const deviceId = getOrCreateDeviceId();
    const cutoff   = new Date(Date.now() - SESSION_TTL_M * 60 * 1000).toISOString();

    // Fetch active sessions sorted oldest → newest
    const { data } = await supabase
      .from("user_sessions")
      .select("device_id, last_seen")
      .eq("user_id", user.id)
      .gte("last_seen", cutoff)
      .order("last_seen", { ascending: true });

    if (data && data.length > 0) {
      // Delete the oldest (data[0]) — not our own device
      const toDelete = data
        .filter((r) => r.device_id !== deviceId)
        .slice(0, Math.max(0, data.length - MAX_SESSIONS + 1))
        .map((r) => r.device_id);

      if (toDelete.length > 0) {
        await supabase
          .from("user_sessions")
          .delete()
          .eq("user_id", user.id)
          .in("device_id", toDelete);
      }
    }

    setStatus({ kind: "ok" });
  }, [user]);

  // ── Run on auth change ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setStatus({ kind: "checking" });
      return;
    }
    register(user);
  }, [user, register]);

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const tick = async () => {
      const deviceId = getOrCreateDeviceId();
      await supabase
        .from("user_sessions")
        .update({ last_seen: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("device_id", deviceId);
    };
    const id = setInterval(tick, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [user]);

  return { sessionStatus, kickAndClaim };
}
