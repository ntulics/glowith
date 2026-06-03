import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CouponsView } from "@/components/dashboard/coupons-view";
import { canOwnCoupons } from "@/lib/coupons";

export default async function CouponsPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, providerType: true, parentBusinessId: true }
  });
  if (!profile) redirect("/signup");

  const allowed = canOwnCoupons(profile.providerType, profile.parentBusinessId);
  const coupons = allowed
    ? await prisma.coupon.findMany({ where: { providerProfileId: profile.id }, orderBy: { createdAt: "desc" } })
    : [];

  return (
    <CouponsView
      allowed={allowed}
      coupons={coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        maxRedemptions: c.maxRedemptions,
        redemptions: c.redemptions,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        active: c.active
      }))}
    />
  );
}
