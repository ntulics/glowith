import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { checkInCodeExpiry, generateCheckInCode } from "@/lib/booking-attendance";

const BASE = process.env.NEXTAUTH_URL ?? "https://glowith.co.za";

// Paystack redirects the customer here after checkout. We verify and confirm,
// then send the customer to a success page. (The webhook is the authoritative
// confirmation; this is the user-facing redirect.)
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) return NextResponse.redirect(`${BASE}/booking/confirmed?status=error`);

  try {
    const { success } = await verifyTransaction(reference);
    if (success) {
      const bookings = await prisma.booking.findMany({ where: { paymentIntentId: reference } });
      await Promise.all(bookings.map((booking) => prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED", checkInCode: generateCheckInCode(), checkInCodeExpiresAt: checkInCodeExpiry(booking.startsAt, booking.durationMinutes) }
      })));
      return NextResponse.redirect(`${BASE}/booking/confirmed?status=success`);
    }
  } catch {
    /* fall through to error */
  }
  return NextResponse.redirect(`${BASE}/booking/confirmed?status=error`);
}
