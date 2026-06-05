import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create a real DB booking (one or more services). Requires the client signed in.
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Please sign in to book" }, { status: 401 });

  const body = await request.json();
  const { providerProfileId, startsAt, notes, couponCode } = body;
  const serviceIds: string[] = Array.isArray(body.serviceIds) && body.serviceIds.length
    ? body.serviceIds
    : body.serviceId ? [body.serviceId] : [];
  if (!providerProfileId || !serviceIds.length || !startsAt) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }

  // The booked profile, plus its parent business and agents — services from any
  // of these may be booked here (a business storefront lists its agents' services).
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { id: true, parentBusinessId: true, plan: true, agents: { select: { id: true } } }
  });
  if (!profile) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  const allowedProviderIds = new Set<string>([profile.id, ...(profile.parentBusinessId ? [profile.parentBusinessId] : []), ...profile.agents.map((a) => a.id)]);

  const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, active: true } });
  if (services.length !== serviceIds.length || services.some((s) => !allowedProviderIds.has(s.providerProfileId))) {
    return NextResponse.json({ error: "One or more services are unavailable" }, { status: 404 });
  }

  const totalDuration = services.reduce((s, x) => s + x.durationMinutes, 0);
  const totalPrice = services.reduce((s, x) => s + x.priceCents, 0);
  const totalDepositBase = services.reduce((s, x) => s + (x.depositCents ?? 0), 0);

  const start = new Date(startsAt);
  if (isNaN(start.getTime()) || start.getTime() < Date.now()) {
    return NextResponse.json({ error: "Pick a future time slot" }, { status: 400 });
  }
  const end = new Date(start.getTime() + totalDuration * 60000);

  // Reject overlaps with this provider's existing confirmed bookings.
  const dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start); dayEnd.setHours(23, 59, 59, 999);
  const sameDay = await prisma.booking.findMany({
    where: { providerProfileId, status: "CONFIRMED", startsAt: { gte: dayStart, lte: dayEnd } },
    select: { startsAt: true, durationMinutes: true, service: { select: { durationMinutes: true } } }
  });
  const clash = sameDay.some((b) => {
    const bStart = b.startsAt.getTime();
    const bEnd = bStart + (b.durationMinutes || b.service.durationMinutes) * 60000;
    return start.getTime() < bEnd && end.getTime() > bStart;
  });
  if (clash) return NextResponse.json({ error: "That slot was just taken — pick another time" }, { status: 409 });

  // Coupon (applied to the combined price)
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
        ? Math.round((totalPrice * coupon!.discountValue) / 100)
        : coupon!.discountValue;
      discountCents = Math.max(0, Math.min(raw, totalPrice));
      couponId = coupon!.id;
    }
  }

  // Deposit Glowith collects upfront (STARTER plan only; super-admin percentage)
  let depositCents = 0;
  if (totalDepositBase > 0 && profile.plan === "STARTER") {
    const config = await prisma.platformConfig.findUnique({ where: { id: "global" } });
    const pct = config?.depositPercent ?? 20;
    depositCents = Math.round(((totalPrice - discountCents) * pct) / 100);
  }

  const booking = await prisma.booking.create({
    data: {
      clientId: user.id,
      providerProfileId,
      serviceId: services[0].id,
      startsAt: start,
      durationMinutes: totalDuration,
      notes: notes ? notes.toString().slice(0, 500) : null,
      depositCents,
      couponId,
      discountCents,
      status: depositCents > 0 ? "PENDING_DEPOSIT" : "CONFIRMED",
      items: {
        create: services.map((s) => ({ serviceId: s.id, name: s.name, priceCents: s.priceCents, durationMinutes: s.durationMinutes }))
      }
    }
  });

  if (couponId) await prisma.coupon.update({ where: { id: couponId }, data: { redemptions: { increment: 1 } } });

  return NextResponse.json({
    booking: { id: booking.id, status: booking.status, depositCents: booking.depositCents }
  }, { status: 201 });
}
