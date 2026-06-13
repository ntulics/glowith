"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlignLeft, ArrowUpFromLine, Check, ChevronDown, Eye, EyeOff, Image, LayoutList,
  Loader2, MoreHorizontal, Plus, Search, Settings, Trash2, X, Tag, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

function fmtDuration(mins: number) {
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}min` : ""}`;
  return `${mins}min`;
}

type ServiceCategory = {
  id: string; name: string; color: string; imageUrl?: string | null;
  _count?: { services: number };
};

type Agent = { id: string; businessName: string; avatarUrl?: string | null };

type Service = {
  id: string; name: string; category: string; categoryId?: string | null;
  description?: string | null;
  durationMinutes: number; priceCents: number; depositCents: number;
  depositIsPercent: boolean; active: boolean;
  agents?: { agentId: string }[];
  ownerName?: string | null;
};

type Extra = {
  id: string; name: string; description?: string | null;
  priceCents: number; durationMinutes: number; active: boolean;
};

const DURATIONS = [
  { label: "15 min", value: 15 }, { label: "20 min", value: 20 }, { label: "30 min", value: 30 },
  { label: "45 min", value: 45 }, { label: "1 hour", value: 60 }, { label: "1 hour 15 min", value: 75 },
  { label: "1 hour 30 min", value: 90 }, { label: "1 hour 45 min", value: 105 }, { label: "2 hours", value: 120 },
  { label: "2 hours 30 min", value: 150 }, { label: "3 hours", value: 180 }, { label: "4 hours", value: 240 },
];

const TABS = [
  { id: "details", label: "Details", icon: AlignLeft },
  { id: "pricing", label: "Pricing & duration", icon: LayoutList },
  { id: "extras", label: "Extras", icon: Plus },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ── Category Form Modal ──────────────────────────────────────────────────────
function CategoryFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: (c: ServiceCategory) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#D94472");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("folder", "categories");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json(); if (d.url) setImageUrl(d.url);
    setUploading(false);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/dashboard/service-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color, imageUrl: imageUrl || null }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return;
    onSaved(d.category);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <span>Services</span>
            <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-gray-300" />
            <span className="font-black text-gray-900">New category</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-6 p-6">
          {/* Image upload */}
          <button onClick={() => fileRef.current?.click()}
            className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 hover:border-[var(--brand)] hover:text-[var(--brand)] transition overflow-hidden">
            {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <>
              <ArrowUpFromLine className="h-5 w-5" />
              <span className="text-[10px] font-semibold text-center">Upload image<br />PNG, JPG, JPEG</span>
            </>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

          <div className="flex-1 space-y-4">
            {/* Name */}
            <div className="relative rounded-xl border border-gray-200 focus-within:border-[var(--brand)]">
              <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-red-400">*</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
                className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none" />
            </div>
            {/* Color */}
            <div className="rounded-xl border border-gray-200 px-3 py-2.5 focus-within:border-[var(--brand)]">
              <p className="text-[10px] text-gray-400 mb-1">Color</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-gray-700">{color}</span>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded-full border-0 p-0" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Close</button>
          <button onClick={save} disabled={!name.trim() || saving}
            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Extra modal ──────────────────────────────────────────────────────────────
function ExtraModal({ extra, serviceId, onClose, onSaved }: {
  extra?: Extra | null; serviceId: string | null; onClose: () => void; onSaved: (e: Extra) => void;
}) {
  const [form, setForm] = useState({ name: extra?.name ?? "", description: extra?.description ?? "", priceCents: extra ? extra.priceCents / 100 : 0, durationMinutes: extra?.durationMinutes ?? 0 });
  const [loading, setLoading] = useState(false);
  function set(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }
  async function save() {
    if (!serviceId) return; setLoading(true);
    const url = extra ? `/api/dashboard/services/${serviceId}/extras/${extra.id}` : `/api/dashboard/services/${serviceId}/extras`;
    const method = extra ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, description: form.description || null, priceCents: Math.round(Number(form.priceCents) * 100), durationMinutes: Number(form.durationMinutes) }) });
    const d = await res.json(); setLoading(false);
    if (res.ok) { onSaved(d.extra); onClose(); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <span className="font-black">{extra ? "Edit extra" : "Add extra"}</span>
          <button onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <div className="space-y-4 p-5">
          {[{ key: "name", label: "Name", type: "text" }, { key: "priceCents", label: "Price (R)", type: "number" }, { key: "durationMinutes", label: "Duration (min)", type: "number" }].map(({ key, label, type }) => (
            <div key={key} className="relative rounded-xl border border-gray-200 focus-within:border-[var(--brand)]">
              <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-500">{label}</span>
              <input type={type} value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} min={0} className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none" />
            </div>
          ))}
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Description (optional)" className="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Close</button>
          <button onClick={save} disabled={loading || !form.name} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Deposit Section with live revenue breakdown ───────────────────────────────
