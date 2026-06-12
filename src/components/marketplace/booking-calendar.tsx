"use client";

/**
 * Shared calendar date-picker used by:
 *   - BookingFlow modal (booking-flow.tsx)
 *   - ProviderProfilePage sidebar/drawer (provider-profile-page.tsx)
 *   - StickyBookingBar mobile sheet (sticky-booking-bar.tsx)
 *
 * Renders a proper Sun–Sat 7-column grid aligned to the current week,
 * with capacity fill (water-in-cup), greyed-out closed/past days, and
 * synchronous SA-public-holiday detection.
 */

import { useEffect, useState } from "react";

/* ── SA Public Holidays ───────────────────────────────────────── */
function easterSunday(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

export function isSAPublicHolidayClient(d: Date): boolean {
  const y = d.getFullYear(), mo = d.getMonth() + 1, da = d.getDate(), dow = d.getDay();
  const easter = easterSunday(y);
  const gf = new Date(easter); gf.setDate(easter.getDate() - 2);
  const fm = new Date(easter); fm.setDate(easter.getDate() + 1);
  function isFixed(hmo: number, hda: number): boolean {
    if (mo === hmo && da === hda) return true;
    if (dow === 1 && mo === hmo && da - 1 === hda) return true;
    return false;
  }
  return (
    isFixed(1, 1) || isFixed(3, 21) ||
    (mo === gf.getMonth() + 1 && da === gf.getDate()) ||
    (mo === fm.getMonth() + 1 && da === fm.getDate()) ||
    isFixed(4, 27) || isFixed(5, 1) || isFixed(6, 16) ||
    isFixed(8, 9) || isFixed(9, 24) || isFixed(12, 16) ||
    isFixed(12, 25) || isFixed(12, 26)
  );
}

/* ── Types ────────────────────────────────────────────────────── */
export type WeeklySchedule = Record<number, { open: string; close: string } | null>;

export interface ProviderSchedule {
  weeklySchedule: WeeklySchedule;
  workOnPublicHolidays: boolean;
}

interface DayMeta {
  fill: number;
  hasSlot: boolean;
  closed: boolean;
}

interface Props {
  providerProfileId: string;
  /** Total service + extras duration in minutes — used to check slot fit */
  serviceDuration: number;
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
  /** Optional pre-fetched schedule (avoids an extra request when parent already has it) */
  schedule?: ProviderSchedule | null;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtDs(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ── Component ────────────────────────────────────────────────── */
export function BookingCalendar({
  providerProfileId,
  serviceDuration,
  selectedDate,
  onSelectDate,
  schedule: scheduleProp,
}: Props) {
  const [schedule, setSchedule] = useState<ProviderSchedule | null>(scheduleProp ?? null);
  const [dayMeta, setDayMeta] = useState<Record<string, DayMeta>>({});

  // Fetch schedule if not provided by parent
  useEffect(() => {
    if (scheduleProp !== undefined) { setSchedule(scheduleProp); return; }
    fetch(`/api/providers/schedule?providerProfileId=${providerProfileId}`)
      .then((r) => r.json())
      .then((d) => setSchedule(d))
      .catch(() => {
        // Fallback: Mon–Fri 09–17
        const ws: WeeklySchedule = {};
        for (let i = 0; i < 7; i++) ws[i] = null;
        for (let i = 1; i <= 5; i++) ws[i] = { open: "09:00", close: "17:00" };
        setSchedule({ weeklySchedule: ws, workOnPublicHolidays: true });
      });
  }, [providerProfileId, scheduleProp]);

  // Synchronously decide if a day is closed based on the fetched schedule
  function isDayClosed(d: Date): boolean {
    if (!schedule) return false; // optimistic while loading
    if (!schedule.weeklySchedule[d.getDay()]) return true;
    if (!schedule.workOnPublicHolidays && isSAPublicHolidayClient(d)) return true;
    return false;
  }

  // Build calendar: start from Sunday of the current week, end on the Saturday
  // that is at least 14 days from today.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - today.getDay()); // back to Sunday
  const minEnd = new Date(today); minEnd.setDate(today.getDate() + 27); // at least 4 weeks
  const gridEnd = new Date(minEnd);
  gridEnd.setDate(minEnd.getDate() + (6 - minEnd.getDay())); // forward to Saturday

  const calDays: Date[] = [];
  for (const cur = new Date(gridStart); cur <= gridEnd; cur.setDate(cur.getDate() + 1)) {
    calDays.push(new Date(cur));
  }

  // Prefetch capacity for open days
  useEffect(() => {
    if (serviceDuration === 0) return;
    calDays.forEach((d) => {
      const ds = fmtDs(d);
      if (dayMeta[ds]) return;
      if (isDayClosed(d) || d < today) {
        setDayMeta((prev) => ({ ...prev, [ds]: { fill: 1, hasSlot: false, closed: true } }));
        return;
      }
      fetch(`/api/bookings/availability?providerProfileId=${providerProfileId}&date=${ds}`)
        .then((r) => r.json())
        .then((data) => {
          const wh: { open: string; close: string } | null = data.workingHours ?? null;
          const busy: Array<{ start: string; durationMinutes: number }> = data.busy ?? [];
          if (!wh || busy.some((b) => b.durationMinutes >= 1440)) {
            setDayMeta((prev) => ({ ...prev, [ds]: { fill: 1, hasSlot: false, closed: true } }));
            return;
          }
          const [oh, om] = wh.open.split(":").map(Number);
          const [ch, cm] = wh.close.split(":").map(Number);
          const totalMins = (ch * 60 + cm) - (oh * 60 + om);
          if (totalMins <= 0) {
            setDayMeta((prev) => ({ ...prev, [ds]: { fill: 1, hasSlot: false, closed: true } }));
            return;
          }
          const bookedMins = busy.reduce((s, b) => s + b.durationMinutes, 0);
          const fill = Math.min(bookedMins / totalMins, 1);
          const openMs = new Date(`${ds}T${wh.open}:00`).getTime();
          const closeMs = new Date(`${ds}T${wh.close}:00`).getTime();
          const now = new Date();
          let hasSlot = false;
          for (let t = openMs; t + serviceDuration * 60000 <= closeMs; t += 30 * 60000) {
            if (t < now.getTime()) continue;
            const slotEnd = t + serviceDuration * 60000;
            const overlaps = busy.some((b) => {
              const bs = new Date(b.start).getTime();
              return t < bs + b.durationMinutes * 60000 && slotEnd > bs;
            });
            if (!overlaps) { hasSlot = true; break; }
          }
          setDayMeta((prev) => ({ ...prev, [ds]: { fill, hasSlot, closed: false } }));
        })
        .catch(() => setDayMeta((prev) => ({ ...prev, [ds]: { fill: 0, hasSlot: true, closed: false } })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerProfileId, serviceDuration, schedule]);

  // Group calendar days into weeks for the month-header label
  const months = [...new Set(calDays.map((d) => d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })))];

  return (
    <div>
      {/* Month label */}
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {months.join(" / ")}
      </p>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((label) => (
          <div key={label} className="py-1 text-center text-[10px] font-bold uppercase text-[var(--muted)]">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {calDays.map((d) => {
          const ds = fmtDs(d);
          const isPast = d < today;
          const meta = dayMeta[ds];
          const closed = isDayClosed(d);
          const unavailable = isPast || closed || (meta ? (!meta.hasSlot || meta.closed) : false);
          const fill = meta?.fill ?? 0;
          const sel = selectedDate && d.toDateString() === selectedDate.toDateString();
          const isToday = d.toDateString() === today.toDateString();

          const fillColor =
            fill < 0.5  ? `rgb(34,197,94,${0.35 + fill * 0.65})`  :
            fill < 0.85 ? `rgb(251,191,36,${0.45 + fill * 0.55})` :
                          `rgb(239,68,68,${0.5 + fill * 0.5})`;

          return (
            <button
              key={ds}
              disabled={unavailable}
              onClick={() => onSelectDate(d)}
              className={[
                "relative overflow-hidden rounded-xl border py-4 text-center transition select-none",
                unavailable
                  ? "cursor-not-allowed border-transparent bg-transparent opacity-30"
                  : sel
                  ? "border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm"
                  : "border-[var(--line)] bg-white hover:border-[var(--brand)] hover:bg-[var(--brand)]/5",
              ].join(" ")}
            >
              {/* Water-fill capacity bg */}
              {!unavailable && fill > 0 && (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl transition-all duration-700"
                  style={{ height: `${Math.round(fill * 100)}%`, background: fillColor, opacity: 0.15 }}
                />
              )}

              {/* Date number */}
              <span className={[
                "relative block text-sm font-black leading-none",
                sel ? "text-[var(--brand)]" :
                unavailable ? "line-through text-[var(--muted)]/40" :
                isToday ? "text-[var(--brand)]" :
                "text-[var(--ink)]",
              ].join(" ")}>
                {d.getDate()}
              </span>

              {/* Today dot */}
              {isToday && !sel && (
                <span className="relative mt-0.5 block">
                  <span className="mx-auto block h-1 w-1 rounded-full bg-[var(--brand)]" />
                </span>
              )}

              {/* Capacity bar */}
              {!unavailable && meta && (
                <span className="relative mt-1 block px-1">
                  <span className="block h-0.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                    <span
                      className="block h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.round(fill * 100)}%`, background: fillColor }}
                    />
                  </span>
                </span>
              )}

              {/* Loading shimmer */}
              {!meta && !unavailable && !closed && (
                <span className="relative mt-1 block px-1">
                  <span className="block h-0.5 w-full animate-pulse rounded-full bg-[var(--line)]" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
