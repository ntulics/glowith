import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create a real DB booking. Requires the client to be signed in.
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Please sign in to book" }, { status: 401 });

  const { providerProfileId, serviceId, startsAt, notes, couponCode } = await request.json();
  if (!providerProfileId || !serviceId || !startsAt) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || service.providerProfileId !== providerProfileId || !service.active) {
    return NextResponse.json({ error: "Service not available" }, { status: 404 });
  }

  const start = new Date(startsAt);
  if (isNaN(start.getTime()) || start.getTime() < Date.now()) {
    return NextResponse.json({ error: "Pick a future time slot" }, { status: 400 });
  }
  const end = new Date(start.getTime() + service.durationMinutes * 60000);

  // Reject overlaps with this provider's existing (non-cancelled) bookings.
  const dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start); dayEnd.setHours(23, 59, 59, 999);
  const sameDay = await prisma.booking.findMany({
    where: { providerProfileId, status: { not: "CANCELLED" }, startsAt: { gte: dayStart, lte: dayEnd } },
    select: { startsAt: true, service: { select: { durationMinutes: true } } }
  });
  const clash = sameDay.some((b) => {
    const bStart = b.startsAt.getTime();
    const bEnd = bStart + b.service.durationMinutes * 60000;
    return start.getTime() < bEnd && end.getTime() > bStart;
  });
  if (clash) return NextResponse.json({ error: "That slot was just taken — pick another time" }, { status: 409 });

  // Apply coupon if supplied (re-validated server-side)
  let couponId: string | null = null;
  let discountCents = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { providerProfileId_code: { providerProfileId, code: couponCode.toString().trim().toUpperCase() } }
    });
    const usable = coupon && coupon.active
      && (!coupon.expiresAt || coupon.expiresAt.getTime() >= Date.now())
      && (coupon.maxRedemptions == null || coupon.redemptions < coupon.maxRedemptions);
    if (usable) {
      const raw = coupon!.discountType === "PERCENT"
        ? Math.round((service.priceCents * coupon!.discountValue) / 100)
        : coupon!.discountValue;
      discountCents = Math.max(0, Math.min(raw, service.priceCents));
      couponId = coupon!.id;
    }
  }

  // Deposit Glowith collects upfront. Only charged to STARTER (free) providers;
  // paid plans (PRO/BUSINESS) keep 100% and arrange their own deposits.
  // The percentage is configured by the super admin (PlatformConfig).
  const requiresDeposit = (service.depositCents ?? 0) > 0;
  let depositCents = 0;
  if (requiresDeposit) {
    const provider = await prisma.providerProfile.findUnique({ where: { id: providerProfileId }, select: { plan: true } });
    if (provider?.plan === "STARTER") {
      const config = await prisma.platformConfig.findUnique({ where: { id: "global" } });
      const pct = config?.depositPercent ?? 20;
      depositCents = Math.round(((service.priceCents - discountCents) * pct) / 100);
    }
  }

  const booking = await prisma.booking.create({
    data: {
      clientId: user.id,
      providerProfileId,
      serviceId,
      startsAt: start,
      notes: notes ? notes.toString().slice(0, 500) : null,
      depositCents,
      couponId,
      discountCents,
      status: depositCents > 0 ? "PENDING_DEPOSIT" : "CONFIRMED"
    }
  });

  if (couponId) {
    await prisma.coupon.update({ where: { id: couponId }, data: { redemptions: { increment: 1 } } });
  }

  return NextResponse.json({
    booking: { id: booking.id, status: booking.status, depositCents: booking.depositCents }
  }, { status: 201 });
}
