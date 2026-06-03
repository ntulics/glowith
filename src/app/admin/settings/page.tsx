"use client";

import { useEffect, useState } from "react";
import { Loader2, Percent, CheckCircle2, Crown } from "lucide-react";

const PLANS = [
  { name: "Starter", price: "Free", tagline: "For getting started", features: ["Public storefront & portfolio", "Bookings & calendar", "Glowith collects the platform deposit %", "Community support"] },
  { name: "Pro", price: "R299 / mo", tagline: "For growing freelancers & salons", features: ["Everything in Starter", "Keep 100% — no platform deposit cut", "Custom branding", "All integrations & analytics"], highlight: true },
  { name: "Business", price: "R799 / mo", tagline: "For teams & multi-location", features: ["Everything in Pro", "Multi-agent management", "Company portfolio & approvals", "Priority support & API access"] }
];

export default function AdminSettingsPage() {
  const [depositPercent, setDepositPercent] = useState("20");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => {
      if (d.depositPercent != null) setDepositPercent(String(d.depositPercent));
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositPercent })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-xl font-black">Platform Settings</h1>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Deposit percentage */}
        <div className="max-w-lg rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <Percent className="h-4 w-4 text-[#D94472]" />
            <h2 className="font-black">Deposit percentage</h2>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            The percentage of a booking&apos;s price that Glowith collects upfront as a deposit, via the configured
            payment gateway. Applies to providers on the free <b>Starter</b> plan. Paid plans keep 100%.
          </p>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 focus-within:border-[#D94472]">
                <input value={depositPercent} onChange={(e) => setDepositPercent(e.target.value)} type="number" min={0} max={100}
                  className="w-20 bg-transparent py-2.5 text-sm font-bold outline-none" />
                <span className="text-sm font-bold text-gray-400">%</span>
              </div>
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
              {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
            </div>
          )}
          {error && <p className="mt-2 text-sm font-semibold text-red-500">{error}</p>}
        </div>

        {/* Plans overview */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-[#D94472]" />
            <h2 className="font-black">Plans</h2>
            <span className="text-xs text-gray-400">Billed via the platform payment gateway · assign a provider&apos;s plan from the Providers table</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className={`rounded-2xl border bg-white p-5 shadow-sm ${p.highlight ? "border-[#D94472]" : "border-gray-100"}`}>
                {p.highlight && <span className="mb-2 inline-block rounded-full bg-[#D94472]/10 px-2 py-0.5 text-[10px] font-bold text-[#D94472]">Most popular</span>}
                <p className="text-lg font-black">{p.name}</p>
                <p className="text-2xl font-black">{p.price}</p>
                <p className="mb-3 text-xs text-gray-500">{p.tagline}</p>
                <ul className="space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
