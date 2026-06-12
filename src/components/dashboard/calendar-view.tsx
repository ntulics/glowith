"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, X, Check, UserX, ClipboardCheck,
  XCircle, Clock, CalendarDays, BadgeCheck, Mail, Loader2
} from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, parseISO } from "date-fns";
import Image from "next/image";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00–20:00

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
  color: string;
};

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

function formatCents(c: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);
}

function categoryColor(service: string): string {
  const s = service.toLowerCase();
  if (s.includes("hair") || s.includes("cut") || s.includes("trim")) return "#D94472";
  if (s.includes("nail") || s.includes("manicure") || s.includes("pedicure")) return "#7C3AED";
  if (s.includes("brow") || s.includes("lash") || s.includes("wax")) return "#EA580C";
  if (s.includes("makeup") || s.includes("mua")) return "#DB2777";
  return "#0891B2";
}

export function CalendarView() {
  const [week, setWeek] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkInCode, setCheckInCode] = useState("");
  const [checkInError, setCheckInError] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(week, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/bookings");
      const data = await res.json();
      if (Array.isArray(data.bookings)) {
        setBookings(data.bookings.map((b: any) => ({
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
          color: STATUS_COLORS[b.status] ?? "#0891B2",
        })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sync notes field when booking changes
  useEffect(() => {
    setNotesValue(selected?.notes ?? "");
    setNotesDirty(false);
    setCheckInCode("");
    setCheckInError("");
  }, [selected?.id]);

  function bookingsForDay(day: Date) {
    return bookings.filter((b) => isSameDay(parseISO(b.startsAt), day));
  }

  function openBooking(b: Booking) {
    setSelected(b);
  }

  async function doAction(action: string, extra?: Record<string, unknown>) {
    if (!selected) return;
    setActionLoading(action);
    setCheckInError("");
    try {
      const res = await fetch(`/api/dashboard/bookings/${selected.id}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (action === "check_in") setCheckInError(data.error ?? "Check-in failed");
        return;
      }
      // refresh
      await load();
      setSelected((prev) => {
        if (!prev) return null;
        return { ...prev, ...mapBooking(data.booking) };
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelBooking() {
    if (!selected) return;
    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/dashboard/bookings/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        await load();
        setSelected((prev) => prev ? { ...prev, status: "CANCELLED", color: STATUS_COLORS.CANCELLED } : null);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function saveNotes() {
    if (!selected) return;
    setActionLoading("notes");
    try {
      await fetch(`/api/dashboard/bookings/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue }),
      });
      setNotesDirty(false);
      setSelected((prev) => prev ? { ...prev, notes: notesValue } : null);
    } finally {
      setActionLoading(null);
    }
  }

  function mapBooking(b: any): Partial<Booking> {
    return {
      status: b.status,
      checkedInAt: b.checkedInAt ?? null,
      noShowAt: b.noShowAt ?? null,
      completedAt: b.completedAt ?? null,
      notes: b.notes ?? null,
      color: STATUS_COLORS[b.status] ?? "#0891B2",
    };
  }

  const isActive = selected?.status === "CONFIRMED";
  const isCheckedIn = !!selected?.checkedInAt;
  const canNoShow = isActive && selected?.startsAt
    ? Date.now() >= parseISO(selected.startsAt).getTime() + 10 * 60 * 1000
    : false;

  return (
    <div className="flex h-full overflow-hidden" onClick={() => setSelected(null)}>
      {/* Main calendar */}
      <div className="flex flex-1 flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
          {/* Time column */}
          <div className="w-16 shrink-0 border-r border-gray-100">
            <div className="h-12 border-b border-gray-100" />
            {HOURS.map((h) => (
              <div key={h} className="relative h-16 border-b border-gray-50">
                <span className="absolute -top-2 right-2 text-[10px] text-gray-400">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex flex-1 overflow-x-auto">
            {days.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="flex min-w-[120px] flex-1 flex-col border-r border-gray-100 last:border-r-0">
                  <div className="flex h-12 flex-col items-center justify-center border-b border-gray-100">
                    <p className="text-[10px] font-semibold uppercase text-gray-400">{format(day, "EEE")}</p>
                    <p className={`text-sm font-black ${isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#D94472] text-white" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>

                  <div className="relative flex-1">
                    {HOURS.map((h) => (
                      <div key={h} className="h-16 border-b border-gray-50" />
                    ))}

                    {bookingsForDay(day).map((b) => {
                      const start = parseISO(b.startsAt);
                      const startHour = start.getHours() + start.getMinutes() / 60;
                      const top = (startHour - 8) * 64;
                      const height = (b.durationMinutes / 60) * 64;
                      const color = categoryColor(b.service);
                      const isSelected = selected?.id === b.id;

                      return (
                        <button
                          key={b.id}
                          onClick={(e) => { e.stopPropagation(); openBooking(b); }}
                          style={{
                            top: Math.max(0, top),
                            height: Math.max(height, 28),
                            backgroundColor: color + (b.status === "CANCELLED" ? "15" : "20"),
                            borderLeftColor: b.status === "CANCELLED" ? "#9CA3AF" : color,
                          }}
                          className={cn(
                            "absolute inset-x-1 overflow-hidden rounded-r-lg border-l-2 px-1.5 py-1 text-left transition-all hover:brightness-95",
                            isSelected && "ring-2 ring-offset-1",
                            b.status === "CANCELLED" && "opacity-50"
                          )}

                        >
                          <p className="truncate text-[10px] font-bold" style={{ color: b.status === "CANCELLED" ? "#9CA3AF" : color }}>
                            {format(parseISO(b.startsAt), "h:mm a")} {b.service}
                          </p>
                          <p className="truncate text-[10px] text-gray-500">{b.clientName}</p>
                          {b.checkedInAt && <span className="text-[9px] font-semibold text-green-600">✓ Checked in</span>}
                          {b.status === "COMPLETED" && !b.noShowAt && <span className="text-[9px] font-semibold text-blue-600">✓ Done</span>}
                          {b.noShowAt && <span className="text-[9px] font-semibold text-red-500">No-show</span>}
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

      {/* Detail panel */}
      {selected && (
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="font-black text-sm">Appointment details</h2>
            <button onClick={() => setSelected(null)} className="rounded-lg p-1 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4 p-4">
            {/* Status badge */}
            <div
              className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: (STATUS_COLORS[selected.status] ?? "#9CA3AF") + "20", color: STATUS_COLORS[selected.status] ?? "#9CA3AF" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[selected.status] ?? "#9CA3AF" }} />
              {STATUS_LABEL[selected.status] ?? selected.status}
            </div>

            {/* Service info */}
            <div className="rounded-xl border border-gray-100 p-3 space-y-1.5">
              <p className="font-black text-sm">{selected.service}</p>
              {selected.agentName && (
                <p className="text-xs text-gray-500">with {selected.agentName}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(parseISO(selected.startsAt), "EEE, d MMM yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(selected.startsAt), "h:mm a")} · {selected.durationMinutes}min
                </span>
              </div>
            </div>

            {/* Client info */}
            <div className="rounded-xl border border-gray-100 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Client</p>
              <div className="flex items-center gap-2">
                {selected.clientImage ? (
                  <Image src={selected.clientImage} alt="" width={32} height={32} className="rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3e8e4] text-xs font-bold text-[#D94472]">
                    {selected.clientName[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold">{selected.clientName}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail className="h-3 w-3" />{selected.clientEmail}
                  </p>
                </div>
              </div>
              {selected.checkedInAt && (
                <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Checked in at {format(parseISO(selected.checkedInAt), "h:mm a")}
                </p>
              )}
              {selected.noShowAt && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                  <UserX className="h-3 w-3" />
                  No-show marked at {format(parseISO(selected.noShowAt), "h:mm a")}
                </p>
              )}
            </div>

            {/* Payment */}
            <div className="rounded-xl border border-gray-100 p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Payment</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Service price</span>
                <span className="font-semibold">{formatCents(selected.priceCents)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Deposit paid</span>
                <span className="font-semibold text-green-600">{formatCents(selected.depositCents)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5">
                <span className="font-bold">Balance due</span>
                <span className="font-bold">{formatCents(Math.max(0, selected.priceCents - selected.depositCents))}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Notes</p>
              <textarea
                value={notesValue}
                onChange={(e) => { setNotesValue(e.target.value); setNotesDirty(true); }}
                placeholder="Add appointment notes…"
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#D94472] focus:outline-none"
              />
              {notesDirty && (
                <button
                  onClick={saveNotes}
                  disabled={actionLoading === "notes"}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {actionLoading === "notes" ? "Saving…" : "Save notes"}
                </button>
              )}
            </div>

            {/* Actions */}
            {isActive && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Actions</p>

                {/* Check-in */}
                {!isCheckedIn && (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Enter customer check-in code"
                      value={checkInCode}
                      onChange={(e) => { setCheckInCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setCheckInError(""); }}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-center text-sm font-mono font-bold tracking-widest focus:border-[#D94472] focus:outline-none"
                      maxLength={6}
                    />
                    {checkInError && <p className="text-xs text-red-500">{checkInError}</p>}
                    <button
                      onClick={() => doAction("check_in", { confirmationCode: checkInCode })}
                      disabled={checkInCode.length < 4 || actionLoading === "check_in"}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D94472] py-2 text-sm font-bold text-white hover:bg-[#c03d66] disabled:opacity-40"
                    >
                      {actionLoading === "check_in" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Check in customer
                    </button>
                  </div>
                )}

                {/* Complete */}
                {isCheckedIn && selected.status !== "COMPLETED" && (
                  <button
                    onClick={() => doAction("complete")}
                    disabled={actionLoading === "complete"}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40"
                  >
                    {actionLoading === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                    Mark complete
                  </button>
                )}

                {/* No-show */}
                {canNoShow && !isCheckedIn && (
                  <button
                    onClick={() => doAction("no_show")}
                    disabled={actionLoading === "no_show"}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 py-2 text-sm font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-40"
                  >
                    {actionLoading === "no_show" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                    Mark no-show
                  </button>
                )}

                {/* Cancel */}
                <button
                  onClick={cancelBooking}
                  disabled={actionLoading === "cancel"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 py-2 text-sm font-bold text-red-500 hover:bg-red-50 disabled:opacity-40"
                >
                  {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Cancel appointment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
