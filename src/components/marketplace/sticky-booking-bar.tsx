"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, CheckCircle2, Clock3, Loader2, X } from "lucide-react";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { BookingCalendar } from "./booking-calendar";

type BusySlot = { start: string; durationMinutes: number };
type Step = "date" | "time" | "notes" | "auth" | "review" | "pay" | "done";

export interface BookingService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  depositCents: number;
}

interface Props {
  service: BookingService | null;
  providerProfileId: string;
  /** Called after a successful booking so parent can reset selection */
  onClear: () => void;
  hidden?: boolean;
}

const SLOTS = Array.from({ length: 20 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  return { label: `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}` };
});

function nextDays(n: number): Date[] {
  const out: Date[] = [];
  const d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) { const x = new Date(d); x.setDate(d.getDate() + i); out.push(x); }
  return out;
}

const ZAR = (c: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);

const fmtDur = (m: number) =>
  m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

function slotDate(base: Date, hhmm: string): Date {
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(base); d.setHours(hh, mm, 0, 0); return d;
}

export function StickyBookingBar({ service, providerProfileId, onClear, hidden = false }: Props) {
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [busyLoading, setBusyLoading] = useState(false);

  // Auth state
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");

  // Booking for
  const [bookingFor, setBookingFor] = useState<"SELF" | "CHILD" | "OTHER">("SELF");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("");

  // Booking state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Payment state
  const [payInfo, setPayInfo] = useState<{ bookingId: string; reference: string; publicKey: string; email: string; amountCents: number; subaccountCode?: string | null } | null>(null);
  const payMountedRef = useRef(false);

  const isExpanded = step === "auth" || step === "review" || step === "pay" || step === "done";

  // Reset when service changes
  useEffect(() => {
    setStep("date"); setSelectedDate(null); setSelectedSlot(null); setNotes("");
    setError(""); setAuthed(null); setPayInfo(null); payMountedRef.current = false;
    setBookingFor("SELF"); setAttendeeName(""); setAttendeePhone("");
  }, [service?.id]);

  // Load availability when date selected
  useEffect(() => {
    if (!selectedDate || !providerProfileId) return;
    setBusySlots([]); setBusyLoading(true);
    const ds = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    fetch(`/api/bookings/availability?providerProfileId=${providerProfileId}&date=${ds}`)
      .then((r) => r.json()).then((d) => setBusySlots(d.busy ?? []))
      .catch(() => {}).finally(() => setBusyLoading(false));
  }, [selectedDate, providerProfileId]);

  // Check session when moving to review
  useEffect(() => {
    if (step !== "review" && step !== "auth") return;
    fetch("/api/auth/session").then((r) => r.json()).then((s) => {
      const ok = !!s?.user;
      setAuthed(ok);
      if (!ok && step === "review") setStep("auth");
    }).catch(() => setAuthed(false));
  }, [step]);

  // Mount Paystack inline when reaching pay step
  useEffect(() => {
    if (step !== "pay" || !payInfo || payMountedRef.current) return;
    payMountedRef.current = true;

    function mount() {
      const w = window as unknown as Record<string, unknown>;
      const PaystackPop = w["PaystackPop"] as { setup: (opts: Record<string, unknown>) => { openIframe: () => void } } | undefined;
      if (!PaystackPop) return;
      const handler = PaystackPop.setup({
        key: payInfo!.publicKey, email: payInfo!.email, amount: payInfo!.amountCents,
        ref: payInfo!.reference, currency: "ZAR",
        subaccount: payInfo!.subaccountCode ?? undefined,
        bearer: "account",
        onSuccess: async () => {
          await fetch("/api/payments/paystack/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: payInfo!.reference }) });
          setStep("done");
        },
        onCancel: () => { setStep("review"); payMountedRef.current = false; setPayInfo(null); }
      });
      handler.openIframe();
    }

    const existing = document.getElementById("paystack-inline-js");
    if (existing) { mount(); return; }
    const s = document.createElement("script");
    s.id = "paystack-inline-js"; s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = mount;
    document.head.appendChild(s);
  }, [step, payInfo]);

  // Auto-clear done after 4 seconds
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => { onClear(); }, 4000);
    return () => clearTimeout(t);
  }, [step, onClear]);

  function isSlotDisabled(hhmm: string): boolean {
    if (!selectedDate || !service) return true;
    const [hh, mm] = hhmm.split(":").map(Number);
    const start = new Date(selectedDate); start.setHours(hh, mm, 0, 0);
    if (start.getTime() < Date.now()) return true;
    if (hh * 60 + mm + service.durationMinutes > 18 * 60) return true;
    const end = start.getTime() + service.durationMinutes * 60000;
    return busySlots.some((b) => {
      const bs = new Date(b.start).getTime();
      const be = bs + b.durationMinutes * 60000;
      return start.getTime() < be && end > bs;
    });
  }

  function goBack() {
    setError("");
    if (step === "time") { setSelectedDate(null); setSelectedSlot(null); setStep("date"); }
    else if (step === "notes") { setSelectedSlot(null); setStep("time"); }
    else if (step === "auth") setStep("notes");
    else if (step === "review") setStep(authed === false ? "auth" : "notes");
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
      setAuthed(true); setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setSubmitting(false); }
  }

  async function confirm() {
    if (!service || !selectedDate || !selectedSlot) return;
    setError(""); setSubmitting(true);
    try {
      const startsAt = slotDate(selectedDate, selectedSlot).toISOString();
      const res = await fetch("/api/bookings/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerProfileId, serviceIds: [service.id], startsAt, notes, bookingFor,
          attendeeName: bookingFor !== "SELF" ? attendeeName || null : null,
          attendeePhone: bookingFor !== "SELF" ? attendeePhone || null : null,
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
        payMountedRef.current = false;
        setPayInfo({ bookingId: d.booking.id, reference: pd.reference, publicKey: pd.publicKey, email: pd.email, amountCents: pd.amountCents, subaccountCode: pd.subaccountCode });
        setStep("pay");
        return;
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setSubmitting(false); }
  }

  if (!service || hidden) return null;

  const stepLabel: Record<Step, string> = {
    date: "Pick a date", time: "Choose a time", notes: "Any notes?",
    auth: "Sign in to confirm", review: "Review & confirm", pay: "Payment", done: "Booked!"
  };
  const showBack = step !== "date" && step !== "pay" && step !== "done";

  return (
    <>
      {/* Backdrop for expanded steps */}
      {isExpanded && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={goBack} />
      )}

      <div className={cn("fixed inset-x-0 bottom-0 z-50 lg:hidden", isExpanded && "z-50")}>
        <div className="pointer-events-none h-6 bg-gradient-to-t from-black/10 to-transparent" />

        <div className="border-t border-[var(--line)] bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">

          {/* ── Summary chips (hide on done step) ── */}
          {step !== "done" && (
            <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 pb-1">
              <span className="flex items-center gap-1 rounded-full bg-[#FFF0F4] px-2.5 py-1 text-xs font-bold text-[var(--brand)]">
                <Check className="h-3 w-3" />{service.name}
              </span>
              {selectedDate && (
                <span className="flex items-center gap-1 rounded-full bg-[#FFF0F4] px-2.5 py-1 text-xs font-bold text-[var(--brand)]">
                  <Check className="h-3 w-3" />
                  {selectedDate.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
                </span>
              )}
              {selectedSlot && (
                <span className="flex items-center gap-1 rounded-full bg-[#FFF0F4] px-2.5 py-1 text-xs font-bold text-[var(--brand)]">
                  <Check className="h-3 w-3" />{selectedSlot}
                </span>
              )}
              {notes && step === "review" && (
                <span className="max-w-[140px] truncate rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                  "{notes}"
                </span>
              )}
              <span className="ml-auto text-sm font-black text-[var(--ink)]">{ZAR(service.priceCents)}</span>
            </div>
          )}

          {/* ── Step header ── */}
          {step !== "done" && (
            <div className="flex items-center gap-2 px-4 py-2">
              {showBack && (
                <button onClick={goBack} className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)]">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <p className="text-sm font-black text-[var(--ink)]">{stepLabel[step]}</p>
              {!isExpanded && (
                <button onClick={onClear} className="ml-auto text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">Clear</button>
              )}
              {isExpanded && step !== "pay" && (
                <button onClick={onClear} className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* ── Step content ── */}
          <div className="px-4">
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: isExpanded ? 0 : 20, y: isExpanded ? 10 : 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: isExpanded ? 0 : -20 }}
                transition={{ duration: 0.18 }}>

                {/* DATE */}
                {step === "date" && (
                  <div className="pb-2">
                    <BookingCalendar
                      providerProfileId={providerProfileId}
                      serviceDuration={service?.durationMinutes ?? 30}
                      selectedDate={selectedDate}
                      onSelectDate={(d) => { setSelectedDate(d); setSelectedSlot(null); setStep("time"); }}
                    />
                  </div>
                )}

                {/* TIME */}
                {step === "time" && (
                  <div className="pb-2">
                    {busyLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" /></div>
                    ) : (
                      <div className="grid grid-cols-5 gap-1.5">
                        {SLOTS.map((s) => {
                          const disabled = isSlotDisabled(s.label);
                          const sel = selectedSlot === s.label;
                          return (
                            <button key={s.label} disabled={disabled}
                              onClick={() => { setSelectedSlot(s.label); setStep("notes"); }}
                              className={cn("rounded-xl border py-2 text-xs font-bold transition",
                                sel ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                                  : disabled ? "cursor-not-allowed border-[var(--line)] bg-[var(--line)]/20 text-[var(--muted)]/40"
                                  : "border-[var(--line)] hover:border-[var(--brand)]")}>
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-1.5 text-center text-[10px] text-[var(--muted)]">Duration: {fmtDur(service.durationMinutes)}</p>
                  </div>
                )}

                {/* NOTES */}
                {step === "notes" && (
                  <div className="pb-2">
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                      placeholder="Allergies, preferences or special requests (optional)"
                      className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
                  </div>
                )}

                {/* AUTH */}
                {step === "auth" && (
                  <div className="space-y-3 pb-2">
                    {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
                    <div className="flex rounded-xl border border-[var(--line)] overflow-hidden">
                      {(["signin", "register"] as const).map((m) => (
                        <button key={m} onClick={() => { setAuthMode(m); setError(""); }}
                          className={cn("flex-1 py-2 text-xs font-bold transition",
                            authMode === m ? "bg-[var(--brand)]/8 text-[var(--brand)]" : "text-[var(--muted)] hover:bg-[var(--background)]")}>
                          {m === "signin" ? "Sign in" : "Register"}
                        </button>
                      ))}
                    </div>
                    {authMode === "register" && (
                      <input value={authName} onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Full name" autoComplete="name"
                        className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
                    )}
                    <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Email" type="email" autoComplete="email"
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
                    <input value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Password" type="password" autoComplete="current-password"
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
                  </div>
                )}

                {/* REVIEW */}
                {step === "review" && selectedDate && selectedSlot && (
                  <div className="space-y-3 pb-2">
                    {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
                    <div className="rounded-xl border border-[var(--line)] divide-y divide-[var(--line)] text-sm">
                      <div className="flex justify-between px-3 py-2"><span className="text-[var(--muted)]">Service</span><span className="font-bold">{service.name}</span></div>
                      <div className="flex justify-between px-3 py-2"><span className="text-[var(--muted)]">Date</span><span className="font-bold">{selectedDate.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "long" })}</span></div>
                      <div className="flex justify-between px-3 py-2"><span className="text-[var(--muted)]">Time</span><span className="font-bold">{selectedSlot}</span></div>
                      <div className="flex justify-between px-3 py-2"><span className="text-[var(--muted)]">Duration</span><span className="font-bold">{fmtDur(service.durationMinutes)}</span></div>
                      {notes && <div className="flex justify-between px-3 py-2"><span className="text-[var(--muted)]">Notes</span><span className="max-w-[55%] text-right font-semibold text-xs">{notes}</span></div>}
                      <div className="flex justify-between px-3 py-2.5">
                        <span className="font-black">Total</span>
                        <span className="font-black text-[var(--brand)]">{ZAR(service.priceCents)}</span>
                      </div>
                      {service.depositCents > 0 && (
                        <div className="flex justify-between px-3 py-2 bg-[var(--background)]">
                          <span className="text-xs text-[var(--muted)]">Deposit required</span>
                          <span className="text-xs font-bold">{ZAR(service.depositCents)}</span>
                        </div>
                      )}
                    </div>
                    {/* Booking for */}
                    <div>
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Booking for</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["SELF", "CHILD", "OTHER"] as const).map((v) => (
                          <button key={v} onClick={() => setBookingFor(v)}
                            className={cn("rounded-xl border py-2 text-xs font-bold transition",
                              bookingFor === v ? "bg-[var(--ink)] border-[var(--ink)] text-white" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--brand)]")}>
                            {v === "SELF" ? "Myself" : v === "CHILD" ? "A child" : "Someone else"}
                          </button>
                        ))}
                      </div>
                      {(bookingFor === "CHILD" || bookingFor === "OTHER") && (
                        <div className="mt-2 space-y-2">
                          <input value={attendeeName} onChange={(e) => setAttendeeName(e.target.value)}
                            placeholder={bookingFor === "CHILD" ? "Child's full name" : "Full name"}
                            className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
                          <input value={attendeePhone} onChange={(e) => setAttendeePhone(e.target.value)}
                            placeholder={bookingFor === "OTHER" ? "Their phone number" : "Emergency contact (optional)"}
                            type="tel"
                            className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PAY */}
                {step === "pay" && (
                  <div className="flex flex-col items-center py-6 pb-2">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
                    <p className="mt-3 text-sm font-semibold text-[var(--muted)]">Opening payment…</p>
                  </div>
                )}

                {/* DONE */}
                {step === "done" && (
                  <div className="flex flex-col items-center py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    <p className="mt-3 text-base font-black text-[var(--ink)]">Booking confirmed!</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">You'll receive a confirmation soon.</p>
                    <button onClick={onClear} className="mt-4 rounded-xl bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white">
                      Done
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── CTA button ── */}
          {step !== "done" && step !== "pay" && (
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {step === "date" && (
                <p className="py-3 text-center text-sm font-semibold text-[var(--muted)]">Select a date to continue</p>
              )}
              {step === "time" && (
                <p className="py-3 text-center text-sm font-semibold text-[var(--muted)]">Select a time to continue</p>
              )}
              {step === "notes" && (
                <button onClick={() => setStep("review")}
                  className="w-full rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]">
                  Book now
                </button>
              )}
              {step === "auth" && (
                <button onClick={doAuth} disabled={submitting || !authEmail || !authPassword}
                  className="w-full rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white shadow-sm transition disabled:opacity-50">
                  {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : authMode === "signin" ? "Sign in & confirm" : "Register & confirm"}
                </button>
              )}
              {step === "review" && (
                <button onClick={confirm} disabled={submitting}
                  className="w-full rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white shadow-sm transition disabled:opacity-50">
                  {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : service.depositCents > 0 ? `Pay deposit ${ZAR(service.depositCents)}` : "Confirm booking"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
