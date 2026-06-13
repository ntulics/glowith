"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Timer,
  UserX
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

type Appointment = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  checkedInAt: string | null;
  noShowAt: string | null;
  completedAt: string | null;
  feedbackRequestedAt: string | null;
  depositCents: number;
  durationMinutes: number;
  service: string;
  priceCents: number;
  isCurrent: boolean;
  client: { id: string; name: string; email: string; image: string | null };
  agentName: string | null;
};

function LiveTimer({ checkedInAt, endsAt }: { checkedInAt: string; endsAt: string }) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    function tick() {
      const remaining = new Date(endsAt).getTime() - Date.now();
      if (remaining <= 0) {
        setDisplay("Time's up");
        return;
      }
      const totalSecs = Math.floor(remaining / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      setDisplay(
        h > 0
          ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")} left`
          : `${m}:${s.toString().padStart(2, "0")} left`
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [checkedInAt, endsAt]);

  const isOvertime = new Date(endsAt).getTime() < Date.now();

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
      isOvertime ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
    )}>
      <Timer className="h-3 w-3" />
      {display}
    </span>
  );
}

function ElapsedTimer({ checkedInAt }: { checkedInAt: string }) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    function tick() {
      const elapsed = Date.now() - new Date(checkedInAt).getTime();
      const totalSecs = Math.floor(elapsed / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      setDisplay(
        h > 0
          ? `${h}h ${m}m ${s}s`
          : m > 0
          ? `${m}m ${s}s`
          : `${s}s`
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [checkedInAt]);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
      <Clock className="h-3 w-3" />
      {display} in
    </span>
  );
}

type Section = "current" | "upcoming" | "past";

export function AppointmentsView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("upcoming");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/appointments");
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.appointments);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateAttendance(id: string, action: "check_in" | "no_show" | "complete") {
    const confirmationCode = action === "check_in"
      ? window.prompt("Enter the customer's 6-digit check-in code")?.trim()
      : undefined;
    if (action === "check_in" && !confirmationCode) return;
    setActing(id);
    const res = await fetch(`/api/dashboard/bookings/${id}/attendance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, confirmationCode })
    });
    if (res.ok) await load();
    setActing(null);
  }

  const now = new Date();

  const current = appointments.filter((a) => a.isCurrent);
  const upcoming = appointments.filter((a) => {
    if (a.isCurrent) return false;
    if (a.status !== "CONFIRMED") return false;
    if (a.noShowAt) return false;
    return new Date(a.endsAt) > now;
  });
  const past = appointments.filter((a) => {
    if (a.status === "CANCELLED" || a.status === "EXPIRED" || a.status === "PENDING_DEPOSIT") return false;
    if (a.isCurrent) return false;
    const isPast = new Date(a.endsAt) <= now;
    const isNoShow = !!a.noShowAt;
    const isCompleted = a.status === "COMPLETED";
    return isPast || isNoShow || isCompleted;
  });

  const tabs: { key: Section; label: string; count: number }[] = [
    { key: "current", label: "In progress", count: current.length },
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "past", label: "Past", count: past.length }
  ];

  const displayed = section === "current" ? current : section === "upcoming" ? upcoming : past;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-black">Appointments</h1>
          <p className="text-xs text-gray-400">{format(now, "EEEE, d MMMM yyyy")}</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setSection(t.key)}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm font-bold transition",
                  section === t.key
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={cn(
                    "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black",
                    t.key === "current" ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-600"
                  )}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Appointment list */}
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <CalendarCheck className="h-10 w-10 text-gray-200" />
              <p className="mt-3 font-bold text-gray-400">
                {section === "current" ? "No appointments in progress" :
                 section === "upcoming" ? "No upcoming appointments" :
                 "No past appointments"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((appt) => {
                const isNoShow = !!appt.noShowAt;
                const isCompleted = appt.status === "COMPLETED" && !isNoShow;
                const checkedIn = !!appt.checkedInAt && !isNoShow && !isCompleted;

                return (
                  <div
                    key={appt.id}
                    className={cn(
                      "rounded-2xl border bg-white p-4 shadow-sm",
                      appt.isCurrent ? "border-emerald-200" : "border-gray-100"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D94472]/10 text-sm font-black text-[#D94472]">
                        {appt.client.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-gray-900">{appt.client.name}</span>
                          {isNoShow && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                              <UserX className="h-3 w-3" />
                              No-show
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                              <CheckCircle className="h-3 w-3" />
                              Completed
                            </span>
                          )}
                          {checkedIn && !appt.isCurrent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                              <CheckCircle className="h-3 w-3" />
                              Checked in
                            </span>
                          )}
                          {appt.isCurrent && appt.checkedInAt && (
                            <>
                              <LiveTimer checkedInAt={appt.checkedInAt} endsAt={appt.endsAt} />
                              <ElapsedTimer checkedInAt={appt.checkedInAt} />
                            </>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-600">
                          {appt.service}
                          {appt.agentName && <span className="text-gray-400"> · {appt.agentName}</span>}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <span>{format(new Date(appt.startsAt), "d MMM yyyy, h:mm a")}</span>
                          <span>{appt.durationMinutes} min</span>
                          <span className="font-semibold text-gray-600">{formatZAR(appt.priceCents)}</span>
                          {appt.depositCents > 0 && (
                            <span className="text-emerald-600 font-semibold">{formatZAR(appt.depositCents)} deposit</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400">{appt.client.email}</p>
                      </div>

                      {/* Actions */}
                      {!isNoShow && !isCompleted && (
                        <div className="flex shrink-0 flex-col gap-1.5">
                          {appt.status === "CONFIRMED" && !appt.checkedInAt && !appt.noShowAt && (
                            <>
                              <button
                                disabled={!!acting}
                                onClick={() => updateAttendance(appt.id, "check_in")}
                                className="rounded-xl bg-[#D94472] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#c23862] disabled:opacity-50 transition"
                              >
                                {acting === appt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check in"}
                              </button>
                              <button
                                disabled={!!acting}
                                onClick={() => updateAttendance(appt.id, "no_show")}
                                className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                              >
                                No-show
                              </button>
                            </>
                          )}
                          {appt.status === "CONFIRMED" && appt.checkedInAt && !appt.noShowAt && (
                            <button
                              disabled={!!acting}
                              onClick={() => updateAttendance(appt.id, "complete")}
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                            >
                              {acting === appt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Complete"}
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
      )}
    </div>
  );
}
