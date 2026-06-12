"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import {
  Users, Tag, Share2, BarChart2, RefreshCw,
  Plus, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Search,
  AlertCircle, Star, Check, Mail, Send, Loader2, Bell,
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

interface Sharer {
  id: string;
  email: string;
  referral_code: string;
  subscription_status: string;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Escalation {
  id: string;
  conversation: string;
  messages: Message[];
  user_email: string | null;
  status: string;
  created_at: string;
}

interface Reply {
  id: string;
  escalation_id: string;
  message: string;
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
  return new Date(s).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
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

type Tab = "overview" | "users" | "coupons" | "referrals" | "support" | "broadcast" | "push" | "emails";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",  Icon: BarChart2 },
  { id: "users",     label: "Users",     Icon: Users },
  { id: "coupons",   label: "Coupons",   Icon: Tag },
  { id: "referrals", label: "Referrals", Icon: Share2 },
  { id: "support",   label: "Support",   Icon: AlertCircle },
  { id: "broadcast", label: "Broadcast", Icon: Mail },
  { id: "push",      label: "Push",      Icon: Bell },
  { id: "emails",    label: "Emails",    Icon: Send },
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
  const [refTotal, setRefTotal]   = useState(0);
  const [refPage,  setRefPage]    = useState(1);

  const [sharers,     setSharers]     = useState<Sharer[]>([]);
  const [sharerTotal, setSharerTotal] = useState(0);
  const [sharerPage,  setSharerPage]  = useState(1);

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [convRes, sharersRes] = await Promise.all([
      fetch(`/api/admin/referrals?page=${refPage}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/admin/referrals?sharers=true&page=${sharerPage}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (convRes.ok) {
      const d = await convRes.json();
      setReferrals(d.referrals);
      setRefTotal(d.total);
    }
    if (sharersRes.ok) {
      const d = await sharersRes.json();
      setSharers(d.sharers);
      setSharerTotal(d.total);
    }
    setLoading(false);
  }, [token, refPage, sharerPage]);

  useEffect(() => { load(); }, [load]);

  const refPages    = Math.max(1, Math.ceil(refTotal    / 20));
  const sharerPages = Math.max(1, Math.ceil(sharerTotal / 20));

  return (
    <div className="space-y-8">
      {loading && <p className="text-slate-500 dark:text-slate-400 py-8 text-center">Loading…</p>}

      {/* ── Active sharers ─────────────────────────────────────────────── */}
      {!loading && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-violet-500" />
            Users actively sharing ({sharerTotal})
            <span className="text-xs font-normal text-slate-400 ml-1">— have generated their referral link</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Referral code</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {sharers.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No users with referral codes yet.</td></tr>
                )}
                {sharers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{s.email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-violet-600 dark:text-violet-400">{s.referral_code}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.subscription_status} /></td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{dateStr(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-sm text-slate-500 dark:text-slate-400">
            <span>{sharerTotal} users sharing</span>
            <div className="flex items-center gap-2">
              <button disabled={sharerPage <= 1} onClick={() => setSharerPage(p => p - 1)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {sharerPage} / {sharerPages}</span>
              <button disabled={sharerPage >= sharerPages} onClick={() => setSharerPage(p => p + 1)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Completed conversions ──────────────────────────────────────── */}
      {!loading && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            Completed conversions ({refTotal})
            <span className="text-xs font-normal text-slate-400 ml-1">— someone paid using their code</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Referrer</th>
                  <th className="px-4 py-3 text-left">Ref code</th>
                  <th className="px-4 py-3 text-left">Referee (paid)</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {referrals.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No conversions yet.</td></tr>
                )}
                {referrals.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{r.referrer?.email ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-violet-600 dark:text-violet-400">{r.referrer?.referral_code ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{r.referee?.email ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{dateStr(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-sm text-slate-500 dark:text-slate-400">
            <span>{refTotal} conversions</span>
            <div className="flex items-center gap-2">
              <button disabled={refPage <= 1} onClick={() => setRefPage(p => p - 1)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {refPage} / {refPages}</span>
              <button disabled={refPage >= refPages} onClick={() => setRefPage(p => p + 1)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Broadcast tab ────────────────────────────────────────────────────────────

function BroadcastTab({ token }: { token: string }) {
  const [subject,  setSubject]  = useState("");
  const [headline, setHeadline] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl,   setCtaUrl]   = useState("");
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState<{ sent: number; total?: number; preview?: boolean; to?: string; id?: string; errors?: string[] } | null>(null);
  const [error,    setError]    = useState("");

  async function send(preview: boolean) {
    if (!subject.trim() || !headline.trim() || !bodyText.trim()) {
      setError("Subject, headline, and body text are required.");
      return;
    }
    setError("");
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          subject,
          headline,
          bodyText,
          ctaLabel: ctaLabel.trim() || undefined,
          ctaUrl:   ctaUrl.trim()   || undefined,
          preview,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed to send"); return; }
      setResult(d);
    } catch {
      setError("Network error — could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Send an email to <strong className="text-slate-700 dark:text-slate-200">all registered users</strong>. Use &ldquo;Preview&rdquo; first — it sends only to your admin email so you can check formatting.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Subject</label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="e.g. Important update from PathoLearn"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Headline</label>
        <input
          value={headline}
          onChange={e => setHeadline(e.target.value)}
          placeholder="e.g. Exciting new features just landed"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
          Body text <span className="font-normal normal-case">(HTML supported)</span>
        </label>
        <textarea
          value={bodyText}
          onChange={e => setBodyText(e.target.value)}
          rows={8}
          placeholder={`<p>Hi there,</p>\n<p>We just launched...</p>`}
          className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
        />
        <p className="text-xs text-slate-400 mt-1">Wrapped in the PathoLearn email template automatically.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">CTA label <span className="font-normal normal-case">(optional)</span></label>
          <input
            value={ctaLabel}
            onChange={e => setCtaLabel(e.target.value)}
            placeholder="e.g. Try it now"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">CTA URL <span className="font-normal normal-case">(optional)</span></label>
          <input
            value={ctaUrl}
            onChange={e => setCtaUrl(e.target.value)}
            placeholder="https://getpatholearn.com/..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <div className={`rounded-lg px-4 py-3 text-sm space-y-1 ${result.preview ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"}`}>
          <p className="font-medium">
            {result.preview
              ? `Preview sent to ${result.to ?? "your admin email"}. Check inbox & spam, then send to all.`
              : `Sent to ${result.sent} of ${result.total} users.`}
          </p>
          {result.id && (
            <p className="text-xs opacity-75">Resend ID: {result.id}</p>
          )}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-0.5">
              <p className="font-semibold">{result.errors.length} failed:</p>
              {result.errors.map((e, i) => <p key={i} className="opacity-80">{e}</p>)}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => send(true)}
          disabled={sending}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Preview (send to me)
        </button>
        <button
          onClick={() => {
            if (!window.confirm(`Send to ALL users? This cannot be undone.`)) return;
            send(false);
          }}
          disabled={sending}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send to all users
        </button>
      </div>
    </div>
  );
}

// ── Support tab ──────────────────────────────────────────────────────────────

function SupportTab() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEsc, setSelectedEsc] = useState<Escalation | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

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

