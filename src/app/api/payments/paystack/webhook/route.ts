import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PAYSTACK_SECRET } from "@/lib/paystack";

// Authoritative payment confirmation from Paystack.
// Configure this URL in the Paystack dashboard → Settings → API Keys & Webhooks.
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!PAYSTACK_SECRET) return NextResponse.json({ ok: true }); // not configured

  const expected = crypto.createHmac("sha512", PAYSTACK_SECRET).update(raw).digest("hex");
  if (expected !== signature) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(raw);
  if (event?.event === "charge.success") {
    const reference = event.data?.reference;
    if (reference) {
      await prisma.booking.updateMany({
        where: { paymentIntentId: reference },
        data: { status: "CONFIRMED" }
      });
    }
  }
  return NextResponse.json({ ok: true });
}
