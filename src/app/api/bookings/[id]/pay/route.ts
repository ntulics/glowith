import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Simulated deposit payment. Marks the booking confirmed.
// A real gateway (Paystack/Yoco/PayFast) will replace this with a redirect + webhook.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.clientId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      paymentProvider: "simulated",
      paymentIntentId: `sim_${Date.now()}`
    }
  });
  return NextResponse.json({ booking: { id: updated.id, status: updated.status } });
}
