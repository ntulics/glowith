"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

type Service = {
  id: string; name: string; category: string;
  durationMinutes: number; priceCents: number; depositCents: number; active: boolean;
};

const CATEGORIES = ["Hair", "Nails", "Makeup", "Lashes", "Brows", "Barber", "Spa", "Other"];

function ServiceFormModal({
  service, profileId, onClose, onSaved
}: {
  service?: Service | null;
  profileId: string;
  onClose: () => void;
  onSaved: (s: Service) => void;
}) {
  const [form, setForm] = useState({
    name: service?.name ?? "",
    category: service?.category ?? "Hair",
    durationMinutes: service?.durationMinutes ?? 60,
    priceCents: service ? service.priceCents / 100 : 0,
    depositCents: service ? service.depositCents / 100 : 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = service ? `/api/dashboard/services/${service.id}` : "/api/dashboard/services";
    const method = service ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        name: form.name,
        category: form.category,
        durationMinutes: Number(form.durationMinutes),
        priceCents: Math.round(Number(form.priceCents) * 100),
        depositCents: Math.round(Number(form.depositCents) * 100)
      })
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    onSaved(data.service);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-black">{service ? "Edit service" : "Add service"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Service name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} required
              placeholder="e.g. Silk press" className="input-base" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className="input-base">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Duration (min)</label>
              <input type="number" value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)}
                min={15} step={15} required className="input-base" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Price (R)</label>
              <input type="number" value={form.priceCents} onChange={(e) => set("priceCents", e.target.value)}
                min={0} step={0.01} required className="input-base" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Deposit (R)</label>
              <input type="number" value={form.depositCents} onChange={(e) => set("depositCents", e.target.value)}
                min={0} step={0.01} required className="input-base" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl bg-[#1a1a1a] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {loading ? "Saving…" : service ? "Save changes" : "Add service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CatalogView({ profileId, services: initial }: { profileId: string; services: Service[] }) {
  const [services, setServices] = useState<Service[]>(initial);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"new" | Service | null>(null);
  const [, startTransition] = useTransition();

  const filtered = services.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/dashboard/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active })
    });
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, active } : s));
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this service?")) return;
    await fetch(`/api/dashboard/services/${id}`, { method: "DELETE" });
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  function onSaved(service: Service) {
    setServices((prev) => {
      const idx = prev.findIndex((s) => s.id === service.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = service; return next; }
      return [...prev, service];
    });
  }

  return (
    <>
      <style>{`.input-base { width: 100%; border-radius: 0.75rem; border: 1px solid #E5E7EB; background: #F9FAFB; padding: 0.625rem 1rem; font-size: 0.875rem; font-weight: 500; outline: none; transition: border-color 0.15s; } .input-base:focus { border-color: #D94472; background: white; }`}</style>

      <div className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h1 className="text-xl font-black">Catalog</h1>
          <button onClick={() => setModal("new")}
            className="flex items-center gap-1.5 rounded-xl bg-[#D94472] px-4 py-2 text-sm font-bold text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> Service
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 bg-white px-6">
          {["Services", "Packages", "Resources"].map((t, i) => (
            <button key={t} className={cn("border-b-2 px-4 py-3 text-sm font-semibold transition", i === 0 ? "border-[#1a1a1a] text-[#1a1a1a]" : "border-transparent text-gray-400 hover:text-gray-600")}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: category sidebar (placeholder) */}
          <div className="w-52 shrink-0 overflow-y-auto border-r border-gray-100 bg-white p-3">
            <button onClick={() => setModal("new")}
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#D94472] py-2 text-xs font-bold text-white hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add category
            </button>
            <div className="rounded-xl bg-[#D94472]/8 px-3 py-2">
              <p className="text-xs font-bold text-[#D94472]">All services</p>
              <p className="text-[10px] text-gray-400">{services.length} Services</p>
            </div>
          </div>

          {/* Right: service table */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search services"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="w-10 px-4 py-2.5"></th>
                    {["ID", "Service", "Duration", "Price", "Deposit", "Visibility", ""].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((svc, i) => (
                    <tr key={svc.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-300">⋮⋮</td>
                      <td className="px-4 py-3 font-semibold text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-[#D94472]/10" />
                          <span className="font-semibold">{svc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{svc.durationMinutes >= 60 ? `${Math.floor(svc.durationMinutes / 60)}h${svc.durationMinutes % 60 ? ` ${svc.durationMinutes % 60}min` : ""}` : `${svc.durationMinutes}min`}</td>
                      <td className="px-4 py-3 font-semibold">{formatZAR(svc.priceCents)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatZAR(svc.depositCents)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(svc.id, !svc.active)}
                          className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition", svc.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                          {svc.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {svc.active ? "Visible" : "Hidden"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModal(svc)} className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-400">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteService(svc.id)} className="rounded-lg p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <p className="text-sm font-semibold text-gray-400">No services yet</p>
                  <button onClick={() => setModal("new")} className="mt-3 text-sm font-bold text-[#D94472] hover:underline">
                    Add your first service
                  </button>
                </div>
              )}
            </div>

            {/* Pagination placeholder */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 text-xs font-semibold text-gray-400">
              <span>Total {filtered.length}</span>
            </div>
          </div>
        </div>
      </div>

      {modal !== null && (
        <ServiceFormModal
          service={modal === "new" ? null : modal}
          profileId={profileId}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
