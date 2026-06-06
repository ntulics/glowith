"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

// ─── sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ active }: { active: boolean }) {
  return (
    <div className="h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-8">
      <div
        className="h-full bg-[#E85D2F] transition-all duration-500"
        style={{ width: active ? "100%" : "0%" }}
      />
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E85D2F]/50 focus:border-[#E85D2F] transition pr-10"
          required
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition"
            tabIndex={-1}
          >
            {show ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-[#E85D2F] hover:bg-[#d04f25] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ─── password strength ────────────────────────────────────────────────────────

function strength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "", color: "bg-zinc-700" },
    1: { label: "Weak", color: "bg-red-500" },
    2: { label: "Fair", color: "bg-orange-400" },
    3: { label: "Good", color: "bg-yellow-400" },
    4: { label: "Strong", color: "bg-green-400" },
    5: { label: "Very strong", color: "bg-emerald-400" },
  };
  return { score, ...map[Math.min(score, 5)] };
}

// ─── main form ────────────────────────────────────────────────────────────────

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const pw = strength(password);

  useEffect(() => () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (pw.score < 2) { setError("Password is too weak."); return; }
    if (!token || !email) { setError("Invalid reset link."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setDone(true);
      redirectTimer.current = setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [password, confirm, token, email, pw.score, router]);

  if (!token || !email) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">Invalid reset link</h2>
        <p className="text-zinc-400 text-sm">This link is missing required parameters.</p>
        <Link href="/login" className="inline-block text-[#E85D2F] hover:underline text-sm">Back to sign in</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">Password updated</h2>
        <p className="text-zinc-400 text-sm">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ProgressBar active={loading} />

      <Field
        label="New password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />

      {password.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pw.score ? pw.color : "bg-zinc-700"}`}
              />
            ))}
          </div>
          {pw.label && <p className="text-xs text-zinc-400">{pw.label}</p>}
        </div>
      )}

      <Field
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        placeholder="Repeat your new password"
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <SubmitButton loading={loading}>Set new password</SubmitButton>

      <p className="text-center text-sm text-zinc-500">
        Remember it?{" "}
        <Link href="/login" className="text-[#E85D2F] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

// ─── page shell ───────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Glow<span className="text-[#E85D2F]">ith</span>
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Choose a new password</h1>
            <p className="text-zinc-400 text-sm mt-1">Make it strong and memorable.</p>
          </div>

          <Suspense fallback={<div className="h-40 flex items-center justify-center text-zinc-500 text-sm">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
