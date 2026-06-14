"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  QrCode,
  Settings,
  Star,
  Sparkles,
  X,
  XCircle,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

type BookingStatus = "PENDING_DEPOSIT" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";

type ProviderPolicy = {
  cancelNoticeHours?: number | null;
  cancelFeePercent?: number | null;
  rescheduleNoticeHours?: number | null;
  rescheduleFeePercent?: number | null;
  policyText?: string | null;
};

type Booking = {
  id: string;
  status: BookingStatus;
  startsAt: string;
  createdAt: string;
  checkedInAt?: string | null;
  noShowAt?: string | null;
  checkInCode?: string | null;
  completedAt?: string | null;
  feedbackRequestedAt?: string | null;
  notes?: string | null;
  depositCents: number;
  durationMinutes: number;
  service: string;
  agentName?: string | null;
  agentHandle?: string | null;
  agentProfileId?: string | null;
  reviewed?: boolean;
  provider: { id?: string; name: string; handle: string; city?: string | null } & ProviderPolicy;
};

/** Hide EXPIRED bookings (failed deposit attempts) and stale PENDING_DEPOSIT from history */
function shouldHideFromHistory(booking: Booking): boolean {
  if (booking.status === "EXPIRED") return true;
  if (booking.status === "PENDING_DEPOSIT") {
    // Only show if still within the 15-min payment window
    const ageMs = Date.now() - new Date(booking.createdAt).getTime();
    return ageMs > 15 * 60 * 1000;
  }
  return false;
}

/** QR code component using canvas */
function BookingQrCode({ code, bookingId }: { code: string; bookingId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const value = code || bookingId;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(value, { width: 200, margin: 2, color: { dark: "#1a1a1a", light: "#ffffff" } })
        .then(setDataUrl)
        .catch(() => {});
    });
  }, [code, bookingId]);

  if (!dataUrl) return null;

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-3 py-2 text-xs font-bold text-white hover:bg-[var(--ink)]/80 transition"
      >
        <QrCode className="h-3.5 w-3.5" />
        Show QR code for check-in
      </button>
      {expanded && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setExpanded(false)} />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 max-w-xs mx-auto rounded-3xl bg-white p-6 shadow-2xl text-center">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Check-in QR code</p>
            <p className="mb-4 text-sm font-semibold text-[var(--ink)]">Show this to your provider at check-in</p>
            <img src={dataUrl} alt="QR code" className="mx-auto rounded-2xl w-48 h-48" />
            <p className="mt-3 font-mono text-xs text-[var(--muted)]">{code || bookingId}</p>
            <button
              onClick={() => setExpanded(false)}
              className="mt-4 w-full rounded-xl bg-[var(--ink)] py-2.5 text-sm font-bold text-white"
            >
              Close
            </button>
          </div>
        </>
      )}
    </>
  );
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_DEPOSIT: { label: "Awaiting deposit", color: "text-amber-600 bg-amber-50", icon: Clock },
  CONFIRMED: { label: "Confirmed", color: "text-emerald-700 bg-emerald-50", icon: CalendarCheck },
  COMPLETED: { label: "Completed", color: "text-[var(--muted)] bg-[var(--background)]", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: XCircle },
  EXPIRED: { label: "Expired", color: "text-amber-700 bg-amber-50", icon: Clock }
};

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function bookingEnd(booking: Booking) {
  return new Date(new Date(booking.startsAt).getTime() + booking.durationMinutes * 60000);
}

