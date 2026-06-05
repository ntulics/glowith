import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";

// Confirm a booking after payment, keyed by reference and verified with Paystack
// (no session needed — Paystack verification is the source of truth). Mirrors the
// webhook so the apex /pay page can confirm immediately.
export async function POST(request: Request) {
  const { reference } = await request.json();
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

  const booking = await prisma.booking.findFirst({ where: { paymentIntentId: reference } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { success } = await verifyTransaction(reference);
    if (success) {
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
      return NextResponse.json({ status: "CONFIRMED" });
    }
  } catch { /* fall through */ }
  return NextResponse.json({ status: booking.status });
}
