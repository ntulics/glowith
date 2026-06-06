"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  startRegistration,
  browserSupportsWebAuthn
} from "@simplewebauthn/browser";
import {
  CheckCircle2,
  FingerprintIcon,
  KeyRound,
  Loader2,
  QrCode,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────── */
type Passkey = {
  id: string;
  name: string;
  createdAt: string;
  lastUsed: string | null;
  deviceType: string;
  backedUp: boolean;
};

type SecurityState = {
  totpEnabled: boolean;
  passkeys: Passkey[];
};

/* ══════════════════════════════════════════════════════════════════ */
export function SecuritySection() {
  const [state, setState] = useState<SecurityState | null>(null);
  const [loadError, setLoadError] = useState("");

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/security/status");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setState(data);
    } catch {
      setLoadError("Could not load security settings.");
    }
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  if (loadError) return <p className="text-sm text-red-500">{loadError}</p>;
  if (!state) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#D94472]" /></div>;

  return (
    <div className="space-y-8 max-w-xl">
      <TOTPSection enabled={state.totpEnabled} onChanged={fetchState} />
      <PasskeysSection passkeys={state.passkeys} onChanged={fetchState} />
    </div>
  );
}

/* ── TOTP ───────────────────────────────────────────────────────── */
function TOTPSection({ enabled, onChanged }: { enabled: boolean; onChanged: () => void }) {
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  return (
    <section>
      <SectionHeading
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Authenticator app"
        badge={enabled ? "Enabled" : "Email OTP active"}
        badgeColor={enabled ? "green" : "blue"}
      />
      <p className="mt-1 text-sm text-gray-500">
        {enabled
          ? "You use an authenticator app (Google Authenticator, Authy, etc.) for two-factor verification."
          : "Every sign-in requires a one-time code. Set up an authenticator app to use TOTP codes instead of email."}
      </p>

      <div className="mt-4 flex gap-3">
        {enabled ? (
          <button
            onClick={() => setShowDisable(true)}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
          >
            Remove authenticator app
          </button>
        ) : (
          <button
            onClick={() => setShowSetup(true)}
            className="rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition"
          >
            Set up authenticator app
          </button>
        )}
      </div>

      {showSetup && (
        <TOTPSetupSheet
          onClose={() => setShowSetup(false)}
          onEnabled={() => { setShowSetup(false); onChanged(); }}
        />
      )}
      {showDisable && (
        <TOTPDisableSheet
          onClose={() => setShowDisable(false)}
          onDisabled={() => { setShowDisable(false); onChanged(); }}
        />
      )}
    </section>
  );
}

function TOTPSetupSheet({ onClose, onEnabled }: { onClose: () => void; onEnabled: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"qr" | "verify">("qr");

  useEffect(() => {
    fetch("/api/auth/mfa/totp/setup", { method: "POST" })
      .then((r) => r.json())
      .then(({ secret: s, qrDataUrl: q }) => {
        setSecret(s);
        setQrDataUrl(q);
      })
      .catch(() => setError("Could not start setup. Try again."));
  }, []);

  async function handleEnable() {
    if (!secret) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/totp/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Incorrect code"); return; }
      onEnabled();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Set up authenticator app">
      {error && <ErrorBanner message={error} />}

      {step === "qr" ? (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app.
          </p>
          {qrDataUrl ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="TOTP QR code" className="rounded-2xl border border-gray-200 p-3" width={200} height={200} />
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#D94472]" />
            </div>
          )}
          {secret && (
            <details className="text-xs text-gray-400">
              <summary className="cursor-pointer font-semibold">Can&apos;t scan? Enter code manually</summary>
              <code className="mt-1 block break-all rounded-lg bg-gray-100 px-3 py-2 font-mono text-gray-700 select-all">{secret}</code>
            </details>
          )}
          <button
            onClick={() => setStep("verify")}
            disabled={!qrDataUrl}
            className="w-full rounded-xl bg-[#1a1a1a] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            I&apos;ve scanned the code
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app to confirm.</p>
          <OTPInput value={code} onChange={setCode} />
          <button
            onClick={handleEnable}
            disabled={loading || code.length < 6}
            className="w-full rounded-xl bg-[#D94472] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enable authenticator app
          </button>
          <button onClick={() => setStep("qr")} className="w-full text-sm font-semibold text-gray-500 hover:text-gray-700">
            ← Back to QR code
          </button>
        </div>
      )}
    </Sheet>
  );
}

