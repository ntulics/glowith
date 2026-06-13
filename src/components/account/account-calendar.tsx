"use client";

import { useEffect, useMemo, useState } from "react";
import { BookingFlow } from "@/components/marketplace/booking-flow";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Search,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
type CalendarBooking = {
  id: string; status: string; startsAt: string; durationMinutes: number;
  serviceName: string; providerName: string; providerHandle: string;
  providerProfileId: string; noShowAt?: string | null; checkedInAt?: string | null;
};
type ProviderService = {
  id: string; name: string; category: string;
  durationMinutes: number; priceCents: number; depositCents: number;
};
type Provider = {
  id: string; handle: string; name: string; avatarUrl: string | null;
  category: string; services: ProviderService[];
};
type BusySlot = { start: string; durationMinutes: number };
type WorkingHours = { open: string; close: string };

/* ── SA Public Holidays ─────────────────────────────────────────── */
function easterSunday(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m2 = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m2 + 114) / 31);
  const da = ((h + l - 7 * m2 + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}
function getSAHolidayName(d: Date): string | null {
  const y = d.getFullYear(), mo = d.getMonth() + 1, da = d.getDate(), dow = d.getDay();
  const easter = easterSunday(y);
  const gf = new Date(easter); gf.setDate(easter.getDate() - 2);
  const fm = new Date(easter); fm.setDate(easter.getDate() + 1);
  function fixed(hmo: number, hda: number, name: string): string | null {
    if (mo === hmo && da === hda) return name;
    if (dow === 1 && mo === hmo && da - 1 === hda) return `${name} (observed)`;
    return null;
  }
  return (
    fixed(1, 1, "New Year's Day") ?? fixed(3, 21, "Human Rights Day") ??
    (mo === gf.getMonth() + 1 && da === gf.getDate() ? "Good Friday" : null) ??
    (mo === fm.getMonth() + 1 && da === fm.getDate() ? "Family Day" : null) ??
    fixed(4, 27, "Freedom Day") ?? fixed(5, 1, "Workers' Day") ??
    fixed(6, 16, "Youth Day") ?? fixed(8, 9, "National Women's Day") ??
    fixed(9, 24, "Heritage Day") ?? fixed(12, 16, "Day of Reconciliation") ??
    fixed(12, 25, "Christmas Day") ?? fixed(12, 26, "Day of Goodwill") ?? null
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const FALLBACK_WH: WorkingHours = { open: "09:00", close: "17:00" };

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const ZAR = (c: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);
const fmtDur = (m: number) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

function buildSlots(wh: WorkingHours, dur: number): string[] {
  const [oh, om] = wh.open.split(":").map(Number);
  const [ch, cm] = wh.close.split(":").map(Number);
  const closeMins = ch * 60 + cm;
  const result: string[] = [];
  for (let m = oh * 60 + om; m < closeMins; m += 30) {
    if (m + dur <= closeMins)
      result.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return result;
}

function availableSlots(wh: WorkingHours, busy: BusySlot[], date: Date, dur: number): string[] {
  const now = Date.now();
  return buildSlots(wh, dur).filter((label) => {
    const [h, m] = label.split(":").map(Number);
    const start = new Date(date); start.setHours(h, m, 0, 0);
    if (start.getTime() <= now) return false;
    const end = start.getTime() + dur * 60000;
    return !busy.some((b) => {
      const bs = new Date(b.start).getTime();
      return start.getTime() < bs + b.durationMinutes * 60000 && end > bs;
    });
  });
}

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: "bg-emerald-500", PENDING_DEPOSIT: "bg-amber-400",
  COMPLETED: "bg-[var(--muted)]/40", CANCELLED: "bg-red-400",
  EXPIRED: "bg-gray-300", NO_SHOW: "bg-orange-400"
};
const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  CONFIRMED: { text: "Confirmed", cls: "text-emerald-700 bg-emerald-50" },
  PENDING_DEPOSIT: { text: "Awaiting deposit", cls: "text-amber-700 bg-amber-50" },
  COMPLETED: { text: "Fulfilled", cls: "text-gray-500 bg-gray-100" },
  CANCELLED: { text: "Cancelled", cls: "text-red-600 bg-red-50" },
  EXPIRED: { text: "Expired", cls: "text-gray-400 bg-gray-100" },
  NO_SHOW: { text: "No-show", cls: "text-orange-700 bg-orange-50" }
};

/* ── Mini Month Grid ────────────────────────────────────────────── */
function MonthGrid({ year, month, bookingDates, selectedDate, onSelect }: {
  year: number; month: number; bookingDates: Set<string>;
  selectedDate: Date | null; onSelect: (d: Date) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = isoDate(new Date());
  const cells: (null | number)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 text-center">
        {DAYS.map((d) => <div key={d} className="py-1 text-xs font-bold text-[var(--muted)]">{d}</div>)}
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const dateObj = new Date(year, month, day);
          const dateStr = isoDate(dateObj);
          const isToday = dateStr === today;
          const hasBooking = bookingDates.has(dateStr);
          const isSelected = selectedDate ? isoDate(selectedDate) === dateStr : false;
          const holidayName = getSAHolidayName(dateObj);
          return (
            <button key={idx} onClick={() => onSelect(dateObj)} title={holidayName ?? undefined}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition",
                isSelected && "bg-[var(--ink)] text-white",
                !isSelected && holidayName && "bg-amber-100 text-amber-700 hover:bg-amber-200",
                !isSelected && !holidayName && isToday && "text-[var(--brand)] font-black",
                !isSelected && !holidayName && !isToday && "hover:bg-[var(--background)] text-[var(--ink)]"
              )}>
              {day}
              {hasBooking && !isSelected && <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--brand)]" />}
              {holidayName && !isSelected && !hasBooking && <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export function AccountCalendar({ initialBookings }: { initialBookings: CalendarBooking[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [mode, setMode] = useState<"my-bookings" | "book-provider">("my-bookings");

  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [providerSearch, setProviderSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);
  const [busyLoading, setBusyLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [availableProviderIds, setAvailableProviderIds] = useState<Set<string> | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (mode !== "book-provider" || allProviders.length > 0) return;
    setLoadingProviders(true);
    fetch("/api/providers/list")
      .then((r) => r.json())
      .then((d) => setAllProviders(d.providers ?? []))
      .catch(() => {})
      .finally(() => setLoadingProviders(false));
  }, [mode, allProviders.length]);

  /* Check which providers have availability on the selected date.
     Falls back to 09:00-17:00 if provider hasn't set working hours — fixes
     providers being incorrectly excluded from the list. */
  useEffect(() => {
    if (mode !== "book-provider" || !selectedDate || allProviders.length === 0) {
      setAvailableProviderIds(null); return;
    }
    setAvailableProviderIds(null);
    setCheckingAvailability(true);
    const ds = isoDate(selectedDate);
    const dateSnap = new Date(selectedDate);
    Promise.all(
      allProviders.map((p) =>
        fetch(`/api/bookings/availability?providerProfileId=${p.id}&date=${ds}`)
          .then((r) => r.json())
          .then((d) => {
            // Use fallback hours if provider hasn't configured working hours
            const wh: WorkingHours = d.workingHours ?? FALLBACK_WH;
            const busyList: BusySlot[] = d.busy ?? [];
            // A provider is available if any of their services has at least one open slot
            const minDur = p.services.length > 0
              ? Math.min(...p.services.map((s) => s.durationMinutes))
              : 30;
            return availableSlots(wh, busyList, dateSnap, minDur).length > 0 ? p.id : null;
          })
          .catch(() => null)
      )
    ).then((ids) => {
      setAvailableProviderIds(new Set(ids.filter(Boolean) as string[]));
    }).finally(() => setCheckingAvailability(false));
  }, [selectedDate, mode, allProviders]);

  /* Load busy slots + working hours when provider + date changes */
  useEffect(() => {
    if (!selectedProvider || !selectedDate) { setBusy([]); setWorkingHours(null); return; }
    setBusyLoading(true);
    fetch(`/api/bookings/availability?providerProfileId=${selectedProvider.id}&date=${isoDate(selectedDate)}`)
      .then((r) => r.json())
      .then((d) => { setBusy(d.busy ?? []); setWorkingHours(d.workingHours ?? null); })
      .catch(() => { setBusy([]); setWorkingHours(null); })
      .finally(() => setBusyLoading(false));
  }, [selectedProvider, selectedDate]);

  function prevMonth() { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }

  const bookingDates = useMemo(() => {
    const s = new Set<string>();
    initialBookings.forEach((b) => s.add(b.startsAt.slice(0, 10)));
    return s;
  }, [initialBookings]);

  const dayBookings = useMemo(() => {
    if (!selectedDate) return [];
    const ds = isoDate(selectedDate);
    return initialBookings.filter((b) => b.startsAt.startsWith(ds));
  }, [selectedDate, initialBookings]);

  const filteredProviders = useMemo(() => {
    let list = availableProviderIds !== null
      ? allProviders.filter((p) => availableProviderIds.has(p.id))
      : allProviders;
    if (providerSearch.trim()) {
      const q = providerSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return list.slice(0, 20);
  }, [allProviders, providerSearch, availableProviderIds]);

  // Effective working hours — fallback to 09-17 if not configured
  const effectiveWH = workingHours ?? (selectedProvider && !busyLoading ? FALLBACK_WH : null);

  // Per-service slot availability for the selected provider + date
  const serviceAvailability = useMemo(() => {
    if (!selectedProvider || !effectiveWH || !selectedDate) return new Map<string, { slots: string[]; reason: string | null }>();
    const map = new Map<string, { slots: string[]; reason: string | null }>();
    for (const svc of selectedProvider.services) {
      const possible = buildSlots(effectiveWH, svc.durationMinutes);
      if (possible.length === 0) {
        map.set(svc.id, { slots: [], reason: `Needs ${fmtDur(svc.durationMinutes)} — provider closes at ${effectiveWH.close}` });
        continue;
      }
      const free = availableSlots(effectiveWH, busy, selectedDate, svc.durationMinutes);
      if (free.length === 0) {
        map.set(svc.id, { slots: [], reason: "Fully booked for this day" });
      } else {
        map.set(svc.id, { slots: free, reason: null });
      }
    }
    return map;
  }, [selectedProvider, effectiveWH, busy, selectedDate]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">Calendar</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">View your appointments and book new ones</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-2xl border border-[var(--line)] bg-white p-1 max-w-sm">
        <button onClick={() => setMode("my-bookings")}
          className={cn("flex-1 rounded-xl py-2 text-sm font-semibold transition",
            mode === "my-bookings" ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]")}>
          My bookings
        </button>
        <button onClick={() => setMode("book-provider")}
          className={cn("flex-1 rounded-xl py-2 text-sm font-semibold transition",
            mode === "book-provider" ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]")}>
          Book a provider
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* ── Left: calendar + provider picker ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)] transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-black">{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] hover:bg-[var(--background)] transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <MonthGrid year={year} month={month}
              bookingDates={mode === "my-bookings" ? bookingDates : new Set()}
              selectedDate={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setSelectedProvider(null); setSelectedService(null); }}
            />
          </div>

          {mode === "book-provider" && (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <p className="mb-1 text-sm font-black">Select a provider</p>
              {selectedDate && (
                <p className="mb-2 text-xs text-[var(--muted)]">
                  Available on {selectedDate.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              )}
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                <input value={providerSearch} onChange={(e) => setProviderSearch(e.target.value)}
                  placeholder="Search…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </div>
              {(loadingProviders || checkingAvailability) ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--muted)]">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--brand)]" />
                  {checkingAvailability ? "Checking availability…" : "Loading providers…"}
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="py-5 text-center">
                  <p className="text-sm font-bold text-[var(--muted)]">No providers available</p>
                  {selectedDate && <p className="mt-1 text-xs text-[var(--muted)]">on {selectedDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</p>}
                </div>
              ) : (
                <ul className="max-h-52 overflow-y-auto space-y-1">
                  {filteredProviders.map((p) => (
                    <li key={p.id}>
                      <button onClick={() => { setSelectedProvider(p); setSelectedService(null); }}
                        className={cn("w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition",
                          selectedProvider?.id === p.id ? "bg-[var(--ink)] text-white" : "hover:bg-[var(--background)] text-[var(--ink)]")}>
                        {p.name}
                        <span className={cn("ml-2 text-xs", selectedProvider?.id === p.id ? "text-white/70" : "text-[var(--muted)]")}>{p.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Right: day view ── */}
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-base font-black">
              {selectedDate ? selectedDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Select a date"}
            </h2>
            {selectedDate && getSAHolidayName(selectedDate) && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                🎉 {getSAHolidayName(selectedDate)}
              </span>
            )}
          </div>

          {mode === "my-bookings" ? (
            dayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="mb-3 h-10 w-10 text-[var(--muted)]/40" />
                <p className="text-sm font-bold text-[var(--muted)]">No appointments on this day</p>
                <button onClick={() => setMode("book-provider")}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-dark)]">
                  Book a provider
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayBookings.map((b) => {
                  const effectiveStatus = b.noShowAt ? "NO_SHOW" : b.status;
                  const dot = STATUS_COLOR[effectiveStatus] ?? "bg-gray-300";
                  const lbl = STATUS_LABEL[effectiveStatus];
                  return (
                    <div key={b.id} className="flex items-start gap-3 rounded-2xl border border-[var(--line)] p-4">
                      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dot)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-[var(--ink)]">{b.serviceName}</p>
                          {lbl && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", lbl.cls)}>{lbl.text}</span>}
                        </div>
                        <p className="text-sm text-[var(--brand)] font-semibold">{b.providerName}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(b.startsAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>{b.durationMinutes} min</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : !selectedProvider ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarCheck className="mb-3 h-10 w-10 text-[var(--muted)]/40" />
              <p className="text-sm font-bold text-[var(--muted)]">
                {availableProviderIds?.size === 0 ? "No providers available on this day" : "Select a provider on the left"}
              </p>
            </div>
          ) : (
            /* ── Provider selected: services + time slots side by side ── */
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
              {/* Services list */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  {selectedProvider.name} — select a service
                  {effectiveWH && <span className="ml-2 normal-case font-normal">· {effectiveWH.open}–{effectiveWH.close}</span>}
                </p>
                {busyLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" /></div>
                ) : (
                  <div className="space-y-2">
                    {selectedProvider.services.map((svc) => {
                      const avail = serviceAvailability.get(svc.id);
                      const canBook = !!avail && avail.slots.length > 0;
                      const isSelected = selectedService?.id === svc.id;
                      return (
                        <button
                          key={svc.id}
                          disabled={!canBook}
                          onClick={() => setSelectedService(isSelected ? null : svc)}
                          className={cn(
                            "w-full flex items-start justify-between gap-3 rounded-2xl border p-3 text-left transition",
                            isSelected ? "border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]" :
                            canBook ? "border-[var(--line)] hover:border-[var(--brand)]" :
                            "border-[var(--line)] opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--ink)]">{svc.name}</p>
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {fmtDur(svc.durationMinutes)} · {ZAR(svc.priceCents)}
                            </p>
                            {avail && (
                              <p className={cn("mt-1 text-xs font-semibold",
                                canBook ? "text-emerald-600" : "text-red-500")}>
                                {canBook
                                  ? `${avail.slots.length} slot${avail.slots.length !== 1 ? "s" : ""} available`
                                  : avail.reason}
                              </p>
                            )}
                          </div>
                          {isSelected && <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Time slots panel */}
              <div>
                {!selectedService ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--line)] px-4 py-10">
                    <p className="text-center text-xs text-[var(--muted)]">← Select a service to see available times</p>
                  </div>
                ) : (
                  <>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Available times
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(serviceAvailability.get(selectedService.id)?.slots ?? []).map((label) => (
                        <button
                          key={label}
                          onClick={() => { setBookingSlot(label); setBookingDate(selectedDate ? new Date(selectedDate) : null); }}
                          className="rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 py-2 text-xs font-bold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {bookingSlot && selectedProvider && bookingDate && selectedService && (
        <BookingFlow
          open drawer
          onClose={() => { setBookingSlot(null); setBookingDate(null); }}
          providerProfileId={selectedProvider.id}
          providerName={selectedProvider.name}
          services={selectedProvider.services}
          preselectedServiceId={selectedService.id}
          preselectedDate={bookingDate}
        />
      )}
    </div>
  );
}
