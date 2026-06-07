"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  X
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
type CalendarBooking = {
  id: string;
  status: string;
  startsAt: string;
  durationMinutes: number;
  serviceName: string;
  providerName: string;
  providerHandle: string;
  providerProfileId: string;
};

type Provider = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  category: string;
  services: Array<{ id: string; name: string; category: string; durationMinutes: number; priceCents: number; depositCents: number }>;
};

type BusySlot = { start: string; durationMinutes: number };

/* ── Helpers ────────────────────────────────────────────────────── */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: "bg-emerald-500",
  PENDING_DEPOSIT: "bg-amber-400",
  COMPLETED: "bg-[var(--muted)]/40"
};

const SLOTS = Array.from({ length: 20 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { h, m, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
});

function slotDisabled(hhmm: string, busy: BusySlot[], totalDuration: number, date: Date): boolean {
  if (totalDuration === 0) return true;
  const [h, m] = hhmm.split(":").map(Number);
  const start = new Date(date); start.setHours(h, m, 0, 0);
  if (start.getTime() < Date.now()) return true;
  const end = start.getTime() + totalDuration * 60000;
  return busy.some((b) => {
    const bs = new Date(b.start).getTime();
    const be = bs + b.durationMinutes * 60000;
    return start.getTime() < be && end > bs;
  });
}

/* ── Mini Month Grid ────────────────────────────────────────────── */
function MonthGrid({
  year, month, bookingDates, selectedDate, onSelect
}: {
  year: number; month: number;
  bookingDates: Set<string>;
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = isoDate(new Date());

  const cells: (null | number)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-xs font-bold text-[var(--muted)]">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === today;
          const hasBooking = bookingDates.has(dateStr);
          const isSelected = selectedDate ? isoDate(selectedDate) === dateStr : false;
          return (
            <button
              key={idx}
              onClick={() => onSelect(new Date(year, month, day))}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition",
                isSelected && "bg-[var(--ink)] text-white",
                !isSelected && isToday && "text-[var(--brand)] font-black",
                !isSelected && !isToday && "hover:bg-[var(--background)] text-[var(--ink)]"
              )}
            >
              {day}
              {hasBooking && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--brand)]" />
              )}
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

  // Provider search state
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [providerSearch, setProviderSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [busyLoading, setBusyLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);

  /* Load providers once when switching to book mode */
  useEffect(() => {
    if (mode !== "book-provider" || allProviders.length > 0) return;
    setLoadingProviders(true);
    fetch("/api/providers/list")
      .then((r) => r.json())
      .then((d) => setAllProviders(d.providers ?? []))
      .catch(() => {})
      .finally(() => setLoadingProviders(false));
  }, [mode, allProviders.length]);

  /* Load busy slots when provider + date changes */
  useEffect(() => {
    if (!selectedProvider || !selectedDate) { setBusy([]); return; }
    setBusyLoading(true);
    fetch(`/api/bookings/availability?providerProfileId=${selectedProvider.id}&date=${isoDate(selectedDate)}`)
      .then((r) => r.json())
      .then((d) => setBusy(d.busy ?? []))
      .catch(() => setBusy([]))
      .finally(() => setBusyLoading(false));
  }, [selectedProvider, selectedDate]);

  /* Calendar navigation */
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  /* Booking dots */
  const bookingDates = useMemo(() => {
    const s = new Set<string>();
    initialBookings.forEach((b) => s.add(b.startsAt.slice(0, 10)));
    return s;
  }, [initialBookings]);

  /* Day's bookings */
  const dayBookings = useMemo(() => {
    if (!selectedDate) return [];
    const ds = isoDate(selectedDate);
    return initialBookings.filter((b) => b.startsAt.startsWith(ds));
  }, [selectedDate, initialBookings]);

  /* Filtered providers */
  const filteredProviders = useMemo(() => {
    if (!providerSearch.trim()) return allProviders.slice(0, 20);
    const q = providerSearch.toLowerCase();
    return allProviders.filter((p) =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allProviders, providerSearch]);

  const totalDuration = selectedProvider?.services.reduce((a, s) => a + s.durationMinutes, 0) ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">Calendar</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">View your appointments and book new ones</p>
      </div>

      {/* Mode toggle */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-[var(--line)] bg-white p-1 max-w-sm">
        <button
          onClick={() => setMode("my-bookings")}
          className={cn(
            "flex-1 rounded-xl py-2 text-sm font-semibold transition",
            mode === "my-bookings" ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
          )}
        >
          My bookings
        </button>
        <button
          onClick={() => setMode("book-provider")}
          className={cn(
            "flex-1 rounded-xl py-2 text-sm font-semibold transition",
            mode === "book-provider" ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
          )}
        >
          Book a provider
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* ── Left: calendar + provider picker ── */}
        <div className="space-y-5">
          {/* Month nav */}
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
            <MonthGrid
              year={year}
              month={month}
              bookingDates={mode === "my-bookings" ? bookingDates : new Set()}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
          </div>

          {/* Provider picker (book mode only) */}
          {mode === "book-provider" && (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <p className="mb-3 text-sm font-black">Select a provider</p>
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                <input
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  placeholder="Search…"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              {loadingProviders ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" /></div>
              ) : (
                <ul className="max-h-56 overflow-y-auto space-y-1">
                  {filteredProviders.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => setSelectedProvider(p)}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition",
                          selectedProvider?.id === p.id
                            ? "bg-[var(--ink)] text-white"
                            : "hover:bg-[var(--background)] text-[var(--ink)]"
                        )}
                      >
                        {p.name}
                        <span className={cn("ml-2 text-xs", selectedProvider?.id === p.id ? "text-white/70" : "text-[var(--muted)]")}>
                          {p.category}
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredProviders.length === 0 && (
                    <p className="py-4 text-center text-sm text-[var(--muted)]">No providers found</p>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Right: day view ── */}
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="mb-4 text-base font-black">
            {selectedDate
              ? selectedDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
              : "Select a date"}
          </h2>

          {mode === "my-bookings" ? (
            dayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="mb-3 h-10 w-10 text-[var(--muted)]/40" />
                <p className="text-sm font-bold text-[var(--muted)]">No appointments on this day</p>
                <button
                  onClick={() => setMode("book-provider")}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-dark)]"
                >
                  Book a provider
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayBookings.map((b) => {
                  const dot = STATUS_COLOR[b.status] ?? "bg-gray-300";
                  return (
                    <div key={b.id} className="flex items-start gap-3 rounded-2xl border border-[var(--line)] p-4">
                      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dot)} />
                      <div>
                        <p className="font-black text-[var(--ink)]">{b.serviceName}</p>
                        <p className="text-sm text-[var(--brand)] font-semibold">{b.providerName}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(b.startsAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>{b.durationMinutes} min</span>
                          <span className="capitalize">{b.status.toLowerCase().replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Book-provider: show time slots */
            !selectedProvider ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarCheck className="mb-3 h-10 w-10 text-[var(--muted)]/40" />
                <p className="text-sm font-bold text-[var(--muted)]">Select a provider on the left to see availability</p>
              </div>
            ) : !selectedDate ? (
              <p className="text-sm text-[var(--muted)]">Select a date</p>
            ) : busyLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" /></div>
            ) : (
              <div>
                <p className="mb-4 text-sm text-[var(--muted)]">
                  Availability for <strong>{selectedProvider.name}</strong> — click an open slot to book
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {SLOTS.map((s) => {
                    const disabled = slotDisabled(s.label, busy, totalDuration > 0 ? totalDuration : 60, selectedDate);
                    return (
                      <button
                        key={s.label}
                        disabled={disabled}
                        onClick={() => { setBookingSlot(s.label); setBookingDate(selectedDate ? new Date(selectedDate) : null); }}
                        className={cn(
                          "rounded-xl border py-2.5 text-sm font-bold transition",
                          disabled
                            ? "border-[var(--line)] bg-[var(--background)] text-[var(--muted)]/40 cursor-not-allowed line-through"
                            : "border-[var(--brand)]/30 bg-[var(--brand)]/5 text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white"
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* BookingFlow overlay — date + slot pre-filled so user skips straight to review */}
      {bookingSlot && selectedProvider && bookingDate && (
        <BookingFlow
          open
          onClose={() => { setBookingSlot(null); setBookingDate(null); }}
          providerProfileId={selectedProvider.id}
          providerName={selectedProvider.name}
          services={selectedProvider.services}
          preselectedDate={bookingDate}
          preselectedSlot={bookingSlot}
        />
      )}
    </div>
  );
}
