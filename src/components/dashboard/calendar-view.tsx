"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, X, Check, UserX, ClipboardCheck,
  XCircle, Clock, CalendarDays, BadgeCheck, Mail, Loader2, Pencil, Ban
} from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, parseISO, addMinutes } from "date-fns";
import Image from "next/image";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkingHour = { day: string; enabled: boolean; from: string; to: string };

type Booking = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientImage: string | null;
  service: string;
  agentName: string | null;
  durationMinutes: number;
  startsAt: string;
  status: string;
  priceCents: number;
  depositCents: number;
  checkedInAt: string | null;
  noShowAt: string | null;
  completedAt: string | null;
  notes: string | null;
};

type BlockedSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

type PanelState =
  | { type: "booking"; booking: Booking }
  | { type: "blocked"; slot: BlockedSlot }
  | { type: "new"; startsAt: Date };

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_WH: WorkingHour[] = [
  "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"
].map((day, i) => ({ day, enabled: i < 5, from: "09:00", to: "17:00" }));

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#0891B2",
  COMPLETED: "#16A34A",
  CANCELLED: "#9CA3AF",
  PENDING_DEPOSIT: "#D97706",
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PENDING_DEPOSIT: "Awaiting deposit",
};

const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function formatCents(c: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function categoryColor(service: string): string {
  const s = service.toLowerCase();
  if (s.includes("hair") || s.includes("cut") || s.includes("trim")) return "#D94472";
  if (s.includes("nail") || s.includes("manicure") || s.includes("pedicure")) return "#7C3AED";
  if (s.includes("brow") || s.includes("lash") || s.includes("wax")) return "#EA580C";
  if (s.includes("makeup") || s.includes("mua")) return "#DB2777";
  return "#0891B2";
}

// ─── Overlap layout ──────────────────────────────────────────────────────────

type LayoutItem = { id: string; startMin: number; endMin: number; col: number; cols: number };

function layoutItems(items: { id: string; startMin: number; endMin: number }[]): LayoutItem[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const result: LayoutItem[] = [];
  // Track running groups of overlapping items
  const groups: LayoutItem[][] = [];

  for (const item of sorted) {
    // Find a group this overlaps with
    let placed = false;
    for (const group of groups) {
      // Check if item overlaps any in group
      const overlaps = group.some(g => item.startMin < g.endMin && item.endMin > g.startMin);
      if (overlaps) {
        // Find first free column
        const usedCols = new Set(group.map(g => g.col));
        let col = 0;
        while (usedCols.has(col)) col++;
        const layout: LayoutItem = { ...item, col, cols: 1 };
        group.push(layout);
        result.push(layout);
        placed = true;
        break;
      }
    }
    if (!placed) {
      const layout: LayoutItem = { ...item, col: 0, cols: 1 };
      groups.push([layout]);
      result.push(layout);
    }
  }

  // Second pass: set cols = max col+1 in each overlapping cluster
  for (const group of groups) {
    const maxCol = Math.max(...group.map(g => g.col)) + 1;
    group.forEach(g => { g.cols = maxCol; });
  }

  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CalendarView() {
  const [week, setWeek] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(DEFAULT_WH);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkInCode, setCheckInCode] = useState("");
  const [checkInError, setCheckInError] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  // New block form
  const [blockReason, setBlockReason] = useState("");
  const [blockDuration, setBlockDuration] = useState(60);
  // Edit booking
  const [editMode, setEditMode] = useState(false);

  const weekStart = startOfWeek(week, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Compute visible hour range from working hours
  const enabledWH = workingHours.filter(w => w.enabled);
  const gridStart = enabledWH.length
    ? Math.min(...enabledWH.map(w => Math.floor(timeToMin(w.from) / 60)))
    : 8;
  const gridEnd = enabledWH.length
    ? Math.max(...enabledWH.map(w => Math.ceil(timeToMin(w.to) / 60)))
    : 20;
  const HOURS = Array.from({ length: gridEnd - gridStart }, (_, i) => gridStart + i);
  const PX_PER_HOUR = 64;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bookRes, whRes, blockRes] = await Promise.all([
        fetch("/api/dashboard/bookings"),
        fetch("/api/dashboard/settings"),
        fetch("/api/dashboard/blocked-slots"),
      ]);
      const bookData = await bookRes.json();
      const whData = await whRes.json();
      const blockData = await blockRes.json();

      if (Array.isArray(bookData.bookings)) {
        setBookings(bookData.bookings.map((b: any) => ({
          id: b.id,
          clientName: b.client.name,
          clientEmail: b.client.email,
          clientImage: b.client.image ?? null,
          service: b.service,
          agentName: b.agentName ?? null,
          durationMinutes: b.durationMinutes,
          startsAt: b.startsAt,
          status: b.status,
          priceCents: b.priceCents,
          depositCents: b.depositCents,
          checkedInAt: b.checkedInAt ?? null,
          noShowAt: b.noShowAt ?? null,
          completedAt: b.completedAt ?? null,
          notes: b.notes ?? null,
        })));
      }
      if (whData.workingHoursJson) {
        try { setWorkingHours(JSON.parse(whData.workingHoursJson)); } catch {}
      }
      if (Array.isArray(blockData.slots)) {
        setBlockedSlots(blockData.slots);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset side effects when panel changes
  useEffect(() => {
    if (panel?.type === "booking") {
      setNotesValue(panel.booking.notes ?? "");
      setNotesDirty(false);
      setCheckInCode("");
      setCheckInError("");
      setEditMode(false);
    }
    if (panel?.type === "new") {
      setBlockReason("");
      setBlockDuration(60);
    }
  }, [panel?.type === "booking" ? (panel as any).booking.id : panel?.type]);

  function bookingsForDay(day: Date) {
    return bookings.filter(b => !["CANCELLED","PENDING_DEPOSIT"].includes(b.status) && isSameDay(parseISO(b.startsAt), day));
  }

  function cancelledForDay(day: Date) {
    return bookings.filter(b => b.status === "CANCELLED" && isSameDay(parseISO(b.startsAt), day));
  }

  function blockedForDay(day: Date) {
    return blockedSlots.filter(s => isSameDay(parseISO(s.startsAt), day));
  }

  function workingHoursForDay(day: Date): WorkingHour | undefined {
    const dayName = DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1];
    return workingHours.find(w => w.day === dayName);
  }

  function slotTop(time: string | Date): number {
    const d = typeof time === "string" ? parseISO(time) : time;
    const mins = d.getHours() * 60 + d.getMinutes();
    return (mins / 60 - gridStart) * PX_PER_HOUR;
  }

  function slotHeight(minutes: number): number {
    return (minutes / 60) * PX_PER_HOUR;
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = gridStart + y / PX_PER_HOUR;
    const roundedMin = Math.round((hour * 60) / 15) * 15;
    const startsAt = new Date(day);
    startsAt.setHours(Math.floor(roundedMin / 60), roundedMin % 60, 0, 0);
    setPanel({ type: "new", startsAt });
  }

  // ── Booking actions ──────────────────────────────────────────────────────

  async function doAttendance(action: string, extra?: Record<string, unknown>) {
    if (panel?.type !== "booking") return;
    setActionLoading(action);
    setCheckInError("");
    try {
      const res = await fetch(`/api/dashboard/bookings/${panel.booking.id}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (action === "check_in") setCheckInError(data.error ?? "Check-in failed");
        return;
      }
      await load();
      const updated = bookings.find(b => b.id === panel.booking.id);
      if (updated) setPanel({ type: "booking", booking: { ...updated, ...data.booking } });
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelBooking() {
    if (panel?.type !== "booking") return;
    setActionLoading("cancel");
    try {
      await fetch(`/api/dashboard/bookings/${panel.booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      await load();
      setPanel(null);
    } finally {
      setActionLoading(null);
    }
  }

  async function saveNotes() {
    if (panel?.type !== "booking") return;
    setActionLoading("notes");
    try {
      await fetch(`/api/dashboard/bookings/${panel.booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue }),
      });
      setNotesDirty(false);
    } finally {
      setActionLoading(null);
    }
  }

  async function createBlock() {
    if (panel?.type !== "new") return;
    setActionLoading("block");
    try {
      const endsAt = addMinutes(panel.startsAt, blockDuration);
      const res = await fetch("/api/dashboard/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: panel.startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: blockReason || null }),
      });
      if (res.ok) {
        await load();
        setPanel(null);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteBlock() {
    if (panel?.type !== "blocked") return;
    setActionLoading("delete");
    try {
      await fetch(`/api/dashboard/blocked-slots/${panel.slot.id}`, { method: "DELETE" });
      await load();
      setPanel(null);
    } finally {
      setActionLoading(null);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const booking = panel?.type === "booking" ? panel.booking : null;
  const isActive = booking?.status === "CONFIRMED";
  const isCheckedIn = !!booking?.checkedInAt;
  const canNoShow = isActive && booking?.startsAt
    ? Date.now() >= parseISO(booking.startsAt).getTime() + 5 * 60 * 1000
    : false;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main calendar ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h1 className="text-xl font-black">Calendar</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeek(subWeeks(week, 1))} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[160px] text-center text-sm font-bold">
              {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
            </span>
            <button onClick={() => setWeek(addWeeks(week, 1))} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setWeek(new Date())} className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">
              Today
            </button>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          {/* Time gutter */}
          <div className="w-16 shrink-0 border-r border-gray-100">
            <div className="h-12 border-b border-gray-100" />
            {HOURS.map((h) => (
              <div key={h} className="relative border-b border-gray-50" style={{ height: PX_PER_HOUR }}>
                <span className="absolute -top-2 right-2 text-[10px] text-gray-400">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex flex-1 overflow-x-auto">
            {days.map((day) => {
              const isToday = isSameDay(day, new Date());
              const wh = workingHoursForDay(day);
              const isDayOff = !wh?.enabled;

              // Build layout items for active bookings
              const activeBookings = bookingsForDay(day);
              const layoutData = layoutItems(activeBookings.map(b => {
                const s = parseISO(b.startsAt);
                const startMin = s.getHours() * 60 + s.getMinutes();
                return { id: b.id, startMin, endMin: startMin + b.durationMinutes };
              }));
              const layoutMap = new Map(layoutData.map(l => [l.id, l]));

              const cancelled = cancelledForDay(day);
              const blocked = blockedForDay(day);

              return (
                <div key={day.toISOString()} className="flex min-w-[110px] flex-1 flex-col border-r border-gray-100 last:border-r-0">
                  {/* Day header */}
                  <div className="flex h-12 flex-col items-center justify-center border-b border-gray-100">
                    <p className="text-[10px] font-semibold uppercase text-gray-400">{format(day, "EEE")}</p>
                    <p className={`text-sm font-black ${isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#D94472] text-white" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>

                  {/* Time grid */}
                  <div
                    className="relative flex-1 select-none"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return;
                      if (!isDayOff) handleGridClick(e, day);
                    }}
                  >
                    {/* Hour rows */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className={cn("border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer", isDayOff && "bg-gray-50 cursor-not-allowed")}
                        style={{ height: PX_PER_HOUR }}
                      />
                    ))}

                    {/* Day-off overlay */}
                    {isDayOff && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-gray-300 font-semibold rotate-90">Day off</span>
                      </div>
                    )}

                    {/* Working hours shading — before open and after close */}
                    {wh?.enabled && (() => {
                      const openMin = timeToMin(wh.from);
                      const closeMin = timeToMin(wh.to);
                      const openTop = (openMin / 60 - gridStart) * PX_PER_HOUR;
                      const closeTop = (closeMin / 60 - gridStart) * PX_PER_HOUR;
                      const totalH = HOURS.length * PX_PER_HOUR;
                      return (
                        <>
                          {openTop > 0 && (
                            <div className="absolute inset-x-0 top-0 bg-gray-100/60 pointer-events-none" style={{ height: openTop }} />
                          )}
                          {closeTop < totalH && (
                            <div className="absolute inset-x-0 bg-gray-100/60 pointer-events-none" style={{ top: closeTop, bottom: 0 }} />
                          )}
                        </>
                      );
                    })()}

                    {/* Blocked slots */}
                    {blocked.map(slot => {
                      const top = slotTop(slot.startsAt);
                      const dMin = (parseISO(slot.endsAt).getTime() - parseISO(slot.startsAt).getTime()) / 60000;
                      const height = slotHeight(dMin);
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setPanel({ type: "blocked", slot })}
                          style={{ top: Math.max(0, top), height: Math.max(height, 24) }}
                          className="absolute inset-x-1 overflow-hidden rounded-lg border border-gray-300 bg-gray-100 px-1.5 py-1 text-left hover:bg-gray-200"
                        >
                          <p className="truncate text-[10px] font-bold text-gray-500 flex items-center gap-1">
                            <Ban className="h-2.5 w-2.5" /> Blocked
                          </p>
                          {slot.reason && <p className="truncate text-[10px] text-gray-400">{slot.reason}</p>}
                        </button>
                      );
                    })}

                    {/* Active bookings (with overlap layout) */}
                    {activeBookings.map(b => {
                      const layout = layoutMap.get(b.id)!;
                      const top = slotTop(b.startsAt);
                      const height = slotHeight(b.durationMinutes);
                      const color = categoryColor(b.service);
                      const colW = 100 / layout.cols;
                      const isSelected = panel?.type === "booking" && panel.booking.id === b.id;

                      return (
                        <button
                          key={b.id}
                          onClick={() => setPanel({ type: "booking", booking: b })}
                          style={{
                            top: Math.max(0, top),
                            height: Math.max(height, 28),
                            left: `${layout.col * colW}%`,
                            width: `${colW}%`,
                            backgroundColor: color + "20",
                            borderLeftColor: color,
                          }}
                          className={cn(
                            "absolute overflow-hidden rounded-r-lg border-l-2 px-1.5 py-1 text-left transition-all hover:brightness-95",
                            isSelected && "brightness-90"
                          )}
                        >
                          <p className="truncate text-[10px] font-bold" style={{ color }}>
                            {format(parseISO(b.startsAt), "h:mm a")} {b.service}
                          </p>
                          <p className="truncate text-[10px] text-gray-500">{b.clientName}</p>
                          {b.checkedInAt && !b.noShowAt && <span className="text-[9px] font-semibold text-green-600">✓ In</span>}
                          {b.noShowAt && <span className="text-[9px] font-semibold text-red-500">No-show</span>}
                          {b.completedAt && !b.noShowAt && <span className="text-[9px] font-semibold text-blue-600">✓ Done</span>}
                        </button>
                      );
                    })}

                    {/* Cancelled (faded, small) */}
                    {cancelled.map(b => {
                      const top = slotTop(b.startsAt);
                      return (
                        <button
                          key={b.id}
                          onClick={() => setPanel({ type: "booking", booking: b })}
                          style={{ top: Math.max(0, top), height: 22, borderLeftColor: "#9CA3AF" }}
                          className="absolute inset-x-1 overflow-hidden rounded-r border-l-2 bg-gray-100 px-1.5 text-left opacity-50 hover:opacity-75"
                        >
                          <p className="truncate text-[9px] font-semibold text-gray-500">{b.service} – cancelled</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Side panel ── */}
      {panel && (
        <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white" onClick={e => e.stopPropagation()}>
          {/* ── Booking detail ── */}
          {panel.type === "booking" && (() => {
            const b = panel.booking;
            const active = b.status === "CONFIRMED";
            const checkedIn = !!b.checkedInAt;
            const noShow = !!b.noShowAt;
            const canNS = active && Date.now() >= parseISO(b.startsAt).getTime() + 5 * 60 * 1000;

            return (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h2 className="text-sm font-black">Appointment details</h2>
                  <div className="flex items-center gap-1">
                    {active && (
                      <button onClick={() => setEditMode(m => !m)} className={cn("rounded-lg p-1.5 hover:bg-gray-100", editMode && "bg-gray-100")}>
                        <Pencil className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    )}
                    <button onClick={() => setPanel(null)} className="rounded-lg p-1 hover:bg-gray-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-4">
                  {/* Status */}
                  <div
                    className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                    style={{ backgroundColor: (STATUS_COLORS[b.status] ?? "#9CA3AF") + "20", color: STATUS_COLORS[b.status] ?? "#9CA3AF" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[b.status] ?? "#9CA3AF" }} />
                    {STATUS_LABEL[b.status] ?? b.status}
                  </div>

                  {/* Service */}
                  <div className="rounded-xl border border-gray-100 p-3 space-y-1.5">
                    <p className="font-black text-sm">{b.service}</p>
                    {b.agentName && <p className="text-xs text-gray-500">with {b.agentName}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(parseISO(b.startsAt), "EEE, d MMM yyyy")}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(parseISO(b.startsAt), "h:mm a")} · {b.durationMinutes}min</span>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="rounded-xl border border-gray-100 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Client</p>
                    <div className="flex items-center gap-2">
                      {b.clientImage ? (
                        <Image src={b.clientImage} alt="" width={32} height={32} className="rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3e8e4] text-xs font-bold text-[#D94472]">
                          {b.clientName[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold">{b.clientName}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500"><Mail className="h-3 w-3" />{b.clientEmail}</p>
                      </div>
                    </div>
                    {checkedIn && !noShow && (
                      <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3" />Checked in at {format(parseISO(b.checkedInAt!), "h:mm a")}
                      </p>
                    )}
                    {noShow && (
                      <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                        <UserX className="h-3 w-3" />No-show at {format(parseISO(b.noShowAt!), "h:mm a")}
                      </p>
                    )}
                  </div>

                  {/* Payment */}
                  <div className="rounded-xl border border-gray-100 p-3 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Payment</p>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Service price</span><span className="font-semibold">{formatCents(b.priceCents)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Deposit paid</span><span className="font-semibold text-green-600">{formatCents(b.depositCents)}</span></div>
                    <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5"><span className="font-bold">Balance due</span><span className="font-bold">{formatCents(Math.max(0, b.priceCents - b.depositCents))}</span></div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Notes</p>
                    <textarea
                      value={notesValue}
                      onChange={e => { setNotesValue(e.target.value); setNotesDirty(true); }}
                      placeholder="Add appointment notes…"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#D94472] focus:outline-none"
                    />
                    {notesDirty && (
                      <button onClick={saveNotes} disabled={actionLoading === "notes"} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-700 disabled:opacity-50">
                        {actionLoading === "notes" ? "Saving…" : "Save notes"}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  {active && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Actions</p>

                      {!checkedIn && (
                        <div className="space-y-1.5">
                          <input
                            type="text" placeholder="Enter check-in code"
                            value={checkInCode}
                            onChange={e => { setCheckInCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setCheckInError(""); }}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-center text-sm font-mono font-bold tracking-widest focus:border-[#D94472] focus:outline-none"
                            maxLength={6}
                          />
                          {checkInError && <p className="text-xs text-red-500">{checkInError}</p>}
                          <button
                            onClick={() => doAttendance("check_in", { confirmationCode: checkInCode })}
                            disabled={checkInCode.length < 4 || actionLoading === "check_in"}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D94472] py-2 text-sm font-bold text-white hover:bg-[#c03d66] disabled:opacity-40"
                          >
                            {actionLoading === "check_in" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Check in customer
                          </button>
                        </div>
                      )}

                      {checkedIn && !b.completedAt && (
                        <button onClick={() => doAttendance("complete")} disabled={actionLoading === "complete"}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40">
                          {actionLoading === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                          Mark complete
                        </button>
                      )}

                      {canNS && !checkedIn && (
                        <button onClick={() => doAttendance("no_show")} disabled={actionLoading === "no_show"}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 py-2 text-sm font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-40">
                          {actionLoading === "no_show" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                          Mark no-show
                        </button>
                      )}

                      {!canNS && !checkedIn && (
                        <p className="text-[10px] text-gray-400 text-center">No-show available 5 min after start time</p>
                      )}

                      <button onClick={cancelBooking} disabled={actionLoading === "cancel"}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 py-2 text-sm font-bold text-red-500 hover:bg-red-50 disabled:opacity-40">
                        {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Cancel appointment
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* ── New slot panel ── */}
          {panel.type === "new" && (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-black">Block time slot</h2>
                <button onClick={() => setPanel(null)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-col gap-4 p-4">
                <div className="rounded-xl border border-gray-100 p-3 space-y-1">
                  <p className="text-xs text-gray-500 flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(panel.startsAt, "EEE, d MMM yyyy")}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" />Starting at {format(panel.startsAt, "h:mm a")}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Duration</label>
                  <select
                    value={blockDuration}
                    onChange={e => setBlockDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#D94472] focus:outline-none"
                  >
                    {[15, 30, 45, 60, 90, 120, 180, 240, 480].map(m => (
                      <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? ` ${m % 60}min` : ""}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Reason (optional)</label>
                  <input
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="e.g. Lunch break, Staff meeting…"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#D94472] focus:outline-none"
                  />
                </div>

                <button onClick={createBlock} disabled={actionLoading === "block"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-40">
                  {actionLoading === "block" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  Block this slot
                </button>
              </div>
            </>
          )}

          {/* ── Blocked slot detail ── */}
          {panel.type === "blocked" && (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-black">Blocked slot</h2>
                <button onClick={() => setPanel(null)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-col gap-4 p-4">
                <div className="rounded-xl border border-gray-100 p-3 space-y-1.5">
                  <p className="text-xs text-gray-500 flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(parseISO(panel.slot.startsAt), "EEE, d MMM yyyy")}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(panel.slot.startsAt), "h:mm a")} – {format(parseISO(panel.slot.endsAt), "h:mm a")}
                  </p>
                  {panel.slot.reason && <p className="text-sm font-semibold mt-1">{panel.slot.reason}</p>}
                </div>

                <button onClick={deleteBlock} disabled={actionLoading === "delete"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 py-2 text-sm font-bold text-red-500 hover:bg-red-50 disabled:opacity-40">
                  {actionLoading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Remove block
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
