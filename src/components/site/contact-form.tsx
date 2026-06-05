"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSending(true); setError("");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, message }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not send");
      setSent(true); setName(""); setEmail(""); setMessage("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send"); }
    finally { setSending(false); }
  }

  if (sent) return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
      <p className="mt-2 font-bold text-emerald-800">Thanks — we&apos;ll be in touch!</p>
      <p className="text-sm text-emerald-700">We usually reply within one business day.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-6">
      <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name"
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Email address"
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} placeholder="How can we help?"
        className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--brand)] focus:bg-white" />
      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
      <button type="submit" disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3 text-sm font-bold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60">
        {sending && <Loader2 className="h-4 w-4 animate-spin" />} Send message
      </button>
    </form>
  );
}