function isUpcoming(booking: Booking) {
  if (booking.status === "CANCELLED" || booking.status === "EXPIRED" || booking.status === "COMPLETED" || booking.noShowAt) return false;
  return (booking.status === "CONFIRMED" || booking.status === "PENDING_DEPOSIT") && bookingEnd(booking) > new Date();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function appointmentState(booking: Booking) {
  const now = new Date();
  const start = new Date(booking.startsAt);
  const end = bookingEnd(booking);
  if (booking.noShowAt) return { label: "No-show recorded", color: "text-red-600 bg-red-50", icon: ShieldAlert };
  if (booking.status === "COMPLETED") return STATUS_CONFIG.COMPLETED;
  if (booking.checkedInAt && !booking.completedAt && now < end) return { label: "In progress", color: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 };
  if (booking.status === "CANCELLED") return STATUS_CONFIG.CANCELLED;
  if (booking.status === "EXPIRED") return STATUS_CONFIG.EXPIRED;
  if (booking.status === "PENDING_DEPOSIT") return STATUS_CONFIG.PENDING_DEPOSIT;
  if (now >= start && now < end) return { label: "Ongoing now", color: "text-emerald-700 bg-emerald-50", icon: CalendarClock };
  if (start > now && isSameDay(start, now)) {
    const minutes = Math.max(1, Math.round((start.getTime() - now.getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return {
      label: hours > 0 ? `In ${hours}h${mins ? ` ${mins}m` : ""}` : `In ${mins}m`,
      color: "text-[var(--brand)] bg-[var(--brand)]/10",
      icon: Clock
    };
  }
  if (start > now) return { label: "Upcoming", color: "text-emerald-700 bg-emerald-50", icon: CalendarCheck };
  return { label: "Past", color: "text-[var(--muted)] bg-[var(--background)]", icon: CheckCircle2 };
}

/** Returns mm:ss remaining for a 15-min pending deposit window, or null if expired */
function usePendingCountdown(createdAt: string, status: BookingStatus) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "PENDING_DEPOSIT") return;
    const expiresAt = new Date(new Date(createdAt).getTime() + 15 * 60 * 1000);

    function tick() {
      const ms = expiresAt.getTime() - Date.now();
      if (ms <= 0) { setRemaining(null); return; }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, "0")}`);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt, status]);

  return remaining;
}

function AppointmentProgressBar({ checkedInAt, endsAt }: { checkedInAt: string; endsAt: string }) {
  const [pct, setPct] = useState(0);
  const [display, setDisplay] = useState("");
  const [over, setOver] = useState(false);

  useEffect(() => {
    function tick() {
      const start = new Date(checkedInAt).getTime();
      const end = new Date(endsAt).getTime();
      const now = Date.now();
      const elapsed = now - start;
      const total = end - start;
      setPct(Math.min(100, Math.max(0, (elapsed / total) * 100)));
      const remaining = end - now;
      setOver(remaining <= 0);
      if (remaining <= 0) { setDisplay("Time's up"); return; }
      const s = Math.floor(remaining / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setDisplay(h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")} left` : `${m}:${String(sec).padStart(2,"0")} left`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [checkedInAt, endsAt]);

  return (
    <div className="mt-3 space-y-1.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-emerald-700">Appointment in progress</span>
        <span className={cn("text-xs font-bold", over ? "text-red-600" : "text-emerald-700")}>{display}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: over ? "#EF4444" : "#16A34A" }} />
      </div>
    </div>
  );
}

type Tab = "upcoming" | "history";

// Provider detail drawer
function ProviderDrawer({ handle, name, onClose }: { handle: string; name: string; onClose: () => void }) {
  const slug = handle.replace("@", "");
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:inset-x-auto sm:right-0 sm:top-0 sm:h-full sm:w-[480px] sm:rounded-none sm:rounded-l-3xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-[var(--muted)]">Provider profile</p>
            <h2 className="text-lg font-black">{name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/provider/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open profile
            </a>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-5">
          <iframe
            src={`/provider/${slug}?embedded=1`}
            className="h-[70vh] w-full rounded-2xl border border-[var(--line)]"
            title={name}
          />
        </div>
      </div>
    </>
  );
}

/** Countdown badge for PENDING_DEPOSIT bookings */
function PendingCountdown({ createdAt, status }: { createdAt: string; status: BookingStatus }) {
  const remaining = usePendingCountdown(createdAt, status);
  if (!remaining) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
      <Clock className="h-3 w-3" />
      Slot reserved {remaining}
    </span>
  );
}

