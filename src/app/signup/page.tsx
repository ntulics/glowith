"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronRight, Loader2, Scissors, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type ProviderType = "FREELANCER" | "BUSINESS";

const TYPE_OPTIONS: Array<{
  type: ProviderType;
  icon: React.ElementType;
  label: string;
  tagline: string;
  bullets: string[];
}> = [
  {
    type: "FREELANCER",
    icon: Scissors,
    label: "Freelancer",
    tagline: "I work independently",
    bullets: [
      "Your own personal studio",
      "Accept bookings & deposits",
      "Can join a business later",
      "Full control over your schedule"
    ]
  },
  {
    type: "BUSINESS",
    icon: Building2,
    label: "Business",
    tagline: "I manage a team or salon",
    bullets: [
      "Invite & manage agents",
      "Centralised booking calendar",
      "Move agents between branches",
      "Business-level analytics"
    ]
  }
];

const CATEGORIES = ["Hair", "Nails", "Makeup", "Lashes", "Brows", "Barber", "Spa"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "details">("type");
  const [providerType, setProviderType] = useState<ProviderType>("FREELANCER");
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    businessName: "", handle: "", category: "Hair"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isFreelancer = providerType === "FREELANCER";

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "businessName") {
      setForm((f) => ({
        ...f,
        businessName: value,
        handle: "@" + value.toLowerCase().replace(/[^a-z0-9]/g, "")
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, providerType })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9F5F3] px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D94472] text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-xl font-black tracking-tight">Create your Glowith studio</p>
          <p className="text-sm text-[#7A6C6E]">
            {step === "type" ? "How will you be using Glowith?" : `Setting up as a ${isFreelancer ? "freelancer" : "business"}`}
          </p>
        </div>

        {/* Step 1: Type selection */}
        {step === "type" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TYPE_OPTIONS.map(({ type, icon: Icon, label, tagline, bullets }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProviderType(type)}
                  className={cn(
                    "flex flex-col items-start gap-3 rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition hover:border-[#D94472]/50",
                    providerType === type ? "border-[#D94472] ring-4 ring-[#D94472]/10" : "border-[#E8E0DC]"
                  )}
                >
                  <div className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    providerType === type ? "bg-[#D94472] text-white" : "bg-[#F9F5F3] text-[#7A6C6E]"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black">{label}</p>
                    <p className="text-xs text-[#7A6C6E]">{tagline}</p>
                  </div>
                  <ul className="mt-1 space-y-1.5">
                    {bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-[#7A6C6E]">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D94472]" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            {/* Freelancer → Business note */}
            <div className="flex items-start gap-3 rounded-2xl border border-[#E8E0DC] bg-white p-4 text-xs text-[#7A6C6E]">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#D94472]" />
              <p>
                <span className="font-bold text-[#3D2C2E]">Freelancers can join a business later.</span>{" "}
                When you join a business, you become an agent within that team — your profile, bookings, and history travel with you.
              </p>
            </div>

            <button
              onClick={() => setStep("details")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D94472] py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Continue as {isFreelancer ? "Freelancer" : "Business"}
              <ChevronRight className="h-4 w-4" />
            </button>

            <p className="text-center text-xs text-[#7A6C6E]">
              Already have a studio?{" "}
              <Link href="/login" className="font-bold text-[#D94472] hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {/* Step 2: Details form */}
        {step === "details" && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[#E8E0DC] bg-white p-6 shadow-sm">
            {/* Back + type badge */}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStep("type")}
                className="text-xs font-bold text-[#7A6C6E] hover:text-[#D94472]">
                ← Back
              </button>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                isFreelancer ? "bg-[#FFF0F4] text-[#D94472]" : "bg-[#EEF2FF] text-indigo-600"
              )}>
                {isFreelancer ? <Scissors className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                {isFreelancer ? "Freelancer" : "Business"}
              </span>
            </div>

            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "name", label: "Your name", placeholder: "Naledi Mokoena" },
                { key: "email", label: "Email", placeholder: "you@example.com", type: "email" },
                {
                  key: "businessName",
                  label: isFreelancer ? "Studio / trading name" : "Business name",
                  placeholder: isFreelancer ? "Lume Locks" : "Lume Group"
                },
                { key: "password", label: "Password", placeholder: "Min. 8 characters", type: "password" }
              ].map(({ key, label, placeholder, type = "text" }) => (
                <div key={key} className={key === "email" || key === "password" ? "col-span-2" : ""}>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => set(key, e.target.value)}
                    required
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-3 text-sm font-medium outline-none transition focus:border-[#D94472] focus:bg-white"
                  />
                </div>
              ))}
            </div>

            {/* Handle */}
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
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">
                {isFreelancer ? "Primary service" : "Main category"}
              </label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full rounded-xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-3 text-sm font-medium outline-none transition focus:border-[#D94472] focus:bg-white"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D94472] py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isFreelancer ? "Create my studio" : "Create my business"}
            </button>

            <p className="text-center text-xs text-[#7A6C6E]">
              Already have a studio?{" "}
              <Link href="/login" className="font-bold text-[#D94472] hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