function DepositSection({ form, set, platformDepositPercent }: {
  form: { priceCents: number; depositCents: number; depositIsPercent: boolean };
  set: (key: string, value: unknown) => void;
  platformDepositPercent: number;
}) {
  const priceCents = Math.round(Number(form.priceCents) * 100);
  const depositCents = (() => {
    const raw = Number(form.depositCents);
    if (form.depositIsPercent) return Math.round((priceCents * Math.min(100, Math.max(0, raw))) / 100);
    return Math.round(raw * 100);
  })();
  const platformCut = Math.round((depositCents * platformDepositPercent) / 100);
  // Paystack SA: 1.5% + R2 flat, capped at R2000
  const paystackFee = Math.min(Math.round(depositCents * 0.015) + 200, 200000);
  const providerNet = Math.max(depositCents - platformCut - paystackFee, 0);
  const showBreakdown = depositCents > 0 && priceCents > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Deposit type</span>
        <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-bold">
          <button type="button" onClick={() => set("depositIsPercent", false)}
            className={`px-3 py-1.5 transition ${!form.depositIsPercent ? "bg-[var(--brand)] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
            Fixed (R)
          </button>
          <button type="button" onClick={() => set("depositIsPercent", true)}
            className={`px-3 py-1.5 transition ${form.depositIsPercent ? "bg-[var(--brand)] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
            Percentage (%)
          </button>
        </div>
      </div>
      <div className="relative rounded-xl border border-gray-200 bg-white focus-within:border-[var(--brand)]">
        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-500">
          {form.depositIsPercent ? "Deposit % of total (incl. extras)" : "Deposit amount (R) — min R100"}
        </span>
        <div className="flex items-center">
          {!form.depositIsPercent && <span className="pl-3 text-sm text-gray-400">R</span>}
          <input type="number" value={form.depositCents} onChange={(e) => set("depositCents", e.target.value)}
            min={form.depositIsPercent ? 0 : 100} max={form.depositIsPercent ? 100 : undefined}
            step={form.depositIsPercent ? 1 : 1}
            className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none" />
          {form.depositIsPercent && <span className="pr-3 text-sm text-gray-400">%</span>}
        </div>
      </div>

      {/* Live revenue breakdown */}
      {showBreakdown && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Revenue breakdown (deposit)</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Client pays (deposit)</span>
              <span className="font-bold text-gray-800">{formatZAR(depositCents)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Platform commission ({platformDepositPercent}%)</span>
              <span>– {formatZAR(platformCut)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Paystack processing fee (~1.5% + R2)</span>
              <span>– {formatZAR(paystackFee)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold">
              <span className="text-gray-700">You receive</span>
              <span className="text-emerald-600">{formatZAR(providerNet)}</span>
            </div>
          </div>
          {priceCents > depositCents && (
            <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
              + {formatZAR(priceCents - depositCents)} remaining paid directly to you at appointment
            </p>
          )}
        </div>
      )}
      {!showBreakdown && (
        <p className="text-xs text-gray-400">
          {form.depositIsPercent
            ? "Set a service price above to preview your revenue split."
            : "Minimum R100. Enter an amount to preview your revenue split."}
        </p>
      )}
    </div>
  );
}

// ── Service Form Modal ───────────────────────────────────────────────────────
function ServiceFormModal({ service, profileId, categories, agents, onClose, onSaved }: {
  service?: Service | null; profileId: string;
  categories: ServiceCategory[]; agents: Agent[];
  onClose: () => void; onSaved: (s: Service) => void;
}) {
  const [tab, setTab] = useState<TabId>("details");
  const [platformDepositPercent, setPlatformDepositPercent] = useState(20);
  useEffect(() => {
    fetch("/api/platform/config").then(r => r.json()).then(d => {
      if (d.depositPercent != null) setPlatformDepositPercent(d.depositPercent);
    }).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    name: service?.name ?? "",
    categoryId: service?.categoryId ?? "",
    durationMinutes: service?.durationMinutes ?? 60,
    priceCents: service ? service.priceCents / 100 : 0,
    depositCents: service ? service.depositCents : 50,
    depositIsPercent: service?.depositIsPercent ?? true,
    active: service?.active ?? true,
    description: service?.description ?? "",
    color: "#D94472",
  });
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(service?.agents?.map((a) => a.agentId) ?? []);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extrasLoaded, setExtrasLoaded] = useState(false);
  const [extraModal, setExtraModal] = useState<"new" | Extra | null>(null);
  const [extraSearch, setExtraSearch] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState(false);
  const [durationError, setDurationError] = useState(false);

  function set(key: string, value: unknown) { setForm((f) => ({ ...f, [key]: value })); }

  async function loadExtras() {
    if (!service || extrasLoaded) return;
    const res = await fetch(`/api/dashboard/services/${service.id}/extras`);
    if (res.ok) { const d = await res.json(); setExtras(d.extras ?? []); }
    setExtrasLoaded(true);
  }

  function handleTabChange(t: TabId) { setTab(t); if (t === "extras") loadExtras(); }

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  }

  async function handleSave() {
    const hasName = form.name.trim().length > 0;
    const hasDuration = form.durationMinutes > 0;
    setNameError(!hasName); setDurationError(!hasDuration);
    if (!hasName || !hasDuration) { setTab(!hasName ? "details" : "pricing"); return; }

    // Minimum R100 for fixed deposits
    if (!form.depositIsPercent && Number(form.depositCents) > 0 && Number(form.depositCents) < 100) {
      setError("Fixed deposit must be at least R100"); setTab("pricing"); return;
    }
    setLoading(true); setError("");
    const url = service ? `/api/dashboard/services/${service.id}` : "/api/dashboard/services";
    const method = service ? "PUT" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        name: form.name.trim(),
        category: categories.find((c) => c.id === form.categoryId)?.name ?? form.categoryId ?? "Other",
        categoryId: form.categoryId || null,
        description: form.description || null,
        durationMinutes: Number(form.durationMinutes),
        priceCents: Math.round(Number(form.priceCents) * 100),
        depositCents: form.depositIsPercent
          ? Math.min(100, Math.max(0, Math.round(Number(form.depositCents))))
          : Math.round(Number(form.depositCents) * 100),
        depositIsPercent: form.depositIsPercent,
        active: form.active,
        agentIds: selectedAgentIds,
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    onSaved(data.service);
    onClose();
  }

  async function uploadGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "services");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json(); if (d.url) urls.push(d.url);
    }
    setGalleryImages((prev) => [...prev, ...urls]);
    setUploading(false);
  }

  const filteredExtras = extras.filter((e) => !extraSearch || e.name.toLowerCase().includes(extraSearch.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-full w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <span>Services</span>
            <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-gray-300" />
            <span className="font-black text-gray-900">{service ? service.name : "New service"}</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar tabs */}
          <div className="w-52 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50/50 py-3">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => handleTabChange(id)}
                className={cn("flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors",
                  tab === id ? "bg-[var(--brand)]/8 text-[var(--brand)]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800")}>
                <Icon className="h-4 w-4 shrink-0" />{label}
              </button>
            ))}
            <div className="mx-4 mt-6 rounded-xl bg-indigo-50 p-3">
              <p className="mb-1 text-xs font-black text-indigo-700">Tips & suggestions</p>
              <button className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm">
                Services setup <ChevronDown className="h-3 w-3 -rotate-90" />
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

              {/* ── DETAILS ── */}
              {tab === "details" && (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <button className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                      <ArrowUpFromLine className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">Upload image</span>
                      <span className="text-[9px]">PNG, JPG, JPEG</span>
                    </button>

                    <div className="flex flex-1 flex-col gap-3">
                      <div className="flex gap-3">
                        {/* Name */}
                        <div className="flex-1">
                          <div className={cn("relative rounded-xl border bg-white transition", nameError ? "border-red-400" : "border-gray-200 focus-within:border-[var(--brand)]")}>
                            <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-red-400">*</span>
                            <input value={form.name} onChange={(e) => { set("name", e.target.value); setNameError(false); }}
                              placeholder="Name" className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none" />
                          </div>
                          {nameError && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-red-400 text-[9px]">!</span>Please enter a service name.</p>}
                        </div>
                        {/* Color */}
                        <div className="relative">
                          <div className="rounded-xl border border-gray-200 px-3 py-2.5 focus-within:border-[var(--brand)]">
                            <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-red-400">*</span>
                            <p className="text-[10px] text-gray-400">Color</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-gray-700">{form.color}</span>
                              <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="h-6 w-6 cursor-pointer rounded-full border-0 p-0" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="relative rounded-xl border border-gray-200 bg-white focus-within:border-[var(--brand)]">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-red-400">*</span>
                        <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}
                          className="w-full appearance-none rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none">
                          <option value="">Select category…</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Employees — multi-select */}
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Employees</span>
                      {selectedAgentIds.length > 0 && (
                        <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">{selectedAgentIds.length} selected</span>
                      )}
                    </div>
                    {agents.length === 0 ? (
                      <p className="text-xs text-gray-400 rounded-xl border border-dashed border-gray-200 px-4 py-3">No agents added yet. Invite agents from the Team section.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {agents.map((agent) => {
                          const selected = selectedAgentIds.includes(agent.id);
                          return (
                            <button key={agent.id} type="button" onClick={() => toggleAgent(agent.id)}
                              className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                                selected ? "border-[var(--brand)] bg-[var(--brand)]/5 font-semibold text-[var(--brand)]" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                              {agent.avatarUrl
                                ? <img src={agent.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                                : <div className="h-6 w-6 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-[10px] font-bold flex items-center justify-center shrink-0">{agent.businessName[0]}</div>
                              }
                              <span className="truncate">{agent.businessName}</span>
                              {selected && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Show on website toggle */}
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <button type="button" onClick={() => set("active", !form.active)}
                      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", form.active ? "bg-[var(--brand)]" : "bg-gray-300")}>
                      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", form.active ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                    <span className="text-sm font-semibold text-gray-700">Show on website</span>
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-400">?</span>
                  </div>

                  {/* Recurring appointments */}
                  <div className="rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recurring appointments</span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-400">?</span>
                    </div>
                    <div className="border-t border-gray-100 px-4 py-2.5">
                      <div className="relative">
                        <select className="w-full appearance-none bg-transparent py-1 text-sm font-semibold text-gray-700 outline-none">
                          <option>Disabled</option><option>Weekly</option><option>Monthly</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Description with formatting toolbar */}
                  <div>
                    <div className="mb-1 flex overflow-hidden rounded-t-xl border border-b-0 border-gray-200">
                      <button type="button" className="flex-1 bg-white py-2 text-xs font-bold text-[var(--brand)]">Text</button>
                      <button type="button" className="flex-1 border-l border-gray-200 bg-gray-50 py-2 text-xs font-semibold text-gray-400">HTML</button>
                    </div>
                    {/* Formatting toolbar */}
                    <div className="flex flex-wrap items-center gap-1 border border-b-0 border-gray-200 bg-gray-50 px-3 py-1.5">
                      {[
                        { label: "B", style: { fontWeight: "bold" }, wrap: ["**", "**"] },
                        { label: "I", style: { fontStyle: "italic" }, wrap: ["_", "_"] },
                        { label: "U", style: { textDecoration: "underline" }, wrap: ["<u>", "</u>"] },
                      ].map(({ label, style, wrap }) => (
                        <button key={label} type="button"
                          onClick={() => {
                            const ta = document.getElementById("svc-desc") as HTMLTextAreaElement | null;
                            if (!ta) return;
                            const start = ta.selectionStart; const end = ta.selectionEnd;
                            const selected = form.description.slice(start, end);
                            const newVal = form.description.slice(0, start) + wrap[0] + selected + wrap[1] + form.description.slice(end);
                            set("description", newVal);
                          }}
                          style={style}
                          className="h-6 w-6 rounded text-xs font-bold text-gray-600 hover:bg-gray-200 transition">{label}</button>
                      ))}
                      <div className="mx-1 h-4 w-px bg-gray-200" />
                      <select className="bg-transparent text-xs font-semibold text-gray-500 outline-none">
                        <option>Paragraph</option><option>Heading 1</option><option>Heading 2</option>
                      </select>
                      <div className="mx-1 h-4 w-px bg-gray-200" />
                      <select className="bg-transparent text-xs font-semibold text-gray-500 outline-none">
                        <option>Sans Serif</option><option>Serif</option><option>Mono</option>
                      </select>
                    </div>
                    <textarea id="svc-desc" value={form.description} onChange={(e) => set("description", e.target.value)}
                      rows={5} placeholder="Describe this service (optional)"
                      className="w-full resize-none rounded-b-xl border border-gray-200 px-3 py-3 font-sans text-sm leading-relaxed outline-none focus:border-[var(--brand)]" />
                  </div>
                </div>
              )}

              {/* ── PRICING & DURATION ── */}
              {tab === "pricing" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className={cn("relative rounded-xl border bg-white transition", durationError ? "border-red-400" : "border-gray-200 focus-within:border-[var(--brand)]")}>
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-red-400">*</span>
                        <select value={form.durationMinutes} onChange={(e) => { set("durationMinutes", Number(e.target.value)); setDurationError(false); }}
                          className="w-full appearance-none rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none">
                          <option value={0}>Duration</option>
                          {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                      {durationError && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-red-400 text-[9px]">!</span>Please select a duration.</p>}
                    </div>
                    <div className="relative rounded-xl border border-gray-200 bg-white focus-within:border-[var(--brand)]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R</span>
                      <input type="number" value={form.priceCents} onChange={(e) => set("priceCents", e.target.value)} min={0} step={0.01} placeholder="0.00"
                        className="w-full rounded-xl bg-transparent py-2.5 pl-8 pr-3 text-sm outline-none" />
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-500">Price</span>
                    </div>
                  </div>

                  {/* Buffer times */}
                  <div className="grid grid-cols-2 gap-4">
                    {["Buffer time before", "Buffer time after"].map((label) => (
                      <div key={label} className="relative rounded-xl border border-gray-200 focus-within:border-[var(--brand)]">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-500">{label}</span>
                        <select className="w-full appearance-none rounded-xl bg-transparent px-3 py-2.5 text-sm text-gray-400 outline-none">
                          <option value="">None</option>
                          {[5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    ))}
                  </div>

                  {/* Capacity */}
                  <div className="relative rounded-xl border border-gray-200 focus-within:border-[var(--brand)]">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-500">Capacity (max clients per slot)</span>
                    <input type="number" min={1} defaultValue={1} className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none" />
                  </div>

                  {/* Deposit */}
                  <DepositSection form={form} set={set} platformDepositPercent={platformDepositPercent} />

                  {/* Pricing by date toggle */}
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                    <button type="button" className="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors">
                      <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700">Pricing by date &amp; time</span>
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-400">?</span>
                  </div>
                </div>
              )}

              {/* ── EXTRAS ── */}
              {tab === "extras" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input value={extraSearch} onChange={(e) => setExtraSearch(e.target.value)} placeholder="Search extras"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)]" />
                    </div>
                    {service && (
                      <button onClick={() => setExtraModal("new")}
                        className="flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-2 text-xs font-bold text-white hover:opacity-90">
                        <Plus className="h-3.5 w-3.5" /> Add extra
                      </button>
                    )}
                  </div>
                  {!service && <p className="text-sm text-gray-400 text-center py-8">Save the service first, then add extras.</p>}
                  {service && filteredExtras.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No extras yet.</p>}
                  {filteredExtras.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                      <div>
                        <p className="font-semibold text-sm">{e.name}</p>
                        {e.description && <p className="text-xs text-gray-400 mt-0.5">{e.description}</p>}
                        <p className="text-xs text-[var(--brand)] mt-0.5">{formatZAR(e.priceCents)} · {e.durationMinutes}min</p>
                      </div>
                      <button onClick={() => setExtraModal(e)} className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-400"><MoreHorizontal className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── GALLERY ── */}
              {tab === "gallery" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {galleryImages.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => setGalleryImages((p) => p.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 rounded-full bg-black/50 p-1"><X className="h-3 w-3 text-white" /></button>
                      </div>
                    ))}
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[var(--brand)] hover:text-[var(--brand)] transition">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ArrowUpFromLine className="h-5 w-5" /><span className="text-xs mt-1">Add photo</span></>}
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadGallery} />
                </div>
              )}

              {/* ── SETTINGS ── */}
              {tab === "settings" && (
                <div className="space-y-4">
                  {[
                    "Allow online booking",
                    "Allow booking without payment",
                    "Require approval before confirming",
                  ].map((label) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                      <button type="button" className="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors">
                        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow" />
                      </button>
                      <span className="text-sm font-semibold text-gray-700">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Close</button>
              <button onClick={handleSave} disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {extraModal !== null && (
        <ExtraModal extra={extraModal === "new" ? null : extraModal} serviceId={service?.id ?? null}
          onClose={() => setExtraModal(null)}
          onSaved={(e) => setExtras((prev) => { const i = prev.findIndex((x) => x.id === e.id); if (i >= 0) { const n = [...prev]; n[i] = e; return n; } return [...prev, e]; })} />
      )}
    </div>
  );
}

// ── CatalogView ──────────────────────────────────────────────────────────────
export function CatalogView({
  profileId, services: initial, agents: initialAgents = []
}: {
  profileId: string; services: Service[]; agents?: Agent[]
}) {
  const [services, setServices] = useState<Service[]>(initial);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | Service | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/dashboard/service-categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  const filtered = services.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategoryId || s.categoryId === activeCategoryId;
    return matchSearch && matchCat;
  });

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/dashboard/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, active } : s));
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this service?")) return;
    const res = await fetch(`/api/dashboard/services/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Could not delete service. Please try again.");
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  function onSaved(service: Service) {
    setServices((prev) => {
      const idx = prev.findIndex((s) => s.id === service.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = service; return next; }
      return [...prev, service];
    });
  }

  function onCategorySaved(cat: ServiceCategory) {
    setCategories((prev) => {
      const i = prev.findIndex((c) => c.id === cat.id);
      if (i >= 0) { const n = [...prev]; n[i] = cat; return n; }
      return [...prev, cat];
    });
  }

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h1 className="text-xl font-black">Catalog</h1>
          <button onClick={() => setModal("new")}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> Service
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 bg-white px-6">
          {["Services", "Packages", "Resources"].map((t, i) => (
            <button key={t} className={cn("border-b-2 px-4 py-3 text-sm font-semibold transition",
              i === 0 ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-gray-400 hover:text-gray-600")}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Category sidebar */}
          <div className="w-56 shrink-0 overflow-y-auto border-r border-gray-100 bg-white p-3 space-y-1.5">
            <button onClick={() => setCategoryModal(true)}
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] py-2 text-xs font-bold text-white hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add category
            </button>

            {/* All services */}
            <button onClick={() => setActiveCategoryId(null)}
              className={cn("w-full rounded-xl px-3 py-2 text-left transition", !activeCategoryId ? "bg-[var(--brand)]/8" : "hover:bg-gray-50")}>
              <p className={cn("text-xs font-bold", !activeCategoryId ? "text-[var(--brand)]" : "text-gray-700")}>All services</p>
              <p className="text-[10px] text-gray-400">{services.length} Services</p>
            </button>

            {/* Per category */}
            {categories.map((cat) => {
              const count = services.filter((s) => s.categoryId === cat.id).length;
              const active = activeCategoryId === cat.id;
              return (
                <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)}
                  className={cn("w-full rounded-xl px-3 py-2 text-left transition", active ? "bg-[var(--brand)]/8" : "hover:bg-gray-50")}>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                    <p className={cn("text-xs font-bold truncate", active ? "text-[var(--brand)]" : "text-gray-700")}>{cat.name}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{count} {count === 1 ? "Service" : "Services"}</p>
                </button>
              );
            })}
          </div>

          {/* Service table */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="w-10 px-4 py-2.5"></th>
                    {["ID", "Service", "Duration", "Price", "Deposit", "Employees", "Visibility", ""].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((svc, i) => {
                    const svcAgents = (svc.agents ?? []).map((a) => initialAgents.find((ag) => ag.id === a.agentId)).filter(Boolean) as Agent[];
                    return (
                      <tr key={svc.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-300">⋮⋮</td>
                        <td className="px-4 py-3 font-semibold text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[10px] font-bold text-[var(--brand)]">{svc.name[0]}</div>
                            <div>
                              <p className="font-semibold">{svc.name}</p>
                              {svc.ownerName
                                ? <p className="text-[10px] text-indigo-500 font-semibold">{svc.ownerName}</p>
                                : svc.categoryId && <p className="text-[10px] text-gray-400">{categories.find((c) => c.id === svc.categoryId)?.name}</p>
                              }
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtDuration(svc.durationMinutes)}</td>
                        <td className="px-4 py-3 font-semibold">{formatZAR(svc.priceCents)}</td>
                        <td className="px-4 py-3 text-gray-500">{svc.depositIsPercent ? `${svc.depositCents}%` : formatZAR(svc.depositCents)}</td>
                        <td className="px-4 py-3">
                          {svcAgents.length > 0 ? (
                            <div className="flex -space-x-2">
                              {svcAgents.slice(0, 3).map((ag) => (
                                ag.avatarUrl
                                  ? <img key={ag.id} src={ag.avatarUrl} alt={ag.businessName} title={ag.businessName} className="h-6 w-6 rounded-full border-2 border-white object-cover" />
                                  : <div key={ag.id} title={ag.businessName} className="h-6 w-6 rounded-full border-2 border-white bg-[var(--brand)]/10 text-[var(--brand)] text-[9px] font-bold flex items-center justify-center">{ag.businessName[0]}</div>
                              ))}
                              {svcAgents.length > 3 && <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center">+{svcAgents.length - 3}</div>}
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleActive(svc.id, !svc.active)}
                            className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition",
                              svc.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                            {svc.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {svc.active ? "Visible" : "Hidden"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setModal(svc)} className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-400"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteService(svc.id)} className="rounded-lg p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <Tag className="h-8 w-8 text-gray-200 mb-3" />
                  <p className="text-sm font-semibold text-gray-400">No services yet</p>
                  <button onClick={() => setModal("new")} className="mt-3 text-sm font-bold text-[var(--brand)] hover:underline">Add your first service</button>
                </div>
              )}
            </div>

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
          categories={categories}
          agents={initialAgents}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {categoryModal && (
        <CategoryFormModal onClose={() => setCategoryModal(false)} onSaved={onCategorySaved} />
      )}
    </>
  );
}
