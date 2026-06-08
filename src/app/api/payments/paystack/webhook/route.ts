import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PAYSTACK_SECRET } from "@/lib/paystack";
import { checkInCodeExpiry, generateCheckInCode } from "@/lib/booking-attendance";

// Authoritative payment confirmation from Paystack.
// Configure this URL in the Paystack dashboard → Settings → API Keys & Webhooks.
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!PAYSTACK_SECRET) return NextResponse.json({ ok: true }); // not configured

  const expected = crypto.createHmac("sha512", PAYSTACK_SECRET).update(raw).digest("hex");
  if (expected !== signature) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(raw);
  if (event?.event === "charge.success") {
    const reference = event.data?.reference;
    if (reference) {
      const bookings = await prisma.booking.findMany({ where: { paymentIntentId: reference } });
      await Promise.all(bookings.map((booking) => prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED", checkInCode: generateCheckInCode(), checkInCodeExpiresAt: checkInCodeExpiry(booking.startsAt, booking.durationMinutes) }
      })));
    }
  }
  return NextResponse.json({ ok: true });
}
