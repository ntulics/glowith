import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initTransaction, paystackEnabled } from "@/lib/paystack";
import { checkInCodeExpiry, generateCheckInCode } from "@/lib/booking-attendance";

const BASE = process.env.NEXTAUTH_URL ?? "https://glowith.co.za";

// Start a deposit payment for a booking. Returns a Paystack checkout URL,
// or { simulated: true } (booking auto-confirmed) when Paystack isn't configured.
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await request.json();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.clientId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.depositCents <= 0) {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", checkInCode: generateCheckInCode(), checkInCodeExpiresAt: checkInCodeExpiry(booking.startsAt, booking.durationMinutes) } });
    return NextResponse.json({ simulated: true });
  }

  // Fall back to confirming without payment if no gateway keys are present yet
  if (!paystackEnabled()) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", paymentProvider: "simulated", paymentIntentId: `sim_${Date.now()}`, checkInCode: generateCheckInCode(), checkInCodeExpiresAt: checkInCodeExpiry(booking.startsAt, booking.durationMinutes) }
    });
    return NextResponse.json({ simulated: true });
  }

  const reference = `glw_${booking.id}_${Date.now()}`;
  const { authorizationUrl } = await initTransaction({
    email: user.email,
    amountCents: booking.depositCents,
    reference,
    callbackUrl: `${BASE}/api/payments/paystack/callback`,
    metadata: { bookingId: booking.id }
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentProvider: "paystack", paymentIntentId: reference }
  });

  return NextResponse.json({ authorizationUrl });
}
