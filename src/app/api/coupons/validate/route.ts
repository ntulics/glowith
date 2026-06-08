import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeDiscountCents, couponLabel } from "@/lib/coupons";

// Validate a coupon against a provider + service. Public (used during booking).
export async function POST(request: Request) {
  const body = await request.json();
  const { providerProfileId, code } = body;
  const serviceIds: string[] = Array.isArray(body.serviceIds) && body.serviceIds.length
    ? body.serviceIds
    : body.serviceId ? [body.serviceId] : [];
  if (!providerProfileId || !code || !serviceIds.length) {
    return NextResponse.json({ valid: false, error: "Missing details" }, { status: 400 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { id: true, parentBusinessId: true, agents: { select: { id: true } } }
  });
  if (!profile) return NextResponse.json({ valid: false, error: "Provider not found" }, { status: 404 });

  const serviceOwnerIds = new Set<string>([profile.id, ...(profile.parentBusinessId ? [profile.parentBusinessId] : []), ...profile.agents.map((a) => a.id)]);
  const couponOwnerIds = [profile.parentBusinessId ?? profile.id, profile.id];

  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, active: true },
    select: { priceCents: true, providerProfileId: true }
  });
  if (services.length !== serviceIds.length || services.some((service) => !serviceOwnerIds.has(service.providerProfileId))) {
    return NextResponse.json({ valid: false, error: "Service not found" }, { status: 404 });
  }

  const coupon = await prisma.coupon.findFirst({
    where: { code: code.toString().trim().toUpperCase(), providerProfileId: { in: couponOwnerIds }, active: true }
  });
  if (!coupon) return NextResponse.json({ valid: false, error: "Invalid code" });
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return NextResponse.json({ valid: false, error: "This coupon has expired" });
  if (coupon.maxRedemptions != null && coupon.redemptions >= coupon.maxRedemptions) {
    return NextResponse.json({ valid: false, error: "This coupon has been fully redeemed" });
  }

  const totalPriceCents = services.reduce((sum, service) => sum + service.priceCents, 0);
  const discountCents = computeDiscountCents(coupon, totalPriceCents);
  return NextResponse.json({
    valid: true,
    code: coupon.code,
    discountCents,
    label: couponLabel(coupon),
    finalCents: totalPriceCents - discountCents
  });
}
