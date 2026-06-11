"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Clock3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BusySlot = { start: string; durationMinutes: number };
type Step = "date" | "time" | "notes";

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
  onBook: (serviceId: string, date: Date, slot: string, notes: string) => void;
  onClear: () => void;
  /** When true the bar hides itself (e.g. while the booking popup is open) */
  hidden?: boolean;
}

const SLOTS = Array.from({ length: 20 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  return {
    h: Math.floor(mins / 60),
    m: mins % 60,
    label: `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`,
  };
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

export function StickyBookingBar({ service, providerProfileId, onBook, onClear, hidden = false }: Props) {
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [busyLoading, setBusyLoading] = useState(false);

  // Reset when service changes
  useEffect(() => {
    setStep("date");
    setSelectedDate(null);
    setSelectedSlot(null);
    setNotes("");
  }, [service?.id]);

  // Load availability when date selected
  useEffect(() => {
    if (!selectedDate || !providerProfileId) return;
    setBusySlots([]);
    setBusyLoading(true);
    const ds = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    fetch(`/api/bookings/availability?providerProfileId=${providerProfileId}&date=${ds}`)
      .then((r) => r.json())
      .then((d) => setBusySlots(d.busy ?? []))
      .catch(() => {})
      .finally(() => setBusyLoading(false));
  }, [selectedDate, providerProfileId]);

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
    if (step === "time") { setSelectedDate(null); setSelectedSlot(null); setStep("date"); }
    else if (step === "notes") { setSelectedSlot(null); setStep("time"); }
  }

  if (!service || hidden) return null;

  const canBook = !!selectedDate && !!selectedSlot;
  const stepLabel = step === "date" ? "Pick a date" : step === "time" ? "Choose a time" : "Any notes?";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
      {/* Shadow fade */}
      <div className="pointer-events-none h-6 bg-gradient-to-t from-black/10 to-transparent" />

      <div className="border-t border-[var(--line)] bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.10)]">

        {/* ── Summary chips ── */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 pb-1">
          {/* Service chip */}
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
          {notes && (
            <span className="max-w-[160px] truncate rounded-full bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
              "{notes}"
            </span>
          )}
          {/* price right-aligned */}
          <span className="ml-auto text-sm font-black text-[var(--ink)]">{ZAR(service.priceCents)}</span>
        </div>

        {/* ── Step panel ── */}
        <div className="px-4">
          {/* Step header */}
          <div className="flex items-center gap-2 py-2">
            {step !== "date" && (
              <button onClick={goBack} className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)]">
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <p className="text-sm font-black text-[var(--ink)]">{stepLabel}</p>
            {step === "time" && selectedDate && (
              <span className="ml-1 text-xs text-[var(--muted)]">
                · {selectedDate.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            )}
            <button onClick={onClear} className="ml-auto text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">
              Clear
            </button>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {step === "date" && (
                <div className="grid grid-cols-5 gap-1.5 pb-2">
                  {nextDays(14).map((d) => {
                    const sel = selectedDate && d.toDateString() === selectedDate.toDateString();
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => { setSelectedDate(d); setSelectedSlot(null); setStep("time"); }}
                        className={cn(
                          "rounded-xl border p-2 text-center transition",
                          sel ? "border-[var(--brand)] bg-[#FFF0F4]" : "border-[var(--line)] hover:border-[var(--brand)]"
                        )}
                      >
                        <span className="block text-[9px] font-bold uppercase text-[var(--muted)]">
                          {d.toLocaleDateString("en-ZA", { weekday: "short" })}
                        </span>
                        <span className="block text-sm font-black">{d.getDate()}</span>
                        <span className="block text-[9px] text-[var(--muted)]">
                          {d.toLocaleDateString("en-ZA", { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === "time" && (
                <div className="pb-2">
                  {busyLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5">
                      {SLOTS.map((s) => {
                        const disabled = isSlotDisabled(s.label);
                        const sel = selectedSlot === s.label;
                        return (
                          <button
                            key={s.label}
                            disabled={disabled}
                            onClick={() => { setSelectedSlot(s.label); setStep("notes"); }}
                            className={cn(
                              "rounded-xl border py-2 text-xs font-bold transition",
                              sel ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                                : disabled ? "cursor-not-allowed border-[var(--line)] bg-[var(--line)]/20 text-[var(--muted)]/40"
                                : "border-[var(--line)] hover:border-[var(--brand)]"
                            )}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-1.5 text-center text-[10px] text-[var(--muted)]">
                    Duration: {fmtDur(service.durationMinutes)}
                  </p>
                </div>
              )}

              {step === "notes" && (
                <div className="pb-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Allergies, preferences or special requests (optional)"
                    className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:bg-white"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Book now CTA ── */}
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => canBook && onBook(service.id, selectedDate!, selectedSlot!, notes)}
            disabled={!canBook}
            className={cn(
              "w-full rounded-xl py-3.5 text-sm font-black text-white shadow-sm transition",
              canBook ? "bg-[var(--brand)] hover:bg-[var(--brand-dark)] active:scale-[0.98]" : "bg-[var(--line)] text-[var(--muted)] cursor-not-allowed"
            )}
          >
            {canBook ? "Book now" : step === "date" ? "Select a date to continue" : step === "time" ? "Select a time to continue" : "Book now"}
          </button>
        </div>
      </div>
    </div>
  );
}
