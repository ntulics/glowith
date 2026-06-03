// Only businesses and standalone freelancers may own coupons — agents cannot.
export function canOwnCoupons(providerType: string, parentBusinessId: string | null): boolean {
  if (providerType === "BUSINESS") return true;
  if (providerType === "FREELANCER" && !parentBusinessId) return true;
  return false;
}

export function computeDiscountCents(
  coupon: { discountType: "PERCENT" | "FIXED"; discountValue: number },
  priceCents: number
): number {
  const raw = coupon.discountType === "PERCENT"
    ? Math.round((priceCents * coupon.discountValue) / 100)
    : coupon.discountValue;
  return Math.max(0, Math.min(raw, priceCents));
}

export function couponLabel(coupon: { discountType: "PERCENT" | "FIXED"; discountValue: number }): string {
  return coupon.discountType === "PERCENT"
    ? `${coupon.discountValue}% off`
    : `R${Math.round(coupon.discountValue / 100)} off`;
}
