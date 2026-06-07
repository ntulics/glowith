import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;

  // Auto-expire PENDING_DEPOSIT bookings older than 15 minutes
  const expiryThreshold = new Date(Date.now() - 15 * 60 * 1000);
  await prisma.booking.updateMany({
    where: {
      clientId: userId,
      status: "PENDING_DEPOSIT",
      createdAt: { lt: expiryThreshold }
    },
    data: { status: "CANCELLED" }
  });

  const bookings = await prisma.booking.findMany({
    where: { clientId: userId },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      providerProfile: {
        select: {
          businessName: true, handle: true, avatarUrl: true, city: true,
          cancelNoticeHours: true, cancelFeePercent: true,
          rescheduleNoticeHours: true, rescheduleFeePercent: true, policyText: true
        }
      }
    },
    orderBy: { startsAt: "desc" }
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      startsAt: b.startsAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      notes: b.notes,
      depositCents: b.depositCents,
      durationMinutes: b.service?.durationMinutes ?? b.durationMinutes,
      service: b.service?.name ?? "Service",
      provider: {
        name: b.providerProfile.businessName,
        handle: b.providerProfile.handle,
        city: b.providerProfile.city,
        cancelNoticeHours: b.providerProfile.cancelNoticeHours,
        cancelFeePercent: b.providerProfile.cancelFeePercent,
        rescheduleNoticeHours: b.providerProfile.rescheduleNoticeHours,
        rescheduleFeePercent: b.providerProfile.rescheduleFeePercent,
        policyText: b.providerProfile.policyText
      }
    }))
  });
}

// Cancel a booking
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { bookingId } = await request.json();
  if (!bookingId) return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.clientId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" }
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
