"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    // Fetch the session to get role + handle for redirect
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const user = session?.user;

    // Explicit callbackUrl always wins (e.g. from middleware redirect)
    const callbackUrl = params.get("callbackUrl");
    if (callbackUrl) {
      router.push(callbackUrl);
      return;
    }

    if (user?.role === "ADMIN") {
      router.push("/admin");
    } else if (user?.role === "PROVIDER" && user?.handle) {
      const isLocalhost = window.location.hostname === "localhost";
      if (isLocalhost) {
        router.push("/dashboard");
      } else {
        // Use the full current hostname as base — works correctly for
        // multi-part TLDs like .co.za (.slice(-2) would give "co.za" not "glowith.co.za")
        window.location.href = `https://${user.handle}.${window.location.hostname}/dashboard`;
      }
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9F5F3] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D94472] text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-xl font-black tracking-tight">Glowith</p>
          <p className="text-sm text-[#7A6C6E]">Sign in to your studio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[#E8E0DC] bg-white p-6 shadow-sm">
          {params.get("registered") && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Studio created! Sign in below.
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-3 text-sm font-medium outline-none transition focus:border-[#D94472] focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-3 pr-11 text-sm font-medium outline-none transition focus:border-[#D94472] focus:bg-white"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6C6E]">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] py-3 text-sm font-bold text-white transition hover:bg-[#1a1a1a]/90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>

          <p className="text-center text-xs text-[#7A6C6E]">
            New to Glowith?{" "}
            <Link href="/signup" className="font-bold text-[#D94472] hover:underline">
              Create your studio
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
