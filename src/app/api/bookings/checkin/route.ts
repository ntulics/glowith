import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, bookingId, action = "checkin" } = await req.json();
  if (!code && !bookingId) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  // Find booking by checkInCode, booking id, or explicit bookingId
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        ...(code ? [{ checkInCode: code }, { id: code }] : []),
        ...(bookingId ? [{ id: bookingId }] : [])
      ],
      status: "CONFIRMED"
    },
    include: {
      client: { select: { name: true } },
      service: { select: { name: true } },
      providerProfile: { select: { userId: true } }
    }
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found or not confirmed. Check the code and try again." }, { status: 404 });
  }

  // Only the provider/agent that owns this booking can check in
  const providerProfile = await prisma.providerProfile.findFirst({
    where: { userId: user.id }
  });
  if (!providerProfile) {
    return NextResponse.json({ error: "Provider profile not found" }, { status: 403 });
  }

  if (action === "checkin") {
    if (booking.checkedInAt) {
      return NextResponse.json({ error: "Client is already checked in" }, { status: 400 });
    }
    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkedInAt: new Date(), checkedInById: providerProfile.id }
    });
  } else if (action === "checkout" || action === "complete") {
    if (!booking.checkedInAt && action === "checkout") {
      return NextResponse.json({ error: "Client has not checked in yet" }, { status: 400 });
    }
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED", completedAt: new Date() }
    });
  } else if (action === "no_show") {
    if (booking.noShowAt) {
      return NextResponse.json({ error: "Already marked as no-show" }, { status: 400 });
    }
    await prisma.booking.update({
      where: { id: booking.id },
      data: { noShowAt: new Date() }
    });
  }

  return NextResponse.json({
    booking: {
      bookingId: booking.id,
      clientName: booking.client.name,
      service: booking.service.name,
      startsAt: booking.startsAt.toISOString(),
      checkInCode: booking.checkInCode,
      checkedInAt: booking.checkedInAt?.toISOString() ?? null,
      bookingFor: booking.bookingFor,
      attendeeName: booking.attendeeName
    }
  });
}
