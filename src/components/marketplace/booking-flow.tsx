"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock3, Loader2, Plus, Star, UserCheck, X } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
type Service = { id: string; name: string; category?: string; durationMinutes: number; priceCents: number; depositCents: number; performer?: string | null };
type Busy = { start: string; durationMinutes: number };
type Agent = { id: string; name: string; avatarUrl: string | null; category: string; serviceCategories: string[] };

const ZAR = (c: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);
const fmtDur = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`);

/** Role label shown in the "preferred artist" step header. */
function roleLabel(categories: string[]): string {
  const joined = categories.join(" ").toLowerCase();
  if (/hair/.test(joined)) return "Hair Stylist";
  if (/nail/.test(joined)) return "Nail Technician";
  if (/makeup|beauty|make.up/.test(joined)) return "Makeup Artist";
  if (/braid|loc|twist/.test(joined)) return "Braiding Specialist";
  if (/lash|lashes/.test(joined)) return "Lash Technician";
  if (/skin|facial|wax/.test(joined)) return "Beauty Therapist";
  if (/massage|body/.test(joined)) return "Massage Therapist";
  if (/barber|beard|shave/.test(joined)) return "Barber";
  return "Artist";
}

const SLOTS = Array.from({ length: 20 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  return { h: Math.floor(mins / 60), m: mins % 60, label: `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}` };
});

function nextDays(n: number) {
  const out: Date[] = [];
  const d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) { const x = new Date(d); x.setDate(d.getDate() + i); out.push(x); }
  return out;
}

type Step = "service" | "artist" | "date" | "time" | "auth" | "review" | "pay" | "done";

/* ── Component ──────────────────────────────────────────────────── */
export function BookingFlow({
  open, onClose,
  providerProfileId, providerName, services, preselectedServiceId,
  preselectedDate, preselectedSlot,
  providerRating, providerReviewCount, providerAvatarUrl
}: {
  open: boolean; onClose: () => void;
  providerProfileId: string; providerName: string;
  services: Service[]; preselectedServiceId?: string | null;
  /** Pre-fill date + time (e.g. from calendar) — skips date & time steps */
  preselectedDate?: Date | null;
  preselectedSlot?: string | null;
  providerRating?: number;
  providerReviewCount?: number;
  providerAvatarUrl?: string | null;
}) {
  const hasPreselectedDateTime = !!(preselectedDate && preselectedSlot);

  const [step, setStep] = useState<Step>("service");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [serviceCat, setServiceCat] = useState("All");
  const [date, setDate] = useState<Date | null>(preselectedDate ?? null);
  const [slot, setSlot] = useState<string | null>(preselectedSlot ?? null);
  const [busy, setBusy] = useState<Busy[]>([]);
  const [notes, setNotes] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [authName, setAuthName] = useState(""); const [authEmail, setAuthEmail] = useState(""); const [authPassword, setAuthPassword] = useState("");
  const [busyLoading, setBusyLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountCents, setDiscountCents] = useState(0);
  const [couponLabel, setCouponLabel] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [payInfo, setPayInfo] = useState<{ bookingId: string; reference: string; publicKey: string; email: string; amountCents: number } | null>(null);
  const [payError, setPayError] = useState("");
  const payMountedRef = useRef(false);
  const popupRef = useRef<any>(null);

  // Artist / staff selection
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null); // null = no preference

  const selectedServices = useMemo(() => services.filter((s) => selectedIds.includes(s.id)), [services, selectedIds]);
  const totalDuration = selectedServices.reduce((a, s) => a + s.durationMinutes, 0);
  const totalPrice = selectedServices.reduce((a, s) => a + s.priceCents, 0);
  const totalDeposit = selectedServices.reduce((a, s) => a + (s.depositCents ?? 0), 0);
  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category).filter(Boolean) as string[]);
    return ["All", ...Array.from(set)];
  }, [services]);
  const catServices = serviceCat === "All" ? services : services.filter((s) => s.category === serviceCat);
  const selectedCategories = useMemo(() => [...new Set(selectedServices.map((s) => s.category).filter(Boolean) as string[])], [selectedServices]);

  // The provider ID actually used for the booking (may be an agent's ID)
  const activeProviderId = selectedAgent?.id ?? providerProfileId;
  const activeProviderName = selectedAgent?.name ?? providerName;

  function toggleService(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setError("");
    setSelectedIds(preselectedServiceId ? [preselectedServiceId] : []);
    setDate(preselectedDate ?? null);
    setSlot(preselectedSlot ?? null);
    setNotes(""); setServiceCat("All");
    setSelectedAgent(null);
    setAgents([]);
    // Choose initial step
    if (preselectedServiceId && hasPreselectedDateTime) {
      setStep("service"); // still need to confirm service; will auto-advance after agent check
    } else if (preselectedServiceId) {
      setStep("date");
    } else {
      setStep("service");
    }
    fetch("/api/auth/session").then((r) => r.json()).then((s) => setAuthed(!!s?.user)).catch(() => setAuthed(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch agents when provider is known (once per open)
  useEffect(() => {
    if (!open || agents.length > 0 || agentsLoading) return;
    setAgentsLoading(true);
    fetch(`/api/providers/agents?providerProfileId=${providerProfileId}`)
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, [open, providerProfileId, agents.length, agentsLoading]);

  // Load busy slots
  useEffect(() => {
    if (!date) return;
    setBusyLoading(true);
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    fetch(`/api/bookings/availability?providerProfileId=${activeProviderId}&date=${ds}`)
      .then((r) => r.json())
      .then((d) => setBusy(d.busy ?? []))
      .catch(() => setBusy([]))
      .finally(() => setBusyLoading(false));
  }, [date, activeProviderId]);

  function afterServiceStep() {
    if (agents.length > 1) {
      setStep("artist");
    } else if (hasPreselectedDateTime) {
      setStep(authed === false ? "auth" : "review");
    } else {
      setStep("date");
    }
  }

  function afterArtistStep() {
    if (hasPreselectedDateTime) {
      setStep(authed === false ? "auth" : "review");
    } else {
      setStep("date");
    }
  }

  async function onPaid() {
    if (!payInfo) return;
    await fetch("/api/payments/paystack/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: payInfo.reference })
    });
    setStep("done");
  }

  function openCheckout() {
    const popup = popupRef.current;
    if (!popup || !payInfo) { setPayError("Payment is still loading — try again in a moment"); return; }
    const opts: any = {
      key: payInfo.publicKey, email: payInfo.email, amount: payInfo.amountCents,
      currency: "ZAR", reference: payInfo.reference, ref: payInfo.reference,
      onSuccess: onPaid, onLoad: () => {}, onCancel: () => {}, onClose: () => {}
    };
    try {
      if (typeof popup.newTransaction === "function") popup.newTransaction(opts);
      else if (typeof popup.checkout === "function") popup.checkout(opts);
      else setPayError("Could not open checkout");
    } catch { setPayError("Could not open checkout"); }
  }

  useEffect(() => {
    if (!open || step !== "pay" || !payInfo || payMountedRef.current) return;
    payMountedRef.current = true;
    function mount() {
      const Pop = (window as any).PaystackPop;
      if (!Pop) { setPayError("Could not load the payment widget"); return; }
      popupRef.current = new Pop();
      try {
        popupRef.current.paymentRequest?.({
          key: payInfo!.publicKey, email: payInfo!.email, amount: payInfo!.amountCents,
          currency: "ZAR", ref: payInfo!.reference, container: "paystack-apple-pay",
          style: { theme: "light", applePay: { width: "100%", borderRadius: "10px", type: "pay", locale: "en" } },
          onSuccess: onPaid, onError: () => {}, onCancel: () => {}
        });
      } catch { /* Apple Pay unavailable */ }
    }
    if ((window as any).PaystackPop) { mount(); return; }
    const existing = document.getElementById("paystack-inline-js");
    if (existing) { existing.addEventListener("load", mount); return; }
    const s = document.createElement("script");
    s.id = "paystack-inline-js"; s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = mount; s.onerror = () => setPayError("Could not load Paystack");
    document.body.appendChild(s);
  }, [open, step, payInfo]);

  if (!open) return null;

  function slotDate(hhmm: string): Date {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(date!); d.setHours(h, m, 0, 0); return d;
  }
  function slotDisabled(hhmm: string): boolean {
    if (!date || totalDuration === 0) return true;
    const start = slotDate(hhmm);
    if (start.getTime() < Date.now()) return true;
    const end = start.getTime() + totalDuration * 60000;
    if (start.getHours() * 60 + start.getMinutes() + totalDuration > 18 * 60) return true;
    return busy.some((b) => {
      const bs = new Date(b.start).getTime(); const be = bs + b.durationMinutes * 60000;
      return start.getTime() < be && end > bs;
    });
  }

  async function doAuth() {
    setError(""); setSubmitting(true);
    try {
      if (authMode === "register") {
        const r = await fetch("/api/auth/register-client", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: authName, email: authEmail, password: authPassword })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Could not create account");
      }
      const res = await signIn("credentials", { email: authEmail, password: authPassword, redirect: false });
      if (res?.error) throw new Error("Invalid email or password");
      setAuthed(true);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirm() {
    if (!selectedServices.length || !date || !slot) return;
    setError(""); setSubmitting(true);
    try {
      const startsAt = slotDate(slot).toISOString();
      const res = await fetch("/api/bookings/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerProfileId: activeProviderId,
          serviceIds: selectedIds, startsAt, notes, couponCode: appliedCode
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not create booking");

      if (d.booking.depositCents > 0) {
        const prep = await fetch("/api/payments/paystack/prepare", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: d.booking.id })
        });
        const pd = await prep.json();
        if (!prep.ok) throw new Error(pd.error ?? "Payment could not be started");
        if (pd.simulated) { setStep("done"); return; }
        const host = typeof window !== "undefined" ? window.location.host : "";
        if (host.endsWith("glowith.co.za")) {
          const ret = encodeURIComponent(window.location.href);
          window.location.href = `https://glowith.co.za/pay?ref=${encodeURIComponent(pd.reference)}&return=${ret}`;
          return;
        }
        payMountedRef.current = false;
        setPayInfo({ bookingId: d.booking.id, reference: pd.reference, publicKey: pd.publicKey, email: pd.email, amountCents: pd.amountCents });
        setStep("pay");
        return;
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function releaseAndBack() {
    if (payInfo?.bookingId) await fetch(`/api/bookings/${payInfo.bookingId}`, { method: "DELETE" });
    payMountedRef.current = false;
    setPayInfo(null); setPayError(""); setStep("review");
  }

  async function applyCoupon() {
    if (!selectedServices.length || !couponInput.trim()) return;
    setApplyingCoupon(true); setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerProfileId: activeProviderId, code: couponInput.trim(), serviceId: selectedServices[0].id })
      });
      const d = await res.json();
      if (!d.valid) { setCouponError(d.error ?? "Invalid code"); setAppliedCode(null); setDiscountCents(0); return; }
      setAppliedCode(d.code); setDiscountCents(d.discountCents); setCouponLabel(d.label);
    } finally {
      setApplyingCoupon(false);
    }
  }

  function goAfterTime() { setStep(authed === false ? "auth" : "review"); }

  const stepsOrder: Step[] = [
    ...(preselectedServiceId ? [] : ["service" as Step]),
    ...(agents.length > 1 ? ["artist" as Step] : []),
    ...(hasPreselectedDateTime ? [] : ["date" as Step, "time" as Step]),
    ...(authed === false ? ["auth" as Step] : []),
    "review", "pay", "done"
  ];
  const progress = (stepsOrder.indexOf(step) + 1) / Math.max(stepsOrder.length, 1);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--background)]">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-[var(--line)] bg-white px-4 py-3 sm:px-8">
        {step === "service" ? (
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] hover:bg-[var(--background)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
            <motion.div className="h-full rounded-full bg-[var(--brand)]" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
        )}
        <h2 className="text-lg font-black">{step === "service" ? "Select services" : providerName}</h2>
        <button onClick={onClose} aria-label="Close" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] hover:bg-[var(--background)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Service selection ── */}
      {step === "service" ? (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-2xl font-black">{providerName}</h3>
            {categories.length > 1 && (
              <div className="mb-5 mt-3 flex gap-2 overflow-x-auto">
                {categories.map((c) => (
                  <button key={c} onClick={() => setServiceCat(c)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${serviceCat === c ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)]"}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-3">
              {catServices.map((s) => {
                const sel = selectedIds.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggleService(s.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-left transition ${sel ? "border-[var(--brand)] ring-1 ring-[var(--brand)]" : "border-[var(--line)] hover:border-[var(--ink)]"}`}>
                    <div className="min-w-0">
                      <p className="font-bold">{s.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{fmtDur(s.durationMinutes)}{s.performer ? ` · with ${s.performer}` : ""}</p>
                      <p className="mt-1 text-sm font-black">{ZAR(s.priceCents)}</p>
                    </div>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sel ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] text-[var(--muted)]"}`}>
                      {sel ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                );
              })}
              {catServices.length === 0 && <p className="py-12 text-center text-sm text-[var(--muted)]">No services in this category.</p>}
            </div>
          </div>

          {/* Summary sidebar */}
          <aside className="lg:w-80 lg:shrink-0">
            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm lg:sticky lg:top-4">
              {/* Provider card */}
              <div className="mb-4 flex items-center gap-3 border-b border-[var(--line)] pb-4">
                {providerAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={providerAvatarUrl} alt={providerName} className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">
                    {providerName[0]}
                  </div>
                )}
                <div>
                  <p className="font-black text-sm">{providerName}</p>
                  {providerRating !== undefined && (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={`h-3 w-3 ${n <= Math.round(providerRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                      ))}
                      <span className="text-xs text-[var(--muted)]">{providerRating.toFixed(1)}{providerReviewCount ? ` (${providerReviewCount})` : ""}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="font-black">{selectedAgent ? `With ${selectedAgent.name}` : "Your booking"}</p>
              {selectedServices.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">No services selected yet. Tap a service to add it.</p>
              ) : (
                <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
                  {selectedServices.map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-2 text-sm">
                      <span><span className="block font-semibold">{s.name}</span><span className="text-xs text-[var(--muted)]">{fmtDur(s.durationMinutes)}</span></span>
                      <span className="font-bold">{ZAR(s.priceCents)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
                <span className="font-black">Total</span>
                <span className="font-black">{ZAR(totalPrice)}</span>
              </div>
              <button onClick={afterServiceStep} disabled={!selectedServices.length}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] py-3.5 text-sm font-bold text-white transition hover:bg-[var(--ink)]/90 disabled:opacity-40">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </div>
      ) : (
        /* ── Other steps: centered ── */
        <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:items-center">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>

                {/* ── Artist selection ── */}
                {step === "artist" && (
                  <Section title={`Preferred ${roleLabel(selectedCategories)}?`} onBack={() => setStep("service")}>
                    <p className="mb-4 text-sm text-[var(--muted)]">
                      Choose a specific team member or leave it as no preference.
                    </p>
                    <div className="space-y-2">
                      {/* No preference option */}
                      <button
                        onClick={() => { setSelectedAgent(null); afterArtistStep(); }}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selectedAgent === null ? "border-[var(--brand)] ring-1 ring-[var(--brand)]" : "border-[var(--line)] bg-white hover:border-[var(--ink)]"}`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--muted)]">
                          <UserCheck className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-bold text-[var(--ink)]">No preference</p>
                          <p className="text-xs text-[var(--muted)]">We&apos;ll assign the best available artist</p>
                        </div>
                      </button>

                      {agentsLoading ? (
                        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" /></div>
                      ) : (
                        agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => { setSelectedAgent(agent); afterArtistStep(); }}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selectedAgent?.id === agent.id ? "border-[var(--brand)] ring-1 ring-[var(--brand)]" : "border-[var(--line)] bg-white hover:border-[var(--ink)]"}`}
                          >
                            {agent.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={agent.avatarUrl} alt={agent.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">
                                {agent.name[0]}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--ink)]">{agent.name}</p>
                              {agent.serviceCategories.length > 0 && (
                                <p className="text-xs text-[var(--muted)]">{agent.serviceCategories.join(", ")}</p>
                              )}
                            </div>
                            {selectedAgent?.id === agent.id && (
                              <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </Section>
                )}

                {/* ── Date ── */}
                {step === "date" && (
                  <Section title="Pick a day" onBack={agents.length > 1 ? () => setStep("artist") : (preselectedServiceId ? undefined : () => setStep("service"))}>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {nextDays(14).map((d) => {
                        const sel = date && d.toDateString() === date.toDateString();
                        return (
                          <button key={d.toISOString()} onClick={() => { setDate(d); setSlot(null); setStep("time"); }}
                            className={`rounded-2xl border p-3 text-center transition ${sel ? "border-[var(--brand)] bg-[var(--brand)]/5" : "border-[var(--line)] bg-white hover:border-[var(--brand)]"}`}>
                            <span className="block text-[10px] font-bold uppercase text-[var(--muted)]">{d.toLocaleDateString("en-ZA", { weekday: "short" })}</span>
                            <span className="block text-lg font-black">{d.getDate()}</span>
                            <span className="block text-[10px] text-[var(--muted)]">{d.toLocaleDateString("en-ZA", { month: "short" })}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* ── Time ── */}
                {step === "time" && (
                  <Section title="Choose a time" onBack={() => setStep("date")}>
                    {busyLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" /></div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {SLOTS.map((s) => {
                          const disabled = slotDisabled(s.label);
                          const sel = slot === s.label;
                          return (
                            <button key={s.label} disabled={disabled} onClick={() => setSlot(s.label)}
                              className={`rounded-xl border py-2.5 text-sm font-bold transition ${sel ? "border-[var(--brand)] bg-[var(--brand)] text-white" : disabled ? "cursor-not-allowed border-[var(--line)] bg-[var(--line)]/30 text-[var(--muted)]/40" : "border-[var(--line)] bg-white hover:border-[var(--brand)]"}`}>
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-3 text-center text-xs text-[var(--muted)]">Total time: {fmtDur(totalDuration)}</p>
                    <NextButton disabled={!slot} onClick={goAfterTime} />
                  </Section>
                )}

                {/* ── Auth ── */}
                {step === "auth" && (
                  <Section title="Sign in to confirm" onBack={() => setStep(hasPreselectedDateTime ? (agents.length > 1 ? "artist" : "service") : "time")}>
                    <div className="mb-4 flex gap-2">
                      <button onClick={() => setAuthMode("signin")} className={`flex-1 rounded-xl border py-2 text-sm font-bold ${authMode === "signin" ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-[var(--line)]"}`}>Sign in</button>
                      <button onClick={() => setAuthMode("register")} className={`flex-1 rounded-xl border py-2 text-sm font-bold ${authMode === "register" ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-[var(--line)]"}`}>Create account</button>
                    </div>
                    <div className="space-y-3">
                      {authMode === "register" && (
                        <input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Your name"
                          className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]" />
                      )}
                      <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} type="email" placeholder="Email"
                        className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]" />
                      <input value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} type="password" placeholder="Password"
                        className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]" />
                    </div>
                    <button onClick={doAuth} disabled={submitting || !authEmail || !authPassword || (authMode === "register" && !authName)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-50">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Continue
                    </button>
                  </Section>
                )}

                {/* ── Review ── */}
                {step === "review" && selectedServices.length > 0 && date && slot && (
                  <Section title="Review & confirm" onBack={() => setStep(authed === false ? "auth" : (hasPreselectedDateTime ? (agents.length > 1 ? "artist" : "service") : "time"))}>

                    {/* Provider card */}
                    <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white p-4">
                      <div className="flex items-center gap-3">
                        {(selectedAgent?.avatarUrl ?? providerAvatarUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={(selectedAgent?.avatarUrl ?? providerAvatarUrl)!} alt={activeProviderName} className="h-12 w-12 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand)] text-white font-bold">
                            {activeProviderName[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-black text-[var(--ink)]">{activeProviderName}</p>
                          {selectedAgent && (
                            <p className="text-xs text-[var(--muted)]">at {providerName}</p>
                          )}
                          {providerRating !== undefined && !selectedAgent && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {[1,2,3,4,5].map((n) => (
                                <Star key={n} className={`h-3 w-3 ${n <= Math.round(providerRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                              ))}
                              <span className="text-xs text-[var(--muted)]">{providerRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {agents.length > 1 && (
                        <button
                          onClick={() => setStep("artist")}
                          className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition"
                        >
                          Change
                        </button>
                      )}
                    </div>

                    {/* Booking details */}
                    <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5">
                      {selectedServices.map((s) => (
                        <Row key={s.id} label={s.name} value={ZAR(s.priceCents)} sub={fmtDur(s.durationMinutes)} />
                      ))}
                      <div className="border-t border-[var(--line)] pt-3">
                        <Row label="Date" value={date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} />
                        <Row label="Time" value={slot} />
                        <Row label="Duration" value={fmtDur(totalDuration)} />
                      </div>
                      {appliedCode && <Row label={`Coupon ${appliedCode} (${couponLabel})`} value={`– ${ZAR(discountCents)}`} highlight />}
                      <div className="border-t border-[var(--line)] pt-3">
                        <Row label="Total" value={ZAR(totalPrice - (appliedCode ? discountCents : 0))} bold />
                        {totalDeposit > 0 && <Row label="Deposit required at checkout" value={ZAR(totalDeposit)} highlight />}
                      </div>
                    </div>

                    {/* Coupon */}
                    <div className="mt-3">
                      {appliedCode ? (
                        <button onClick={() => { setAppliedCode(null); setDiscountCents(0); setCouponInput(""); }} className="text-xs font-bold text-[var(--brand)] hover:underline">Remove coupon</button>
                      ) : (
                        <div className="flex gap-2">
                          <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code"
                            className="flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm uppercase outline-none focus:border-[var(--brand)]" />
                          <button onClick={applyCoupon} disabled={applyingCoupon || !couponInput.trim()}
                            className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold hover:border-[var(--brand)] disabled:opacity-50">{applyingCoupon ? "…" : "Apply"}</button>
                        </div>
                      )}
                      {couponError && <p className="mt-1 text-xs font-semibold text-red-500">{couponError}</p>}
                    </div>

                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the provider should know? (optional)"
                      className="mt-3 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]" />

                    <button onClick={confirm} disabled={submitting}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white hover:bg-[var(--brand-dark)] disabled:opacity-50">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {totalDeposit > 0 ? "Continue to payment" : "Confirm booking"}
                    </button>
                  </Section>
                )}

                {/* ── Pay ── */}
                {step === "pay" && payInfo && (
                  <Section title="Pay your deposit" onBack={releaseAndBack}>
                    <div className="mb-4 space-y-2 rounded-2xl border border-[var(--line)] bg-white p-4">
                      {/* Provider + artist */}
                      <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
                        {(selectedAgent?.avatarUrl ?? providerAvatarUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={(selectedAgent?.avatarUrl ?? providerAvatarUrl)!} alt={activeProviderName} className="h-10 w-10 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)] text-white text-sm font-bold">{activeProviderName[0]}</div>
                        )}
                        <div>
                          <p className="text-sm font-black">{activeProviderName}</p>
                          {selectedAgent && <p className="text-xs text-[var(--muted)]">at {providerName}</p>}
                        </div>
                      </div>
                      {selectedServices.map((s) => <Row key={s.id} label={s.name} value={ZAR(s.priceCents)} />)}
                      {date && slot && <Row label="When" value={`${date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })} at ${slot}`} />}
                      <div className="border-t border-[var(--line)] pt-2"><Row label="Deposit due now" value={ZAR(payInfo.amountCents)} highlight /></div>
                    </div>
                    <p className="mb-3 text-xs text-[var(--muted)]">Your slot is confirmed once the deposit is paid. Apple Pay appears automatically on supported devices.</p>
                    <div id="paystack-apple-pay" className="w-full [&>*]:!w-full empty:hidden" />
                    <button id="paystack-other-channels" type="button" onClick={openCheckout}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white hover:bg-[var(--brand-dark)]">
                      Pay {ZAR(payInfo.amountCents)} — card, EFT &amp; more
                    </button>
                    {payError && <p className="mt-3 text-center text-sm font-semibold text-red-500">{payError}</p>}
                  </Section>
                )}

                {/* ── Done ── */}
                {step === "done" && (
                  <div className="text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-black">Booking confirmed!</h2>
                    <p className="mt-2 text-[var(--muted)]">
                      {activeProviderName} has your appointment
                      {date && slot ? ` for ${date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} at ${slot}` : ""}.
                    </p>
                    <button onClick={onClose} className="mt-6 rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--ink)]/90">Done</button>
                  </div>
                )}

                {error && <p className="mt-4 text-center text-sm font-semibold text-red-500">{error}</p>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared UI ──────────────────────────────────────────────────── */
function Section({ title, children, onBack }: { title: string; children: React.ReactNode; onBack?: () => void }) {
  return (
    <div>
      {onBack && (
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}
      <h2 className="mb-5 text-2xl font-black leading-tight">{title}</h2>
      {children}
    </div>
  );
}

function NextButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-50">
      Continue <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function Row({ label, value, highlight, bold, sub }: { label: string; value: string; highlight?: boolean; bold?: boolean; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-[var(--muted)]">
        {label}
        {sub && <span className="block text-xs text-[var(--muted)]/70">{sub}</span>}
      </span>
      <span className={`text-sm font-bold ${highlight ? "text-[var(--brand)]" : bold ? "text-[var(--ink)]" : ""}`}>{value}</span>
    </div>
  );
}
