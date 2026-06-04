"use client";

import { useState } from "react";
import { BadgeCheck, Building2, Check, Clock, Copy, ExternalLink, FlaskConical, Plus, Scissors, Search, Shield, ShieldOff, Trash2, Users, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Tenants that can never be deleted
const PROTECTED_HANDLES = new Set(["@demo", "@glowith_demo", "@duvha_demo", "@glowith", "@admin", "@freelancer", "@freelancers"]);
const PROTECTED_BUSINESS_NAMES = new Set(["Glowith Admin", "Freelancers"]);

type Provider = {
  id: string; businessName: string; handle: string; category: string;
  city: string; verified: boolean; isDemo: boolean; providerType: string; plan: "STARTER" | "PRO" | "BUSINESS";
  parentBusinessId: string | null; parentBusinessName: string | null; parentBusinessHandle: string | null;
  email: string;
  bookings: number; services: number; posts: number; createdAt: string;
};

type DemoCredential = { email: string; password: string };

type CreateForm = {
  name: string; email: string; password: string;
  businessName: string; handle: string; category: string;
  city: string; bio: string; isDemo: boolean;
};

const EMPTY_FORM: CreateForm = {
  name: "", email: "", password: "",
  businessName: "", handle: "", category: "Hair",
  city: "", bio: "", isDemo: false
};

const CATEGORIES = ["Hair", "Nails", "Makeup", "Lashes", "Brows", "Barber", "Spa"];
const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#D94472] focus:bg-white";

function isProtected(p: Provider) {
  return PROTECTED_HANDLES.has(p.handle) || PROTECTED_BUSINESS_NAMES.has(p.businessName);
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function HandleAvailability({ handle }: { handle: string }) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "restricted" | "invalid">("idle");

  async function check() {
    if (!handle || handle.length < 2) return;
    setStatus("checking");
    try {
      const res = await fetch(`/api/auth/check-handle?handle=${encodeURIComponent(handle)}`);
      const data = await res.json();
      setStatus(data.available ? "available" : data.reason ?? "taken");
    } catch {
      setStatus("idle");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input value={handle} readOnly placeholder="@handle" className={inputCls} />
      <button type="button" onClick={check} className="shrink-0 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold hover:bg-gray-200">
        Check
      </button>
      {status !== "idle" && (
        <span className={cn("text-xs font-bold", {
          "text-gray-400": status === "checking",
          "text-emerald-600": status === "available",
          "text-red-500": status === "taken" || status === "restricted" || status === "invalid"
        })}>
          {status === "checking" && "Checking…"}
          {status === "available" && "✓ Available"}
          {status === "taken" && "✗ Already taken"}
          {status === "restricted" && "✗ Reserved name"}
          {status === "invalid" && "✗ Invalid format"}
        </span>
      )}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded text-gray-300 hover:text-gray-600">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

type DemoAccount = { label: string; businessName: string; email: string; password: string };

export function ProvidersTable({ providers: initial, freelancerCount, demoAccounts = [] }: { providers: Provider[]; freelancerCount: number; demoAccounts?: DemoAccount[] }) {
  const [providers, setProviders] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "demo" | "freelancers" | "business">("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [demoCredentials, setDemoCredentials] = useState<Array<{ tenant: string; owner: string; password: string; agents: DemoCredential[] }> | null>(null);

  const filtered = providers.filter((p) => {
    const matchSearch = !search || [p.businessName, p.handle, p.email, p.city].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "pending" && !p.verified) ||
      (filter === "verified" && p.verified) ||
      (filter === "demo" && p.isDemo) ||
      (filter === "freelancers" && p.providerType === "FREELANCER" && !p.parentBusinessId) ||
      (filter === "business" && p.providerType === "BUSINESS");
    return matchSearch && matchFilter;
  });

  async function setVerified(id: string, verified: boolean) {
    setLoading(id);
    await fetch(`/api/admin/providers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verified }) });
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, verified } : p));
    setLoading(null);
  }

  async function setPlan(id: string, plan: string) {
    await fetch(`/api/admin/providers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, plan: plan as any } : p));
  }

  async function toggleDemo(id: string, isDemo: boolean) {
    setLoading(`demo_${id}`);
    await fetch(`/api/admin/providers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDemo }) });
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, isDemo } : p));
    setLoading(null);
  }

  async function deleteProvider(id: string) {
    setLoading(`del_${id}`);
    await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
    setProviders((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null);
    setLoading(null);
  }

  async function createProvider(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create provider");
      setProviders((prev) => [data.provider, ...prev]);
      setShowCreate(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function seedDemo() {
    setSeedingDemo(true);
    try {
      const res = await fetch("/api/admin/seed-demo", { method: "POST" });
      const data = await res.json();
      setDemoCredentials(data.credentials);
      // Refresh providers list
      const fresh = await fetch("/api/admin/providers");
      if (fresh.ok) {
        const d = await fresh.json();
        if (d.providers) setProviders(d.providers);
      }
    } finally {
      setSeedingDemo(false);
    }
  }

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h1 className="text-xl font-black">Providers & Tenants</h1>
            <p className="text-xs text-gray-400">
              {providers.length} total · {providers.filter((p) => !p.verified).length} pending · {providers.filter((p) => p.isDemo).length} demo · {freelancerCount} freelancers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={seedDemo} disabled={seedingDemo}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-600 hover:bg-violet-100 disabled:opacity-50">
              <FlaskConical className="h-4 w-4" />
              {seedingDemo ? "Seeding…" : "Seed demo tenants"}
            </button>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#D94472] px-4 py-2 text-sm font-bold text-white hover:bg-[#c23761]">
              <Plus className="h-4 w-4" />
              New provider
            </button>
          </div>
        </div>

        {/* Persistent demo credentials — always available to the super admin */}
        {demoAccounts.length > 0 && (
          <div className="border-b border-violet-100 bg-violet-50 px-6 py-4">
            <div className="mb-3 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-violet-600" />
              <p className="text-sm font-black text-violet-700">Demo credentials (save these)</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {demoAccounts.map((a) => (
                <div key={a.email} className="rounded-xl border border-violet-200 bg-white p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#D94472]">{a.businessName}</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-600">{a.label}</span>
                  </div>
                  <p className="mt-1.5 text-gray-500">
                    <span className="font-mono font-bold text-gray-800">{a.email}</span><CopyBtn text={a.email} />
                  </p>
                  <p className="mt-1 text-gray-500">
                    <span className="font-mono font-bold text-gray-800">{a.password}</span><CopyBtn text={a.password} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo credentials panel (shown right after seeding) */}
        {demoCredentials && (
          <div className="border-b border-violet-100 bg-violet-50 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black text-violet-700">Demo credentials (save these)</p>
              <button onClick={() => setDemoCredentials(null)} className="text-violet-400 hover:text-violet-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              {demoCredentials.map((t) => (
                <div key={t.tenant} className="rounded-xl border border-violet-200 bg-white p-3 text-xs">
                  <p className="font-black text-[#D94472]">{t.tenant}</p>
                  <p className="mt-1 text-gray-500">Owner: <span className="font-mono font-bold text-gray-800">{t.owner}</span><CopyBtn text={t.owner} /> · <span className="font-mono font-bold text-gray-800">{t.password}</span><CopyBtn text={t.password} /></p>
                  <div className="mt-2 space-y-1">
                    {t.agents.map((a) => (
                      <p key={a.email} className="text-gray-500">Agent: <span className="font-mono font-bold text-gray-800">{a.email}</span><CopyBtn text={a.email} /> · <span className="font-mono font-bold text-gray-800">{a.password}</span><CopyBtn text={a.password} /></p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Freelancers virtual tenant row */}
        <div className="border-b border-gray-50 bg-gray-50/60 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                <Scissors className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Freelancers</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">Virtual tenant</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    <Shield className="h-2.5 w-2.5" /> Protected
                  </span>
                </div>
                <p className="text-xs text-gray-400">{freelancerCount} independent freelancers · shared tenant · no admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter(filter === "freelancers" ? "all" : "freelancers")}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition",
                  filter === "freelancers" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500 hover:bg-amber-50")}
              >
                <Users className="inline h-3 w-3 mr-1" />View all
              </button>
              <button disabled title="Protected — cannot delete Freelancers tenant"
                className="rounded-lg p-1.5 text-gray-200 cursor-not-allowed">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-6 py-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search providers…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
          </div>
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {(["all", "pending", "verified", "demo", "freelancers", "business"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition",
                  filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700")}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                {["Studio", "Type", "Plan", "Category", "City", "Svcs", "Bookings", "Joined", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const locked = isProtected(p);
                return (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold">{p.businessName}</p>
                            {locked && <Shield className="h-3 w-3 text-blue-400" />}
                          </div>
                          <p className="text-xs text-gray-400">{p.handle}</p>
                          <p className="text-xs text-gray-300">{p.email}</p>
                        </div>
                        {p.isDemo && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                            <FlaskConical className="h-3 w-3" /> Demo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.providerType === "BUSINESS" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                          <Building2 className="h-3 w-3" /> Business
                        </span>
                      ) : p.parentBusinessId ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            Agent
                          </span>
                          {p.parentBusinessName && (
                            <span className="text-[10px] text-gray-400">
                              @ {p.parentBusinessName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          <Scissors className="h-3 w-3" /> Freelancer
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.parentBusinessId ? (
                        <span className="text-[10px] text-gray-400">—</span>
                      ) : (
                        <select value={p.plan} onChange={(e) => setPlan(p.id, e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold outline-none focus:border-[#D94472]">
                          <option value="STARTER">Starter</option>
                          <option value="PRO">Pro</option>
                          <option value="BUSINESS">Business</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.city || "—"}</td>
                    <td className="px-4 py-3 font-semibold">{p.services}</td>
                    <td className="px-4 py-3 font-semibold">{p.bookings}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(p.createdAt), "d MMM yyyy")}</td>
                    <td className="px-4 py-3">
                      {p.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {!p.verified ? (
                          <button onClick={() => setVerified(p.id, true)} disabled={loading === p.id}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                            {loading === p.id ? "…" : "✓"}
                          </button>
                        ) : (
                          <button onClick={() => setVerified(p.id, false)} disabled={loading === p.id}
                            className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                            <ShieldOff className="inline h-3 w-3" />
                          </button>
                        )}
                        <button onClick={() => toggleDemo(p.id, !p.isDemo)} disabled={loading === `demo_${p.id}`}
                          title={p.isDemo ? "Remove demo flag" : "Mark as demo"}
                          className={cn("rounded-lg p-1.5 transition disabled:opacity-50",
                            p.isDemo ? "bg-violet-100 text-violet-600 hover:bg-violet-200" : "bg-gray-100 text-gray-400 hover:bg-violet-50 hover:text-violet-600")}>
                          <FlaskConical className="h-3.5 w-3.5" />
                        </button>
                        <a href="/dashboard" target="_blank" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="View studio">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {locked ? (
                          <button disabled title="Protected — cannot delete" className="rounded-lg p-1.5 text-gray-200 cursor-not-allowed">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteProvider(p.id)} disabled={loading === `del_${p.id}`}
                              className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50">
                              {loading === `del_${p.id}` ? "…" : "Confirm"}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(p.id)} title="Delete provider"
                            className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-sm font-semibold text-gray-400">No providers match your filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Create provider modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-black">Create new provider</h2>
              <button onClick={() => { setShowCreate(false); setCreateError(null); }} className="rounded-xl p-1.5 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={createProvider} className="max-h-[72vh] space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name" required>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputCls} placeholder="Jane Doe" />
                </Field>
                <Field label="Email" required>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={inputCls} placeholder="jane@example.com" />
                </Field>
              </div>
              <Field label="Password" required>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className={inputCls} placeholder="Min 8 characters" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Business name" required>
                  <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required className={inputCls} placeholder="Jane's Studio" />
                </Field>
                <Field label="Handle" required>
                  <input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} required className={inputCls} placeholder="@janes_studio"
                    onBlur={(e) => { if (e.target.value && !e.target.value.startsWith("@")) setForm((f) => ({ ...f, handle: `@${f.handle}` })); }} />
                </Field>
              </div>
              <Field label="Handle availability">
                <HandleAvailability handle={form.handle} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category" required>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="City / suburb" required>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className={inputCls} placeholder="Sandton, Johannesburg" />
                </Field>
              </div>
              <Field label="Bio">
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className={inputCls} placeholder="Short description…" />
              </Field>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 p-4 hover:border-violet-300">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", form.isDemo ? "bg-violet-100" : "bg-gray-100")}>
                  <FlaskConical className={cn("h-5 w-5", form.isDemo ? "text-violet-600" : "text-gray-400")} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Demo provider</p>
                  <p className="text-xs text-gray-400">Marks this as a demonstration account</p>
                </div>
                <input type="checkbox" checked={form.isDemo} onChange={(e) => setForm({ ...form, isDemo: e.target.checked })} className="h-4 w-4 accent-violet-600" />
              </label>
              {createError && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setCreateError(null); }}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 rounded-xl bg-[#D94472] py-2.5 text-sm font-bold text-white hover:bg-[#c23761] disabled:opacity-60">
                  {creating ? "Creating…" : "Create provider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
