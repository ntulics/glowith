"use client";

import { format } from "date-fns";
import { BadgeCheck, BookOpen, DollarSign, TrendingUp, Users, Store, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const formatZAR = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);

const STATUS_STYLE: Record<string, string> = {
  PENDING_DEPOSIT: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  EXPIRED: "bg-amber-50 text-amber-700"
};
const STATUS_LABEL: Record<string, string> = {
  PENDING_DEPOSIT: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired"
};

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border p-5", accent ? "border-[#D94472]/20 bg-[#D94472]/5" : "border-gray-100 bg-white shadow-sm")}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent ? "bg-[#D94472]/15" : "bg-gray-100")}>
          <Icon className={cn("h-4 w-4", accent ? "text-[#D94472]" : "text-gray-500")} />
        </div>
      </div>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs font-semibold text-gray-400">{sub}</p>}
    </div>
  );
}

export function AdminOverview({ stats, recentBookings, recentProviders }: {
  stats: { totalProviders: number; pendingVerification: number; totalClients: number; totalBookings: number; totalRevenueCents: number };
  recentBookings: Array<{ id: string; clientName: string; providerName: string; service: string; status: string; depositCents: number; createdAt: string }>;
  recentProviders: Array<{ id: string; businessName: string; handle: string; category: string; city: string; verified: boolean; bookings: number; services: number; createdAt: string }>;
}) {
  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-black">Platform Overview</h1>
          <p className="text-xs text-gray-400">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>
        {stats.pendingVerification > 0 && (
          <a href="/admin/providers?filter=pending"
            className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100">
            <Clock className="h-4 w-4" />
            {stats.pendingVerification} awaiting verification
          </a>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Total providers" value={String(stats.totalProviders)} sub={`${stats.pendingVerification} pending`} icon={Store} />
          <StatCard label="Clients" value={String(stats.totalClients)} icon={Users} />
          <StatCard label="Total bookings" value={String(stats.totalBookings)} icon={BookOpen} />
          <StatCard label="Platform revenue" value={formatZAR(stats.totalRevenueCents)} sub="deposits collected" icon={TrendingUp} accent />
          <StatCard label="Verified" value={String(stats.totalProviders - stats.pendingVerification)} sub="of all providers" icon={BadgeCheck} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent providers */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-black">New providers</h2>
              <a href="/admin/providers" className="text-xs font-bold text-[#D94472] hover:underline">View all</a>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-50">
                  <th className="px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Studio</th>
                  <th className="px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Category</th>
                  <th className="px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentProviders.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <p className="font-bold">{p.businessName}</p>
                      <p className="text-xs text-gray-400">{p.handle} · {p.services} services</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.category}</td>
                    <td className="px-5 py-3">
                      {p.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentProviders.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">No providers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Recent bookings */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-black">Recent bookings</h2>
              <a href="/admin/bookings" className="text-xs font-bold text-[#D94472] hover:underline">View all</a>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-50">
                  <th className="px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Client</th>
                  <th className="px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Provider</th>
                  <th className="px-5 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <p className="font-bold">{b.clientName}</p>
                      <p className="text-xs text-gray-400">{b.service}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{b.providerName}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", STATUS_STYLE[b.status])}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentBookings.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">No bookings yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