  const loadReplies = useCallback(async (escalationId: string) => {
    try {
      const { data } = await supabase
        .from("support_replies")
        .select("*")
        .eq("escalation_id", escalationId)
        .order("created_at", { ascending: true });
      if (data) setReplies(data);
    } catch (err) {
      console.error("Failed to load replies:", err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    await supabase.from("support_escalations").update({ status }).eq("id", id);
    load();
  }

  async function sendReply() {
    if (!replyText.trim() || !selectedEsc) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/escalations/${selectedEsc.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        loadReplies(selectedEsc.id);
      }
    } catch (err) {
      console.error("Failed to send reply:", err);
    }
    setSending(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Escalations List */}
        <div className="lg:col-span-1">
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
                  <button
                    key={esc.id}
                    onClick={() => { setSelectedEsc(esc); loadReplies(esc.id); }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedEsc?.id === esc.id
                        ? "bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{esc.user_email || "Unknown"}</p>
                      <StatusBadge status={esc.status} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(esc.created_at).toLocaleDateString()}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Conversation View */}
        <div className="lg:col-span-2">
          {selectedEsc ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 h-full flex flex-col">
              <div className="mb-4">
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{selectedEsc.user_email}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(selectedEsc.created_at).toLocaleString()}</p>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                {selectedEsc.messages && selectedEsc.messages.length > 0 ? (
                  selectedEsc.messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          msg.role === "user"
                            ? "bg-violet-600 text-white rounded-br-none"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No messages in conversation.</p>
                )}

                {/* Admin Replies */}
                {replies.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-600 pt-3 mt-3">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Your replies:</p>
                    {replies.map(reply => (
                      <div key={reply.id} className="mb-2 flex justify-start">
                        <div className="max-w-xs px-3 py-2 rounded-lg text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 rounded-bl-none">
                          {reply.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Input */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply…"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="flex-1 text-xs py-2 px-3 rounded bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 font-medium transition-colors"
                  >
                    {sending ? "Sending…" : "Send Reply"}
                  </button>
                  {selectedEsc.status === "pending" ? (
                    <button
                      onClick={() => updateStatus(selectedEsc.id, "resolved")}
                      className="text-xs py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
                    >
                      <Check className="w-3 h-3 inline mr-1" /> Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(selectedEsc.id, "pending")}
                      className="text-xs py-2 px-3 rounded bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 h-full flex items-center justify-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Select an escalation to view the conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" /> Recent Reviews
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reviews.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No reviews yet.</p>
          ) : (
            reviews.slice(0, 4).map(review => (
              <div key={review.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className="w-3 h-3"
                      fill={star <= review.rating ? "#f59e0b" : "none"}
                      stroke={star <= review.rating ? "#f59e0b" : "#cbd5e1"}
                    />
                  ))}
                </div>
                {review.text && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 mb-1">{review.text}</p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Push tab ─────────────────────────────────────────────────────────────────

function PushTab({ token }: { token: string }) {
  const [title,   setTitle]   = useState("");
  const [body,    setBody]    = useState("");
  const [url,     setUrl]     = useState("");
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState<{ sent: number; failed: number; preview?: boolean; hint?: string; errors?: { statusCode?: number; message: string }[] } | null>(null);
  const [error,   setError]   = useState("");

  async function send(preview: boolean) {
    if (!title.trim() || !body.trim()) { setError("Title and body are required."); return; }
    setError("");
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ title, body, url: url.trim() || "/", preview }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed to send"); return; }
      setResult(d);
    } catch {
      setError("Network error — could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Send a push notification to all users who have enabled notifications on their device.
        Use &ldquo;Preview&rdquo; first — it delivers only to your own device so you can check how it looks.
      </p>

      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. New feature available!"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Body</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          placeholder="e.g. Check out what we just shipped"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
          Link when tapped <span className="font-normal normal-case">(optional — defaults to home)</span>
        </label>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="/atlas"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (() => {
        const { sent, failed, preview } = result;
        const errorDetail = result.errors?.length
          ? result.errors.map(e => (e.statusCode ? `${e.statusCode} ${e.message}` : e.message)).join("; ")
          : null;

        let tone: "emerald" | "amber" | "red";
        let message: string;

        if (failed > 0 && sent === 0) {
          // Every send was rejected by the push service.
          tone = "red";
          message = `Couldn't deliver to any device${errorDetail ? ` — ${errorDetail}` : "."}`;
        } else if (failed > 0) {
          // Some devices got it, some didn't — don't pretend it fully worked.
          tone = "amber";
          message = `Delivered to ${sent} device${sent !== 1 ? "s" : ""}, but ${failed} failed${errorDetail ? ` — ${errorDetail}` : "."}`;
        } else if (sent === 0) {
          tone = "amber";
          message = result.hint ?? "No devices found. Enable notifications on the device first.";
        } else if (preview) {
          tone = "emerald";
          message = `Preview delivered to your device${sent > 1 ? `s (${sent})` : ""}. If it doesn't appear, check that notifications are enabled for PathoLearn in your phone's system settings.`;
        } else {
          tone = "emerald";
          message = `Sent to ${sent} device${sent !== 1 ? "s" : ""}.`;
        }

        const toneClass = {
          emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          amber:   "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          red:     "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
        }[tone];

        return (
          <div className={`rounded-lg px-4 py-3 text-sm border ${toneClass}`}>
            <p className="font-medium">{message}</p>
          </div>
        );
      })()}

      <div className="flex gap-3">
        <button
          onClick={() => send(true)}
          disabled={sending}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Preview (send to me)
        </button>
        <button
          onClick={() => {
            if (!window.confirm("Send to ALL subscribed users? This cannot be undone.")) return;
            send(false);
          }}
          disabled={sending}
          className="flex items-center gap-2 px-5 py-2.5 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending…" : "Send to all users"}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

// ── Emails tab ────────────────────────────────────────────────────────────────

type EmailTemplateKind = "welcome" | "paid" | "cancelled";

interface EmailTemplate {
  kind: EmailTemplateKind;
  subject: string;
  html: string;
  updated_at: string;
}

const EMAIL_KIND_LABEL: Record<EmailTemplateKind, string> = {
  welcome:   "Welcome — sent after first sign-in",
  paid:      "Payment confirmation — sent after successful subscribe",
  cancelled: "Cancellation — sent after the user cancels",
};

const EMAIL_VARS: Record<EmailTemplateKind, string[]> = {
  welcome:   ["{{name}}", "{{appUrl}}"],
  paid:      ["{{name}}", "{{plan}}", "{{amount}}", "{{nextBilling}}", "{{appUrl}}"],
  cancelled: ["{{name}}", "{{periodEnd}}", "{{appUrl}}"],
};

function EmailsTab({ token }: { token: string }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<EmailTemplateKind | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editHtml,    setEditHtml]    = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/email-templates", { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) {
      const d = await r.json();
      setTemplates(d.templates as EmailTemplate[]);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (tpl: EmailTemplate) => {
    setSelected(tpl.kind);
    setEditSubject(tpl.subject);
    setEditHtml(tpl.html);
    setError(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const r = await fetch(`/api/admin/email-templates/${selected}`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ subject: editSubject, html: editHtml }),
    });
    if (r.ok) {
      await load();
      setSelected(null);
    } else {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
    }
    setSaving(false);
  };

  if (loading) return <p className="text-slate-500 dark:text-slate-400 py-8 text-center">Loading…</p>;

  if (selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to templates
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Editing</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{EMAIL_KIND_LABEL[selected]}</h3>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Available variables</p>
          <div className="flex flex-wrap gap-2">
            {EMAIL_VARS[selected].map(v => (
              <code key={v} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs">{v}</code>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Use these in your subject or HTML — they get replaced with real values when the email goes out.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Subject</label>
          <input
            value={editSubject}
            onChange={e => setEditSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">HTML body</label>
          <textarea
            value={editHtml}
            onChange={e => setEditHtml(e.target.value)}
            rows={24}
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 font-mono"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !editSubject.trim() || !editHtml.trim()}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save</>}
          </button>
          <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
        Edit the wording and HTML of the three automatic transactional emails. Sent automatically when each trigger fires — you don't ship them manually.
      </p>
      {templates.length === 0 && (
        <p className="text-sm text-slate-500 py-8 text-center">No templates found. Did the 20260612 migration run?</p>
      )}
      {templates.map(t => (
        <button
          key={t.kind}
          onClick={() => handleEdit(t)}
          className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
                {EMAIL_KIND_LABEL[t.kind]}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{t.subject}</p>
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">
              Updated {new Date(t.updated_at).toLocaleDateString()}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

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

        {tab === "overview"  && <OverviewTab   token={token} />}
        {tab === "users"     && <UsersTab      token={token} />}
        {tab === "coupons"   && <CouponsTab    token={token} />}
        {tab === "referrals" && <ReferralsTab  token={token} />}
        {tab === "support"   && <SupportTab />}
        {tab === "broadcast" && <BroadcastTab  token={token} />}
        {tab === "push"      && <PushTab       token={token} />}
        {tab === "emails"    && <EmailsTab     token={token} />}
      </div>
    </div>
  );
}
