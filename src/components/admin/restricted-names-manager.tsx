"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { format } from "date-fns";

type Entry = { id: string; name: string; reason: string; createdAt: string };

export function RestrictedNamesManager({ initial }: { initial: Entry[] }) {
  const [names, setNames] = useState(initial);
  const [newName, setNewName] = useState("");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/restricted-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, reason: newReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setNames((prev) => [{ id: data.entry.id, name: data.entry.name, reason: data.entry.reason ?? "", createdAt: data.entry.createdAt }, ...prev]);
      setNewName("");
      setNewReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    await fetch(`/api/admin/restricted-names/${id}`, { method: "DELETE" });
    setNames((prev) => prev.filter((n) => n.id !== id));
    setDeleting(null);
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-xl font-black">Restricted Names</h1>
        <p className="text-xs text-gray-400">Handle names that cannot be registered by users — {names.length} entries</p>
      </div>

      {/* Add form */}
      <form onSubmit={add} className="border-b border-gray-100 bg-gray-50 px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Handle name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="e.g. glowith, admin, support"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#D94472]" />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Reason (optional)</label>
            <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="e.g. Brand name, platform reserved"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#D94472]" />
          </div>
          <button type="submit" disabled={adding}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D94472] px-4 py-2 text-sm font-bold text-white hover:bg-[#c23761] disabled:opacity-50">
            <Plus className="h-4 w-4" />
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
      </form>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              {["Handle", "Reason", "Added", ""].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((n) => (
              <tr key={n.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-6 py-3 font-mono font-bold text-[#D94472]">@{n.name}</td>
                <td className="px-6 py-3 text-gray-500">{n.reason || <span className="text-gray-300">—</span>}</td>
                <td className="px-6 py-3 text-xs text-gray-400">{format(new Date(n.createdAt), "d MMM yyyy")}</td>
                <td className="px-6 py-3">
                  <button onClick={() => remove(n.id)} disabled={deleting === n.id}
                    className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                    {deleting === n.id ? <X className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {names.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-semibold text-gray-400">No restricted names yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
