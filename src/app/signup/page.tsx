"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "", handle: "", category: "Hair" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    // Auto-generate handle from business name
    if (key === "businessName") {
      setForm((f) => ({ ...f, businessName: value, handle: "@" + value.toLowerCase().replace(/[^a-z0-9]/g, "") }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
    } else {
      router.push("/login?registered=1");
    }
  }

  const categories = ["Hair", "Nails", "Makeup", "Lashes", "Brows", "Barber", "Spa"];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9F5F3] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D94472] text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-xl font-black tracking-tight">Create your Glowith studio</p>
          <p className="text-sm text-[#7A6C6E]">Your clients will book at {form.handle || "@yourstudio"}.glowith.co.za</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[#E8E0DC] bg-white p-6 shadow-sm">
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "name", label: "Your name", placeholder: "Naledi Mokoena" },
              { key: "email", label: "Email", placeholder: "you@example.com", type: "email" },
              { key: "businessName", label: "Business name", placeholder: "Lume Locks Studio" },
              { key: "password", label: "Password", placeholder: "Min. 8 characters", type: "password" }
            ].map(({ key, label, placeholder, type = "text" }) => (
              <div key={key} className={key === "email" || key === "password" ? "col-span-2" : ""}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">{label}</label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  required
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-3 text-sm font-medium outline-none transition focus:border-[#D94472] focus:bg-white"
                />
              </div>
            ))}
          </div>

          {/* Handle preview */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">Your subdomain</label>
            <div className="flex overflow-hidden rounded-xl border border-[#E8E0DC] bg-[#F9F5F3]">
              <input
                value={form.handle.replace("@", "")}
                onChange={(e) => setForm((f) => ({ ...f, handle: "@" + e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") }))}
                placeholder="yourstudio"
                className="flex-1 bg-transparent px-4 py-3 text-sm font-medium outline-none"
              />
              <span className="flex items-center border-l border-[#E8E0DC] bg-white px-3 text-sm font-semibold text-[#7A6C6E]">
                .glowith.co.za
              </span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">Primary category</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-3 text-sm font-medium outline-none transition focus:border-[#D94472] focus:bg-white"
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D94472] py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create my studio
          </button>

          <p className="text-center text-xs text-[#7A6C6E]">
            Already have a studio?{" "}
            <Link href="/login" className="font-bold text-[#D94472] hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