function TOTPDisableSheet({ onClose, onDisabled }: { onClose: () => void; onDisabled: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDisable() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Incorrect code"); return; }
      onDisabled();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Remove authenticator app">
      <p className="text-sm text-gray-600 mb-5">
        Enter the 6-digit code from your authenticator app to confirm removal. After this, sign-ins will use email OTP.
      </p>
      {error && <ErrorBanner message={error} />}
      <OTPInput value={code} onChange={setCode} />
      <button
        onClick={handleDisable}
        disabled={loading || code.length < 6}
        className="mt-5 w-full rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Remove authenticator app
      </button>
    </Sheet>
  );
}

/* ── Passkeys ───────────────────────────────────────────────────── */
function PasskeysSection({ passkeys, onChanged }: { passkeys: Passkey[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supportsWebAuthn = typeof window !== "undefined" && browserSupportsWebAuthn();

  async function handleAdd() {
    setLoading(true);
    setError("");
    try {
      const optRes = await fetch("/api/auth/passkey/register-options", { method: "POST" });
      const options = await optRes.json();
      const registration = await startRegistration(options);
      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: registration, name: addName || "Passkey" })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) { setError(verifyData.error ?? "Registration failed"); return; }
      setAdding(false);
      setAddName("");
      onChanged();
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        setError(err.message ?? "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/auth/passkey/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Delete failed"); return; }
      onChanged();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      <SectionHeading
        icon={<FingerprintIcon className="h-5 w-5" />}
        title="Passkeys"
        badge={passkeys.length > 0 ? `${passkeys.length} registered` : "None"}
        badgeColor={passkeys.length > 0 ? "green" : "gray"}
      />
      <p className="mt-1 text-sm text-gray-500">
        Passkeys let you sign in with Face ID, Touch ID, or a hardware key — no password needed.
      </p>

      {error && <ErrorBanner message={error} className="mt-3" />}

      {passkeys.length > 0 && (
        <ul className="mt-4 space-y-2">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <KeyRound className="h-4 w-4 shrink-0 text-[#D94472]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{pk.name}</p>
                <p className="text-xs text-gray-400">
                  Added {new Date(pk.createdAt).toLocaleDateString()}
                  {pk.lastUsed && ` · Last used ${new Date(pk.lastUsed).toLocaleDateString()}`}
                  {pk.backedUp && " · Synced"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(pk.id)}
                disabled={deletingId === pk.id}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                aria-label="Remove passkey"
              >
                {deletingId === pk.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!supportsWebAuthn ? (
        <p className="mt-4 text-sm text-gray-400">Your browser doesn&apos;t support passkeys.</p>
      ) : adding ? (
        <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Passkey name (optional)</span>
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. MacBook Touch ID"
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D94472]"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FingerprintIcon className="h-4 w-4" />}
              Register passkey
            </button>
            <button
              onClick={() => { setAdding(false); setAddName(""); setError(""); }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:border-[#D94472] hover:text-[#D94472] transition"
        >
          <FingerprintIcon className="h-4 w-4" />
          Add a passkey
        </button>
      )}
    </section>
  );
}

/* ── Shared UI ─────────────────────────────────────────────────── */
function SectionHeading({
  icon,
  title,
  badge,
  badgeColor
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  badgeColor: "green" | "blue" | "gray";
}) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    gray: "bg-gray-100 text-gray-500"
  };
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0F4] text-[#D94472]">{icon}</span>
      <h3 className="text-base font-black text-gray-900">{title}</h3>
      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", colors[badgeColor])}>{badge}</span>
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex h-12 w-10 items-center justify-center rounded-xl border text-lg font-bold transition",
            i < value.length ? "border-[#D94472] bg-[#FFF0F4] text-[#D94472]" : "border-gray-200 bg-gray-50 text-gray-300"
          )}
        >
          {value[i] ?? "·"}
        </div>
      ))}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="absolute opacity-0 pointer-events-none w-px h-px"
        autoFocus
      />
    </div>
  );
}

function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600", className)}>
      {message}
    </div>
  );
}
