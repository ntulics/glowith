import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ownedCoupon(userId: string, id: string) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return null;
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon || coupon.providerProfileId !== profile.id) return null;
  return coupon;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const coupon = await ownedCoupon(user.id, id);
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { active } = await request.json();
  const updated = await prisma.coupon.update({ where: { id }, data: { ...(typeof active === "boolean" ? { active } : {}) } });
  return NextResponse.json({ coupon: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const coupon = await ownedCoupon(user.id, id);
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
