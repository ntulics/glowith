"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowDown, ArrowUp, Calendar, CheckCircle, Clock, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function StatCard({
  label, value, prev, curr, icon: Icon, format: fmt = String
}: {
  label: string; value: string; prev: number; curr: number;
  icon: React.ElementType; format?: (n: number) => string;
}) {
  const pct = pctChange(curr, prev);
  const up = pct >= 0;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D94472]/8">
          <Icon className="h-4 w-4 text-[#D94472]" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      <div className={cn("mt-1 inline-flex items-center gap-1 text-xs font-bold", up ? "text-emerald-600" : "text-red-500")}>
        {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {Math.abs(pct)}% vs last month
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING_DEPOSIT: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500"
};
const STATUS_LABEL: Record<string, string> = {
  PENDING_DEPOSIT: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

export function DashboardHome({
  stats, upcoming, chartData
}: {
  stats: { totalBookings: number; prevBookings: number; revenue: number; prevRevenue: number; clients: number; prevClients: number };
  upcoming: Array<{ id: string; clientName: string; service: string; startsAt: string; status: string; priceCents: number; depositCents: number }>;
  chartData: Array<{ label: string; revenue: number }>;
}) {
  return (
    <div className="flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-black">Dashboard</h1>
          <p className="text-xs text-gray-400">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
            Appointments
          </button>
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-400 transition hover:bg-gray-50">
            Events
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total appointments" value={String(stats.totalBookings)} curr={stats.totalBookings} prev={stats.prevBookings} icon={Calendar} />
          <StatCard label="Clients" value={String(stats.clients)} curr={stats.clients} prev={stats.prevClients} icon={Users} />
          <StatCard label="Revenue (deposits)" value={formatZAR(stats.revenue)} curr={stats.revenue} prev={stats.prevRevenue} icon={TrendingUp} />
        </div>

        {/* Revenue chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500">Revenue</p>
              <p className="text-3xl font-black">{formatZAR(stats.revenue)}</p>
            </div>
            <div className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", pctChange(stats.revenue, stats.prevRevenue) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
              {pctChange(stats.revenue, stats.prevRevenue) >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(pctChange(stats.revenue, stats.prevRevenue))}%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D94472" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#D94472" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R${v}`} />
              <Tooltip formatter={(v) => [`R ${v}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#D94472" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming appointments table */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-black">Upcoming appointments</h2>
            <button className="text-xs font-bold text-[#D94472] hover:underline">View all</button>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Clock className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-400">No upcoming appointments</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-50 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {["Date", "Time", "Client", "Service", "Price", "Status"].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcoming.map((appt) => {
                  const d = new Date(appt.startsAt);
                  return (
                    <tr key={appt.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-semibold">{format(d, "d MMM yyyy")}</td>
                      <td className="px-5 py-3 text-gray-500">{format(d, "h:mm a")}</td>
                      <td className="px-5 py-3 font-semibold">{appt.clientName}</td>
                      <td className="px-5 py-3 text-gray-500">{appt.service}</td>
                      <td className="px-5 py-3 font-semibold">{formatZAR(appt.priceCents)}</td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", STATUS_STYLES[appt.status])}>
                          <CheckCircle className="h-3 w-3" />
                          {STATUS_LABEL[appt.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
