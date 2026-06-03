"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, Sparkles } from "lucide-react";

type LookupResult = {
  exists: boolean;
  firstName: string;
  role: "CLIENT" | "PROVIDER" | "ADMIN";
  handle: string | null;
  businessName: string | null;
};

function tenantHost(handle: string) {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "";

  const root = host.endsWith(".glowith.co.za") ? "glowith.co.za" : host;
  return `https://${handle}.${root}`;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/lookup?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (!response.ok) {
        setError("Enter a valid email address");
        return;
      }

      setLookup(data);
      setStep("password");
    } catch {
      setError("Could not check that email. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
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

    const callbackUrl = params.get("callbackUrl");
    if (callbackUrl) {
      router.push(callbackUrl);
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const user = session?.user;

    if (user?.role === "ADMIN") {
      router.push("/admin");
      return;
    }

    if (user?.role === "PROVIDER" && user?.handle) {
      const host = tenantHost(user.handle);
      if (host) {
        window.location.href = `${host}/dashboard`;
      } else {
        router.push("/dashboard");
      }
      return;
    }

    router.push("/");
  }

  const firstName = lookup?.firstName ?? "there";
  const isPrivileged = lookup?.role === "ADMIN" || lookup?.role === "PROVIDER";

  return (
    <main className="min-h-screen bg-[#F9F5F3] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#D94472] text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            Glowith
          </Link>
          <Link href="/signup" className="rounded-full border border-[#E8E0DC] bg-white px-4 py-2 text-sm font-bold">
            List your business
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 md:grid-cols-[1fr_420px]">
          <div className="text-left">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#D94472]">
              {step === "email" ? "Login" : isPrivileged ? "Studio access" : "Welcome back"}
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-black leading-[1.05] text-[#1F1B1C] sm:text-6xl">
              {step === "email" ? "First, what is your email?" : `Welcome ${firstName}`}
            </h1>
            <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-[#7A6C6E]">
              {step === "email"
                ? "We will check your account and send you to the right Glowith experience."
                : isPrivileged
                  ? "Enter your password to continue to your tenant workspace."
                  : "Enter your password to continue booking and managing appointments."}
            </p>
          </div>

          <div className="rounded-[2rem] border border-[#E8E0DC] bg-white p-6 shadow-xl shadow-black/5">
            <div className="mb-6 flex gap-2">
              {["email", "password"].map((item, index) => (
                <div
                  key={item}
                  className={`h-1 flex-1 rounded-full ${index === 0 || step === "password" ? "bg-[#D94472]" : "bg-[#E8E0DC]"}`}
                />
              ))}
            </div>

            {params.get("registered") && (
              <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Studio created. Sign in below.
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            {step === "email" ? (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">Email address</span>
                  <span className="mt-2 flex items-center gap-3 rounded-2xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-4">
                    <Mail className="h-5 w-5 text-[#7A6C6E]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      placeholder="bookings@demo.glowith.co.za"
                      className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-[#B2A6A8]"
                    />
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a1a1a] py-4 text-sm font-black text-white transition hover:bg-[#1a1a1a]/90 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Continue
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setPassword("");
                    setError("");
                  }}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#7A6C6E]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change email
                </button>

                <div className="rounded-2xl bg-[#FFF5F8] px-4 py-3 text-sm font-semibold text-[#7A6C6E]">
                  {email}
                  {lookup?.businessName && <span className="block text-[#1F1B1C]">{lookup.businessName}</span>}
                </div>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">Password</span>
                  <span className="mt-2 flex items-center gap-3 rounded-2xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-4">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                      placeholder="Enter your password"
                      className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-[#B2A6A8]"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="text-[#7A6C6E]" aria-label="Toggle password visibility">
                      {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a1a1a] py-4 text-sm font-black text-white transition hover:bg-[#1a1a1a]/90 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Log in
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
