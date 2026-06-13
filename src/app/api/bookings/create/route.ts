import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkInCodeExpiry, generateCheckInCode } from "@/lib/booking-attendance";
import { isSAPublicHoliday, getHolidayForDate } from "@/lib/sa-holidays";

// How long a PENDING_DEPOSIT booking holds a slot before another user can take it.
const RESERVATION_MINUTES = 15;

// Create a real DB booking (one or more services + optional extras). Requires client signed in.
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Please sign in to book" }, { status: 401 });

  const body = await request.json();
  const { providerProfileId, startsAt, notes, couponCode, bookingFor, attendeeName, attendeePhone } = body;
  const serviceIds: string[] = Array.isArray(body.serviceIds) && body.serviceIds.length
    ? body.serviceIds
    : body.serviceId ? [body.serviceId] : [];
  const extraIds: string[] = Array.isArray(body.extraIds) ? body.extraIds : [];

  if (!providerProfileId || !serviceIds.length || !startsAt) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }

  // Expire any stale reservations from other users so the slot-conflict check is accurate
  await prisma.booking.updateMany({
    where: { status: "PENDING_DEPOSIT", reservedUntil: { lt: new Date() } },
    data: { status: "EXPIRED" }
  });

  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: {
      id: true, parentBusinessId: true, plan: true,
      agents: { select: { id: true } }
    }
  });
  if (!profile) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  // Determine the effective provider profile ID for this booking.
  // If the passed providerProfileId is a parent business (not an agent itself) and
  // has agents, auto-assign the least-loaded available agent for the requested slot.
  let effectiveProviderId = providerProfileId;
  if (!profile.parentBusinessId && profile.agents.length > 0 && startsAt) {
    const start = new Date(startsAt);
    if (!isNaN(start.getTime())) {
      const ds = start.toISOString().slice(0, 10);
      const slotHHMM = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
      const dur = body.durationMinutes ?? 60;
      try {
        const agentsRes = await fetch(
          `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/providers/agents?providerProfileId=${providerProfileId}&date=${ds}&slot=${slotHHMM}&duration=${dur}`
        );
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          const available: { id: string }[] = agentsData.agents ?? [];
          if (available.length > 0) effectiveProviderId = available[0].id;
        }
      } catch { /* fall back to parent */ }
    }
  }

  const allowedProviderIds = new Set<string>([
    profile.id,
    ...(profile.parentBusinessId ? [profile.parentBusinessId] : []),
    ...profile.agents.map((a) => a.id)
  ]);
  const couponOwnerIds = [profile.parentBusinessId ?? profile.id, profile.id];

  const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, active: true } });
  if (services.length !== serviceIds.length || services.some((s) => !allowedProviderIds.has(s.providerProfileId))) {
    return NextResponse.json({ error: "One or more services are unavailable" }, { status: 404 });
  }

  // Load selected extras
  const extras = extraIds.length
    ? await prisma.serviceExtra.findMany({ where: { id: { in: extraIds }, active: true } })
    : [];

  const servicesDuration = services.reduce((s, x) => s + x.durationMinutes, 0);
  const extrasDuration = extras.reduce((s, e) => s + e.durationMinutes, 0);
  const totalDuration = servicesDuration + extrasDuration;

  const servicesPrice = services.reduce((s, x) => s + x.priceCents, 0);
  const extrasPrice = extras.reduce((s, e) => s + e.priceCents, 0);
  const totalPrice = servicesPrice + extrasPrice;

  // Provider-defined deposit applied to the booking total (service + extras).
  // depositIsPercent=true  → depositCents stores the % (e.g. 50 = 50% of total)
  // depositIsPercent=false → depositCents is a fixed amount in cents
  const totalDepositBase = services.reduce((sum, svc) => {
    if (svc.depositIsPercent) return sum + Math.round((totalPrice * svc.depositCents) / 100);
    return sum + (svc.depositCents ?? 0);
  }, 0);

  const start = new Date(startsAt);
  if (isNaN(start.getTime()) || start.getTime() < Date.now()) {
    return NextResponse.json({ error: "Pick a future time slot" }, { status: 400 });
  }
  const end = new Date(start.getTime() + totalDuration * 60000);

  // Reject overlaps with this provider's existing active bookings
  const dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start); dayEnd.setHours(23, 59, 59, 999);
  const sameDay = await prisma.booking.findMany({
    where: {
      providerProfileId,
      startsAt: { gte: dayStart, lte: dayEnd },
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING_DEPOSIT", reservedUntil: { gt: new Date() } },
      ],
    },
    select: { startsAt: true, durationMinutes: true, service: { select: { durationMinutes: true } } }
  });
  const clash = sameDay.some((b) => {
    const bStart = b.startsAt.getTime();
    const bEnd = bStart + (b.durationMinutes || b.service.durationMinutes) * 60000;
    return start.getTime() < bEnd && end.getTime() > bStart;
  });
  if (clash) return NextResponse.json({ error: "That slot was just taken — pick another time" }, { status: 409 });

  const rootProviderId = profile.parentBusinessId ?? profile.id;

  // Reject if the provider doesn't work on public holidays and this day is one
  const rootProfile = await prisma.providerProfile.findUnique({
    where: { id: rootProviderId },
    select: { workOnPublicHolidays: true }
  });
  if (rootProfile?.workOnPublicHolidays === false && isSAPublicHoliday(start)) {
    const holiday = getHolidayForDate(start);
    return NextResponse.json({ error: `Bookings are not available on ${holiday?.name ?? "this public holiday"}` }, { status: 409 });
  }

  // Reject if the provider (or their parent business) has blocked this slot
  const blockedOverlap = await prisma.blockedSlot.findFirst({
    where: {
      providerProfileId: rootProviderId,
      startsAt: { lt: end },
      endsAt: { gt: start },
    },
  });
  if (blockedOverlap) return NextResponse.json({ error: "This time slot is not available for booking" }, { status: 409 });

  // Coupon: discount applies to service price only (matching the validate route)
  let couponId: string | null = null;
  let discountCents = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        providerProfileId: { in: couponOwnerIds },
        code: couponCode.toString().trim().toUpperCase()
      }
    });
    const usable = coupon && coupon.active
      && (!coupon.expiresAt || coupon.expiresAt.getTime() >= Date.now())
      && (coupon.maxRedemptions == null || coupon.redemptions < coupon.maxRedemptions);
    if (usable) {
      const raw = coupon!.discountType === "PERCENT"
        ? Math.round((servicesPrice * coupon!.discountValue) / 100)
        : coupon!.discountValue;
      discountCents = Math.max(0, Math.min(raw, servicesPrice));
      couponId = coupon!.id;
    }
  }

  // Deposit the client pays upfront — provider-defined amount applied to discounted total.
  // platformConfig.depositPercent is only used for the Paystack subaccount split, not here.
  const discountedTotal = Math.max(totalPrice - discountCents, 0);
  let depositCents = 0;
  if (discountedTotal > 0) {
    // Re-compute deposit against discounted total if percentage-based
    depositCents = services.reduce((sum, svc) => {
      if (svc.depositIsPercent) return sum + Math.round((discountedTotal * svc.depositCents) / 100);
      return sum + (svc.depositCents ?? 0);
    }, 0);
    depositCents = Math.min(depositCents, discountedTotal); // never exceed total
  }

  const status = depositCents > 0 ? "PENDING_DEPOSIT" : "CONFIRMED";
  const reservedUntil = status === "PENDING_DEPOSIT"
    ? new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000)
    : null;

  const booking = await prisma.booking.create({
    data: {
      clientId: user.id,
      providerProfileId: effectiveProviderId,
      serviceId: services[0].id,
      startsAt: start,
      durationMinutes: totalDuration,
      notes: notes ? notes.toString().slice(0, 500) : null,
      depositCents,
      couponId,
      discountCents,
      status,
      reservedUntil,
      checkInCode: status === "CONFIRMED" ? generateCheckInCode() : null,
      checkInCodeExpiresAt: status === "CONFIRMED" ? checkInCodeExpiry(start, totalDuration) : null,
      bookingFor: bookingFor ?? "SELF",
      attendeeName: attendeeName ?? null,
      attendeePhone: attendeePhone ?? null,
      items: {
        create: [
          ...services.map((s) => ({ serviceId: s.id, name: s.name, priceCents: s.priceCents, durationMinutes: s.durationMinutes }))
        ]
      },
      extras: extras.length ? {
        create: extras.map((e) => ({ serviceExtraId: e.id, name: e.name, priceCents: e.priceCents }))
      } : undefined
    }
  });

  if (couponId) await prisma.coupon.update({ where: { id: couponId }, data: { redemptions: { increment: 1 } } });

  return NextResponse.json({
    booking: { id: booking.id, status: booking.status, depositCents: booking.depositCents }
  }, { status: 201 });
}
