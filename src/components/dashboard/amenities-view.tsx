"use client";

import { useEffect, useState } from "react";
import {
  Accessibility, ArrowUpDown, Award, Baby, Bath, BellRing, Camera,
  Car, Coffee, Cookie, Candy, Droplets, Flame, Gift, GlassWater,
  HeartPulse, Home, Lamp, Layers, Leaf, Lock, MapPin, Music,
  Package, PawPrint, Save, ShieldCheck, ShowerHead, Sofa, Sparkles,
  Sun, Thermometer, Thermometer as ThermometerIcon, TreePine, Tv, User,
  Users, VolumeX, Wind, Wifi, Zap, Loader2, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AMENITY_CATEGORIES, type AmenityDef } from "@/lib/amenities";

// ── Icon resolver ────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Accessibility, ArrowUpDown, Award, Baby, Bath, BellRing, Camera,
  Car, Coffee, Cookie, Candy, Droplets, Flame, Gift, GlassWater,
  HeartPulse, Home, Lamp, Layers, Leaf, Lock, MapPin, Music,
  Package, PawPrint, ShieldCheck, ShowerHead, Sofa, Sparkles,
  Sun, Thermometer: ThermometerIcon, TreePine, Tv, User,
  Users, VolumeX, Wind, Wifi, Zap
};

function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Sparkles;
  return <Icon className={className} />;
}

type AmenityState = Record<string, { checked: boolean; value: string }>;

function buildInitialState(saved: Array<{ key: string; value: string | null }>): AmenityState {
  return Object.fromEntries(
    saved.map((a) => [a.key, { checked: true, value: a.value ?? "" }])
  );
}

export function AmenitiesView() {
  const [state, setState] = useState<AmenityState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/providers/amenities")
      .then((r) => r.json())
      .then((d) => {
        setState(buildInitialState(d.amenities ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggle(key: string) {
    setState((prev) => {
      const cur = prev[key];
      if (cur) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { checked: true, value: "" } };
    });
  }

  function setValue(key: string, value: string) {
    setState((prev) => ({ ...prev, [key]: { checked: true, value } }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const amenities = Object.entries(state).map(([key, v]) => ({ key, value: v.value || null }));
    await fetch("/api/providers/amenities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amenities })
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const selectedCount = Object.keys(state).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--ink)]">Studio amenities</h1>
          <p className="text-sm text-[var(--muted)]">
            Let clients know what to expect. {selectedCount} feature{selectedCount !== 1 ? "s" : ""} selected.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition",
            saved ? "bg-emerald-500" : "bg-[var(--brand)] hover:bg-[var(--brand-dark)]",
            saving && "opacity-70"
          )}
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 className="h-4 w-4" /> Saved!</>
          ) : (
            <><Save className="h-4 w-4" /> Save amenities</>
          )}
        </button>
      </div>

      {/* Category sections */}
      {AMENITY_CATEGORIES.map((cat) => (
        <section key={cat.key}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
            {cat.label}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {cat.amenities.map((amenity) => (
              <AmenityCard
                key={amenity.key}
                amenity={amenity}
                checked={!!state[amenity.key]}
                value={state[amenity.key]?.value ?? ""}
                onToggle={() => toggle(amenity.key)}
                onValueChange={(v) => setValue(amenity.key, v)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Sticky save bar for mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/90 px-4 py-3 backdrop-blur-sm sm:hidden">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition",
            saved ? "bg-emerald-500" : "bg-[var(--brand)] hover:bg-[var(--brand-dark)]"
          )}
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> :
           saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> :
           <><Save className="h-4 w-4" /> Save amenities ({selectedCount})</>}
        </button>
      </div>
    </div>
  );
}

function AmenityCard({
  amenity, checked, value, onToggle, onValueChange
}: {
  amenity: AmenityDef;
  checked: boolean;
  value: string;
  onToggle: () => void;
  onValueChange: (v: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative flex items-start gap-3 rounded-2xl border p-3.5 text-left transition",
        checked
          ? "border-[var(--brand)] bg-[var(--brand)]/5"
          : "border-[var(--line)] bg-white hover:border-[var(--brand)]/40"
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition",
        checked ? "bg-[var(--brand)] text-white" : "bg-[var(--background)] text-[var(--muted)]"
      )}>
        <AmenityIcon name={amenity.icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold leading-snug", checked ? "text-[var(--brand)]" : "text-[var(--ink)]")}>
          {amenity.label}
        </p>
        {amenity.hasValue && checked && (
          <div
            className="mt-2 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              inputMode="numeric"
              placeholder={amenity.valuePlaceholder}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              className="w-20 rounded-lg border border-[var(--line)] px-2 py-1 text-xs outline-none focus:border-[var(--brand)]"
            />
            {amenity.valueSuffix && (
              <span className="text-xs text-[var(--muted)]">{amenity.valueSuffix}</span>
            )}
          </div>
        )}
      </div>
      {/* Checkmark */}
      <div className={cn(
        "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition",
        checked ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[var(--line)] bg-white"
      )}>
        {checked && <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-2"><polyline points="1,4 4,7 9,1" /></svg>}
      </div>
    </button>
  );
}
