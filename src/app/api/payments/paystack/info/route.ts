import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public payment info for a booking, keyed by its secret Paystack reference.
// Lets the apex /pay page render the Paystack popup (so Apple Pay works on the
// registered apex domain) without needing a cross-subdomain session.
export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "ref required" }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: { paymentIntentId: ref },
    include: { client: { select: { email: true } }, providerProfile: { select: { businessName: true } } }
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    publicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",
    email: booking.client.email,
    amountCents: booking.depositCents,
    providerName: booking.providerProfile.businessName,
    status: booking.status,
    reference: ref
  });
}
