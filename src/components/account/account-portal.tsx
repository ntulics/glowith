"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  LogOut,
  MapPin,
  MessageCircle,
  Settings,
  Sparkles,
  X,
  XCircle
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

  const firstName = userName.split(" ")[0] || "there";

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
    <div className="min-h-screen bg-[#F9F5F3]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)]/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="Glowith">
            <span role="img" aria-label="Glowith" className="logo-adaptive h-7" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/account/settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition">
              <Settings className="h-4 w-4" />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex h-9 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)] text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand)]">Your account</p>
              <h1 className="text-2xl font-black text-[var(--ink)]">Hi {firstName} 👋</h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">{userEmail}</p>
        </div>

        {/* Quick stats */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {[
            { label: "Upcoming", value: upcoming.length, icon: CalendarClock, accent: "text-[var(--brand)]" },
            { label: "Completed", value: bookings.filter((b) => b.status === "COMPLETED").length, icon: CheckCircle2, accent: "text-emerald-600" },
            { label: "Total spent", value: formatCurrency(bookings.filter((b) => b.status !== "CANCELLED").reduce((s, b) => s + b.depositCents, 0)), icon: Sparkles, accent: "text-[var(--muted)]" }
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
            <span className="text-sm font-semibold">Book a service</span>
            <ChevronRight className="ml-auto h-4 w-4 text-[var(--muted)]" />
          </Link>
          <Link href="/dashboard/inbox" className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--brand)]/40">
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

        {/* Appointments tabs */}
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
                          <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">{booking.provider.name}</p>
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
                        <div className="mt-3 flex gap-2 border-t border-[var(--line)] pt-3">
                          <Link
                            href={`/provider/${booking.provider.handle.replace("@", "")}`}
                            className="flex-1 rounded-xl border border-[var(--line)] py-2 text-center text-xs font-bold text-[var(--ink)] hover:bg-[var(--background)] transition"
                          >
                            View provider
                          </Link>
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

        <p className="mt-12 text-center text-xs text-[var(--muted)]">
          Need help?{" "}
          <Link href="/contact" className="font-semibold text-[var(--brand)] hover:underline">
            Contact support
          </Link>
        </p>
      </main>
    </div>
  );
}
