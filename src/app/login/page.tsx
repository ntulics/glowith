"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Fingerprint, Loader2, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type LookupResult = {
  exists: boolean;
  firstName: string;
  role: "CLIENT" | "PROVIDER" | "ADMIN";
  handle: string | null;
  tenantSlug: string | null;
  businessName: string | null;
};

type MFAState = {
  email: string;
  ticket: string;
  method: "email" | "totp";
};

type ForgotState = {
  email: string;
  resetToken?: string;
};

function tenantHost(tenantSlug: string) {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "";
  const root = host.endsWith(".glowith.co.za") ? "glowith.co.za" : host;
  return `https://${tenantSlug}.${root}`;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"email" | "password" | "mfa" | "forgot" | "forgot-otp" | "forgot-new-pw">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfa, setMfa] = useState<MFAState | null>(null);
  const [forgot, setForgot] = useState<ForgotState | null>(null);
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPw, setForgotNewPw] = useState("");
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown(s: number) {
    setResendCooldown(s);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  async function redirectAfterLogin() {
    const callbackUrl = params.get("callbackUrl");
    if (callbackUrl) { router.push(callbackUrl); return; }
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const user = session?.user;
    if (user?.role === "ADMIN") { router.push("/admin"); return; }
    if (user?.role === "PROVIDER" && user?.tenantSlug) {
      const host = tenantHost(user.tenantSlug);
      if (host) { window.location.href = `${host}/dashboard`; return; }
      router.push("/dashboard");
      return;
    }
    router.push("/");
  }

  /* ── Register ─────────────────────────────────────────────────── */
  async function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/register-client", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const d = await r.json();
      if (!r.ok) { setError(typeof d.error === "string" ? d.error : "Could not create account"); return; }
      // After registration, go through normal sign-in (which will trigger MFA)
      setMode("login");
      setStep("password");
      setLookup({ exists: true, firstName: name, role: "CLIENT", handle: null, tenantSlug: null, businessName: null });
    } catch {
      setError("Could not create your account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Email lookup ─────────────────────────────────────────────── */
  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/lookup?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (!response.ok) { setError("Enter a valid email address"); return; }
      setLookup(data);
      setStep("password");
    } catch {
      setError("Could not check that email. Try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Password → MFA ───────────────────────────────────────────── */
  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", { email, password, redirect: false });

      if (!result?.error) {
        await redirectAfterLogin();
        return;
      }

      // NextAuth v5 wraps thrown errors as CallbackRouteError; the real message
      // is in result.url as ?error=MFA_REQUIRED%7C...
      let errorParam = result.error ?? "";
      if (result.url) {
        try {
          const u = new URL(result.url, window.location.origin);
          errorParam = u.searchParams.get("error") ?? errorParam;
        } catch { /* ignore malformed URL */ }
      }

      if (errorParam?.startsWith("MFA_REQUIRED")) {
        const parts = errorParam.split("|");
        if (parts.length === 4) {
          const state: MFAState = { email: parts[1], ticket: parts[2], method: parts[3] as "email" | "totp" };
          setMfa(state);
          setStep("mfa");
          if (state.method === "email") startCooldown(60);
          return;
        }
      }

      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  /* ── MFA verify ───────────────────────────────────────────────── */
  async function handleMFASubmit(e: FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn("mfa-complete", {
        email: mfa.email,
        ticket: mfa.ticket,
        code: mfaCode,
        method: mfa.method,
        redirect: false
      });
      if (result?.error) { setError("Incorrect code — check and try again"); setMfaCode(""); return; }
      await redirectAfterLogin();
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    if (!mfa || resendCooldown > 0) return;
    try {
      await fetch("/api/auth/mfa/resend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mfa.email, ticket: mfa.ticket })
      });
      startCooldown(60);
    } catch { /* ignore */ }
  }

  /* ── Forgot password ─────────────────────────────────────────── */
  async function handleForgotSend(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await fetch("/api/auth/forgot-password-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", email })
      });
      // Always advance — don't leak account existence
      setForgot({ email });
      setStep("forgot-otp");
      startCooldown(60);
    } catch {
      setError("Could not send code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!forgot) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: forgot.email, otp: forgotOtp })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Incorrect code."); return; }
      setForgot({ email: forgot.email, resetToken: data.resetToken });
      setStep("forgot-new-pw");
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSetPassword(e: FormEvent) {
    e.preventDefault();
    if (!forgot?.resetToken) return;
    if (forgotNewPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgot.email, token: forgot.resetToken, password: forgotNewPw })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not reset password."); return; }
      // Success — go back to password step with the new password pre-filled
      setStep("password");
      setPassword(forgotNewPw);
      setForgot(null);
      setForgotOtp("");
      setForgotNewPw("");
      setError("");
    } catch {
      setError("Could not reset password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotResend() {
    if (!forgot || resendCooldown > 0) return;
    await fetch("/api/auth/forgot-password-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", email: forgot.email })
    });
    startCooldown(60);
  }

  /* ── Passkey sign-in ──────────────────────────────────────────── */
  async function handlePasskeySignIn() {
    setPasskeyLoading(true);
    setError("");
    try {
      const { startAuthentication, browserSupportsWebAuthn } = await import("@simplewebauthn/browser");
      if (!browserSupportsWebAuthn()) { setError("Your browser doesn't support passkeys."); return; }

      const optRes = await fetch("/api/auth/passkey/auth-options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined })
      });
      const options = await optRes.json();
      const assertion = await startAuthentication(options);

      const verifyRes = await fetch("/api/auth/passkey/auth-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion })
      });
      const { ok, email: verifiedEmail, ticket } = await verifyRes.json();
      if (!ok) { setError("Passkey verification failed"); return; }

      const result = await signIn("passkey-complete", { email: verifiedEmail, ticket, redirect: false });
      if (result?.error) { setError("Sign-in failed after passkey verification"); return; }
      await redirectAfterLogin();
    } catch (err: any) {
      if (err.name !== "NotAllowedError") setError(err.message ?? "Passkey sign-in failed");
    } finally {
      setPasskeyLoading(false);
    }
  }

  const firstName = lookup?.firstName ?? "there";
  const isPrivileged = lookup?.role === "ADMIN" || lookup?.role === "PROVIDER";

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-[#F9F5F3] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center" aria-label="Glowith">
            <span role="img" aria-label="Glowith" className="logo-adaptive h-7" />
          </Link>
          <Link href="/signup" className="rounded-full border border-[#E8E0DC] bg-white px-4 py-2 text-sm font-bold">
            List your business
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 md:grid-cols-[1fr_420px]">
          <div className="text-left">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#D94472]">
              {step === "mfa" ? "Verification" : step.startsWith("forgot") ? "Password reset" : step === "email" ? "Login" : isPrivileged ? "Studio access" : "Welcome back"}
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-black leading-[1.05] text-[#1F1B1C] sm:text-6xl">
              {step === "mfa"
                ? mfa?.method === "totp" ? "Open your authenticator app" : "Check your email"
                : step === "forgot" ? "Forgot your password?"
                : step === "forgot-otp" ? "Check your email"
                : step === "forgot-new-pw" ? "Choose a new password"
                : step === "email" ? "First, what is your email?"
                : `Welcome ${firstName}`}
            </h1>
            <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-[#7A6C6E]">
              {step === "mfa"
                ? mfa?.method === "totp"
                  ? "Enter the 6-digit code from your authenticator app."
                  : `We sent a verification code to ${mfa?.email}. Enter it below.`
                : step === "forgot"
                  ? "Enter your email and we will send a one-time code to verify it's you."
                : step === "forgot-otp"
                  ? `We sent a 6-digit code to ${forgot?.email}. Enter it below.`
                : step === "forgot-new-pw"
                  ? "Almost there — choose a strong new password."
                : step === "email"
                  ? "We will check your account and send you to the right Glowith experience."
                  : isPrivileged
                    ? "Enter your password to continue to your tenant workspace."
                    : "Enter your password to continue booking and managing appointments."}
            </p>
          </div>

          <div className="rounded-[2rem] border border-[#E8E0DC] bg-white p-6 shadow-xl shadow-black/5">
            <ProgressBar
              steps={step === "mfa" || step === "forgot-new-pw" ? 3 : step === "password" || step === "forgot-otp" ? 2 : 1}
              total={step.startsWith("forgot") ? 3 : step === "mfa" ? 3 : 2}
            />

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

            {/* ── Forgot: enter email ──────────────────────────────────── */}
            {step === "forgot" ? (
              <form onSubmit={handleForgotSend} className="space-y-5">
                <button type="button" onClick={() => { setStep("password"); setError(""); }}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#7A6C6E]">
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </button>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">Email address</span>
                  <span className="mt-2 flex items-center gap-3 rounded-2xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-4">
                    <Mail className="h-5 w-5 text-[#7A6C6E]" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                      placeholder="your@email.com"
                      className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-[#B2A6A8]" />
                  </span>
                </label>
                <SubmitButton loading={loading}>Send code</SubmitButton>
              </form>

            ) : step === "forgot-otp" && forgot ? (
              /* ── Forgot: verify OTP ─────────────────────────────────── */
              <form onSubmit={handleForgotVerifyOtp} className="space-y-5">
                <button type="button" onClick={() => { setStep("forgot"); setForgotOtp(""); setError(""); }}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#7A6C6E]">
                  <ArrowLeft className="h-4 w-4" /> Change email
                </button>
                <div className="flex items-center gap-2 rounded-2xl bg-[#FFF5F8] px-4 py-3">
                  <ShieldCheck className="h-4 w-4 text-[#D94472]" />
                  <span className="text-sm font-semibold text-[#7A6C6E]">Code sent to {forgot.email}</span>
                </div>
                <OTPInput value={forgotOtp} onChange={setForgotOtp} />
                <button type="submit" disabled={loading || forgotOtp.length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a1a1a] py-4 text-sm font-black text-white transition hover:bg-[#1a1a1a]/90 disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify code
                </button>
                <button type="button" onClick={handleForgotResend} disabled={resendCooldown > 0}
                  className={cn("w-full text-center text-sm font-semibold transition", resendCooldown > 0 ? "text-gray-400" : "text-[#D94472] hover:underline")}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
              </form>

            ) : step === "forgot-new-pw" && forgot ? (
              /* ── Forgot: set new password ───────────────────────────── */
              <form onSubmit={handleForgotSetPassword} className="space-y-5">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Identity verified — set your new password below.
                </div>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">New password</span>
                  <span className="mt-2 flex items-center gap-3 rounded-2xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-4">
                    <input type={showForgotPw ? "text" : "password"} value={forgotNewPw}
                      onChange={(e) => setForgotNewPw(e.target.value)} required autoFocus minLength={8}
                      placeholder="At least 8 characters"
                      className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-[#B2A6A8]" />
                    <button type="button" onClick={() => setShowForgotPw(!showForgotPw)} className="text-[#7A6C6E]">
                      {showForgotPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </span>
                </label>
                <SubmitButton loading={loading}>Set new password</SubmitButton>
              </form>

            ) : /* ── MFA step ─────────────────────────────────────────────── */
            step === "mfa" && mfa ? (
              <form onSubmit={handleMFASubmit} className="space-y-5">
                <button
                  type="button"
                  onClick={() => { setStep("password"); setMfa(null); setMfaCode(""); setError(""); }}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#7A6C6E]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <div className="flex items-center gap-2 rounded-2xl bg-[#FFF5F8] px-4 py-3">
                  <ShieldCheck className="h-4 w-4 text-[#D94472]" />
                  <span className="text-sm font-semibold text-[#7A6C6E]">
                    {mfa.method === "totp" ? "Use your authenticator app" : `Code sent to ${mfa.email}`}
                  </span>
                </div>

                <OTPInput value={mfaCode} onChange={setMfaCode} />

                <button
                  type="submit"
                  disabled={loading || mfaCode.length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a1a1a] py-4 text-sm font-black text-white transition hover:bg-[#1a1a1a]/90 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify
                </button>

                {mfa.method === "email" && (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0}
                    className={cn(
                      "w-full text-center text-sm font-semibold transition",
                      resendCooldown > 0 ? "text-gray-400" : "text-[#D94472] hover:underline"
                    )}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                )}
              </form>
            ) : mode === "register" ? (
              /* ── Register ─────────────────────────────────────────────── */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <Field label="Your name" value={name} onChange={setName} placeholder="Thandi Mokoena" autoFocus />
                <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" minLength={8} />
                <SubmitButton loading={loading}>Create account</SubmitButton>
                <button type="button" onClick={() => { setMode("login"); setError(""); }}
                  className="w-full text-center text-sm font-semibold text-[#7A6C6E] hover:text-[#1F1B1C]">
                  Already have an account? <span className="text-[#D94472]">Sign in</span>
                </button>
              </form>
            ) : step === "email" ? (
              /* ── Email step ───────────────────────────────────────────── */
              <div className="space-y-4">
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">Email address</span>
                    <span className="mt-2 flex items-center gap-3 rounded-2xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-4">
                      <Mail className="h-5 w-5 text-[#7A6C6E]" />
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        required autoFocus placeholder="bookings@demo.glowith.co.za"
                        className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-[#B2A6A8]"
                      />
                    </span>
                  </label>
                  <SubmitButton loading={loading}>Continue</SubmitButton>
                </form>

                <div className="relative flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#E8E0DC]" />
                  <span className="text-xs font-semibold text-[#B2A6A8]">or</span>
                  <div className="h-px flex-1 bg-[#E8E0DC]" />
                </div>

                <SocialButton
                  onClick={() => signIn("google", { callbackUrl: params.get("callbackUrl") || "/" })}
                  icon={<GoogleIcon />}
                >
                  Continue with Google
                </SocialButton>

                <PasskeyButton onClick={handlePasskeySignIn} loading={passkeyLoading} />

                <button type="button" onClick={() => { setMode("register"); setError(""); }}
                  className="w-full text-center text-sm font-semibold text-[#7A6C6E] hover:text-[#1F1B1C]">
                  New customer? <span className="text-[#D94472]">Create an account</span>
                </button>
              </div>
            ) : (
              /* ── Password step ────────────────────────────────────────── */
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <button type="button" onClick={() => { setStep("email"); setPassword(""); setError(""); }}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#7A6C6E]">
                  <ArrowLeft className="h-4 w-4" /> Change email
                </button>

                <div className="rounded-2xl bg-[#FFF5F8] px-4 py-3 text-sm font-semibold text-[#7A6C6E]">
                  {email}
                  {lookup?.businessName && <span className="block text-[#1F1B1C]">{lookup.businessName}</span>}
                </div>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">Password</span>
                  <span className="mt-2 flex items-center gap-3 rounded-2xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-4">
                    <input
                      type={showPw ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} required autoFocus
                      placeholder="Enter your password"
                      className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-[#B2A6A8]"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="text-[#7A6C6E]">
                      {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </span>
                </label>

                <SubmitButton loading={loading}>Log in</SubmitButton>

                <button type="button"
                  onClick={() => { setStep("forgot"); setError(""); }}
                  className="block w-full text-center text-xs font-semibold text-[#7A6C6E] hover:text-[#D94472] transition-colors">
                  Forgot password?
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/* ── Shared components ─────────────────────────────────────────── */
function ProgressBar({ steps, total }: { steps: number; total: number }) {
  return (
    <div className="mb-6 flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < steps ? "bg-[#D94472]" : "bg-[#E8E0DC]")} />
      ))}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, autoFocus, minLength
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; autoFocus?: boolean; minLength?: number;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C6E]">{label}</span>
      <span className="mt-2 flex items-center rounded-2xl border border-[#E8E0DC] bg-[#F9F5F3] px-4 py-3.5">
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required autoFocus={autoFocus} placeholder={placeholder} minLength={minLength}
          className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-[#B2A6A8]"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="text-[#7A6C6E] ml-2">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </span>
    </label>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a1a1a] py-4 text-sm font-black text-white transition hover:bg-[#1a1a1a]/90 disabled:opacity-60">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

function SocialButton({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#E8E0DC] bg-white py-3.5 text-sm font-bold text-[#1F1B1C] transition hover:bg-[#F9F5F3]">
      {icon}
      {children}
    </button>
  );
}

function PasskeyButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#E8E0DC] bg-white py-3.5 text-sm font-bold text-[#1F1B1C] transition hover:bg-[#F9F5F3] disabled:opacity-60">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-5 w-5 text-[#D94472]" />}
      Sign in with passkey
    </button>
  );
}

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="relative flex gap-2 justify-center" onClick={() => inputRef.current?.focus()}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn(
          "flex h-14 w-11 items-center justify-center rounded-2xl border text-xl font-black transition cursor-text",
          i < value.length ? "border-[#D94472] bg-[#FFF5F8] text-[#D94472]" : "border-[#E8E0DC] bg-[#F9F5F3] text-[#B2A6A8]"
        )}>
          {value[i] ?? "·"}
        </div>
      ))}
      <input
        ref={inputRef}
        type="text" inputMode="numeric" autoComplete="one-time-code"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="absolute inset-0 opacity-0 cursor-text"
        aria-label="Verification code"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
