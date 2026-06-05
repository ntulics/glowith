"use client";

import { useState } from "react";
import { HardDrive, Check } from "lucide-react";
import { formatBytes, GB } from "@/lib/storage-format";

type Agent = { id: string; name: string; used: number; quota: number };

function Bar({ used, quota }: { used: number; quota: number }) {
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const over = used > quota;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{formatBytes(used)} used</span>
        <span className="text-gray-400">of {formatBytes(quota)}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-[#D94472]"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StorageView({
  isBusiness, businessName, used, quota, sharedUsed, agents, parentBusinessName
}: {
  isBusiness: boolean; businessName: string; used: number; quota: number;
  sharedUsed: number | null; agents: Agent[]; parentBusinessName: string | null;
}) {
  const [list, setList] = useState(agents);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function saveQuota(id: string, gb: number) {
    setSavingId(id);
    const bytes = Math.round(gb * GB);
    const res = await fetch(`/api/dashboard/agents/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storageQuotaBytes: bytes })
    });
    if (res.ok) { setList((l) => l.map((a) => a.id === id ? { ...a, quota: bytes } : a)); setSavedId(id); setTimeout(() => setSavedId(null), 2000); }
    setSavingId(null);
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D94472]/10"><HardDrive className="h-5 w-5 text-[#D94472]" /></div>
          <div>
            <h1 className="text-xl font-black">Storage</h1>
            <p className="text-xs text-gray-500">Photos and files you&apos;ve uploaded</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {isBusiness ? (
          <>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-3 font-black">{businessName} — shared storage</p>
              <Bar used={sharedUsed ?? used} quota={quota} />
              <p className="mt-2 text-xs text-gray-400">Shared across your business and all agents. Adjust each agent&apos;s allowance below.</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-4 font-black">Per-agent usage & limits</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold">{businessName} (company)</span>
                  <span className="text-xs text-gray-400">{formatBytes(used)}</span>
                </div>
                {list.map((a) => (
                  <div key={a.id} className="border-t border-gray-50 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold">{a.name}</span>
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} step={0.5} defaultValue={+(a.quota / GB).toFixed(1)}
                          onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && Math.round(v * GB) !== a.quota) saveQuota(a.id, v); }}
                          className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold outline-none focus:border-[#D94472]" />
                        <span className="text-xs text-gray-400">GB</span>
                        {savingId === a.id && <span className="text-xs text-gray-400">…</span>}
                        {savedId === a.id && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                    </div>
                    <Bar used={a.used} quota={a.quota} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-lg rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 font-black">{businessName}</p>
            <Bar used={used} quota={quota} />
            {parentBusinessName && <p className="mt-2 text-xs text-gray-400">Part of {parentBusinessName}&apos;s shared storage. Your limit is set by the business.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
