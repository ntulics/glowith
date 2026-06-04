"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock3, Loader2, X } from "lucide-react";

type Service = { id: string; name: string; durationMinutes: number; priceCents: number; depositCents: number };
type Busy = { start: string; durationMinutes: number };

const ZAR = (c: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);
const fmtDur = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`);

// 08:00–18:00 in 30-min steps
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

type Step = "service" | "date" | "time" | "auth" | "review" | "pay" | "done";

export function BookingFlow({
  open, onClose, providerProfileId, providerName, services, preselectedServiceId
}: {
  open: boolean; onClose: () => void; providerProfileId: string; providerName: string;
  services: Service[]; preselectedServiceId?: string | null;
}) {
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [slot, setSlot] = useState<string | null>(null); // HH:MM
  const [busy, setBusy] = useState<Busy[]>([]);
  const [notes, setNotes] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busyLoading, setBusyLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountCents, setDiscountCents] = useState(0);
  const [couponLabel, setCouponLabel] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  // Inline payment (Paystack popup)
  const [payInfo, setPayInfo] = useState<{ bookingId: string; reference: string; publicKey: string; email: string; amountCents: number } | null>(null);
  const [payError, setPayError] = useState("");
  const payMountedRef = useRef(false);
  const popupRef = useRef<any>(null);

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);

  // On open: reset + detect session + honour preselected service
  useEffect(() => {
    if (!open) return;
    setError("");
    setServiceId(preselectedServiceId ?? null);
    setDate(null); setSlot(null); setNotes("");
    setStep(preselectedServiceId ? "date" : "service");
    fetch("/api/auth/session").then((r) => r.json()).then((s) => setAuthed(!!s?.user)).catch(() => setAuthed(false));
  }, [open, preselectedServiceId]);

  // Fetch availability when a date is chosen
  useEffect(() => {
    if (!date) return;
    setBusyLoading(true);
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    fetch(`/api/bookings/availability?providerProfileId=${providerProfileId}&date=${ds}`)
      .then((r) => r.json())
      .then((d) => setBusy(d.busy ?? []))
      .catch(() => setBusy([]))
      .finally(() => setBusyLoading(false));
  }, [date, providerProfileId]);

  async function onPaid() {
    if (!payInfo) return;
    await fetch("/api/payments/paystack/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: payInfo.reference })
    });
    setStep("done");
  }

  // Standard Paystack popup (card / EFT / etc.) — the reliable path on any browser.
  function openCheckout() {
    const popup = popupRef.current;
    if (!popup || !payInfo) { setPayError("Payment is still loading — try again in a moment"); return; }
    const opts = {
      key: payInfo.publicKey,
      email: payInfo.email,
      amount: payInfo.amountCents,
      currency: "ZAR",
      reference: payInfo.reference,
      ref: payInfo.reference,
      onSuccess: onPaid,
      onLoad: () => {},
      onCancel: () => {},
      onClose: () => {}
    };
    try {
      if (typeof popup.newTransaction === "function") popup.newTransaction(opts);
      else if (typeof popup.checkout === "function") popup.checkout(opts);
      else if (typeof popup.resumeTransaction === "function") popup.resumeTransaction(payInfo.reference);
      else setPayError("Could not open checkout");
    } catch {
      setPayError("Could not open checkout");
    }
  }

  // Load the Paystack inline script and best-effort mount the Apple Pay button.
  // Must run unconditionally (before any early return) to satisfy Rules of Hooks.
  useEffect(() => {
    if (!open || step !== "pay" || !payInfo || payMountedRef.current) return;
    payMountedRef.current = true;

    function mount() {
      const Pop = (window as any).PaystackPop;
      if (!Pop) { setPayError("Could not load the payment widget"); return; }
      popupRef.current = new Pop();
      // Apple Pay button (only renders on supported Safari/iOS with a registered domain)
      try {
        popupRef.current.paymentRequest?.({
          key: payInfo!.publicKey,
          email: payInfo!.email,
          amount: payInfo!.amountCents,
          currency: "ZAR",
          ref: payInfo!.reference,
          container: "paystack-apple-pay",
          style: { theme: "light", applePay: { width: "100%", borderRadius: "10px", type: "pay", locale: "en" } },
          onSuccess: onPaid,
          onError: () => {},
          onCancel: () => {}
        });
      } catch {
        /* Apple Pay unavailable — the "More payment options" button still works */
      }
    }

    if ((window as any).PaystackPop) { mount(); return; }
    const existing = document.getElementById("paystack-inline-js");
    if (existing) { existing.addEventListener("load", mount); return; }
    const s = document.createElement("script");
    s.id = "paystack-inline-js";
    s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = mount;
    s.onerror = () => setPayError("Could not load Paystack");
    document.body.appendChild(s);
  }, [open, step, payInfo]);

  if (!open) return null;

  function slotDate(hhmm: string): Date {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(date!); d.setHours(h, m, 0, 0); return d;
  }
  function slotDisabled(hhmm: string): boolean {
    if (!date || !service) return true;
    const start = slotDate(hhmm);
    if (start.getTime() < Date.now()) return true;
    const end = start.getTime() + service.durationMinutes * 60000;
    if (start.getHours() * 60 + start.getMinutes() + service.durationMinutes > 18 * 60) return true;
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
          body: JSON.stringify({ name, email, password })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Could not create account");
      }
      const res = await signIn("credentials", { email, password, redirect: false });
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
    if (!service || !date || !slot) return;
    setError(""); setSubmitting(true);
    try {
      const startsAt = slotDate(slot).toISOString();
      const res = await fetch("/api/bookings/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerProfileId, serviceId: service.id, startsAt, notes, couponCode: appliedCode })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not create booking");

      if (d.booking.depositCents > 0) {
        // Prepare an inline (popup) payment. Returns key + reference, or
        // { simulated } when the gateway isn't configured yet.
        const prep = await fetch("/api/payments/paystack/prepare", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: d.booking.id })
        });
        const pd = await prep.json();
        if (!prep.ok) throw new Error(pd.error ?? "Payment could not be started");
        if (pd.simulated) { setStep("done"); return; }
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
    if (payInfo?.bookingId) {
      await fetch(`/api/bookings/${payInfo.bookingId}`, { method: "DELETE" });
    }
    payMountedRef.current = false;
    setPayInfo(null);
    setPayError("");
    setStep("review");
  }

  async function applyCoupon() {
    if (!service || !couponInput.trim()) return;
    setApplyingCoupon(true); setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerProfileId, code: couponInput.trim(), serviceId: service.id })
      });
      const d = await res.json();
      if (!d.valid) { setCouponError(d.error ?? "Invalid code"); setAppliedCode(null); setDiscountCents(0); return; }
      setAppliedCode(d.code); setDiscountCents(d.discountCents); setCouponLabel(d.label);
    } finally {
      setApplyingCoupon(false);
    }
  }

  function goAfterTime() {
    if (authed === false) { setStep("auth"); } else { setStep("review"); }
  }

  const stepsOrder: Step[] = preselectedServiceId
    ? ["date", "time", ...(authed === false ? ["auth" as Step] : []), "review", "pay", "done"]
    : ["service", "date", "time", ...(authed === false ? ["auth" as Step] : []), "review", "pay", "done"];
  const progress = (stepsOrder.indexOf(step) + 1) / stepsOrder.length;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--background)]">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3 sm:px-8">
        <button onClick={onClose} aria-label="Close booking" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-white">
          <X className="h-4 w-4" />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <motion.div className="h-full rounded-full bg-[var(--brand)]" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
        <span className="text-xs font-bold text-[var(--muted)]">{providerName}</span>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:items-center">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>

              {step === "service" && (
                <Section title="Which service would you like?">
                  <div className="space-y-2">
                    {services.map((s) => (
                      <button key={s.id} onClick={() => { setServiceId(s.id); setStep("date"); }}
                        className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--brand)]">
                        <span>
                          <span className="block font-bold">{s.name}</span>
                          <span className="text-xs text-[var(--muted)]"><Clock3 className="mr-1 inline h-3 w-3" />{fmtDur(s.durationMinutes)}</span>
                        </span>
                        <span className="font-black">{ZAR(s.priceCents)}</span>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {step === "date" && (
                <Section title="Pick a day" onBack={preselectedServiceId ? undefined : () => setStep("service")}>
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
                  <NextButton disabled={!slot} onClick={goAfterTime} />
                </Section>
              )}

              {step === "auth" && (
                <Section title="Sign in to confirm" onBack={() => setStep("time")}>
                  <div className="mb-4 flex gap-2">
                    <button onClick={() => setAuthMode("signin")} className={`flex-1 rounded-xl border py-2 text-sm font-bold ${authMode === "signin" ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-[var(--line)]"}`}>Sign in</button>
                    <button onClick={() => setAuthMode("register")} className={`flex-1 rounded-xl border py-2 text-sm font-bold ${authMode === "register" ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-[var(--line)]"}`}>Create account</button>
                  </div>
                  <div className="space-y-3">
                    {authMode === "register" && (
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                        className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]" />
                    )}
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email"
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]" />
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password"
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]" />
                  </div>
                  <button onClick={doAuth} disabled={submitting || !email || !password || (authMode === "register" && !name)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-50">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Continue
                  </button>
                </Section>
              )}

              {step === "review" && service && date && slot && (
                <Section title="Review & confirm" onBack={() => setStep(authed === false ? "auth" : "time")}>
                  <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5">
                    <Row label="Service" value={service.name} />
                    <Row label="When" value={`${date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} at ${slot}`} />
                    <Row label="Duration" value={fmtDur(service.durationMinutes)} />
                    <Row label="Price" value={ZAR(service.priceCents)} />
                    {appliedCode && (
                      <Row label={`Coupon ${appliedCode} (${couponLabel})`} value={`– ${ZAR(discountCents)}`} highlight />
                    )}
                    {appliedCode && <Row label="Total" value={ZAR(service.priceCents - discountCents)} />}
                    {service.depositCents > 0 && <Row label="Deposit due now" value={ZAR(service.depositCents)} highlight />}
                  </div>

                  {/* Coupon */}
                  <div className="mt-3">
                    {appliedCode ? (
                      <button onClick={() => { setAppliedCode(null); setDiscountCents(0); setCouponInput(""); }}
                        className="text-xs font-bold text-[var(--brand)] hover:underline">Remove coupon</button>
                    ) : (
                      <div className="flex gap-2">
                        <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code"
                          className="flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm uppercase outline-none focus:border-[var(--brand)]" />
                        <button onClick={applyCoupon} disabled={applyingCoupon || !couponInput.trim()}
                          className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold hover:border-[var(--brand)] disabled:opacity-50">
                          {applyingCoupon ? "…" : "Apply"}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-1 text-xs font-semibold text-red-500">{couponError}</p>}
                  </div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the provider should know? (optional)"
                    className="mt-3 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]" />
                  <button onClick={confirm} disabled={submitting}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white hover:bg-[var(--brand-dark)] disabled:opacity-50">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {service.depositCents > 0 ? "Continue to payment" : "Confirm booking"}
                  </button>
                </Section>
              )}

              {step === "pay" && service && date && slot && (
                <Section title="Pay your deposit" onBack={releaseAndBack}>
                  {/* Booking summary, shown again right before payment */}
                  <div className="mb-4 space-y-2 rounded-2xl border border-[var(--line)] bg-white p-4">
                    <Row label="Service" value={service.name} />
                    <Row label="When" value={`${date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} at ${slot}`} />
                    {appliedCode && <Row label={`Coupon ${appliedCode}`} value={`– ${ZAR(discountCents)}`} highlight />}
                    <Row label="Deposit due now" value={ZAR(service.depositCents)} highlight />
                  </div>
                  <p className="mb-3 text-xs text-[var(--muted)]">
                    Your slot is confirmed only once the deposit is paid. Apple Pay appears automatically on supported devices.
                  </p>
                  {/* Paystack injects the Apple Pay button here (Safari/iOS only) */}
                  <div id="paystack-apple-pay" className="w-full [&>*]:!w-full empty:hidden" />
                  <button id="paystack-other-channels" type="button" onClick={openCheckout}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white hover:bg-[var(--brand-dark)]">
                    Pay {service ? ZAR(service.depositCents) : "deposit"} — card, EFT &amp; more
                  </button>
                  {payError && <p className="mt-3 text-center text-sm font-semibold text-red-500">{payError}</p>}
                </Section>
              )}

              {step === "done" && (
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-black">Booking confirmed!</h2>
                  <p className="mt-2 text-[var(--muted)]">{providerName} has your appointment{date && slot ? ` for ${date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} at ${slot}` : ""}.</p>
                  <button onClick={onClose} className="mt-6 rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--ink)]/90">Done</button>
                </div>
              )}

              {error && <p className="mt-4 text-center text-sm font-semibold text-red-500">{error}</p>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

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

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className={`text-sm font-bold ${highlight ? "text-[var(--brand)]" : ""}`}>{value}</span>
    </div>
  );
}
