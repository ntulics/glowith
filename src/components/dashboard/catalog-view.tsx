"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlignLeft, ArrowUpFromLine, Check, ChevronDown, Eye, EyeOff, Image, LayoutList,
  Loader2, MoreHorizontal, Plus, Search, Settings, Trash2, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

type Service = {
  id: string; name: string; category: string;
  durationMinutes: number; priceCents: number; depositCents: number;
  depositIsPercent: boolean; active: boolean;
};

type Extra = {
  id: string; name: string; description?: string | null;
  priceCents: number; durationMinutes: number; active: boolean;
};

const CATEGORIES = ["Hair", "Nails", "Makeup", "Lashes", "Brows", "Barber", "Spa", "Other"];

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

// ── Extra modal ──────────────────────────────────────────────────────────────
function ExtraModal({
  extra, serviceId, onClose, onSaved
}: {
  extra?: Extra | null;
  serviceId: string | null;
  onClose: () => void;
  onSaved: (e: Extra) => void;
}) {
  const [form, setForm] = useState({
    name: extra?.name ?? "",
    description: extra?.description ?? "",
    priceCents: extra ? extra.priceCents / 100 : 0,
    durationMinutes: extra?.durationMinutes ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!serviceId) return;
    setLoading(true); setError("");
    const body = {
      name: form.name,
      description: form.description || null,
      priceCents: Math.round(Number(form.priceCents) * 100),
      durationMinutes: Number(form.durationMinutes),
    };
    const res = await fetch(
      extra ? `/api/dashboard/services/${serviceId}/extras/${extra.id}` : `/api/dashboard/services/${serviceId}/extras`,
      { method: extra ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    onSaved(data.extra);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-black">{extra ? "Edit Extra" : "Add Extra"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-6">
          {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="field-label">Name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Deep conditioning"
              className="field-input" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label">Duration</label>
              <select value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} className="field-input">
                <option value={0}>None</option>
                {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R</span>
                <input type="number" value={form.priceCents} onChange={(e) => set("priceCents", e.target.value)}
                  min={0} step={0.01} className="field-input pl-7" />
              </div>
            </div>
            <div>
              <label className="field-label">Max qty</label>
              <input type="number" value={1} min={1} className="field-input" readOnly />
            </div>
          </div>
          <div>
            <div className="mb-1 flex gap-px overflow-hidden rounded-xl border border-gray-200">
              <button className="flex-1 bg-white py-2 text-xs font-bold text-[var(--brand)]">Text</button>
              <button className="flex-1 bg-gray-50 py-2 text-xs font-semibold text-gray-400">HTML</button>
            </div>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} placeholder="Description (optional)"
              className="field-input resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Close
          </button>
          <button onClick={save} disabled={loading || !form.name} className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main service form modal ──────────────────────────────────────────────────
function ServiceFormModal({
  service, profileId, onClose, onSaved
}: {
  service?: Service | null;
  profileId: string;
  onClose: () => void;
  onSaved: (s: Service) => void;
}) {
  const [tab, setTab] = useState<TabId>("details");
  const [form, setForm] = useState({
    name: service?.name ?? "",
    category: service?.category ?? "Hair",
    durationMinutes: service?.durationMinutes ?? 60,
    priceCents: service ? service.priceCents / 100 : 0,
    depositCents: service ? service.depositCents : 0,
    depositIsPercent: service?.depositIsPercent ?? false,
    active: service?.active ?? true,
    description: "",
    color: "#D94472",
  });
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

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function loadExtras() {
    if (!service || extrasLoaded) return;
    const res = await fetch(`/api/dashboard/services/${service.id}/extras`);
    if (res.ok) { const d = await res.json(); setExtras(d.extras ?? []); }
    setExtrasLoaded(true);
  }

  function handleTabChange(t: TabId) {
    setTab(t);
    if (t === "extras") loadExtras();
  }

  async function handleSave() {
    const hasName = form.name.trim().length > 0;
    const hasDuration = form.durationMinutes > 0;
    setNameError(!hasName);
    setDurationError(!hasDuration);
    if (!hasName || !hasDuration) { setTab(!hasName ? "details" : "pricing"); return; }

    setLoading(true); setError("");
    const url = service ? `/api/dashboard/services/${service.id}` : "/api/dashboard/services";
    const method = service ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        name: form.name.trim(),
        category: form.category,
        durationMinutes: Number(form.durationMinutes),
        priceCents: Math.round(Number(form.priceCents) * 100),
        // percentage: store as integer 0-100; fixed: store in cents
        depositCents: form.depositIsPercent
          ? Math.min(100, Math.max(0, Math.round(Number(form.depositCents))))
          : Math.round(Number(form.depositCents) * 100),
        depositIsPercent: form.depositIsPercent,
        active: form.active,
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    onSaved(data.service);
    onClose();
  }

  const filteredExtras = extras.filter((e) =>
    !extraSearch || e.name.toLowerCase().includes(extraSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-full w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <span>Services</span>
            <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-gray-300" />
            <span className="font-black text-gray-900">{service ? service.name : "New service"}</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left sidebar tabs ── */}
          <div className="w-52 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50/50 py-3">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => handleTabChange(id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors",
                  tab === id
                    ? "bg-[var(--brand)]/8 text-[var(--brand)]"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                )}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}

            <div className="mx-4 mt-6 rounded-xl bg-indigo-50 p-3">
              <p className="mb-1 text-xs font-black text-indigo-700">Tips & suggestions</p>
              <button className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm">
                Services setup <ChevronDown className="h-3 w-3 -rotate-90" />
              </button>
            </div>
          </div>

          {/* ── Tab content ── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

              {/* DETAILS */}
              {tab === "details" && (
                <div className="space-y-5">
                  {/* Image + Name row */}
                  <div className="flex items-start gap-4">
                    {/* Thumbnail upload */}
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
                              placeholder="Name"
                              className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none" />
                          </div>
                          {nameError && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-red-400 text-[9px]">!</span>
                              Please enter a service name.
                            </p>
                          )}
                        </div>
                        {/* Color */}
                        <div className="relative">
                          <div className="rounded-xl border border-gray-200 px-3 py-2.5 text-[10px] font-bold text-gray-500 focus-within:border-[var(--brand)]">
                            <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-red-400">*</span>
                            <p className="text-[10px] text-gray-400">Color</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="text-sm font-mono font-bold text-gray-700">{form.color}</span>
                              <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)}
                                className="h-6 w-6 cursor-pointer rounded-full border-0 p-0" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="relative">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-red-400">*</span>
                        <div className="relative rounded-xl border border-gray-200 focus-within:border-[var(--brand)]">
                          <select value={form.category} onChange={(e) => set("category", e.target.value)}
                            className="w-full appearance-none rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none">
                            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>

                      {/* Employees */}
                      <div className="relative">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-red-400">*</span>
                        <div className="relative rounded-xl border border-gray-200 focus-within:border-[var(--brand)]">
                          <select className="w-full appearance-none rounded-xl bg-transparent px-3 py-2.5 text-sm text-gray-400 outline-none">
                            <option value="">Employees</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-amber-400 text-[9px]">!</span>
                          Please select at least one employee.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Show on website */}
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <button onClick={() => set("active", !form.active)}
                      className={cn("relative h-6 w-11 rounded-full transition-colors", form.active ? "bg-[var(--brand)]" : "bg-gray-300")}>
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
                          <option>Disabled</option>
                          <option>Weekly</option>
                          <option>Monthly</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Limit appointments per customer */}
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                    <button className="relative h-6 w-11 rounded-full bg-gray-300 transition-colors">
                      <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700">Limit appointments per customer</span>
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-400">?</span>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="mb-1 flex overflow-hidden rounded-t-xl border border-b-0 border-gray-200">
                      <button className="flex-1 bg-white py-2 text-xs font-bold text-[var(--brand)]">Text</button>
                      <button className="flex-1 border-l border-gray-200 bg-gray-50 py-2 text-xs font-semibold text-gray-400">HTML</button>
                    </div>
                    <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
                      rows={4} placeholder="Description (optional)"
                      className="w-full resize-none rounded-b-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[var(--brand)]" />
                    {/* Minimal formatting toolbar */}
                    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-t-0 border-gray-200 bg-gray-50 px-3 py-2">
                      {["B", "I", "U"].map((f) => (
                        <button key={f} className="h-6 w-6 rounded text-xs font-bold text-gray-500 hover:bg-gray-200" style={{ fontStyle: f === "I" ? "italic" : "normal", textDecoration: f === "U" ? "underline" : "none" }}>{f}</button>
                      ))}
                      <div className="mx-1 h-4 w-px bg-gray-200" />
                      <span className="text-xs font-semibold text-gray-400">Paragraph</span>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                      <span className="ml-1 text-xs font-semibold text-gray-400">Sans Serif</span>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* PRICING & DURATION */}
              {tab === "pricing" && (
                <div className="space-y-5">
                  {/* Duration + Price */}
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
                      {durationError && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-red-400 text-[9px]">!</span>
                          Please select a duration.
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="relative rounded-xl border border-gray-200 bg-white focus-within:border-[var(--brand)]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R</span>
                        <input type="number" value={form.priceCents} onChange={(e) => set("priceCents", e.target.value)}
                          min={0} step={0.01} placeholder="0.00"
                          className="w-full rounded-xl bg-transparent py-2.5 pl-8 pr-3 text-sm outline-none" />
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-500">Price</span>
                      </div>
                    </div>
                  </div>

                  {/* Buffer time */}
                  <div className="grid grid-cols-2 gap-4">
                    {["Buffer time before", "Buffer time after"].map((label) => (
                      <div key={label} className="relative rounded-xl border border-gray-200 focus-within:border-[var(--brand)]">
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-500 flex items-center gap-1">
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-300 text-[9px] text-gray-400">?</span>
                          {label}
                        </span>
                        <select className="w-full appearance-none rounded-xl bg-transparent px-3 py-2.5 text-sm text-gray-400 outline-none">
                          <option value="">None</option>
                          {[5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    ))}
                  </div>

                  {/* Capacity */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Minimum capacity", value: 1 },
                      { label: "Maximum capacity", value: 1 }
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-gray-200 px-4 py-3">
                        <p className="mb-2 flex items-center gap-1 text-xs font-bold text-gray-500">
                          {label}
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[9px] text-gray-400">?</span>
                        </p>
                        <div className="flex items-center gap-3">
                          <button className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-gray-400">–</button>
                          <span className="flex-1 text-center text-sm font-bold">{value}</span>
                          <button className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-gray-400">+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Deposit */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Deposit type</span>
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-bold">
                        <button type="button"
                          onClick={() => set("depositIsPercent", false)}
                          className={`px-3 py-1.5 transition ${!form.depositIsPercent ? "bg-[var(--brand)] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                          Fixed (R)
                        </button>
                        <button type="button"
                          onClick={() => set("depositIsPercent", true)}
                          className={`px-3 py-1.5 transition ${form.depositIsPercent ? "bg-[var(--brand)] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                          Percentage (%)
                        </button>
                      </div>
                    </div>
                    <div className="relative rounded-xl border border-gray-200 bg-white focus-within:border-[var(--brand)]">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-500">
                        {form.depositIsPercent ? "Deposit % of total (incl. extras)" : "Deposit amount (R)"}
                      </span>
                      <div className="flex items-center">
                        {!form.depositIsPercent && <span className="pl-3 text-sm text-gray-400">R</span>}
                        <input type="number" value={form.depositCents} onChange={(e) => set("depositCents", e.target.value)}
                          min={0} max={form.depositIsPercent ? 100 : undefined} step={form.depositIsPercent ? 1 : 0.01}
                          className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none" />
                        {form.depositIsPercent && <span className="pr-3 text-sm text-gray-400">%</span>}
                      </div>
                    </div>
                    {form.depositIsPercent && (
                      <p className="text-xs text-gray-400">Calculated at booking time from the service price + any extras selected.</p>
                    )}
                  </div>

                  {/* Pricing by date & time */}
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                    <button className="relative h-6 w-11 rounded-full bg-gray-300 transition-colors">
                      <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700">Pricing by date &amp; time</span>
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-400">?</span>
                  </div>
                </div>
              )}

              {/* EXTRAS */}
              {tab === "extras" && (
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input value={extraSearch} onChange={(e) => setExtraSearch(e.target.value)}
                        placeholder="Search"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
                    </div>
                    <button onClick={() => setExtraModal("new")}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:opacity-90">
                      <Plus className="h-3.5 w-3.5" /> Extra
                    </button>
                  </div>
                  {!service && (
                    <div className="flex flex-col items-center py-12 text-center">
                      <p className="text-sm text-gray-400">Save the service first to add extras.</p>
                    </div>
                  )}
                  {service && !extrasLoaded && (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                    </div>
                  )}
                  {service && extrasLoaded && filteredExtras.length === 0 && (
                    <div className="flex flex-col items-center py-12 text-center">
                      <p className="text-sm text-gray-400">No extras yet.</p>
                      <button onClick={() => setExtraModal("new")} className="mt-2 text-sm font-bold text-[var(--brand)] hover:underline">
                        Add your first extra
                      </button>
                    </div>
                  )}
                  {filteredExtras.map((extra) => (
                    <div key={extra.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 mb-2 shadow-sm">
                      <div>
                        <p className="text-sm font-bold">{extra.name}</p>
                        <p className="text-xs text-gray-400">
                          {extra.durationMinutes > 0 && `${extra.durationMinutes} min · `}
                          {formatZAR(extra.priceCents)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setExtraModal(extra)} className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-400">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={async () => {
                          if (!confirm("Delete this extra?")) return;
                          await fetch(`/api/dashboard/services/${service!.id}/extras/${extra.id}`, { method: "DELETE" });
                          setExtras((prev) => prev.filter((e) => e.id !== extra.id));
                        }} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* GALLERY */}
              {tab === "gallery" && (
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input placeholder="Search" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
                    </div>
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:opacity-90">
                      <Plus className="h-3.5 w-3.5" /> Upload
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;
                      setUploading(true);
                      const urls: string[] = [];
                      for (const file of files) {
                        const fd = new FormData(); fd.append("file", file);
                        const r = await fetch("/api/upload", { method: "POST", body: fd });
                        if (r.ok) { const d = await r.json(); urls.push(d.url); }
                      }
                      setGalleryImages((prev) => [...prev, ...urls]);
                      setUploading(false);
                      e.target.value = "";
                    }} />
                  </div>

                  {uploading && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                    </div>
                  )}

                  {galleryImages.length === 0 ? (
                    <button onClick={() => fileRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-gray-400 transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                      <ArrowUpFromLine className="h-8 w-8" />
                      <p className="text-sm font-semibold">Click to upload</p>
                      <p className="text-xs">JPG, PNG, JPEG</p>
                    </button>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {galleryImages.map((url, i) => (
                        <div key={i} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full object-cover" />
                          <button onClick={() => setGalleryImages((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                            <Trash2 className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => fileRef.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[var(--brand)] hover:text-[var(--brand)]">
                        <Plus className="h-5 w-5" />
                        <span className="text-xs font-semibold">Add</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS */}
              {tab === "settings" && (
                <div className="flex flex-col items-center py-12 text-center text-gray-400">
                  <Settings className="mb-3 h-10 w-10 text-gray-200" />
                  <p className="text-sm font-semibold">Advanced settings coming soon.</p>
                </div>
              )}
            </div>

            {/* ── Footer actions ── */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
              <button onClick={onClose}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Close
              </button>
              <button onClick={handleSave} disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Extra modal */}
      {extraModal !== null && (
        <ExtraModal
          extra={extraModal === "new" ? null : extraModal}
          serviceId={service?.id ?? null}
          onClose={() => setExtraModal(null)}
          onSaved={(e) => setExtras((prev) => {
            const idx = prev.findIndex((x) => x.id === e.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = e; return next; }
            return [...prev, e];
          })}
        />
      )}
    </div>
  );
}

// ── CatalogView ──────────────────────────────────────────────────────────────
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
      <style>{`
        .field-label { display:block; font-size:0.625rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#6B7280; margin-bottom:0.375rem; }
        .field-input { width:100%; border-radius:0.75rem; border:1px solid #E5E7EB; background:#F9FAFB; padding:0.625rem 0.75rem; font-size:0.875rem; font-weight:500; outline:none; transition:border-color 0.15s; }
        .field-input:focus { border-color:var(--brand); background:white; }
      `}</style>

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
            <button key={t} className={cn("border-b-2 px-4 py-3 text-sm font-semibold transition", i === 0 ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-gray-400 hover:text-gray-600")}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: category sidebar */}
          <div className="w-52 shrink-0 overflow-y-auto border-r border-gray-100 bg-white p-3">
            <button onClick={() => setModal("new")}
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] py-2 text-xs font-bold text-white hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add category
            </button>
            <div className="rounded-xl bg-[var(--brand)]/8 px-3 py-2">
              <p className="text-xs font-bold text-[var(--brand)]">All services</p>
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
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
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
                          <div className="h-7 w-7 rounded-full bg-[var(--brand)]/10" />
                          <span className="font-semibold">{svc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{svc.durationMinutes >= 60 ? `${Math.floor(svc.durationMinutes / 60)}h${svc.durationMinutes % 60 ? ` ${svc.durationMinutes % 60}min` : ""}` : `${svc.durationMinutes}min`}</td>
                      <td className="px-4 py-3 font-semibold">{formatZAR(svc.priceCents)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {svc.depositIsPercent ? `${svc.depositCents}%` : formatZAR(svc.depositCents)}
                      </td>
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
                  <button onClick={() => setModal("new")} className="mt-3 text-sm font-bold text-[var(--brand)] hover:underline">
                    Add your first service
                  </button>
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
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