/** Policy block used inside cancel / reschedule modals */
function PolicyBlock({ policy, depositCents, mode }: {
  policy: ProviderPolicy;
  depositCents: number;
  mode: "cancel" | "reschedule";
}) {
  const feePercent = mode === "cancel" ? policy.cancelFeePercent : policy.rescheduleFeePercent;
  const noticeHours = mode === "cancel" ? policy.cancelNoticeHours : policy.rescheduleNoticeHours;
  const feeAmount = feePercent && depositCents ? Math.round(depositCents * feePercent / 100) : 0;

  const hasCancelPolicy = mode === "cancel" && (feePercent || noticeHours || policy.policyText);
  const hasReschedulePolicy = mode === "reschedule" && (feePercent || noticeHours || policy.policyText);

  if (!hasCancelPolicy && !hasReschedulePolicy && !policy.policyText) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-amber-800">
            {mode === "cancel" ? "Cancellation policy" : "Reschedule policy"}
          </p>
          {noticeHours != null && noticeHours > 0 && (
            <p className="text-xs text-amber-700">
              Notice required: <strong>{noticeHours}h</strong> before appointment
            </p>
          )}
          {feePercent != null && feePercent > 0 && (
            <p className="text-xs text-amber-700">
              {mode === "cancel" ? "Cancellation" : "Reschedule"} fee:{" "}
              <strong>{feePercent}% of deposit</strong>
              {feeAmount > 0 && <> ({formatCurrency(feeAmount)})</>}
            </p>
          )}
          {depositCents > 0 && mode === "cancel" && (
            <p className="text-xs font-semibold text-amber-800">
              ⚠ Deposit of {formatCurrency(depositCents)} may be partially or fully forfeited based on policy above.
            </p>
          )}
          {policy.policyText && (
            <p className="text-xs text-amber-700 mt-1 whitespace-pre-line">{policy.policyText}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AccountPortal({
  userName,
  userEmail,
  initialBookings
}: {
  userName: string;
  userEmail: string;
  initialBookings: Booking[];
}) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [tab, setTab] = useState<Tab>("upcoming");

  // Poll for updated booking statuses (catches provider-side completions, check-ins, etc.)
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/account/bookings");
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings);
        }
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [providerDrawer, setProviderDrawer] = useState<{ handle: string; name: string } | null>(null);
  const [payingDeposit, setPayingDeposit] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleTermsAccepted, setRescheduleTermsAccepted] = useState(false);

  // Cancel state — full modal
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancelTermsAccepted, setCancelTermsAccepted] = useState(false);

  // Paystack popup ref
  const popupRef = useRef<any>(null);

  const firstName = userName.split(" ")[0] || "there";

  // Load Paystack inline JS once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("paystack-portal-js")) return;
    const s = document.createElement("script");
    s.id = "paystack-portal-js";
    s.src = "https://js.paystack.co/v2/inline.js";
    s.async = true;
    s.onload = () => {
      const Pop = (window as any).PaystackPop;
      if (Pop) popupRef.current = new Pop();
    };
    document.head.appendChild(s);
  }, []);

  async function handlePayDeposit(bookingId: string) {
    setPayingDeposit(bookingId);
    try {
      const res = await fetch("/api/payments/paystack/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const d = await res.json();

      if (d.simulated) {
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "CONFIRMED" } : b));
        return;
      }

      if (!d.enabled || !d.publicKey) return;

      // Ensure popup is ready
      if (!popupRef.current) {
        const Pop = (window as any).PaystackPop;
        if (Pop) popupRef.current = new Pop();
      }
      const popup = popupRef.current;
      if (!popup) return;

      const opts = {
        key: d.publicKey,
        email: d.email,
        amount: d.amountCents,
        currency: "ZAR",
        ref: d.reference,
        onSuccess: async (txn: any) => {
          await fetch("/api/payments/paystack/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: txn.reference ?? d.reference, bookingId })
          });
          setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "CONFIRMED" } : b));
        },
        onCancel: () => {}
      };

      if (typeof popup.newTransaction === "function") popup.newTransaction(opts);
      else if (typeof popup.checkout === "function") popup.checkout(opts);
    } finally {
      setPayingDeposit(null);
    }
  }

  async function handleReschedule() {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) return;
    setRescheduling(true);
    setRescheduleError("");
    try {
      const [yr, mo, dy] = rescheduleDate.split("-").map(Number);
      const [hr, mn] = rescheduleTime.split(":").map(Number);
      const startsAt = new Date(yr, mo - 1, dy, hr, mn).toISOString();
      const res = await fetch(`/api/bookings/${rescheduleBooking.id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt })
      });
      const data = await res.json();
      if (!res.ok) { setRescheduleError(data.error ?? "Could not reschedule"); return; }
      setBookings((prev) => prev.map((b) => b.id === rescheduleBooking.id ? { ...b, startsAt: data.startsAt } : b));
      setRescheduleBooking(null);
    } finally {
      setRescheduling(false);
    }
  }

  async function handleCancel(bookingId: string) {
    setCancelling(bookingId);
    try {
      const res = await fetch("/api/account/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });
      if (res.ok) {
        const data = await res.json();
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: data.status ?? "CANCELLED" } : b));
      }
    } finally {
      setCancelling(null);
      setCancelBooking(null);
      setCancelTermsAccepted(false);
    }
  }

  const upcoming = bookings.filter((b) => isUpcoming(b));
  const history = bookings
    .filter((b) => !isUpcoming(b) && !shouldHideFromHistory(b))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const displayed = tab === "upcoming" ? upcoming : history;

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)] text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand)]">Welcome back</p>
            <h1 className="text-2xl font-black text-[var(--ink)]">Hi {firstName} 👋</h1>
          </div>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">{userEmail}</p>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        {[
          { label: "Upcoming", value: upcoming.length, icon: CalendarClock, accent: "text-[var(--brand)]" },
          { label: "Completed", value: bookings.filter((b) => b.status === "COMPLETED").length, icon: CheckCircle2, accent: "text-emerald-600" },
          { label: "Total deposits", value: formatCurrency(bookings.filter((b) => b.status !== "CANCELLED" && b.status !== "EXPIRED").reduce((s, b) => s + b.depositCents, 0)), icon: Sparkles, accent: "text-[var(--muted)]" }
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <Icon className={cn("mb-2 h-5 w-5", accent)} />
            <p className="text-lg font-black text-[var(--ink)]">{value}</p>
            <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link href="/" className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--brand)]/40">
          <Calendar className="h-5 w-5 text-[var(--brand)]" />
          <span className="text-sm font-semibold">Find a provider</span>
          <ChevronRight className="ml-auto h-4 w-4 text-[var(--muted)]" />
        </Link>
        <Link href="/account/messages" className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--brand)]/40">
          <MessageCircle className="h-5 w-5 text-[var(--brand)]" />
          <span className="text-sm font-semibold">Messages</span>
          <ChevronRight className="ml-auto h-4 w-4 text-[var(--muted)]" />
        </Link>
        <Link href="/account/settings" className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--brand)]/40">
          <Settings className="h-5 w-5 text-[var(--brand)]" />
          <span className="text-sm font-semibold">Settings</span>
          <ChevronRight className="ml-auto h-4 w-4 text-[var(--muted)]" />
        </Link>
      </div>

      {/* Appointments */}
      <div>
        <h2 className="mb-4 text-xl font-black">My appointments</h2>

        <div className="mb-5 flex gap-1 rounded-2xl border border-[var(--line)] bg-white p-1">
          {(["upcoming", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-xl py-2 text-sm font-semibold transition",
                tab === t ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
              )}
            >
              {t === "upcoming" ? `Upcoming (${upcoming.length})` : `History (${history.length})`}
            </button>
          ))}
        </div>

        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--line)] py-16 text-center">
            <CalendarCheck className="mb-3 h-10 w-10 text-[var(--muted)]/40" />
            <p className="text-base font-bold text-[var(--muted)]">
              {tab === "upcoming" ? "No upcoming appointments" : "No booking history yet"}
            </p>
            {tab === "upcoming" && (
              <Link href="/" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-dark)]">
                <Calendar className="h-4 w-4" />
                Browse providers
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((booking) => {
              const cfg = appointmentState(booking);
              const StatusIcon = cfg.icon;
              const canCancel = booking.status === "CONFIRMED" || booking.status === "PENDING_DEPOSIT";
              const isPast = new Date(booking.startsAt) < new Date();

              return (
                <div key={booking.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--background)]">
                        <Calendar className="h-5 w-5 text-[var(--brand)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-[var(--ink)]">{booking.service}</p>
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", cfg.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                          <PendingCountdown createdAt={booking.createdAt} status={booking.status} />
                        </div>
                        <button
                          onClick={() => setProviderDrawer({ handle: booking.provider.handle, name: booking.provider.name })}
                          className="mt-0.5 text-sm font-semibold text-[var(--brand)] hover:underline text-left"
                        >
                          {booking.provider.name}
                        </button>
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1">
                            <CalendarCheck className="h-3 w-3" />
                            {formatDate(booking.startsAt)} at {formatTime(booking.startsAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.durationMinutes} min
                          </span>
                          {booking.provider.city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {booking.provider.city}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--muted)]/70">
                          Booked {formatDate(booking.createdAt)} at {formatTime(booking.createdAt)}
                        </p>
                        <p className="mt-2 text-xs font-bold text-[var(--muted)]">
                          Deposit: {formatCurrency(booking.depositCents)}
                        </p>
                        {/* Live progress bar — only while in progress (not after completed) */}
                        {booking.checkedInAt && !booking.noShowAt && !booking.completedAt && (() => {
                          const end = bookingEnd(booking);
                          if (end > new Date()) {
                            return <AppointmentProgressBar checkedInAt={booking.checkedInAt} endsAt={end.toISOString()} />;
                          }
                          return null;
                        })()}
                        {booking.status === "CONFIRMED" && !booking.checkedInAt && (
                          <BookingQrCode
                            code={booking.checkInCode ?? ""}
                            bookingId={booking.id}
                          />
                        )}
                        {booking.status === "COMPLETED" && (
                          <div className={cn("mt-3 rounded-xl border p-3 space-y-2", booking.reviewed ? "border-emerald-100 bg-emerald-50" : "border-pink-100 bg-pink-50")}>
                            <div className="flex items-center gap-2 font-black text-sm text-[var(--ink)]">
                              <Star className={cn("h-4 w-4", booking.reviewed ? "fill-amber-400 text-amber-400" : "text-[var(--brand)]")} />
                              {booking.reviewed ? "Review submitted" : "How was your appointment?"}
                            </div>
                            {!booking.reviewed && (
                              <p className="text-xs text-[var(--muted)]">
                                Rate your {booking.agentName ? "provider and artist" : "provider"} — it helps others find great services.
                              </p>
                            )}
                            <Link
                              href={`/account/review/${booking.id}`}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition",
                                booking.reviewed
                                  ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                                  : "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]"
                              )}
                            >
                              <Star className="h-3 w-3" />
                              {booking.reviewed ? "View review" : (booking.agentName ? `Rate provider & ${booking.agentName}` : `Rate ${booking.provider.name}`)}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {(canCancel && !isPast) && (
                      <div className="mt-3 flex gap-2 border-t border-[var(--line)] pt-3 flex-wrap">
                        <button
                          onClick={() => setProviderDrawer({ handle: booking.provider.handle, name: booking.provider.name })}
                          className="rounded-xl border border-[var(--line)] px-3 py-2 text-center text-xs font-bold text-[var(--ink)] hover:bg-[var(--background)] transition"
                        >
                          View provider
                        </button>
                        {booking.status === "PENDING_DEPOSIT" && (
                          <button
                            onClick={() => handlePayDeposit(booking.id)}
                            disabled={payingDeposit === booking.id}
                            className="flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-2 text-xs font-bold text-white hover:bg-[var(--brand-dark)] transition disabled:opacity-60"
                          >
                            {payingDeposit === booking.id && <Loader2 className="h-3 w-3 animate-spin" />}
                            Pay deposit
                          </button>
                        )}
                        {booking.status === "CONFIRMED" && !isPast && (
                          <button
                            onClick={() => {
                              setRescheduleBooking(booking);
                              setRescheduleDate("");
                              setRescheduleTime("");
                              setRescheduleError("");
                              setRescheduleTermsAccepted(false);
                            }}
                            className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--background)] transition"
                          >
                            Reschedule
                          </button>
                        )}
                        <button
                          onClick={() => { setCancelBooking(booking); setCancelTermsAccepted(false); }}
                          className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                        >
                          Cancel booking
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Provider detail drawer */}
      {providerDrawer && (
        <ProviderDrawer
          handle={providerDrawer.handle}
          name={providerDrawer.name}
          onClose={() => setProviderDrawer(null)}
        />
      )}

      {/* ── Cancel modal ── */}
      {cancelBooking && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setCancelBooking(null)} />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-black">Cancel booking</h3>
              </div>
              <button onClick={() => setCancelBooking(null)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-[var(--muted)]">
              You are about to cancel <strong>{cancelBooking.service}</strong> with{" "}
              <strong>{cancelBooking.provider.name}</strong> on{" "}
              {formatDate(cancelBooking.startsAt)} at {formatTime(cancelBooking.startsAt)}.
            </p>

            <PolicyBlock
              policy={cancelBooking.provider}
              depositCents={cancelBooking.depositCents}
              mode="cancel"
            />

            {/* Generic deposit warning when no explicit policy */}
            {!cancelBooking.provider.cancelFeePercent && !cancelBooking.provider.cancelNoticeHours && !cancelBooking.provider.policyText && cancelBooking.depositCents > 0 && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs font-semibold text-amber-800">
                  Your deposit of {formatCurrency(cancelBooking.depositCents)} may be forfeited depending on the provider&apos;s discretion.
                </p>
              </div>
            )}

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--line)] p-3 hover:bg-[var(--background)]">
              <input
                type="checkbox"
                checked={cancelTermsAccepted}
                onChange={(e) => setCancelTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)] shrink-0"
              />
              <span className="text-xs text-[var(--muted)]">
                I understand and accept the cancellation terms above, including any applicable deposit forfeiture.
              </span>
            </label>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => handleCancel(cancelBooking.id)}
                disabled={!cancelTermsAccepted || cancelling === cancelBooking.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition"
              >
                {cancelling === cancelBooking.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm cancellation
              </button>
              <button
                onClick={() => { setCancelBooking(null); setCancelTermsAccepted(false); }}
                className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)]"
              >
                Keep booking
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Reschedule modal ── */}
      {rescheduleBooking && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setRescheduleBooking(null)} />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black">Reschedule appointment</h3>
              <button onClick={() => setRescheduleBooking(null)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-[var(--muted)]">
              Moving: <strong>{rescheduleBooking.service}</strong> with {rescheduleBooking.provider.name}
            </p>

            <PolicyBlock
              policy={rescheduleBooking.provider}
              depositCents={rescheduleBooking.depositCents}
              mode="reschedule"
            />

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">New date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">New time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>

            {(rescheduleBooking.provider.rescheduleFeePercent || rescheduleBooking.provider.rescheduleNoticeHours || rescheduleBooking.provider.policyText) && (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--line)] p-3 hover:bg-[var(--background)]">
                <input
                  type="checkbox"
                  checked={rescheduleTermsAccepted}
                  onChange={(e) => setRescheduleTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--brand)] shrink-0"
                />
                <span className="text-xs text-[var(--muted)]">
                  I have read and accept the reschedule policy, including any applicable fees.
                </span>
              </label>
            )}

            {rescheduleError && <p className="mt-2 text-sm font-semibold text-red-500">{rescheduleError}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={handleReschedule}
                disabled={
                  rescheduling || !rescheduleDate || !rescheduleTime ||
                  ((rescheduleBooking.provider.rescheduleFeePercent != null ||
                    rescheduleBooking.provider.rescheduleNoticeHours != null ||
                    !!rescheduleBooking.provider.policyText) && !rescheduleTermsAccepted)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60 transition"
              >
                {rescheduling && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm reschedule
              </button>
              <button
                onClick={() => setRescheduleBooking(null)}
                className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
