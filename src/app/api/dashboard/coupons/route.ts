import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canOwnCoupons } from "@/lib/coupons";

async function ownerProfile(userId: string) {
  return prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, providerType: true, parentBusinessId: true }
  });
}

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await ownerProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });
  if (!canOwnCoupons(profile.providerType, profile.parentBusinessId)) {
    return NextResponse.json({ coupons: [], allowed: false });
  }
  const coupons = await prisma.coupon.findMany({ where: { providerProfileId: profile.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons, allowed: true });
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await ownerProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });
  if (!canOwnCoupons(profile.providerType, profile.parentBusinessId)) {
    return NextResponse.json({ error: "Agents cannot create coupons — these are managed at company level" }, { status: 403 });
  }

  const body = await request.json();
  const code = (body.code ?? "").toString().trim().toUpperCase().replace(/\s+/g, "");
  const discountType = body.discountType === "FIXED" ? "FIXED" : "PERCENT";
  const discountValue = parseInt(body.discountValue, 10);

  if (!/^[A-Z0-9]{3,20}$/.test(code)) return NextResponse.json({ error: "Code must be 3–20 letters/numbers" }, { status: 400 });
  if (!discountValue || discountValue < 1) return NextResponse.json({ error: "Enter a discount value" }, { status: 400 });
  if (discountType === "PERCENT" && discountValue > 100) return NextResponse.json({ error: "Percentage cannot exceed 100" }, { status: 400 });

  const exists = await prisma.coupon.findUnique({ where: { providerProfileId_code: { providerProfileId: profile.id, code } } });
  if (exists) return NextResponse.json({ error: "You already have a coupon with that code" }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: {
      providerProfileId: profile.id,
      code,
      discountType,
      discountValue: discountType === "FIXED" ? Math.round(discountValue * 100) : discountValue,
      maxRedemptions: body.maxRedemptions ? parseInt(body.maxRedemptions, 10) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
    }
  });
  return NextResponse.json({ coupon });
}
