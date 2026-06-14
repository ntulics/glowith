"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, X, Check, UserX, ClipboardCheck,
  XCircle, Clock, CalendarDays, BadgeCheck, Mail, Loader2, Ban,
  Plus, Search, UserPlus
} from "lucide-react";
import {
  format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks,
  parseISO, addMinutes
} from "date-fns";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { saHolidaysForYear, type SAHoliday } from "@/lib/sa-holidays";

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

type ExtraOption = { id: string; name: string; durationMinutes: number; priceCents: number };
type ServiceOption = { id: string; name: string; durationMinutes: number; priceCents: number; extras: ExtraOption[] };
type ClientOption = { id: string; name: string; email: string; image: string | null };
type AgentOption = { id: string; name: string; avatarUrl: string | null };

type PanelState =
  | { type: "booking"; booking: Booking }
  | { type: "blocked"; slot: BlockedSlot }
  | { type: "new"; startsAt: Date }
  | { type: "reschedule"; booking: Booking };

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
const PX_PER_HOUR = 80; // taller rows = fills screen, less blank space

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
  const groups: LayoutItem[][] = [];

  for (const item of sorted) {
    let placed = false;
    for (const group of groups) {
      const overlaps = group.some(g => item.startMin < g.endMin && item.endMin > g.startMin);
      if (overlaps) {
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
  const [workOnPublicHolidays, setWorkOnPublicHolidays] = useState(true);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Provider type + agents (for BUSINESS providers)
  const [isBusiness, setIsBusiness] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);

  // Booking detail state
  const [checkInCode, setCheckInCode] = useState("");
  const [checkInError, setCheckInError] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  // New-slot panel state
  const [newMode, setNewMode] = useState<"pick" | "block" | "booking">("pick");
  const [blockReason, setBlockReason] = useState("");
  const [blockAgentId, setBlockAgentId] = useState(""); // which agent to block (BUSINESS only)
  // Date-range block
  const [blockStartDate, setBlockStartDate] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndDate, setBlockEndDate] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("17:00");

  // Manual booking form state
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [bookingAgentId, setBookingAgentId] = useState(""); // which agent for the manual booking
  const [availableAgentsForSlot, setAvailableAgentsForSlot] = useState<AgentOption[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingError, setBookingError] = useState("");
  const clientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  // Compute grid from working hours — only show working days
  const enabledWH = workingHours.filter(w => w.enabled);
  const gridStart = enabledWH.length ? Math.min(...enabledWH.map(w => Math.floor(timeToMin(w.from) / 60))) : 8;
  const gridEnd = enabledWH.length ? Math.max(...enabledWH.map(w => Math.ceil(timeToMin(w.to) / 60))) : 20;
  const HOURS = Array.from({ length: gridEnd - gridStart }, (_, i) => gridStart + i);

  const weekStart = startOfWeek(week, { weekStartsOn: 1 });
  const allDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  // Only show working days (skip days marked off)
  const days = allDays.filter(d => {
    const name = DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1];
    return workingHours.find(w => w.day === name)?.enabled ?? true;
  });

  // Build a map of public holidays for any year visible in this view
  const holidayMap = new Map<string, SAHoliday>();
  const yearsInView = [...new Set(days.map(d => d.getFullYear()))];
  for (const y of yearsInView) {
    for (const h of saHolidaysForYear(y)) {
      const key = format(h.observed, "yyyy-MM-dd");
      holidayMap.set(key, h);
    }
  }
  function holidayForDay(day: Date): SAHoliday | undefined {
    return holidayMap.get(format(day, "yyyy-MM-dd"));
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bookRes, whRes, blockRes, svcRes] = await Promise.all([
        fetch("/api/dashboard/bookings"),
        fetch("/api/dashboard/settings"),
        fetch("/api/dashboard/blocked-slots"),
        fetch("/api/dashboard/services"),
      ]);
      const bookData = await bookRes.json();
      const whData = await whRes.json();
      const blockData = await blockRes.json();
      const svcData = await svcRes.json();

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
      if (typeof whData.workOnPublicHolidays === "boolean") {
        setWorkOnPublicHolidays(whData.workOnPublicHolidays);
      }
      if (whData.providerType === "BUSINESS") {
        setIsBusiness(true);
        setAgents((whData.agents ?? []).map((a: any) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl ?? null })));
      }
      if (Array.isArray(blockData.slots)) setBlockedSlots(blockData.slots);
      if (Array.isArray(svcData.services)) {
        setServices(svcData.services.map((s: any) => ({
          id: s.id, name: s.name,
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
          extras: (s.extras ?? []).map((e: any) => ({ id: e.id, name: e.name, durationMinutes: e.durationMinutes, priceCents: e.priceCents }))
        })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset panel state on change
  useEffect(() => {
    if (panel?.type === "booking") {
      setNotesValue(panel.booking.notes ?? "");
      setNotesDirty(false);
      setCheckInCode("");
      setCheckInError("");
    }
    if (panel?.type === "new") {
      setNewMode("pick");
      setBlockReason("");
      const d = format(panel.startsAt, "yyyy-MM-dd");
      const t = format(panel.startsAt, "HH:mm");
      setBlockStartDate(d); setBlockStartTime(t);
      setBlockEndDate(d); setBlockEndTime(format(addMinutes(panel.startsAt, 60), "HH:mm"));
      setSelectedClient(null);
      setClientQuery("");
      setClientResults([]);
      setSelectedServiceId(services[0]?.id ?? "");
      setSelectedExtraIds([]);
      setBookingNotes("");
      setBookingError("");
    }
    if (panel?.type === "reschedule") {
      setRescheduleDate(format(parseISO(panel.booking.startsAt), "yyyy-MM-dd"));
      setRescheduleTime(format(parseISO(panel.booking.startsAt), "HH:mm"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel?.type === "booking" ? (panel as any).booking.id : panel?.type]);

  // Client search debounce
  useEffect(() => {
    if (clientTimer.current) clearTimeout(clientTimer.current);
    if (!clientQuery.trim()) { setClientResults([]); return; }
    setClientSearching(true);
    clientTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dashboard/clients?q=${encodeURIComponent(clientQuery)}`);
        const data = await res.json();
        setClientResults(data.clients ?? []);
      } finally {
        setClientSearching(false);
      }
    }, 300);
  }, [clientQuery]);

  // ── Grid helpers ─────────────────────────────────────────────────────────

  function slotTop(time: string | Date) {
    const d = typeof time === "string" ? parseISO(time) : time;
    return (d.getHours() + d.getMinutes() / 60 - gridStart) * PX_PER_HOUR;
  }
  function slotHeight(mins: number) { return (mins / 60) * PX_PER_HOUR; }

  function bookingsForDay(day: Date) {
    return bookings.filter(b => !["CANCELLED","PENDING_DEPOSIT"].includes(b.status) && isSameDay(parseISO(b.startsAt), day));
  }
  function cancelledForDay(day: Date) {
    return bookings.filter(b => b.status === "CANCELLED" && isSameDay(parseISO(b.startsAt), day));
  }
  function blockedForDay(day: Date) {
    return blockedSlots.filter(s => isSameDay(parseISO(s.startsAt), day));
  }
  function whForDay(day: Date): WorkingHour | undefined {
    const name = DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1];
    return workingHours.find(w => w.day === name);
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    if ((e.target as HTMLElement).closest("button,a")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMin = (gridStart + y / PX_PER_HOUR) * 60;
    const roundedMin = Math.round(rawMin / 15) * 15;
    const startsAt = new Date(day);
    startsAt.setHours(Math.floor(roundedMin / 60), roundedMin % 60, 0, 0);
    setPanel({ type: "new", startsAt });
  }

  // ── Actions ──────────────────────────────────────────────────────────────

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
      if (!res.ok) { if (action === "check_in") setCheckInError(data.error ?? "Check-in failed"); return; }
      await load();
      setPanel(prev => prev?.type === "booking"
        ? { type: "booking", booking: { ...prev.booking, ...data.booking } }
        : prev);
    } finally { setActionLoading(null); }
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
    } finally { setActionLoading(null); }
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
    } finally { setActionLoading(null); }
  }

  // Load available agents for a service+slot (BUSINESS mode)
  // Uses /api/dashboard/agents-available — a scoped endpoint that resolves the caller's business ID
  async function refreshAvailableAgents(serviceId: string, startsAt: Date) {
    if (!isBusiness || !serviceId) return;
    setLoadingAgents(true);
    const ds = format(startsAt, "yyyy-MM-dd");
    const slotTime = format(startsAt, "HH:mm");
    const svc = services.find(s => s.id === serviceId);
    const dur = svc ? svc.durationMinutes : 60;
    try {
      const r = await fetch(`/api/dashboard/agents-available?date=${ds}&slot=${slotTime}&duration=${dur}&serviceId=${serviceId}`);
      const d = await r.json();
      setAvailableAgentsForSlot((d.agents ?? []).map((a: any) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl ?? null })));
    } catch { setAvailableAgentsForSlot([]); }
    setLoadingAgents(false);
  }

  async function createBlock() {
    setActionLoading("block");
    try {
      const startsAt = new Date(`${blockStartDate}T${blockStartTime}`);
      const endsAt = new Date(`${blockEndDate}T${blockEndTime}`);
      if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) return;
      const res = await fetch("/api/dashboard/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          reason: blockReason || null,
          agentProfileId: isBusiness && blockAgentId ? blockAgentId : undefined,
        }),
      });
      if (res.ok) { await load(); setPanel(null); }
    } finally { setActionLoading(null); }
  }

  async function createManualBooking() {
    if (panel?.type !== "new") return;
    setBookingError("");
    if (!selectedClient) { setBookingError("Select a client"); return; }
    if (!selectedServiceId) { setBookingError("Select a service"); return; }
    if (isBusiness && !bookingAgentId) { setBookingError("Select an agent for this booking"); return; }
    setActionLoading("booking");
    try {
      const res = await fetch("/api/dashboard/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          serviceId: selectedServiceId,
          extraIds: selectedExtraIds,
          startsAt: panel.startsAt.toISOString(),
          notes: bookingNotes || null,
          agentProfileId: isBusiness && bookingAgentId ? bookingAgentId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setBookingError(data.error ?? "Failed to create booking"); return; }
      await load();
      setPanel(null);
    } finally { setActionLoading(null); }
  }

  async function rescheduleBooking() {
    if (panel?.type !== "reschedule") return;
    setActionLoading("reschedule");
    try {
      const newStart = new Date(`${rescheduleDate}T${rescheduleTime}`);
      if (isNaN(newStart.getTime())) return;
      const res = await fetch(`/api/dashboard/bookings/${panel.booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: newStart.toISOString() }),
      });
      if (res.ok) { await load(); setPanel(null); }
    } finally { setActionLoading(null); }
  }

  async function deleteBlock() {
    if (panel?.type !== "blocked") return;
    setActionLoading("delete");
    try {
      await fetch(`/api/dashboard/blocked-slots/${panel.slot.id}`, { method: "DELETE" });
      await load();
      setPanel(null);
    } finally { setActionLoading(null); }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const bk = panel?.type === "booking" ? panel.booking : null;
  const isActive = bk?.status === "CONFIRMED";
  const isCheckedIn = !!bk?.checkedInAt;
  const canNoShow = isActive && bk?.startsAt
    ? Date.now() >= parseISO(bk.startsAt).getTime() + 5 * 60 * 1000
    : false;
  const selectedService = services.find(s => s.id === selectedServiceId);
  const availableExtras = selectedService?.extras ?? [];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Main calendar ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
          <h1 className="text-lg font-black">Calendar</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeek(subWeeks(week, 1))} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[155px] text-center text-sm font-bold">
              {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
            </span>
            <button onClick={() => setWeek(addWeeks(week, 1))} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setWeek(new Date())} className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">
              Today
            </button>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          {/* Time gutter */}
          <div className="w-14 shrink-0 border-r border-gray-100">
            <div className="h-10 border-b border-gray-100" />
            {HOURS.map(h => (
              <div key={h} className="relative border-b border-gray-50" style={{ height: PX_PER_HOUR }}>
                <span className="absolute -top-2 right-2 text-[10px] text-gray-400">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns — only working days */}
          <div className="flex flex-1 overflow-x-auto">
            {days.map(day => {
              const isToday = isSameDay(day, new Date());
              const wh = whForDay(day);
              const holiday = holidayForDay(day);
              const isPublicHolidayClosed = !!holiday && !workOnPublicHolidays;
              const activeBookings = bookingsForDay(day);
              const layoutData = layoutItems(activeBookings.map(b => {
                const s = parseISO(b.startsAt);
                const startMin = s.getHours() * 60 + s.getMinutes();
                return { id: b.id, startMin, endMin: startMin + b.durationMinutes };
              }));
              const layoutMap = new Map(layoutData.map(l => [l.id, l]));

              return (
                <div key={day.toISOString()} className="flex min-w-[100px] flex-1 flex-col border-r border-gray-100 last:border-r-0">
                  {/* Day header */}
                  <div className={cn("flex flex-col items-center justify-center border-b px-1 pb-1 pt-1.5", holiday ? "border-amber-200 bg-amber-50/60" : "border-gray-100", "min-h-[40px]")}>
                    <p className={cn("text-[9px] font-semibold uppercase", holiday ? "text-amber-500" : "text-gray-400")}>{format(day, "EEE")}</p>
                    <p className={`text-xs font-black ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-[#D94472] text-white" : ""}`}>
                      {format(day, "d")}
                    </p>
                    {holiday && (
                      <p className="truncate text-center text-[8px] font-bold leading-tight text-amber-600 max-w-full px-0.5">
                        {isPublicHolidayClosed ? "🔒 " : "🇿🇦 "}{holiday.name}
                      </p>
                    )}
                  </div>

                  {/* Grid — clickable */}
                  <div className="relative flex-1" onClick={e => { if (!isPublicHolidayClosed) handleGridClick(e, day); }}>
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="cursor-pointer border-b border-gray-50 hover:bg-blue-50/20"
                        style={{ height: PX_PER_HOUR }}
                      />
                    ))}

                    {/* Working hours shading outside open hours */}
                    {wh?.enabled && (() => {
                      const openMin = timeToMin(wh.from);
                      const closeMin = timeToMin(wh.to);
                      const openTop = (openMin / 60 - gridStart) * PX_PER_HOUR;
                      const closeTop = (closeMin / 60 - gridStart) * PX_PER_HOUR;
                      const totalH = HOURS.length * PX_PER_HOUR;
                      return (
                        <>
                          {openTop > 0 && <div className="pointer-events-none absolute inset-x-0 top-0 bg-gray-100/50" style={{ height: openTop }} />}
                          {closeTop < totalH && <div className="pointer-events-none absolute inset-x-0 bg-gray-100/50" style={{ top: closeTop, bottom: 0 }} />}
                        </>
                      );
                    })()}

                    {/* Public holiday overlay */}
                    {isPublicHolidayClosed && (
                      <div className="pointer-events-none absolute inset-0 bg-amber-50/70 flex items-center justify-center">
                        <div className="rotate-90 text-center">
                          <p className="text-[9px] font-bold text-amber-400 whitespace-nowrap">Public holiday</p>
                        </div>
                      </div>
                    )}

                    {/* Blocked slots */}
                    {blockedForDay(day).map(slot => {
                      const top = slotTop(slot.startsAt);
                      const dMin = (parseISO(slot.endsAt).getTime() - parseISO(slot.startsAt).getTime()) / 60000;
                      return (
                        <button key={slot.id} onClick={e => { e.stopPropagation(); setPanel({ type: "blocked", slot }); }}
                          style={{ top: Math.max(0, top), height: Math.max(slotHeight(dMin), 18) }}
                          className="absolute inset-x-0.5 overflow-hidden rounded border border-gray-300 bg-gray-100 px-1 text-left hover:bg-gray-200">
                          <p className="flex items-center gap-0.5 truncate text-[9px] font-bold text-gray-500">
                            <Ban className="h-2 w-2 shrink-0" /> {slot.reason || "Blocked"}
                          </p>
                        </button>
                      );
                    })}

                    {/* Active bookings */}
                    {activeBookings.map(b => {
                      const layout = layoutMap.get(b.id)!;
                      const top = slotTop(b.startsAt);
                      const height = Math.max(slotHeight(b.durationMinutes), 22);
                      const color = categoryColor(b.service);
                      const colW = 100 / layout.cols;
                      const isSelected = panel?.type === "booking" && panel.booking.id === b.id;
                      const compact = height < 44;

                      return (
                        <button key={b.id}
                          onClick={e => { e.stopPropagation(); setPanel({ type: "booking", booking: b }); }}
                          style={{
                            top: Math.max(0, top),
                            height,
                            left: `${layout.col * colW}%`,
                            width: `calc(${colW}% - 2px)`,
                            backgroundColor: color + "18",
                            borderLeftColor: color,
                          }}
                          className={cn("absolute overflow-hidden rounded-r border-l-2 px-1 text-left transition-all hover:brightness-95", isSelected && "brightness-90")}>
                          {compact ? (
                            <p className="truncate text-[9px] font-bold leading-tight" style={{ color }}>
                              {format(parseISO(b.startsAt), "h:mm")} {b.service}
                            </p>
                          ) : (
                            <>
                              <p className="truncate text-[10px] font-bold leading-tight" style={{ color }}>
                                {format(parseISO(b.startsAt), "h:mm a")} · {b.service}
                              </p>
                              <p className="truncate text-[9px] leading-tight text-gray-500">{b.clientName}</p>
                              {b.checkedInAt && !b.noShowAt && <span className="text-[8px] font-bold text-green-600">✓ In</span>}
                              {b.noShowAt && <span className="text-[8px] font-bold text-red-500">✗ NS</span>}
                            </>
                          )}
                        </button>
                      );
                    })}

                    {/* Cancelled (tiny, faded) */}
                    {cancelledForDay(day).map(b => {
                      const top = slotTop(b.startsAt);
                      return (
                        <button key={b.id}
                          onClick={e => { e.stopPropagation(); setPanel({ type: "booking", booking: b }); }}
                          style={{ top: Math.max(0, top), height: 16, borderLeftColor: "#9CA3AF" }}
                          className="absolute inset-x-0.5 overflow-hidden rounded-r border-l-2 bg-gray-100 px-1 text-left opacity-50 hover:opacity-75">
                          <p className="truncate text-[8px] text-gray-500">{b.service}</p>
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

      {/* ── Side panel ───────────────────────────────────────────────────────── */}
      {panel && (
        <div className="flex w-76 shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white" style={{ width: 296 }} onClick={e => e.stopPropagation()}>

          {/* ── Booking detail ── */}
          {panel.type === "booking" && bk && (() => {
            const active = bk.status === "CONFIRMED";
            const checkedIn = !!bk.checkedInAt;
            const noShow = !!bk.noShowAt;
            const canNS = active && Date.now() >= parseISO(bk.startsAt).getTime() + 5 * 60 * 1000;

            return (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h2 className="text-sm font-black">Appointment</h2>
                  <button onClick={() => setPanel(null)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  {/* Status badge */}
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ backgroundColor: (STATUS_COLORS[bk.status] ?? "#9CA3AF") + "20", color: STATUS_COLORS[bk.status] ?? "#9CA3AF" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[bk.status] ?? "#9CA3AF" }} />
                    {STATUS_LABEL[bk.status] ?? bk.status}
                  </span>

                  {/* Service + time */}
                  <div className="rounded-xl border border-gray-100 p-3 space-y-1">
                    <p className="font-black text-sm">{bk.service}</p>
                    {bk.agentName && <p className="text-xs text-gray-400">with {bk.agentName}</p>}
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <CalendarDays className="h-3 w-3" />{format(parseISO(bk.startsAt), "EEE, d MMM · h:mm a")}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />{bk.durationMinutes} min
                    </p>
                  </div>

                  {/* Client */}
                  <div className="rounded-xl border border-gray-100 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {bk.clientImage ? (
                        <Image src={bk.clientImage} alt="" width={28} height={28} className="rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3e8e4] text-xs font-bold text-[#D94472]">{bk.clientName[0]}</div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{bk.clientName}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-gray-400"><Mail className="h-3 w-3 shrink-0" />{bk.clientEmail}</p>
                      </div>
                    </div>
                    {checkedIn && !noShow && <p className="text-xs font-semibold text-green-600 flex items-center gap-1"><BadgeCheck className="h-3 w-3" />In at {format(parseISO(bk.checkedInAt!), "h:mm a")}</p>}
                    {noShow && <p className="text-xs font-semibold text-red-500 flex items-center gap-1"><UserX className="h-3 w-3" />No-show</p>}
                  </div>

                  {/* Payment */}
                  <div className="rounded-xl border border-gray-100 p-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-semibold">{formatCents(bk.priceCents)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Deposit paid</span><span className="font-semibold text-green-600">{formatCents(bk.depositCents)}</span></div>
                    <div className="flex justify-between border-t border-gray-100 pt-1 font-bold"><span>Balance due</span><span>{formatCents(Math.max(0, bk.priceCents - bk.depositCents))}</span></div>
                  </div>

                  {/* Notes */}
                  <div>
                    <textarea value={notesValue} onChange={e => { setNotesValue(e.target.value); setNotesDirty(true); }}
                      placeholder="Appointment notes…" rows={2}
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#D94472] focus:outline-none" />
                    {notesDirty && (
                      <button onClick={saveNotes} disabled={actionLoading === "notes"}
                        className="mt-1 rounded-lg bg-gray-900 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">
                        {actionLoading === "notes" ? "Saving…" : "Save notes"}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  {active && (
                    <div className="space-y-2 pt-1">
                      {!checkedIn && (
                        <>
                          <input type="text" placeholder="Check-in code" value={checkInCode}
                            onChange={e => { setCheckInCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setCheckInError(""); }}
                            className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-center text-sm font-mono font-bold tracking-widest focus:border-[#D94472] focus:outline-none" maxLength={6} />
                          {checkInError && <p className="text-xs text-red-500">{checkInError}</p>}
                          <button onClick={() => doAttendance("check_in", { confirmationCode: checkInCode })}
                            disabled={checkInCode.length < 4 || actionLoading === "check_in"}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#D94472] py-2 text-sm font-bold text-white hover:bg-[#c03d66] disabled:opacity-40">
                            {actionLoading === "check_in" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Check in
                          </button>
                        </>
                      )}
                      {checkedIn && !bk.completedAt && (
                        <button onClick={() => doAttendance("complete")} disabled={actionLoading === "complete"}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40">
                          {actionLoading === "complete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
                          Mark complete
                        </button>
                      )}
                      {canNS && !checkedIn && (
                        <button onClick={() => doAttendance("no_show")} disabled={actionLoading === "no_show"}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-orange-200 py-2 text-sm font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-40">
                          {actionLoading === "no_show" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                          No-show
                        </button>
                      )}
                      {!canNS && !checkedIn && <p className="text-center text-[10px] text-gray-400">No-show available 5 min after start</p>}
                      <button
                        onClick={() => setPanel({ type: "reschedule", booking: bk })}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Reschedule
                      </button>
                      <button onClick={cancelBooking} disabled={actionLoading === "cancel"}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-100 py-2 text-sm font-bold text-red-500 hover:bg-red-50 disabled:opacity-40">
                        {actionLoading === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* ── New slot — pick mode ── */}
          {panel.type === "new" && (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-black">
                  {newMode === "pick" ? format(panel.startsAt, "h:mm a · EEE d MMM") : newMode === "booking" ? "New booking" : "Block slot"}
                </h2>
                <div className="flex items-center gap-1">
                  {newMode !== "pick" && (
                    <button onClick={() => setNewMode("pick")} className="rounded-lg p-1 text-xs text-gray-400 hover:bg-gray-100">← Back</button>
                  )}
                  <button onClick={() => setPanel(null)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
                </div>
              </div>

              {newMode === "pick" && (
                <div className="flex flex-col gap-3 p-4">
                  <p className="text-xs text-gray-400">What would you like to do at this time?</p>
                  <button onClick={() => setNewMode("booking")}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left hover:border-[#D94472] hover:bg-[#D94472]/5 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D94472]/10">
                      <UserPlus className="h-4 w-4 text-[#D94472]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">New booking</p>
                      <p className="text-xs text-gray-400">Book a client for a service</p>
                    </div>
                  </button>
                  <button onClick={() => setNewMode("block")}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left hover:border-gray-400 hover:bg-gray-50 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                      <Ban className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Block time</p>
                      <p className="text-xs text-gray-400">Mark as unavailable</p>
                    </div>
                  </button>
                </div>
              )}

              {newMode === "block" && (
                <div className="flex flex-col gap-3 p-4">
                  {/* Agent selector — BUSINESS only */}
                  {isBusiness && agents.length > 0 && (
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Block for agent</label>
                      <select value={blockAgentId} onChange={e => setBlockAgentId(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#D94472] focus:outline-none">
                        <option value="">All agents (business-wide)</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">From</label>
                    <div className="flex gap-2">
                      <input type="date" value={blockStartDate} onChange={e => setBlockStartDate(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 px-2 py-2 text-sm focus:border-[#D94472] focus:outline-none" />
                      <input type="time" value={blockStartTime} onChange={e => setBlockStartTime(e.target.value)}
                        className="w-24 rounded-xl border border-gray-200 px-2 py-2 text-sm focus:border-[#D94472] focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">To</label>
                    <div className="flex gap-2">
                      <input type="date" value={blockEndDate} onChange={e => setBlockEndDate(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 px-2 py-2 text-sm focus:border-[#D94472] focus:outline-none" />
                      <input type="time" value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)}
                        className="w-24 rounded-xl border border-gray-200 px-2 py-2 text-sm focus:border-[#D94472] focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Reason (optional)</label>
                    <input value={blockReason} onChange={e => setBlockReason(e.target.value)}
                      placeholder="Holiday, leave, maintenance…"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#D94472] focus:outline-none" />
                  </div>
                  <button onClick={createBlock} disabled={actionLoading === "block" || !blockStartDate || !blockEndDate}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-40">
                    {actionLoading === "block" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    Block time
                  </button>
                </div>
              )}

              {newMode === "booking" && (
                <div className="flex flex-col gap-3 p-4">
                  <div className="rounded-xl border border-gray-100 p-3 text-xs text-gray-500">
                    {format(panel.startsAt, "h:mm a · EEE d MMM yyyy")}
                    {selectedService && <span className="ml-1 text-gray-400">({selectedService.durationMinutes} min)</span>}
                  </div>

                  {/* Service */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Service</label>
                    <select value={selectedServiceId} onChange={e => {
                      const svcId = e.target.value;
                      setSelectedServiceId(svcId);
                      setSelectedExtraIds([]);
                      setBookingAgentId("");
                      setAvailableAgentsForSlot([]);
                      if (panel?.type === "new" && svcId) refreshAvailableAgents(svcId, panel.startsAt);
                    }}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#D94472] focus:outline-none">
                      <option value="">Select service…</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} · {formatCents(s.priceCents)} ({s.durationMinutes}min)</option>
                      ))}
                    </select>
                  </div>

                  {/* Agent selector — BUSINESS only, shown after service selected */}
                  {isBusiness && selectedServiceId && (
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Assign to agent
                        {loadingAgents && <span className="ml-1 text-gray-300">loading…</span>}
                      </label>
                      {availableAgentsForSlot.length === 0 && !loadingAgents ? (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                          No agents available for this service at {panel?.type === "new" ? format(panel.startsAt, "h:mm a") : "this time"}
                        </p>
                      ) : (
                        <select value={bookingAgentId} onChange={e => setBookingAgentId(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#D94472] focus:outline-none">
                          <option value="">Select agent…</option>
                          {availableAgentsForSlot.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Extras */}
                  {availableExtras.length > 0 && (
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Extras</label>
                      <div className="space-y-1.5">
                        {availableExtras.map(e => {
                          const checked = selectedExtraIds.includes(e.id);
                          return (
                            <label key={e.id} className={cn("flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 transition-colors", checked ? "border-[#D94472]/40 bg-[#D94472]/5" : "border-gray-200 hover:bg-gray-50")}>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={checked}
                                  onChange={() => setSelectedExtraIds(prev => checked ? prev.filter(x => x !== e.id) : [...prev, e.id])}
                                  className="accent-[#D94472]" />
                                <span className="text-xs font-semibold">{e.name}</span>
                                {e.durationMinutes > 0 && <span className="text-[10px] text-gray-400">+{e.durationMinutes}min</span>}
                              </div>
                              <span className="text-xs font-bold text-gray-600">+{formatCents(e.priceCents)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Client search */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Client</label>
                    {selectedClient ? (
                      <div className="flex items-center justify-between rounded-xl border border-[#D94472]/30 bg-[#D94472]/5 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D94472]/20 text-[10px] font-bold text-[#D94472]">{selectedClient.name[0]}</div>
                          <div>
                            <p className="text-xs font-bold">{selectedClient.name}</p>
                            <p className="text-[10px] text-gray-400">{selectedClient.email}</p>
                          </div>
                        </div>
                        <button onClick={() => { setSelectedClient(null); setClientQuery(""); }} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          value={clientQuery}
                          onChange={e => setClientQuery(e.target.value)}
                          placeholder="Search by name or email…"
                          className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-[#D94472] focus:outline-none"
                        />
                        {clientSearching && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400" />}
                        {clientResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                            {clientResults.map(c => (
                              <button key={c.id} onClick={() => { setSelectedClient(c); setClientQuery(""); setClientResults([]); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f3e8e4] text-[10px] font-bold text-[#D94472]">{c.name[0]}</div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold">{c.name}</p>
                                  <p className="truncate text-[10px] text-gray-400">{c.email}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {clientQuery.trim() && !clientSearching && clientResults.length === 0 && (
                          <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-400 shadow">
                            No past clients found — only clients who have booked before can be selected.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Notes (optional)</label>
                    <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)}
                      placeholder="Any notes for this appointment…" rows={2}
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#D94472] focus:outline-none" />
                  </div>

                  {bookingError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">{bookingError}</p>}

                  <button onClick={createManualBooking} disabled={!selectedClient || !selectedServiceId || actionLoading === "booking"}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D94472] py-2.5 text-sm font-bold text-white hover:bg-[#c03d66] disabled:opacity-40">
                    {actionLoading === "booking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create booking
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Reschedule ── */}
          {panel.type === "reschedule" && (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-black">Reschedule</h2>
                <button onClick={() => setPanel({ type: "booking", booking: panel.booking })} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div className="rounded-xl border border-gray-100 p-3 space-y-0.5 text-xs text-gray-500">
                  <p className="font-bold text-gray-700">{panel.booking.service}</p>
                  <p>Currently: {format(parseISO(panel.booking.startsAt), "EEE d MMM · h:mm a")}</p>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">New date</label>
                  <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#D94472] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">New time</label>
                  <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#D94472] focus:outline-none" />
                </div>
                <button onClick={rescheduleBooking} disabled={!rescheduleDate || !rescheduleTime || actionLoading === "reschedule"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D94472] py-2.5 text-sm font-bold text-white hover:bg-[#c03d66] disabled:opacity-40">
                  {actionLoading === "reschedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                  Confirm reschedule
                </button>
                <button onClick={() => setPanel({ type: "booking", booking: panel.booking })}
                  className="text-center text-xs text-gray-400 hover:text-gray-600">← Back to appointment</button>
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
              <div className="flex flex-col gap-3 p-4">
                <div className="rounded-xl border border-gray-100 p-3 space-y-1 text-xs text-gray-500">
                  <p className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(parseISO(panel.slot.startsAt), "EEE, d MMM yyyy")}</p>
                  <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(parseISO(panel.slot.startsAt), "h:mm a")} – {format(parseISO(panel.slot.endsAt), "h:mm a")}</p>
                  {panel.slot.reason && <p className="pt-0.5 font-semibold text-gray-700">{panel.slot.reason}</p>}
                </div>
                <button onClick={deleteBlock} disabled={actionLoading === "delete"}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-100 py-2 text-sm font-bold text-red-500 hover:bg-red-50 disabled:opacity-40">
                  {actionLoading === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
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
