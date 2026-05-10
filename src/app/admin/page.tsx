"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import {
  Users, Tag, Share2, BarChart2, RefreshCw,
  Plus, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Search,
  AlertCircle, Star, Check,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  active: number;
  trial: number;
  expired: number;
  mrr: number;
  referrals: number;
  activeCoupons: number;
}

interface User {
  id: string;
  email: string;
  subscription_status: string;
  plan: string | null;
  trial_end: string | null;
  subscription_end: string | null;
  referral_code: string | null;
  created_at: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Referral {
  id: string;
  status: string;
  discount_amount: number;
  created_at: string;
  referrer: { email: string; referral_code: string } | null;
  referee:  { email: string } | null;
}

interface Escalation {
  id: string;
  conversation: string;
  user_email: string | null;
  status: string;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
}

function dateStr(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    trial:     "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    expired:   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "coupons" | "referrals" | "support";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",  Icon: BarChart2 },
  { id: "users",     label: "Users",     Icon: Users },
  { id: "coupons",   label: "Coupons",   Icon: Tag },
  { id: "referrals", label: "Referrals", Icon: Share2 },
  { id: "support",   label: "Support",   Icon: AlertCircle },
];

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ token }: { token: string }) {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setStats(await r.json());
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-slate-500 dark:text-slate-400 py-8 text-center">Loading…</p>;
  if (!stats)  return <p className="text-red-500 py-8 text-center">Failed to load stats.</p>;

  const cards = [
    { label: "Active subscribers",  value: stats.active,        color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Trial users",         value: stats.trial,         color: "text-blue-600 dark:text-blue-400" },
    { label: "Expired / lapsed",    value: stats.expired,       color: "text-red-500 dark:text-red-400" },
    { label: "Est. MRR",            value: fmt(stats.mrr),      color: "text-violet-600 dark:text-violet-400" },
    { label: "Completed referrals", value: stats.referrals,     color: "text-amber-600 dark:text-amber-400" },
    { label: "Active coupons",      value: stats.activeCoupons, color: "text-sky-600 dark:text-sky-400" },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({ token }: { token: string }) {
  const [users, setUsers]   = useState<User[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery]   = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), ...(query ? { search: query } : {}) });
    const r = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) {
      const d = await r.json();
      setUsers(d.users);
      setTotal(d.total);
    }
    setLoading(false);
  }, [token, page, query]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Search by email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); setQuery(search); } }}
          />
        </div>
        <button
          onClick={() => { setPage(1); setQuery(search); }}
          className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
        >
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400 py-8 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Ref code</th>
                <th className="px-4 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No users found.</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{u.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.subscription_status ?? "—"} /></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">{u.plan ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{dateStr(u.subscription_end ?? u.trial_end)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{u.referral_code ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{dateStr(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 text-sm text-slate-500 dark:text-slate-400">
        <span>{total} total users</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Coupons tab ───────────────────────────────────────────────────────────────

const EMPTY_FORM = { code: "", discount_type: "percent" as "percent" | "fixed", discount_value: "", max_uses: "", expires_at: "" };

function CouponsTab({ token }: { token: string }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/coupons", { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const d = await r.json(); setCoupons(d.coupons); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function toggle(id: string, current: boolean) {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !current }),
    });
    load();
  }

  async function create() {
    setErr("");
    if (!form.code || !form.discount_value) { setErr("Code and discount value are required."); return; }
    setSaving(true);
    const r = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        code:           form.code,
        discount_type:  form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses:       form.max_uses ? Number(form.max_uses) : null,
        expires_at:     form.expires_at || null,
      }),
    });
    setSaving(false);
    if (r.ok) { setShowForm(false); setForm(EMPTY_FORM); load(); }
    else { const d = await r.json(); setErr(d.error ?? "Failed to create coupon."); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <Plus className="w-4 h-4" /> New coupon
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Create coupon</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Code</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 uppercase"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. LAUNCH20"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Discount type</label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as "percent" | "fixed" }))}
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (₦)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Discount value {form.discount_type === "percent" ? "(%)" : "(₦)"}
              </label>
              <input
                type="number" min="0"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === "percent" ? "20" : "500"}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Max uses (blank = unlimited)</label>
              <input
                type="number" min="1"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Expires at (blank = never)</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          </div>
          {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={create} disabled={saving}
              className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving…" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setErr(""); }}
              className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400 py-8 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Discount</th>
                <th className="px-4 py-3 text-left">Uses</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {coupons.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No coupons yet.</td></tr>
              )}
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono font-semibold text-violet-700 dark:text-violet-400">{c.code}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : fmt(c.discount_value)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {c.uses_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{dateStr(c.expires_at)}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.is_active ? "active" : "expired"} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(c.id, c.is_active)} title={c.is_active ? "Deactivate" : "Activate"}>
                      {c.is_active
                        ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                        : <ToggleLeft  className="w-5 h-5 text-slate-400" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Referrals tab ─────────────────────────────────────────────────────────────

function ReferralsTab({ token }: { token: string }) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/referrals?page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const d = await r.json(); setReferrals(d.referrals); setTotal(d.total); }
    setLoading(false);
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      {loading ? (
        <p className="text-slate-500 dark:text-slate-400 py-8 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Referrer</th>
                <th className="px-4 py-3 text-left">Ref code</th>
                <th className="px-4 py-3 text-left">Referee</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Discount</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {referrals.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No referrals yet.</td></tr>
              )}
              {referrals.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{r.referrer?.email ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-violet-600 dark:text-violet-400">{r.referrer?.referral_code ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{r.referee?.email ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.discount_amount ? fmt(r.discount_amount) : "—"}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{dateStr(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 text-sm text-slate-500 dark:text-slate-400">
        <span>{total} total referrals</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Support tab ──────────────────────────────────────────────────────────────

function SupportTab() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEscalation, setExpandedEscalation] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [escalRes, reviewRes] = await Promise.all([
        supabase.from("support_escalations").select("*").order("created_at", { ascending: false }),
        supabase.from("chatbot_reviews").select("*").order("created_at", { ascending: false }),
      ]);
      if (escalRes.data) setEscalations(escalRes.data);
      if (reviewRes.data) setReviews(reviewRes.data);
    } catch (err) {
      console.error("Failed to load support data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    await supabase.from("support_escalations").update({ status }).eq("id", id);
    load();
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Escalations</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{escalations.length}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
            {escalations.filter(e => e.status === "resolved").length} resolved
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Reviews</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{reviews.length}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">⭐ {avgRating} avg</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pending</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {escalations.filter(e => e.status === "pending").length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Escalations */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" /> Escalations
          </h3>
          {loading ? (
            <p className="text-slate-500 dark:text-slate-400 py-4">Loading…</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {escalations.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No escalations yet.</p>
              ) : (
                escalations.map(esc => (
                  <div key={esc.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{esc.user_email || "Unknown"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(esc.created_at).toLocaleDateString()}</p>
                      </div>
                      <StatusBadge status={esc.status} />
                    </div>
                    <button
                      onClick={() => setExpandedEscalation(expandedEscalation === esc.id ? null : esc.id)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 mb-2 w-full text-left"
                    >
                      {expandedEscalation === esc.id ? "▼ Hide" : "▶ View message"}
                    </button>
                    {expandedEscalation === esc.id && (
                      <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs text-slate-700 dark:text-slate-300 mb-2 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 whitespace-pre-wrap font-mono">
                        {esc.conversation}
                      </div>
                    )}
                    {esc.status === "pending" ? (
                      <button
                        onClick={() => updateStatus(esc.id, "resolved")}
                        className="w-full text-xs py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      >
                        <Check className="w-3 h-3 inline mr-1" /> Mark Resolved
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(esc.id, "pending")}
                        className="w-full text-xs py-1.5 rounded bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                      >
                        <AlertCircle className="w-3 h-3 inline mr-1" /> Mark Pending
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" /> Reviews
          </h3>
          {loading ? (
            <p className="text-slate-500 dark:text-slate-400 py-4">Loading…</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reviews.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No reviews yet.</p>
              ) : (
                reviews.map(review => (
                  <div key={review.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className="w-3.5 h-3.5"
                          fill={star <= review.rating ? "#f59e0b" : "none"}
                          stroke={star <= review.rating ? "#f59e0b" : "#cbd5e1"}
                        />
                      ))}
                    </div>
                    {review.text && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 mb-1 line-clamp-2">{review.text}</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab]           = useState<Tab>("overview");
  const [session, setSession]   = useState<Session | null>(null);
  const [allowed, setAllowed]   = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) { setAllowed(false); return; }
      fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${s.access_token}` } })
        .then(r => setAllowed(r.ok))
        .catch(() => setAllowed(false));
    });
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Checking access…</p>
      </div>
    );
  }

  if (!allowed || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">Access denied</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">You are not authorised to view this page.</p>
        </div>
      </div>
    );
  }

  const token = session.access_token;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">PathoLearn Admin</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{session.user?.email}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/"))}
          className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 mb-8 w-fit flex-wrap">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                tab === id
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "overview"  && <OverviewTab  token={token} />}
        {tab === "users"     && <UsersTab     token={token} />}
        {tab === "coupons"   && <CouponsTab   token={token} />}
        {tab === "referrals" && <ReferralsTab token={token} />}
        {tab === "support"   && <SupportTab />}
      </div>
    </div>
  );
}
