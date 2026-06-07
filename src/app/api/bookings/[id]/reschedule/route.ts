import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Reschedule a confirmed booking to a new date/time.
// Validates: ownership, no clash at new slot, booking is not in the past.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { startsAt: startsAtStr } = await request.json();
  if (!startsAtStr) return NextResponse.json({ error: "startsAt required" }, { status: 400 });

  const newStart = new Date(startsAtStr);
  if (isNaN(newStart.getTime()) || newStart.getTime() < Date.now()) {
    return NextResponse.json({ error: "Please pick a future time" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: { select: { durationMinutes: true } } }
  });
  if (!booking || booking.clientId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status === "CANCELLED") return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
  if (booking.status === "COMPLETED") return NextResponse.json({ error: "Completed bookings cannot be rescheduled" }, { status: 400 });

  const totalDuration = booking.durationMinutes || booking.service.durationMinutes;
  const newEnd = new Date(newStart.getTime() + totalDuration * 60000);

  // Check for clashes with other confirmed bookings at this provider
  const dayStart = new Date(newStart); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(newStart); dayEnd.setHours(23, 59, 59, 999);
  const others = await prisma.booking.findMany({
    where: {
      providerProfileId: booking.providerProfileId,
      status: "CONFIRMED",
      id: { not: id },
      startsAt: { gte: dayStart, lte: dayEnd }
    },
    select: { startsAt: true, durationMinutes: true, service: { select: { durationMinutes: true } } }
  });
  const clash = others.some((b) => {
    const bs = b.startsAt.getTime();
    const be = bs + (b.durationMinutes || b.service.durationMinutes) * 60000;
    return newStart.getTime() < be && newEnd.getTime() > bs;
  });
  if (clash) return NextResponse.json({ error: "That slot is already taken — please choose another time" }, { status: 409 });

  const updated = await prisma.booking.update({
    where: { id },
    data: { startsAt: newStart }
  });

  return NextResponse.json({ ok: true, startsAt: updated.startsAt.toISOString() });
}
