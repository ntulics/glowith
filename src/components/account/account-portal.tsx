"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Settings,
  Sparkles,
  X,
  XCircle,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

type BookingStatus = "PENDING_DEPOSIT" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

type Booking = {
  id: string;
  status: BookingStatus;
  startsAt: string;
  createdAt: string;
  notes?: string | null;
  depositCents: number;
  durationMinutes: number;
  service: string;
  provider: { name: string; handle: string; city?: string | null };
};

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_DEPOSIT: { label: "Awaiting deposit", color: "text-amber-600 bg-amber-50", icon: Clock },
  CONFIRMED: { label: "Confirmed", color: "text-emerald-700 bg-emerald-50", icon: CalendarCheck },
  COMPLETED: { label: "Completed", color: "text-[var(--muted)] bg-[var(--background)]", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: XCircle }
};

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function isUpcoming(iso: string, status: BookingStatus) {
  return (status === "CONFIRMED" || status === "PENDING_DEPOSIT") && new Date(iso) > new Date();
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
              Full page
            </a>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Embed provider profile in iframe for in-place viewing */}
        <iframe
          src={`/provider/${slug}`}
          className="h-[calc(100%-65px)] w-full border-0"
          title={name}
        />
      </div>
    </>
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
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [providerDrawer, setProviderDrawer] = useState<{ handle: string; name: string } | null>(null);
  const [payingDeposit, setPayingDeposit] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  const firstName = userName.split(" ")[0] || "there";

  async function handlePayDeposit(bookingId: string) {
    setPayingDeposit(bookingId);
    try {
      const res = await fetch("/api/payments/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const data = await res.json();
      if (data.simulated) {
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "CONFIRMED" } : b));
        return;
      }
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } finally {
      setPayingDeposit(null);
    }
  }

  async function handleReschedule() {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) return;
    setRescheduling(true);
    setRescheduleError("");
    try {
      const startsAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
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
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "CANCELLED" } : b));
      }
    } finally {
      setCancelling(null);
      setCancelConfirm(null);
    }
  }

  const upcoming = bookings.filter((b) => isUpcoming(b.startsAt, b.status));
  const history = bookings.filter((b) => !isUpcoming(b.startsAt, b.status));
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
          { label: "Total deposits", value: formatCurrency(bookings.filter((b) => b.status !== "CANCELLED").reduce((s, b) => s + b.depositCents, 0)), icon: Sparkles, accent: "text-[var(--muted)]" }
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
              const cfg = STATUS_CONFIG[booking.status];
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
                        <p className="mt-2 text-xs font-bold text-[var(--muted)]">
                          Deposit: {formatCurrency(booking.depositCents)}
                        </p>
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
                            onClick={() => { setRescheduleBooking(booking); setRescheduleDate(""); setRescheduleTime(""); setRescheduleError(""); }}
                            className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--background)] transition"
                          >
                            Reschedule
                          </button>
                        )}
                        {cancelConfirm === booking.id ? (
                          <div className="flex flex-1 gap-2">
                            <button
                              onClick={() => handleCancel(booking.id)}
                              disabled={cancelling === booking.id}
                              className="flex-1 rounded-xl bg-red-500 py-2 text-xs font-bold text-white hover:bg-red-600 transition disabled:opacity-60"
                            >
                              {cancelling === booking.id ? "Cancelling…" : "Yes, cancel"}
                            </button>
                            <button
                              onClick={() => setCancelConfirm(null)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--muted)]"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCancelConfirm(booking.id)}
                            className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                          >
                            Cancel booking
                          </button>
                        )}
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

      {/* Reschedule modal */}
      {rescheduleBooking && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setRescheduleBooking(null)} />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black">Reschedule appointment</h3>
              <button onClick={() => setRescheduleBooking(null)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Moving: <strong>{rescheduleBooking.service}</strong> with {rescheduleBooking.provider.name}
            </p>
            <div className="space-y-3">
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
            {rescheduleError && <p className="mt-2 text-sm font-semibold text-red-500">{rescheduleError}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleReschedule}
                disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60 transition"
              >
                {rescheduling && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm reschedule
              </button>
              <button onClick={() => setRescheduleBooking(null)} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)]">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
