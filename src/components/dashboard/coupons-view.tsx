"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Ticket, Plus, Trash2, Loader2, Info } from "lucide-react";

type Coupon = {
  id: string; code: string; discountType: "PERCENT" | "FIXED"; discountValue: number;
  maxRedemptions: number | null; redemptions: number; expiresAt: string | null; active: boolean;
};

const fmtValue = (c: Coupon) => c.discountType === "PERCENT" ? `${c.discountValue}% off` : `R${Math.round(c.discountValue / 100)} off`;

export function CouponsView({ allowed, coupons: initial }: { allowed: boolean; coupons: Coupon[] }) {
  const [coupons, setCoupons] = useState(initial);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/dashboard/coupons", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, discountType, discountValue, maxRedemptions: maxRedemptions || null, expiresAt: expiresAt || null })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not create coupon");
      setCoupons((p) => [d.coupon, ...p]);
      setCode(""); setDiscountValue(""); setMaxRedemptions(""); setExpiresAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  async function toggle(c: Coupon) {
    const res = await fetch(`/api/dashboard/coupons/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active })
    });
    if (res.ok) setCoupons((p) => p.map((x) => x.id === c.id ? { ...x, active: !x.active } : x));
  }

  async function remove(id: string) {
    await fetch(`/api/dashboard/coupons/${id}`, { method: "DELETE" });
    setCoupons((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D94472]/10">
            <Ticket className="h-5 w-5 text-[#D94472]" />
          </div>
          <div>
            <h1 className="text-xl font-black">Coupons</h1>
            <p className="text-xs text-gray-500">Discount codes clients can redeem at checkout</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {!allowed ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-amber-800">Coupons are managed at company level</p>
              <p className="mt-1 text-sm text-amber-700">As an agent you can't create coupons — your business owner manages discount codes for the company.</p>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={create} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-[#D94472]" /><h2 className="font-black">New coupon</h2></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Code</label>
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="WELCOME10"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm uppercase outline-none focus:border-[#D94472] focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Type</label>
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#D94472] focus:bg-white">
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED">Fixed amount (R)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{discountType === "PERCENT" ? "Percent off" : "Rand off"}</label>
                  <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} type="number" min={1} required placeholder={discountType === "PERCENT" ? "10" : "50"}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Max redemptions (optional)</label>
                  <input value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} type="number" min={1} placeholder="Unlimited"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Expires (optional)</label>
                  <input value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} type="date"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
                </div>
              </div>
              {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}
              <button type="submit" disabled={creating}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#D94472] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#9f2852] disabled:opacity-60">
                {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create coupon
              </button>
            </form>

            {coupons.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {coupons.map((c) => (
                  <div key={c.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${c.active ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-lg font-black">{c.code}</p>
                        <p className="text-sm font-bold text-[#D94472]">{fmtValue(c)}</p>
                      </div>
                      <button onClick={() => remove(c.id)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      <p>Redeemed: {c.redemptions}{c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}</p>
                      {c.expiresAt && <p>Expires {format(new Date(c.expiresAt), "d MMM yyyy")}</p>}
                    </div>
                    <button onClick={() => toggle(c)}
                      className={`mt-3 w-full rounded-lg border py-1.5 text-xs font-bold ${c.active ? "border-gray-200 text-gray-600 hover:bg-gray-50" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"}`}>
                      {c.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">No coupons yet — create one above.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
