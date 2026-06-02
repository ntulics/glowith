"use client";

import { useState } from "react";
import { BadgeCheck, Clock, ExternalLink, Search, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Provider = {
  id: string; businessName: string; handle: string; category: string;
  city: string; verified: boolean; email: string;
  bookings: number; services: number; posts: number; createdAt: string;
};

export function ProvidersTable({ providers: initial }: { providers: Provider[] }) {
  const [providers, setProviders] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = providers.filter((p) => {
    const matchSearch = !search || [p.businessName, p.handle, p.email, p.city].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "pending" && !p.verified) || (filter === "verified" && p.verified);
    return matchSearch && matchFilter;
  });

  async function setVerified(id: string, verified: boolean) {
    setLoading(id);
    await fetch(`/api/admin/providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified })
    });
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, verified } : p));
    setLoading(null);
  }

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-black">Providers</h1>
          <p className="text-xs text-gray-400">{providers.length} total · {providers.filter(p => !p.verified).length} pending</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-6 py-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search providers…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
        </div>
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          {(["all", "pending", "verified"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition",
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700")}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              {["Studio", "Category", "City", "Services", "Bookings", "Joined", "Status", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <p className="font-bold">{p.businessName}</p>
                  <p className="text-xs text-gray-400">{p.handle}</p>
                  <p className="text-xs text-gray-300">{p.email}</p>
                </td>
                <td className="px-5 py-3 text-gray-500">{p.category}</td>
                <td className="px-5 py-3 text-gray-500">{p.city || "—"}</td>
                <td className="px-5 py-3 font-semibold">{p.services}</td>
                <td className="px-5 py-3 font-semibold">{p.bookings}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{format(new Date(p.createdAt), "d MMM yyyy")}</td>
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
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {!p.verified ? (
                      <button
                        onClick={() => setVerified(p.id, true)}
                        disabled={loading === p.id}
                        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {loading === p.id ? "…" : "✓ Verify"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setVerified(p.id, false)}
                        disabled={loading === p.id}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <ShieldOff className="inline h-3 w-3" /> Unverify
                      </button>
                    )}
                    <a
                      href={`/dashboard`}
                      target="_blank"
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                      title="View studio"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-semibold text-gray-400">No providers match your filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
