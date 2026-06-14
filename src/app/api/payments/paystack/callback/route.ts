import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { checkInCodeExpiry, generateCheckInCode } from "@/lib/booking-attendance";

const BASE = process.env.NEXTAUTH_URL ?? "https://glowith.co.za";

// Paystack redirects the customer here after checkout. We verify and confirm,
// then send the customer to a success page. (The webhook is the authoritative
// confirmation; this is the user-facing redirect.)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const mobile = url.searchParams.get("mobile") === "1";

  const redirect = (status: "success" | "error") => {
    if (mobile) return NextResponse.redirect(`glowith://payment/${status}`);
    return NextResponse.redirect(`${BASE}/booking/confirmed?status=${status}`);
  };

  if (!reference) return redirect("error");

  try {
    const { success } = await verifyTransaction(reference);
    if (success) {
      const bookings = await prisma.booking.findMany({ where: { paymentIntentId: reference } });
      await Promise.all(bookings.map((booking) => prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED", checkInCode: generateCheckInCode(), checkInCodeExpiresAt: checkInCodeExpiry(booking.startsAt, booking.durationMinutes) }
      })));
      return redirect("success");
    }
  } catch {
    /* fall through to error */
  }
  return redirect("error");
}
