"use client";

import { useState } from "react";
import { BadgeCheck, Clock, ExternalLink, FlaskConical, Plus, Search, ShieldOff, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Provider = {
  id: string; businessName: string; handle: string; category: string;
  city: string; verified: boolean; isDemo: boolean; email: string;
  bookings: number; services: number; posts: number; createdAt: string;
};

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

export function ProvidersTable({ providers: initial }: { providers: Provider[] }) {
  const [providers, setProviders] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "demo">("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = providers.filter((p) => {
    const matchSearch = !search || [p.businessName, p.handle, p.email, p.city].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "pending" && !p.verified) ||
      (filter === "verified" && p.verified) ||
      (filter === "demo" && p.isDemo);
    return matchSearch && matchFilter;
  });

  async function setVerified(id: string, verified: boolean) {
    setLoading(id);
    await fetch(`/api/admin/providers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verified }) });
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, verified } : p));
    setLoading(null);
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

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h1 className="text-xl font-black">Providers</h1>
            <p className="text-xs text-gray-400">
              {providers.length} total · {providers.filter((p) => !p.verified).length} pending · {providers.filter((p) => p.isDemo).length} demo
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#D94472] px-4 py-2 text-sm font-bold text-white hover:bg-[#c23761]">
            <Plus className="h-4 w-4" />
            New provider
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-6 py-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search providers…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
          </div>
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {(["all", "pending", "verified", "demo"] as const).map((f) => (
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
                {["Studio", "Category", "City", "Services", "Bookings", "Joined", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-bold">{p.businessName}</p>
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
                  <td className="px-5 py-3 text-gray-500">{p.category}</td>
                  <td className="px-5 py-3 text-gray-500">{p.city || "—"}</td>
                  <td className="px-5 py-3 font-semibold">{p.services}</td>
                  <td className="px-5 py-3 font-semibold">{p.bookings}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{format(new Date(p.createdAt), "d MMM yyyy")}</td>
                  <td className="px-5 py-3">
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
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      {!p.verified ? (
                        <button onClick={() => setVerified(p.id, true)} disabled={loading === p.id}
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                          {loading === p.id ? "…" : "✓ Verify"}
                        </button>
                      ) : (
                        <button onClick={() => setVerified(p.id, false)} disabled={loading === p.id}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                          <ShieldOff className="inline h-3 w-3" /> Unverify
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
                      {deleteConfirm === p.id ? (
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
              ))}
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
                  <input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} required className={inputCls} placeholder="@janes_studio" />
                </Field>
              </div>
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
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className={inputCls} placeholder="Short description of services…" />
              </Field>

              {/* Demo toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 p-4 hover:border-violet-300">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", form.isDemo ? "bg-violet-100" : "bg-gray-100")}>
                  <FlaskConical className={cn("h-5 w-5", form.isDemo ? "text-violet-600" : "text-gray-400")} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Demo provider</p>
                  <p className="text-xs text-gray-400">Marks this as a demonstration account — visible under the demo filter in admin</p>
                </div>
                <input type="checkbox" checked={form.isDemo} onChange={(e) => setForm({ ...form, isDemo: e.target.checked })} className="h-4 w-4 accent-violet-600" />
              </label>

              {createError && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{createError}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setCreateError(null); }}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold hover:bg-gray-50">
                  Cancel
                </button>
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
