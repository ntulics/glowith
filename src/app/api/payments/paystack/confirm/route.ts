import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";

// Called by the popup's onSuccess. Verifies server-side and confirms the
// booking. The webhook remains the authoritative confirmation as a backstop.
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference } = await request.json();
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

  const booking = await prisma.booking.findFirst({ where: { paymentIntentId: reference, clientId: user.id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { success } = await verifyTransaction(reference);
    if (success) {
      // Guard against a slot being confirmed twice between popup steps.
      const svc = await prisma.service.findUnique({ where: { id: booking.serviceId }, select: { durationMinutes: true } });
      const dur = svc?.durationMinutes ?? 0;
      const start = booking.startsAt.getTime();
      const end = start + dur * 60000;
      const dayStart = new Date(booking.startsAt); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(booking.startsAt); dayEnd.setHours(23, 59, 59, 999);
      const others = await prisma.booking.findMany({
        where: { providerProfileId: booking.providerProfileId, status: "CONFIRMED", id: { not: booking.id }, startsAt: { gte: dayStart, lte: dayEnd } },
        select: { startsAt: true, service: { select: { durationMinutes: true } } }
      });
      const clash = others.some((b) => {
        const bs = b.startsAt.getTime(); const be = bs + b.service.durationMinutes * 60000;
        return start < be && end > bs;
      });
      if (clash) {
        await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
        return NextResponse.json({ status: "CANCELLED", error: "That slot was just taken — your deposit will be refunded." });
      }
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
      return NextResponse.json({ status: "CONFIRMED" });
    }
  } catch {
    /* fall through */
  }
  return NextResponse.json({ status: booking.status });
}
