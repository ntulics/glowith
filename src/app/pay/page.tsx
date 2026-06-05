"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";

const ZAR = (c: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);

function PayInner() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const ret = params.get("return");

  const [info, setInfo] = useState<{ publicKey: string; email: string; amountCents: number; providerName: string; status: string } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "done" | "error">("loading");
  const [error, setError] = useState("");
  const popupRef = useRef<any>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!ref) { setState("error"); setError("Missing payment reference."); return; }
    fetch(`/api/payments/paystack/info?ref=${encodeURIComponent(ref)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setState("error"); setError("This payment could not be found."); return; }
        if (d.status === "CONFIRMED") { setState("done"); return; }
        setInfo(d); setState("ready");
      })
      .catch(() => { setState("error"); setError("Could not load payment."); });
  }, [ref]);

  async function onPaid() {
    await fetch("/api/payments/paystack/confirm-ref", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: ref })
    });
    setState("done");
  }

  // Mount Paystack (Apple Pay + checkout) once info is ready
  useEffect(() => {
    if (state !== "ready" || !info || mountedRef.current) return;
    mountedRef.current = true;
    function mount() {
      const Pop = (window as any).PaystackPop;
      if (!Pop) { setError("Could not load the payment widget."); return; }
      popupRef.current = new Pop();
      try {
        popupRef.current.paymentRequest?.({
          key: info!.publicKey, email: info!.email, amount: info!.amountCents,
          currency: "ZAR", ref: ref!, container: "paystack-apple-pay",
          style: { theme: "light", applePay: { width: "100%", borderRadius: "10px", type: "pay", locale: "en" } },
          onSuccess: onPaid, onError: () => {}, onCancel: () => {}
        });
      } catch { /* Apple Pay unavailable */ }
    }
    if ((window as any).PaystackPop) { mount(); return; }
    const s = document.createElement("script");
    s.id = "paystack-inline-js"; s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = mount; s.onerror = () => setError("Could not load Paystack.");
    document.body.appendChild(s);
  }, [state, info, ref]);

  function openCheckout() {
    const popup = popupRef.current;
    if (!popup || !info) { setError("Payment is still loading — try again in a moment."); return; }
    const opts: any = { key: info.publicKey, email: info.email, amount: info.amountCents, currency: "ZAR", reference: ref, ref, onSuccess: onPaid, onCancel: () => {}, onClose: () => {} };
    try {
      if (typeof popup.newTransaction === "function") popup.newTransaction(opts);
      else if (typeof popup.checkout === "function") popup.checkout(opts);
    } catch { setError("Could not open checkout."); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span role="img" aria-label="Glowith" className="logo-adaptive h-6" />
          {ret && <a href={ret} aria-label="Cancel" className="text-[var(--muted)] hover:text-[var(--ink)]"><X className="h-5 w-5" /></a>}
        </div>

        {state === "loading" && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" /></div>}

        {state === "error" && <p className="py-8 text-center text-sm font-semibold text-red-500">{error}</p>}

        {state === "ready" && info && (
          <>
            <h1 className="text-xl font-black">Pay your deposit</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Confirm your booking with {info.providerName}.</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--background)] px-4 py-3">
              <span className="text-sm font-semibold">Deposit due now</span>
              <span className="font-black text-[var(--brand)]">{ZAR(info.amountCents)}</span>
            </div>
            <p className="mt-4 mb-2 text-xs text-[var(--muted)]">Apple Pay appears automatically on supported devices.</p>
            <div id="paystack-apple-pay" className="w-full [&>*]:!w-full empty:hidden" />
            <button onClick={openCheckout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3.5 text-sm font-black text-white hover:bg-[var(--brand-dark)]">
              Pay {ZAR(info.amountCents)} — card, EFT &amp; more
            </button>
            {error && <p className="mt-3 text-center text-sm font-semibold text-red-500">{error}</p>}
          </>
        )}

        {state === "done" && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"><Check className="h-7 w-7 text-emerald-600" /></div>
            <h1 className="text-xl font-black">Booking confirmed!</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Your deposit was received. A confirmation has been sent to your email.</p>
            <a href={ret || "/"} className="mt-5 inline-block rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--ink)]/90">Done</a>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PayPage() {
  return <Suspense fallback={null}><PayInner /></Suspense>;
}
