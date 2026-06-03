import Link from "next/link";
import { Check, X } from "lucide-react";

export default async function BookingConfirmedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const ok = status !== "error";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${ok ? "bg-emerald-100" : "bg-red-100"}`}>
          {ok ? <Check className="h-8 w-8 text-emerald-600" /> : <X className="h-8 w-8 text-red-600" />}
        </div>
        <h1 className="text-2xl font-black">{ok ? "Booking confirmed!" : "Payment not completed"}</h1>
        <p className="mt-2 text-[var(--muted)]">
          {ok
            ? "Your deposit was received and your appointment is confirmed. A confirmation has been sent to your email."
            : "We couldn't confirm your payment. Your slot is held as pending — please try paying the deposit again."}
        </p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--ink)]/90">
          Back to Glowith
        </Link>
      </div>
    </main>
  );
}
