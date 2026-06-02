"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type Profile = { id: string; businessName: string; handle: string; bio: string; city: string; category: string; mobile: boolean; studio: boolean };

export function SettingsView({ profile: initial }: { profile: Profile }) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/dashboard/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);
    setSaved(true);
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-xl font-black">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-black">Studio profile</h2>

            {[
              { key: "businessName", label: "Business name" },
              { key: "city", label: "City" },
              { key: "bio", label: "Bio", multiline: true }
            ].map(({ key, label, multiline }) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
                {multiline ? (
                  <textarea value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white resize-none" />
                ) : (
                  <input value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#D94472] focus:bg-white" />
                )}
              </div>
            ))}

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Subdomain</label>
              <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <input value={form.handle.replace("@", "")} readOnly className="flex-1 bg-transparent px-4 py-3 text-sm font-medium outline-none text-gray-400" />
                <span className="flex items-center border-l border-gray-200 bg-white px-3 text-sm font-semibold text-gray-400">.glowith.co.za</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {saved && <p className="text-sm font-semibold text-emerald-600">Saved!</p>}
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
