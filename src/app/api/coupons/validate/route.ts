import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeDiscountCents, couponLabel } from "@/lib/coupons";

// Validate a coupon against a provider + service. Public (used during booking).
export async function POST(request: Request) {
  const { providerProfileId, code, serviceId } = await request.json();
  if (!providerProfileId || !code || !serviceId) {
    return NextResponse.json({ valid: false, error: "Missing details" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { priceCents: true, providerProfileId: true } });
  if (!service) return NextResponse.json({ valid: false, error: "Service not found" }, { status: 404 });

  // Agents can also redeem their parent business's coupons
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId }, select: { parentBusinessId: true }
  });
  const providerIds = [providerProfileId, profile?.parentBusinessId].filter(Boolean) as string[];
  if (!providerIds.includes(service.providerProfileId)) {
    return NextResponse.json({ valid: false, error: "Service not found" }, { status: 404 });
  }

  const coupon = await prisma.coupon.findFirst({
    where: { code: code.toString().trim().toUpperCase(), providerProfileId: { in: providerIds }, active: true }
  });
  if (!coupon) return NextResponse.json({ valid: false, error: "Invalid code" });
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return NextResponse.json({ valid: false, error: "This coupon has expired" });
  if (coupon.maxRedemptions != null && coupon.redemptions >= coupon.maxRedemptions) {
    return NextResponse.json({ valid: false, error: "This coupon has been fully redeemed" });
  }

  const discountCents = computeDiscountCents(coupon, service.priceCents);
  return NextResponse.json({
    valid: true,
    code: coupon.code,
    discountCents,
    label: couponLabel(coupon),
    finalCents: service.priceCents - discountCents
  });
}
