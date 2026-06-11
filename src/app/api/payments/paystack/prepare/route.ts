import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paystackEnabled } from "@/lib/paystack";
import { checkInCodeExpiry, generateCheckInCode } from "@/lib/booking-attendance";

// Prepares an inline (popup) Paystack payment: generates a reference and returns
// the public key + amount for the client-side PaystackPop. Falls back to
// confirming the booking (simulated) when keys aren't configured.
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const publicKey = process.env.PAYSTACK_PUBLIC_KEY ?? "";
  const { bookingId } = await request.json();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.clientId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (booking.depositCents <= 0) {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", checkInCode: generateCheckInCode(), checkInCodeExpiresAt: checkInCodeExpiry(booking.startsAt, booking.durationMinutes) } });
    return NextResponse.json({ simulated: true });
  }

  if (!paystackEnabled() || !publicKey) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", paymentProvider: "simulated", paymentIntentId: `sim_${Date.now()}`, checkInCode: generateCheckInCode(), checkInCodeExpiresAt: checkInCodeExpiry(booking.startsAt, booking.durationMinutes) }
    });
    return NextResponse.json({ simulated: true });
  }

  // Fetch provider's Paystack subaccount for split pay
  const provider = await prisma.providerProfile.findUnique({
    where: { id: booking.providerProfileId },
    select: { paystackSubaccountCode: true }
  });

  const reference = `glw_${booking.id}_${Date.now()}`;
  await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentProvider: "paystack", paymentIntentId: reference }
  });

  return NextResponse.json({
    enabled: true,
    reference,
    publicKey,
    email: user.email,
    amountCents: booking.depositCents,
    // Split pay: if provider has a subaccount, Paystack routes their share directly
    subaccountCode: provider?.paystackSubaccountCode ?? null,
  });
}
